const express = require('express');
const { validateSignupInput, cleanPlainText } = require('../rules');
const { createRateLimiter } = require('../security');
const {
  SESSION_TTL_SECONDS,
  setAuthCookies,
  clearAuthCookies,
  requireUser,
} = require('../middleware');
const { ensureStore, asyncHandler } = require('../store');
const { sendNotification } = require('../notifications');

const TERMS_VERSION = '22 November 2026';

function createAuthRouter(dbOrStore, uploadsDir, verificationsDir) {
  const store = ensureStore(dbOrStore, { uploadsDir, verificationsDir });
  const router = express.Router();

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    keyFn: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
    message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  });

  router.post('/signup', authLimiter, asyncHandler(async (req, res) => {
    const parsed = validateSignupInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { name, phone, email, password } = parsed.data;
    const nowIso = new Date().toISOString();

    const result = await store.signupWithPassword({
      name,
      phone,
      email,
      password,
      termsVersion: TERMS_VERSION,
      nowIso,
      sessionTtlSeconds: SESSION_TTL_SECONDS,
    });

    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    setAuthCookies(res, result.sessionToken, result.refreshToken);
    res.status(201).json(result.user);
  }));

  router.post('/login', authLimiter, asyncHandler(async (req, res) => {
    const email = cleanPlainText(req.body?.email, 160).toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const result = await store.loginWithPassword({
      email,
      password,
      sessionTtlSeconds: SESSION_TTL_SECONDS,
    });
    if (result.error) {
      return res.status(result.status || 401).json({ error: result.error });
    }

    setAuthCookies(res, result.sessionToken, result.refreshToken);
    res.json(result.user);
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    await store.logoutSession({
      tokenHash: req.sessionTokenHash || null,
      accessToken: req.sessionAccessToken || null,
    });
    clearAuthCookies(res);
    res.json({ ok: true });
  }));

  router.post('/forgot', authLimiter, asyncHandler(async (req, res) => {
    const email = cleanPlainText(req.body?.email, 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const created = await store.requestPasswordReset({ email, ttlMs: 60 * 60 * 1000 });
    if (created) {
      const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const resetLink = `${siteUrl}/#reset/${created.token}`;
      await sendNotification(store, {
        workerId: created.user.id,
        type: `password_reset_${created.tokenHash.slice(0, 10)}`,
        channel: 'email',
        recipient: created.user.email,
        subject: 'Reset your Nkabom password',
        message: `Hi ${created.user.name}, use this link within 1 hour to reset your Nkabom password: ${resetLink}`,
      }).catch(() => {});
    }

    res.json({
      ok: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  }));

  router.post('/reset', authLimiter, asyncHandler(async (req, res) => {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Please provide a valid reset link and a password of at least 6 characters.' });
    }

    const result = await store.resetPasswordWithToken({ token, newPassword: password });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json({ ok: true });
  }));

  const meRouter = express.Router();

  meRouter.get('/', (req, res) => {
    res.json(req.user || null);
  });

  meRouter.patch('/', requireUser, asyncHandler(async (req, res) => {
    const name = cleanPlainText(req.body?.name, 80);
    const phone = cleanPlainText(req.body?.phone, 25);
    if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
    if (phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Please enter a valid phone or WhatsApp number.' });

    const updated = await store.updateUserProfile({
      userId: req.user.id,
      name,
      phone,
      nowIso: new Date().toISOString(),
    });
    res.json({
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      email: updated.email,
      termsAcceptedAt: updated.termsAcceptedAt,
      termsVersion: updated.termsVersion,
    });
  }));

  meRouter.post('/password', requireUser, authLimiter, asyncHandler(async (req, res) => {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (!currentPassword) {
      return res.status(400).json({ error: 'Please enter your current password.' });
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const result = await store.changeUserPassword({
      userId: req.user.id,
      email: req.user.email,
      currentPassword,
      newPassword,
      sessionTtlSeconds: SESSION_TTL_SECONDS,
    });
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    setAuthCookies(res, result.sessionToken, result.refreshToken);
    res.json({ ok: true });
  }));

  meRouter.get('/export', requireUser, asyncHandler(async (req, res) => {
    const payload = await store.exportUserData(req.user.id);
    res.setHeader('Content-Disposition', 'attachment; filename="nkabom-my-data.json"');
    res.json(payload);
  }));

  meRouter.delete('/', requireUser, asyncHandler(async (req, res) => {
    await store.deleteUserAccount(req.user.id);
    clearAuthCookies(res);
    res.json({ ok: true });
  }));

  return { authRouter: router, meRouter };
}

module.exports = { createAuthRouter };
