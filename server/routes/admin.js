const crypto = require('crypto');
const express = require('express');
const {
  cleanPlainText,
  neutralizeCsvCell,
} = require('../rules');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  createRateLimiter,
} = require('../security');
const { ADMIN_COOKIE, ADMIN_TTL_SECONDS, requireAdmin } = require('../middleware');
const { runDailyRemindersJob } = require('../notifications');
const { ensureStore, asyncHandler } = require('../store');

function safeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminRouter(dbOrStore, uploadsDir, verificationsDir) {
  const store = ensureStore(dbOrStore, { uploadsDir, verificationsDir });
  const router = express.Router();

  const adminLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyFn: (req) => `adm:${req.ip}`,
    message: 'Too many admin sign-in attempts. Please wait a few minutes.',
  });

  function getEnvPasscode() {
    const val = process.env.ADMIN_PASSCODE;
    return val && val.trim().length > 0 ? val.trim() : null;
  }

  async function isAdminCookieValid(req) {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE];
    if (!token) return false;
    return store.isAdminSessionValid(hashToken(token));
  }

  async function createAdminSession(res) {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ADMIN_TTL_SECONDS * 1000).toISOString();
    await store.createAdminSession({ tokenHash, expiresAt, createdAt: nowIso });
    setSessionCookie(res, ADMIN_COOKIE, raw, ADMIN_TTL_SECONDS);
  }

  router.get('/status', asyncHandler(async (req, res) => {
    const envCode = getEnvPasscode();
    const storedHash = await store.getStoredAdminPasscodeHash();
    res.json({
      authenticated: await isAdminCookieValid(req),
      needsBootstrap: !envCode && !storedHash,
      envConfigured: Boolean(envCode),
    });
  }));

  router.post('/bootstrap', adminLimiter, asyncHandler(async (req, res) => {
    if (getEnvPasscode()) {
      return res.status(409).json({ error: 'Admin passcode is configured via environment variables.' });
    }

    const passcode = String(req.body?.passcode || '');
    if (passcode.length < 8 || passcode.length > 128) {
      return res.status(400).json({ error: 'Choose an admin password of at least 8 characters.' });
    }

    const hashed = hashPassword(passcode);
    const claim = await store.claimAdminPasscodeHash(hashed);
    if (!claim.ok) {
      return res.status(409).json({ error: 'Admin password has already been claimed. Please sign in.' });
    }

    await createAdminSession(res);
    res.status(201).json({ ok: true });
  }));

  router.post('/login', adminLimiter, asyncHandler(async (req, res) => {
    const passcode = String(req.body?.passcode || '');
    if (!passcode) return res.status(400).json({ error: 'Please enter the admin password.' });

    const envCode = getEnvPasscode();
    const storedHash = await store.getStoredAdminPasscodeHash();

    let valid = false;
    if (envCode) {
      valid = safeEqualStrings(passcode, envCode);
    } else if (storedHash) {
      valid = verifyPassword(passcode, storedHash);
    } else {
      return res.status(400).json({ error: 'Admin password has not been set up yet.' });
    }

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect admin password.' });
    }

    await createAdminSession(res);
    res.json({ ok: true });
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies[ADMIN_COOKIE];
    if (token) {
      await store.deleteAdminSession(hashToken(token));
    }
    clearSessionCookie(res, ADMIN_COOKIE);
    res.json({ ok: true });
  }));

  const guard = requireAdmin(store);

  router.get('/overview', guard, asyncHandler(async (req, res) => {
    res.json(await store.getAdminOverview(new Date()));
  }));

  router.get('/workers', guard, asyncHandler(async (req, res) => {
    const items = await store.listAdminWorkers({
      q: String(req.query.q || ''),
      now: new Date(),
    });
    res.json({ items });
  }));

  router.patch('/workers/:id', guard, asyncHandler(async (req, res) => {
    const out = await store.updateAdminWorker({
      id: req.params.id,
      verified: typeof req.body?.verified === 'boolean' ? req.body.verified : undefined,
      status: req.body?.status,
      nowIso: new Date().toISOString(),
    });
    if (!out.found) return res.status(404).json({ error: 'Worker not found.' });
    if (out.invalid) return res.status(400).json({ error: 'No valid fields to update.' });
    res.json({ ok: true });
  }));

  router.delete('/workers/:id', guard, asyncHandler(async (req, res) => {
    const out = await store.deleteAdminWorker(req.params.id);
    if (!out.found) return res.status(404).json({ error: 'Worker not found.' });
    res.json({ ok: true });
  }));

  router.post('/workers/:id/extend', guard, asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number.parseInt(req.body?.days || '30', 10) || 30));
    const out = await store.extendAdminWorkerSubscription({
      id: req.params.id,
      days,
      now: new Date(),
    });
    if (!out.found) return res.status(404).json({ error: 'Worker not found.' });
    res.json({ ok: true, paidUntil: out.paidUntil });
  }));

  router.get('/feedback', guard, asyncHandler(async (req, res) => {
    res.json({ items: await store.listAdminFeedback() });
  }));

  router.patch('/feedback/:id', guard, asyncHandler(async (req, res) => {
    const status = req.body?.status;
    if (!['published', 'hidden', 'removed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid feedback status.' });
    }
    const out = await store.moderateAdminFeedback({ id: req.params.id, status });
    if (!out.found) return res.status(404).json({ error: 'Feedback not found.' });
    res.json({ ok: true });
  }));

  router.get('/reports', guard, asyncHandler(async (req, res) => {
    res.json({ items: await store.listAdminReports() });
  }));

  router.patch('/reports/:id', guard, asyncHandler(async (req, res) => {
    const status = req.body?.status;
    if (!['open', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }
    const out = await store.updateAdminReport({ id: req.params.id, status });
    if (!out.found) return res.status(404).json({ error: 'Report not found.' });
    res.json({ ok: true });
  }));

  router.get('/payments', guard, asyncHandler(async (req, res) => {
    res.json({ items: await store.listAdminPayments({ limit: 250 }) });
  }));

  router.get('/payments.csv', guard, asyncHandler(async (req, res) => {
    const rows = await store.listAdminPayments({ limit: 0 });
    const header = ['Payment ID', 'Worker ID', 'Worker Name', 'Amount (GHS)', 'Currency', 'Reference', 'Channel', 'Status', 'Paid At', 'Period Start', 'Period End'];
    const lines = [header.map(neutralizeCsvCell).join(',')];
    for (const r of rows) {
      lines.push([
        r.id,
        r.worker_id,
        r.worker_name || '',
        (Number(r.amount_pesewas) / 100).toFixed(2),
        r.currency,
        r.paystack_reference,
        r.channel,
        r.status,
        r.paid_at,
        r.period_start,
        r.period_end,
      ].map(neutralizeCsvCell).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nkabom-payments.csv"');
    res.send(lines.join('\r\n'));
  }));

  router.get('/verifications', guard, asyncHandler(async (req, res) => {
    res.json({ items: await store.listAdminVerifications() });
  }));

  router.get('/verifications/:id/document', guard, asyncHandler(async (req, res) => {
    try {
      const doc = await store.getVerificationDocumentBytes(req.params.id);
      if (!doc || !doc.found || !doc.buffer) {
        return res.status(404).end();
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', doc.contentType || 'application/octet-stream');
      res.send(doc.buffer);
    } catch {
      res.status(400).end();
    }
  }));

  router.patch('/verifications/:id', guard, asyncHandler(async (req, res) => {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Verification status must be approved or rejected.' });
    }
    const adminNote = cleanPlainText(req.body?.adminNote, 240);
    const out = await store.reviewVerification({
      id: req.params.id,
      status,
      adminNote,
      nowIso: new Date().toISOString(),
    });
    if (!out.found) return res.status(404).json({ error: 'Verification request not found.' });
    res.json({ ok: true });
  }));

  router.get('/audit', guard, asyncHandler(async (req, res) => {
    res.json({ items: await store.listAdminAuditLogs() });
  }));

  router.post('/reminders/run', guard, asyncHandler(async (req, res) => {
    const summary = await runDailyRemindersJob(store);
    await store.logAdminAudit({ action: 'reminders.run', targetType: 'system', targetId: 'reminders', details: summary });
    res.json(summary);
  }));

  return router;
}

module.exports = { createAdminRouter };
