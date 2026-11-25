const express = require('express');
const { cleanPlainText, validateFeedbackInput, DAY_MS } = require('../rules');
const { generateToken, hashIp, createRateLimiter } = require('../security');
const { requireUser } = require('../middleware');

const TOKEN_RE = /^[A-Za-z0-9_-]{6,80}$/;

function createReviewsRouter(db) {
  const meInvitesRouter = express.Router();
  const publicInvitesRouter = express.Router();

  const submitLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyFn: (req) => `fb:${req.ip}`,
    message: 'Too many feedback submissions from this network. Please try again later.',
  });

  meInvitesRouter.post('/', requireUser, (req, res) => {
    const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Publish your worker profile first before creating feedback links.' });
    }

    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const recentCount = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM feedback_invites
      WHERE worker_id = ? AND created_at >= ?
    `).get(worker.id, sinceIso).cnt;

    if (recentCount >= 20) {
      return res.status(429).json({ error: 'Daily limit reached: you can create up to 20 feedback links per day.' });
    }

    const clientName = cleanPlainText(req.body?.clientName, 30);
    const id = 'inv_' + generateToken(10);
    const token = generateToken(24);
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + 30 * DAY_MS).toISOString();

    db.prepare(`
      INSERT INTO feedback_invites (id, token, worker_id, client_name, created_at, expires_at, used_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `).run(id, token, worker.id, clientName, nowIso, expiresAt);

    res.status(201).json({ token, expiresAt });
  });

  publicInvitesRouter.get('/:token', (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!TOKEN_RE.test(token)) {
      return res.status(404).json({ error: 'This feedback link is invalid.' });
    }

    const invite = db.prepare(`
      SELECT i.*, w.user_id AS worker_user_id, w.name AS worker_name, w.category, w.area, w.photo_url, w.tint, w.status AS worker_status
      FROM feedback_invites i
      JOIN workers w ON w.id = i.worker_id
      WHERE i.token = ?
    `).get(token);

    if (!invite) {
      return res.status(404).json({ error: 'This feedback link could not be found.' });
    }
    if (invite.used_at) {
      return res.status(410).json({ error: 'This link has already been used.' });
    }
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: 'This feedback link has expired.' });
    }
    if (invite.worker_status !== 'active') {
      return res.status(404).json({ error: 'This profile is not available right now.' });
    }
    if (req.user && req.user.id === invite.worker_user_id) {
      return res.status(403).json({ error: 'You cannot leave feedback on your own profile.' });
    }

    res.json({
      worker: {
        name: invite.worker_name,
        category: invite.category,
        area: invite.area,
        photo: invite.photo_url || null,
        tint: Number(invite.tint || 0),
      },
      clientName: invite.client_name || '',
    });
  });

  publicInvitesRouter.post('/:token/feedback', submitLimiter, (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!TOKEN_RE.test(token)) {
      return res.status(404).json({ error: 'This feedback link is invalid.' });
    }

    const parsed = validateFeedbackInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const data = parsed.data;

    const ipHash = hashIp(req.ip);
    const nowIso = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      const invite = db.prepare(`
        SELECT i.*, w.user_id AS worker_user_id, w.status AS worker_status
        FROM feedback_invites i
        JOIN workers w ON w.id = i.worker_id
        WHERE i.token = ?
      `).get(token);

      if (!invite) {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'This feedback link could not be found.' });
      }
      if (invite.used_at) {
        db.exec('ROLLBACK');
        return res.status(410).json({ error: 'This link has already been used.' });
      }
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        db.exec('ROLLBACK');
        return res.status(410).json({ error: 'This feedback link has expired.' });
      }
      if (invite.worker_status !== 'active') {
        db.exec('ROLLBACK');
        return res.status(404).json({ error: 'This profile is not available right now.' });
      }
      if (req.user && req.user.id === invite.worker_user_id) {
        db.exec('ROLLBACK');
        return res.status(403).json({ error: 'You cannot leave feedback on your own profile.' });
      }

      const updateRes = db.prepare(`
        UPDATE feedback_invites
        SET used_at = ?
        WHERE id = ? AND used_at IS NULL
      `).run(nowIso, invite.id);

      if (updateRes.changes !== 1) {
        db.exec('ROLLBACK');
        return res.status(410).json({ error: 'This link has already been used.' });
      }

      const fbId = 'fb_' + generateToken(10);
      db.prepare(`
        INSERT INTO feedback (id, worker_id, invite_id, blaze, rating, testimonial, client_name, status, ip_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
      `).run(
        fbId,
        invite.worker_id,
        invite.id,
        data.blaze ? 1 : 0,
        data.rating,
        data.testimonial,
        data.clientName,
        ipHash,
        nowIso
      );

      db.exec('COMMIT');
      res.status(201).json({ ok: true });
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }
  });

  return { meInvitesRouter, publicInvitesRouter };
}

module.exports = { createReviewsRouter };
