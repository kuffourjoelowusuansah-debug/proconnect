const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const {
  getPlanConfig,
  validateWorkerInput,
  validateVerificationRequest,
  computeProfileStrength,
  normalizePhoneDigits,
  cleanPlainText,
  isWorkerVisible,
  DAY_MS,
} = require('../rules');
const { generateToken, createRateLimiter } = require('../security');
const { inspectAndStripImage, resolveSafeUploadPath, MAX_IMAGE_BYTES } = require('../images');
const { buildWorkerDTO, listVisibleWorkers, getMarketplaceStats } = require('../db');
const { requireUser } = require('../middleware');
const { isPaystackConfigured } = require('../paystack');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

function handleMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Image must be 2 MB or smaller.' });
        }
        return res.status(400).json({ error: err.message || 'Upload failed.' });
      }
      next();
    });
  };
}

function createWorkersRouter(db, uploadsDir, verificationsDir) {
  const publicRouter = express.Router();
  const meWorkerRouter = express.Router();
  const meBookmarksRouter = express.Router();

  const trackLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 90,
    keyFn: (req) => `trk:${req.ip}`,
    message: 'Too many analytics requests.',
  });

  publicRouter.get('/config', (req, res) => {
    const plan = getPlanConfig();
    res.json({
      plan: { price: plan.priceGhs, trialDays: plan.trialDays },
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      paystackConfigured: isPaystackConfigured(),
    });
  });

  publicRouter.get('/stats', (req, res) => {
    res.json(getMarketplaceStats(db));
  });

  publicRouter.get('/workers', (req, res) => {
    const rawIds = String(req.query.ids || '').trim();
    const ids = rawIds ? rawIds.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50) : null;
    const result = listVisibleWorkers(db, {
      q: req.query.q || '',
      category: req.query.category || '',
      area: req.query.area || '',
      verifiedOnly: req.query.verifiedOnly === '1' || req.query.verifiedOnly === 'true',
      availableOnly: req.query.availableOnly === '1' || req.query.availableOnly === 'true',
      minRating: Number(req.query.minRating || 0),
      ids,
      sort: req.query.sort || 'rating',
      page: Number(req.query.page || 1),
      pageSize: ids ? 50 : 12,
    });
    res.json(result);
  });

  publicRouter.get('/workers/:id', (req, res) => {
    const id = String(req.params.id || '').trim();
    const row = db.prepare(`
      SELECT w.*, s.trial_ends_at, s.paid_until
      FROM workers w
      LEFT JOIN subscriptions s ON s.worker_id = w.id
      WHERE w.id = ?
    `).get(id);

    if (!row || !isWorkerVisible(row, row, new Date())) {
      return res.status(404).json({ error: 'This profile is not available right now.' });
    }
    res.json(buildWorkerDTO(db, row));
  });

  publicRouter.post('/workers/:id/track', trackLimiter, (req, res) => {
    const id = String(req.params.id || '').trim();
    const eventType = req.body?.type === 'wa_click' ? 'wa_click' : req.body?.type === 'view' ? 'view' : null;
    if (!eventType) return res.status(400).json({ error: 'Invalid event type.' });

    const row = db.prepare(`
      SELECT w.id, w.status, s.trial_ends_at, s.paid_until
      FROM workers w
      LEFT JOIN subscriptions s ON s.worker_id = w.id
      WHERE w.id = ?
    `).get(id);
    if (!row || !isWorkerVisible(row, row, new Date())) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const evtId = 'evt_' + generateToken(10);
    db.prepare(`
      INSERT INTO worker_events (id, worker_id, event_type, created_at)
      VALUES (?, ?, ?, ?)
    `).run(evtId, row.id, eventType, new Date().toISOString());

    res.status(201).json({ ok: true });
  });

  publicRouter.post('/reports', (req, res) => {
    const workerId = cleanPlainText(req.body?.workerId, 80);
    const reason = cleanPlainText(req.body?.reason, 500);
    const contact = cleanPlainText(req.body?.contact, 120);

    if (!workerId) return res.status(400).json({ error: 'Missing professional profile id.' });
    if (reason.length < 5) return res.status(400).json({ error: 'Please describe the issue (at least 5 characters).' });

    const exists = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
    if (!exists) return res.status(404).json({ error: 'Profile not found.' });

    const id = 'rep_' + generateToken(10);
    db.prepare(`
      INSERT INTO reports (id, worker_id, reporter_contact, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'open', ?)
    `).run(id, workerId, contact, reason, new Date().toISOString());

    res.status(201).json({ ok: true, id });
  });

  meWorkerRouter.get('/', requireUser, (req, res) => {
    const row = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (!row) return res.json(null);
    res.json(buildWorkerDTO(db, row));
  });

  meWorkerRouter.put('/', requireUser, (req, res) => {
    const parsed = validateWorkerInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const data = parsed.data;
    const now = new Date();
    const nowIso = now.toISOString();

    const existing = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare(`
        UPDATE workers
        SET type = ?, name = ?, category = ?, area = ?, phone = ?, years = ?, bio = ?, availability = ?, rate_note = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        data.type,
        data.name,
        data.category,
        data.area,
        data.phone,
        data.years,
        data.bio,
        data.availability,
        data.rateNote,
        nowIso,
        existing.id,
        req.user.id
      );

      const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(existing.id);
      return res.json(buildWorkerDTO(db, updated));
    }

    const { trialDays } = getPlanConfig();
    const normPhone = normalizePhoneDigits(data.phone);
    const userRow = db.prepare('SELECT trial_claimed_at FROM users WHERE id = ?').get(req.user.id);
    const phoneUsedTrial = normPhone
      ? db.prepare('SELECT user_id FROM trial_phone_claims WHERE normalized_phone = ?').get(normPhone)
      : null;

    const alreadyClaimed = Boolean(userRow?.trial_claimed_at) || Boolean(phoneUsedTrial);
    const trialEndsAt = alreadyClaimed
      ? nowIso
      : new Date(now.getTime() + trialDays * DAY_MS).toISOString();

    const workerId = 'w_' + generateToken(10);
    const tint = Math.floor(Math.random() * 6);

    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        INSERT INTO workers (id, user_id, type, name, category, area, phone, years, bio, availability, rate_note, photo_url, photo_path, verified, status, tint, published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 'active', ?, ?, ?, ?)
      `).run(
        workerId,
        req.user.id,
        data.type,
        data.name,
        data.category,
        data.area,
        data.phone,
        data.years,
        data.bio,
        data.availability,
        data.rateNote,
        tint,
        nowIso,
        nowIso,
        nowIso
      );

      db.prepare(`
        INSERT INTO subscriptions (worker_id, trial_ends_at, paid_until, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(workerId, trialEndsAt, trialEndsAt, nowIso);

      if (!alreadyClaimed) {
        db.prepare('UPDATE users SET trial_claimed_at = ? WHERE id = ? AND trial_claimed_at IS NULL').run(nowIso, req.user.id);
      }

      if (normPhone && !phoneUsedTrial) {
        db.prepare('INSERT OR IGNORE INTO trial_phone_claims (normalized_phone, user_id, claimed_at) VALUES (?, ?, ?)').run(
          normPhone,
          req.user.id,
          nowIso
        );
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const created = db.prepare('SELECT * FROM workers WHERE id = ?').get(workerId);
    res.status(201).json(buildWorkerDTO(db, created));
  });

  meWorkerRouter.delete('/', requireUser, (req, res) => {
    const existing = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (!existing) return res.json({ ok: true });

    const portfolioRows = db.prepare('SELECT storage_path FROM portfolio_items WHERE worker_id = ?').all(existing.id);
    const verifRows = db.prepare('SELECT doc_path FROM verification_requests WHERE worker_id = ?').all(existing.id);
    db.prepare('DELETE FROM workers WHERE id = ? AND user_id = ?').run(existing.id, req.user.id);

    const filesToDelete = [existing.photo_path, ...portfolioRows.map((r) => r.storage_path)].filter(Boolean);
    for (const rel of filesToDelete) {
      try {
        const target = resolveSafeUploadPath(uploadsDir, rel);
        fs.rmSync(target, { force: true });
      } catch {}
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

  meWorkerRouter.post('/photo', requireUser, handleMulter(upload.single('photo')), (req, res) => {
    const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Save your worker profile first before uploading a photo.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file.' });
    }

    const result = inspectAndStripImage(req.file.buffer);
    if (result.error) return res.status(400).json({ error: result.error });

    const filename = `profile_${generateToken(8)}.${result.ext}`;
    const relPath = path.join(req.user.id, filename);
    const fullPath = resolveSafeUploadPath(uploadsDir, req.user.id, filename);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, result.buffer);

    if (worker.photo_path) {
      try {
        fs.rmSync(resolveSafeUploadPath(uploadsDir, worker.photo_path), { force: true });
      } catch {}
    }

    const url = `/uploads/${encodeURIComponent(req.user.id)}/${encodeURIComponent(filename)}`;
    db.prepare('UPDATE workers SET photo_url = ?, photo_path = ?, updated_at = ? WHERE id = ?').run(
      url,
      relPath,
      new Date().toISOString(),
      worker.id
    );

    res.json({ url });
  });

  meWorkerRouter.post('/portfolio', requireUser, handleMulter(upload.single('photo')), (req, res) => {
    const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Save your worker profile first before adding portfolio photos.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file.' });
    }

    const count = db.prepare('SELECT COUNT(*) AS cnt FROM portfolio_items WHERE worker_id = ?').get(worker.id).cnt;
    if (count >= 12) {
      return res.status(400).json({ error: 'You can upload up to 12 portfolio photos.' });
    }

    const result = inspectAndStripImage(req.file.buffer);
    if (result.error) return res.status(400).json({ error: result.error });

    const title = cleanPlainText(req.body?.title, 60);
    const filename = `port_${generateToken(8)}.${result.ext}`;
    const relPath = path.join(req.user.id, filename);
    const fullPath = resolveSafeUploadPath(uploadsDir, req.user.id, filename);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, result.buffer);

    const item = {
      id: 'pf_' + generateToken(10),
      worker_id: worker.id,
      image_url: `/uploads/${encodeURIComponent(req.user.id)}/${encodeURIComponent(filename)}`,
      storage_path: relPath,
      title,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO portfolio_items (id, worker_id, image_url, storage_path, title, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(item.id, item.worker_id, item.image_url, item.storage_path, item.title, item.created_at);

    res.status(201).json({
      id: item.id,
      image_url: item.image_url,
      title: item.title,
      created_at: item.created_at,
    });
  });

  meWorkerRouter.delete('/portfolio/:id', requireUser, (req, res) => {
    const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) return res.status(404).json({ error: 'Worker profile not found.' });

    const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND worker_id = ?').get(req.params.id, worker.id);
    if (!item) return res.status(404).json({ error: 'Portfolio photo not found.' });

    db.prepare('DELETE FROM portfolio_items WHERE id = ? AND worker_id = ?').run(item.id, worker.id);
    try {
      fs.rmSync(resolveSafeUploadPath(uploadsDir, item.storage_path), { force: true });
    } catch {}

    res.json({ ok: true });
  });

  meWorkerRouter.get('/analytics', requireUser, (req, res) => {
    const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.json({
        totalViews: 0,
        totalWaClicks: 0,
        views7d: 0,
        waClicks7d: 0,
        inviteCount: 0,
        usedInviteCount: 0,
        strength: computeProfileStrength(null, { portfolioCount: 0, inviteCount: 0 }),
      });
    }

    const since7d = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const evtAgg = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END), 0) AS total_views,
        COALESCE(SUM(CASE WHEN event_type = 'wa_click' THEN 1 ELSE 0 END), 0) AS total_wa_clicks,
        COALESCE(SUM(CASE WHEN event_type = 'view' AND created_at >= ? THEN 1 ELSE 0 END), 0) AS views_7d,
        COALESCE(SUM(CASE WHEN event_type = 'wa_click' AND created_at >= ? THEN 1 ELSE 0 END), 0) AS wa_clicks_7d
      FROM worker_events
      WHERE worker_id = ?
    `).get(since7d, since7d, worker.id);

    const invAgg = db.prepare(`
      SELECT
        COUNT(*) AS invite_count,
        COALESCE(SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS used_invite_count
      FROM feedback_invites
      WHERE worker_id = ?
    `).get(worker.id);

    const portfolioCount = db.prepare('SELECT COUNT(*) AS cnt FROM portfolio_items WHERE worker_id = ?').get(worker.id).cnt;

    res.json({
      totalViews: Number(evtAgg.total_views || 0),
      totalWaClicks: Number(evtAgg.total_wa_clicks || 0),
      views7d: Number(evtAgg.views_7d || 0),
      waClicks7d: Number(evtAgg.wa_clicks_7d || 0),
      inviteCount: Number(invAgg.invite_count || 0),
      usedInviteCount: Number(invAgg.used_invite_count || 0),
      strength: computeProfileStrength(worker, {
        portfolioCount: Number(portfolioCount || 0),
        inviteCount: Number(invAgg.invite_count || 0),
      }),
    });
  });

  function formatVerificationDTO(row) {
    if (!row) return null;
    return {
      id: row.id,
      docType: row.doc_type,
      docRef: row.doc_ref,
      hasDocument: Boolean(row.doc_path),
      notes: row.notes,
      status: row.status,
      adminNote: row.admin_note || '',
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at || null,
    };
  }

  meWorkerRouter.get('/verify-request', requireUser, (req, res) => {
    const worker = db.prepare('SELECT id, verified FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) return res.json({ latest: null });
    const row = db.prepare(`
      SELECT * FROM verification_requests
      WHERE worker_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(worker.id);
    res.json({ latest: formatVerificationDTO(row) });
  });

  meWorkerRouter.post('/verify-request', requireUser, handleMulter(upload.single('document')), (req, res) => {
    const worker = db.prepare('SELECT id, verified FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Publish your worker profile first before requesting verification.' });
    }
    if (worker.verified) {
      return res.status(409).json({ error: 'Your profile is already ID verified.' });
    }

    const pending = db.prepare("SELECT id FROM verification_requests WHERE worker_id = ? AND status = 'pending'").get(worker.id);
    if (pending) {
      return res.status(409).json({ error: 'You already have a verification request awaiting review.' });
    }

    const parsed = validateVerificationRequest(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { docType, docRef, notes } = parsed.data;

    let docRelPath = null;
    if (req.file) {
      if (!verificationsDir) {
        return res.status(500).json({ error: 'Verification document storage is not configured.' });
      }
      const checked = inspectAndStripImage(req.file.buffer);
      if (checked.error) return res.status(400).json({ error: checked.error });
      const filename = `id_${generateToken(10)}.${checked.ext}`;
      docRelPath = path.join(req.user.id, filename);
      const fullPath = resolveSafeUploadPath(verificationsDir, req.user.id, filename);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, checked.buffer);
    } else if (!docRef) {
      return res.status(400).json({ error: 'Please enter your document reference number or upload an ID photo.' });
    }

    const id = 'vr_' + generateToken(10);
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO verification_requests (id, worker_id, doc_type, doc_ref, doc_path, notes, status, admin_note, created_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?, NULL)
    `).run(id, worker.id, docType, docRef, docRelPath, notes, nowIso);

    const created = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(id);
    res.status(201).json({ latest: formatVerificationDTO(created) });
  });

  function listUserBookmarkIds(userId) {
    return db.prepare('SELECT worker_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((r) => r.worker_id);
  }

  meBookmarksRouter.get('/', requireUser, (req, res) => {
    const ids = listUserBookmarkIds(req.user.id);
    const items = ids.length ? listVisibleWorkers(db, { ids, page: 1, pageSize: 50 }).items : [];
    res.json({ ids, items });
  });

  meBookmarksRouter.post('/', requireUser, (req, res) => {
    const incoming = [];
    if (typeof req.body?.workerId === 'string') incoming.push(req.body.workerId.trim());
    if (Array.isArray(req.body?.workerIds)) {
      for (const v of req.body.workerIds.slice(0, 50)) {
        if (typeof v === 'string' && v.trim()) incoming.push(v.trim());
      }
    }
    const nowIso = new Date().toISOString();
    for (const workerId of incoming) {
      const exists = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
      if (exists) {
        db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, worker_id, created_at) VALUES (?, ?, ?)').run(
          req.user.id,
          workerId,
          nowIso
        );
      }
    }
    const ids = listUserBookmarkIds(req.user.id);
    res.json({ ids });
  });

  meBookmarksRouter.delete('/:workerId', requireUser, (req, res) => {
    const workerId = String(req.params.workerId || '').trim();
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND worker_id = ?').run(req.user.id, workerId);
    const ids = listUserBookmarkIds(req.user.id);
    res.json({ ok: true, ids });
  });

  return { publicRouter, meWorkerRouter, meBookmarksRouter };
}

module.exports = { createWorkersRouter };
