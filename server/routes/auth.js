const fs = require('fs');
const path = require('path');
const express = require('express');
const { validateSignupInput, cleanPlainText } = require('../rules');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  setSessionCookie,
  clearSessionCookie,
  createRateLimiter,
} = require('../security');
const { USER_COOKIE, SESSION_TTL_SECONDS, requireUser } = require('../middleware');
const { sendNotification } = require('../notifications');

const TERMS_VERSION = '22 November 2026';

function createAuthRouter(db, uploadsDir) {
  const router = express.Router();

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    keyFn: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
    message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  });

  function createSession(res, userId) {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      tokenHash,
      userId,
      expiresAt,
      nowIso
    );
    setSessionCookie(res, USER_COOKIE, raw, SESSION_TTL_SECONDS);
  }

  router.post('/signup', authLimiter, (req, res) => {
    const parsed = validateSignupInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { name, phone, email, password } = parsed.data;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in instead.' });
    }

    const userId = 'u_' + generateToken(12);
    const nowIso = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, phone, email, password_hash, terms_accepted_at, terms_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, phone, email, passwordHash, nowIso, TERMS_VERSION, nowIso, nowIso);

    createSession(res, userId);
    res.status(201).json({ id: userId, name, phone, email, termsAcceptedAt: nowIso, termsVersion: TERMS_VERSION });
  });

  router.post('/login', authLimiter, (req, res) => {
    const email = cleanPlainText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const user = db.prepare('SELECT id, name, phone, email, password_hash, terms_accepted_at, terms_version FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    createSession(res, user.id);
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      termsAcceptedAt: user.terms_accepted_at,
      termsVersion: user.terms_version,
    });
  });

  router.post('/logout', (req, res) => {
    if (req.sessionTokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
    }
    clearSessionCookie(res, USER_COOKIE);
    res.json({ ok: true });
  });

  router.post('/forgot', authLimiter, async (req, res) => {
    const email = cleanPlainText(req.body?.email, 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
    if (user && user.password_hash !== '!seeded_demo!') {
      const token = generateToken(24);
      const tokenHash = hashToken(token);
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)').run(
        tokenHash,
        user.id,
        expiresAt,
        nowIso
      );

      const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const resetLink = `${siteUrl}/#reset/${token}`;
      await sendNotification(db, {
        workerId: user.id,
        type: `password_reset_${tokenHash.slice(0, 10)}`,
        channel: 'email',
        recipient: user.email,
        subject: 'Reset your ProConnect password',
        message: `Hi ${user.name}, use this link within 1 hour to reset your ProConnect password: ${resetLink}`,
      }).catch(() => {});
    }

    res.json({
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  });

  router.post('/reset', authLimiter, (req, res) => {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Please provide a valid reset link and a password of at least 6 characters.' });
    }

    const tokenHash = hashToken(token);
    const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(tokenHash);
    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    }

    const nowIso = new Date().toISOString();
    const newHash = hashPassword(password);

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, nowIso, row.user_id);
      db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(nowIso, tokenHash);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ ok: true });
  });

  const meRouter = express.Router();

  meRouter.get('/', (req, res) => {
    res.json(req.user || null);
  });

  meRouter.patch('/', requireUser, (req, res) => {
    const name = cleanPlainText(req.body?.name, 80);
    const phone = cleanPlainText(req.body?.phone, 25);
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Please enter a valid phone or WhatsApp number.' });

    const nowIso = new Date().toISOString();
    db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?').run(name, phone, nowIso, req.user.id);
    res.json({
      id: req.user.id,
      name,
      phone,
      email: req.user.email,
      termsAcceptedAt: req.user.termsAcceptedAt,
      termsVersion: req.user.termsVersion,
    });
  });

  meRouter.post('/password', requireUser, authLimiter, (req, res) => {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (!currentPassword) {
      return res.status(400).json({ error: 'Please enter your current password.' });
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const row = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!row || !verifyPassword(currentPassword, row.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const nowIso = new Date().toISOString();
    const newHash = hashPassword(newPassword);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, nowIso, req.user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    createSession(res, req.user.id);
    res.json({ ok: true });
  });

  meRouter.get('/export', requireUser, (req, res) => {
    const userRow = db.prepare(
      'SELECT id, name, phone, email, terms_accepted_at, terms_version, trial_claimed_at, created_at, updated_at FROM users WHERE id = ?'
    ).get(req.user.id);
    const workerRow = db.prepare(
      'SELECT id, type, name, category, area, phone, years, bio, photo_url, verified, status, published_at, created_at, updated_at FROM workers WHERE user_id = ?'
    ).get(req.user.id);
    const portfolio = workerRow
      ? db.prepare('SELECT id, image_url, title, created_at FROM portfolio_items WHERE worker_id = ? ORDER BY created_at DESC').all(workerRow.id)
      : [];
    const subscription = workerRow
      ? db.prepare('SELECT trial_ends_at, paid_until, updated_at FROM subscriptions WHERE worker_id = ?').get(workerRow.id)
      : null;
    const payments = workerRow
      ? db.prepare(
        'SELECT id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end FROM payments WHERE worker_id = ? ORDER BY paid_at DESC'
      ).all(workerRow.id)
      : [];

    res.setHeader('Content-Disposition', 'attachment; filename="proconnect-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: userRow,
      workerProfile: workerRow || null,
      portfolio,
      subscription,
      payments,
    });
  });

  meRouter.delete('/', requireUser, (req, res) => {
    const userId = req.user.id;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    // Remove uploaded files directory for this user if present
    if (uploadsDir) {
      const userUploadDir = path.resolve(uploadsDir, userId);
      if (userUploadDir.startsWith(path.resolve(uploadsDir) + path.sep)) {
        fs.rmSync(userUploadDir, { recursive: true, force: true });
      }
    }

    clearSessionCookie(res, USER_COOKIE);
    res.json({ ok: true });
  });

  return { authRouter: router, meRouter };
}

module.exports = { createAuthRouter };
