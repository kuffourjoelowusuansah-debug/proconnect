const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const {
  computeSubscriptionStatus,
  computeExtendedPaidUntil,
  cleanPlainText,
  neutralizeCsvCell,
  DAY_MS,
} = require('../rules');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  setSessionCookie,
  clearSessionCookie,
  createRateLimiter,
} = require('../security');
const { ADMIN_COOKIE, ADMIN_TTL_SECONDS, requireAdmin } = require('../middleware');
const { resolveSafeUploadPath } = require('../images');
const { logAdminAudit } = require('../db');
const { runDailyRemindersJob } = require('../notifications');

function safeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminRouter(db, uploadsDir, verificationsDir) {
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

  function getStoredPasscodeHash() {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get();
    return row ? row.value : null;
  }

  function isAdminCookieValid(req) {
    const rawCookie = req.headers.cookie || '';
    const match = rawCookie.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${ADMIN_COOKIE}=`));
    if (!match) return false;
    const token = decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1));
    const row = db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').get(hashToken(token));
    return Boolean(row && new Date(row.expires_at).getTime() > Date.now());
  }

  function createAdminSession(res) {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ADMIN_TTL_SECONDS * 1000).toISOString();
    db.prepare('INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)').run(
      tokenHash,
      expiresAt,
      nowIso
    );
    setSessionCookie(res, ADMIN_COOKIE, raw, ADMIN_TTL_SECONDS);
  }

  router.get('/status', (req, res) => {
    const envCode = getEnvPasscode();
    const storedHash = getStoredPasscodeHash();
    res.json({
      authenticated: isAdminCookieValid(req),
      needsBootstrap: !envCode && !storedHash,
      envConfigured: Boolean(envCode),
    });
  });

  router.post('/bootstrap', adminLimiter, (req, res) => {
    if (getEnvPasscode()) {
      return res.status(409).json({ error: 'Admin passcode is configured via environment variables.' });
    }

    const passcode = String(req.body?.passcode || '');
    if (passcode.length < 8 || passcode.length > 128) {
      return res.status(400).json({ error: 'Choose an admin password of at least 8 characters.' });
    }

    const hashed = hashPassword(passcode);

    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get();
      if (existing) {
        db.exec('ROLLBACK');
        return res.status(409).json({ error: 'Admin password has already been claimed. Please sign in.' });
      }
      db.prepare("INSERT INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)").run(hashed);
      logAdminAudit(db, { action: 'admin.bootstrap', targetType: 'system', targetId: 'admin', details: {} });
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }

    createAdminSession(res);
    res.status(201).json({ ok: true });
  });

  router.post('/login', adminLimiter, (req, res) => {
    const passcode = String(req.body?.passcode || '');
    if (!passcode) return res.status(400).json({ error: 'Please enter the admin password.' });

    const envCode = getEnvPasscode();
    const storedHash = getStoredPasscodeHash();

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

    createAdminSession(res);
    res.json({ ok: true });
  });

  router.post('/logout', (req, res) => {
    const rawCookie = req.headers.cookie || '';
    const match = rawCookie.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${ADMIN_COOKIE}=`));
    if (match) {
      const token = decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1));
      db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
    }
    clearSessionCookie(res, ADMIN_COOKIE);
    res.json({ ok: true });
  });

  const guard = requireAdmin(db);

  router.get('/overview', guard, (req, res) => {
    const now = new Date();
    const workers = db.prepare(`
      SELECT w.id, w.status, s.trial_ends_at, s.paid_until
      FROM workers w
      LEFT JOIN subscriptions s ON s.worker_id = w.id
    `).all();

    let activeCount = 0;
    let trialCount = 0;
    let expiredCount = 0;
    let hiddenCount = 0;
    let suspendedCount = 0;

    for (const w of workers) {
      if (w.status === 'hidden') hiddenCount += 1;
      if (w.status === 'suspended') suspendedCount += 1;
      const sub = computeSubscriptionStatus(w, now);
      if (!sub || sub.status === 'expired') expiredCount += 1;
      else if (sub.status === 'trial') {
        trialCount += 1;
        if (w.status === 'active') activeCount += 1;
      } else if (sub.status === 'active') {
        if (w.status === 'active') activeCount += 1;
      }
    }

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const payStats = db.prepare(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(amount_pesewas), 0) AS total_pesewas
      FROM payments
      WHERE status = 'success' AND paid_at >= ?
    `).get(monthStart);

    const openReports = db.prepare("SELECT COUNT(*) AS cnt FROM reports WHERE status = 'open'").get().cnt;
    const pendingVerifications = db.prepare("SELECT COUNT(*) AS cnt FROM verification_requests WHERE status = 'pending'").get().cnt;

    res.json({
      totalWorkers: workers.length,
      activeWorkers: activeCount,
      trialWorkers: trialCount,
      expiredWorkers: expiredCount,
      hiddenWorkers: hiddenCount,
      suspendedWorkers: suspendedCount,
      paymentsThisMonthCount: Number(payStats.cnt || 0),
      paymentsThisMonthPesewas: Number(payStats.total_pesewas || 0),
      openReports: Number(openReports || 0),
      pendingVerifications: Number(pendingVerifications || 0),
    });
  });

  router.get('/workers', guard, (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const now = new Date();
    const rows = db.prepare(`
      SELECT w.*, u.email AS user_email, s.trial_ends_at, s.paid_until,
        (SELECT COUNT(*) FROM feedback f WHERE f.worker_id = w.id AND f.status = 'published' AND f.rating IS NOT NULL) AS reviews,
        (SELECT COALESCE(SUM(CASE WHEN f.blaze = 1 THEN 1 ELSE 0 END), 0) FROM feedback f WHERE f.worker_id = w.id AND f.status = 'published') AS blazes
      FROM workers w
      JOIN users u ON u.id = w.user_id
      LEFT JOIN subscriptions s ON s.worker_id = w.id
      ORDER BY w.created_at DESC
    `).all();

    const list = rows
      .filter((r) => !q || `${r.name} ${r.category} ${r.area} ${r.phone} ${r.user_email}`.toLowerCase().includes(q))
      .map((r) => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        type: r.type,
        category: r.category,
        area: r.area,
        phone: r.phone,
        email: r.user_email,
        years: r.years,
        verified: Boolean(r.verified),
        status: r.status,
        reviews: Number(r.reviews || 0),
        blazes: Number(r.blazes || 0),
        subscription: computeSubscriptionStatus(r, now),
        createdAt: r.created_at,
      }));

    res.json({ items: list });
  });

  router.patch('/workers/:id', guard, (req, res) => {
    const id = req.params.id;
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    const updates = [];
    const params = [];
    const changes = {};

    if (typeof req.body?.verified === 'boolean') {
      updates.push('verified = ?');
      params.push(req.body.verified ? 1 : 0);
      changes.verified = req.body.verified;
    }
    if (req.body?.status && ['active', 'hidden', 'suspended'].includes(req.body.status)) {
      updates.push('status = ?');
      params.push(req.body.status);
      changes.status = req.body.status;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString(), id);

    db.prepare(`UPDATE workers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logAdminAudit(db, { action: 'worker.update', targetType: 'worker', targetId: id, details: changes });
    res.json({ ok: true });
  });

  router.delete('/workers/:id', guard, (req, res) => {
    const id = req.params.id;
    const worker = db.prepare('SELECT id, name, photo_path FROM workers WHERE id = ?').get(id);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    const portfolioRows = db.prepare('SELECT storage_path FROM portfolio_items WHERE worker_id = ?').all(id);
    const verifRows = db.prepare('SELECT doc_path FROM verification_requests WHERE worker_id = ?').all(id);
    db.prepare('DELETE FROM workers WHERE id = ?').run(id);
    logAdminAudit(db, { action: 'worker.delete', targetType: 'worker', targetId: id, details: { name: worker.name } });

    if (uploadsDir) {
      for (const rel of [worker.photo_path, ...portfolioRows.map((p) => p.storage_path)].filter(Boolean)) {
        try {
          const target = resolveSafeUploadPath(uploadsDir, rel);
          fs.rmSync(target, { force: true });
        } catch {}
      }
    }
    if (verificationsDir) {
      for (const vr of verifRows) {
        if (!vr.doc_path) continue;
        try {
          const target = resolveSafeUploadPath(verificationsDir, vr.doc_path);
          fs.rmSync(target, { force: true });
        } catch {}
      }
    }
    res.json({ ok: true });
  });

  router.post('/workers/:id/extend', guard, (req, res) => {
    const id = req.params.id;
    const days = Math.min(365, Math.max(1, Number.parseInt(req.body?.days || '30', 10) || 30));
    const worker = db.prepare('SELECT id, name FROM workers WHERE id = ?').get(id);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });

    const now = new Date();
    const nowIso = now.toISOString();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(id);
    const newPaidUntil = computeExtendedPaidUntil(sub ? sub.paid_until : nowIso, now, days);

    if (sub) {
      db.prepare('UPDATE subscriptions SET paid_until = ?, updated_at = ? WHERE worker_id = ?').run(newPaidUntil, nowIso, id);
    } else {
      db.prepare('INSERT INTO subscriptions (worker_id, trial_ends_at, paid_until, updated_at) VALUES (?, ?, ?, ?)').run(
        id,
        nowIso,
        newPaidUntil,
        nowIso
      );
    }

    logAdminAudit(db, {
      action: 'subscription.extend',
      targetType: 'worker',
      targetId: id,
      details: { days, newPaidUntil, workerName: worker.name },
    });

    res.json({ ok: true, paidUntil: newPaidUntil });
  });

  router.get('/feedback', guard, (req, res) => {
    const rows = db.prepare(`
      SELECT f.*, w.name AS worker_name, w.category
      FROM feedback f
      JOIN workers w ON w.id = f.worker_id
      ORDER BY f.created_at DESC
      LIMIT 200
    `).all();
    res.json({ items: rows });
  });

  router.patch('/feedback/:id', guard, (req, res) => {
    const status = req.body?.status;
    if (!['published', 'hidden', 'removed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid feedback status.' });
    }
    const row = db.prepare('SELECT id, worker_id FROM feedback WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Feedback not found.' });

    db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, row.id);
    logAdminAudit(db, { action: 'feedback.moderate', targetType: 'feedback', targetId: row.id, details: { status, workerId: row.worker_id } });
    res.json({ ok: true });
  });

  router.get('/reports', guard, (req, res) => {
    const rows = db.prepare(`
      SELECT r.*, w.name AS worker_name, w.status AS worker_status
      FROM reports r
      JOIN workers w ON w.id = r.worker_id
      ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 200
    `).all();
    res.json({ items: rows });
  });

  router.patch('/reports/:id', guard, (req, res) => {
    const status = req.body?.status;
    if (!['open', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }
    const row = db.prepare('SELECT id FROM reports WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Report not found.' });

    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, row.id);
    logAdminAudit(db, { action: 'report.update', targetType: 'report', targetId: row.id, details: { status } });
    res.json({ ok: true });
  });

  router.get('/payments', guard, (req, res) => {
    const rows = db.prepare(`
      SELECT p.id, p.worker_id, w.name AS worker_name, p.amount_pesewas, p.currency, p.paystack_reference, p.channel, p.status, p.paid_at, p.period_start, p.period_end
      FROM payments p
      LEFT JOIN workers w ON w.id = p.worker_id
      ORDER BY p.paid_at DESC
      LIMIT 250
    `).all();
    res.json({ items: rows });
  });

  router.get('/payments.csv', guard, (req, res) => {
    const rows = db.prepare(`
      SELECT p.id, p.worker_id, w.name AS worker_name, p.amount_pesewas, p.currency, p.paystack_reference, p.channel, p.status, p.paid_at, p.period_start, p.period_end
      FROM payments p
      LEFT JOIN workers w ON w.id = p.worker_id
      ORDER BY p.paid_at DESC
    `).all();

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
  });

  router.get('/verifications', guard, (req, res) => {
    const rows = db.prepare(`
      SELECT vr.id, vr.worker_id, vr.doc_type, vr.doc_ref, vr.doc_path, vr.notes, vr.status, vr.admin_note, vr.created_at, vr.reviewed_at,
        w.name AS worker_name, w.category, w.area, w.phone, w.verified AS worker_verified
      FROM verification_requests vr
      JOIN workers w ON w.id = vr.worker_id
      ORDER BY CASE WHEN vr.status = 'pending' THEN 0 ELSE 1 END, vr.created_at DESC
      LIMIT 200
    `).all();
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        workerName: r.worker_name,
        category: r.category,
        area: r.area,
        phone: r.phone,
        workerVerified: Boolean(r.worker_verified),
        docType: r.doc_type,
        docRef: r.doc_ref,
        hasDocument: Boolean(r.doc_path),
        notes: r.notes,
        status: r.status,
        adminNote: r.admin_note || '',
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at || null,
      })),
    });
  });

  router.get('/verifications/:id/document', guard, (req, res) => {
    const row = db.prepare('SELECT id, doc_path FROM verification_requests WHERE id = ?').get(req.params.id);
    if (!row || !row.doc_path || !verificationsDir) {
      return res.status(404).end();
    }
    try {
      const target = resolveSafeUploadPath(verificationsDir, row.doc_path);
      if (!fs.existsSync(target)) return res.status(404).end();
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(target);
    } catch {
      res.status(400).end();
    }
  });

  router.patch('/verifications/:id', guard, (req, res) => {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Verification status must be approved or rejected.' });
    }
    const adminNote = cleanPlainText(req.body?.adminNote, 240);
    const row = db.prepare('SELECT id, worker_id, status FROM verification_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Verification request not found.' });

    const nowIso = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE verification_requests SET status = ?, admin_note = ?, reviewed_at = ? WHERE id = ?').run(
        status,
        adminNote,
        nowIso,
        row.id
      );
      if (status === 'approved') {
        db.prepare('UPDATE workers SET verified = 1, updated_at = ? WHERE id = ?').run(nowIso, row.worker_id);
      }
      logAdminAudit(db, {
        action: `verification.${status}`,
        targetType: 'verification',
        targetId: row.id,
        details: { workerId: row.worker_id, adminNote },
      });
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }

    res.json({ ok: true });
  });

  router.get('/audit', guard, (req, res) => {
    const rows = db.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 150').all();
    res.json({ items: rows });
  });

  router.post('/reminders/run', guard, async (req, res) => {
    const summary = await runDailyRemindersJob(db);
    logAdminAudit(db, { action: 'reminders.run', targetType: 'system', targetId: 'reminders', details: summary });
    res.json(summary);
  });

  return router;
}

module.exports = { createAdminRouter };
