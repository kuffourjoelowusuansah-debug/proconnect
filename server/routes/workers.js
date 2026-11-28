const express = require('express');
const multer = require('multer');
const {
  getPlanConfig,
  validateWorkerInput,
  validateAvailabilityPatch,
  validateVerificationRequest,
  cleanPlainText,
} = require('../rules');
const { createRateLimiter } = require('../security');
const { inspectAndStripImage, MAX_IMAGE_BYTES } = require('../images');
const { requireUser } = require('../middleware');
const { isPaystackConfigured } = require('../paystack');
const { ensureStore, asyncHandler } = require('../store');

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

function createWorkersRouter(dbOrStore, uploadsDir, verificationsDir) {
  const store = ensureStore(dbOrStore, { uploadsDir, verificationsDir });
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

  publicRouter.get('/stats', asyncHandler(async (req, res) => {
    res.json(await store.getMarketplaceStats());
  }));

  publicRouter.get('/workers', asyncHandler(async (req, res) => {
    const rawIds = String(req.query.ids || '').trim();
    const ids = rawIds ? rawIds.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50) : null;
    const result = await store.listVisibleWorkers({
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
  }));

  publicRouter.get('/workers/:id', asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').trim();
    const dto = await store.getPublicWorker(id);
    if (!dto) {
      return res.status(404).json({ error: 'This profile is not available right now.' });
    }
    res.json(dto);
  }));

  publicRouter.post('/workers/:id/track', trackLimiter, asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').trim();
    const eventType = req.body?.type === 'wa_click' ? 'wa_click' : req.body?.type === 'view' ? 'view' : null;
    if (!eventType) return res.status(400).json({ error: 'Invalid event type.' });

    const tracked = await store.trackWorkerEvent({
      workerId: id,
      eventType,
      nowIso: new Date().toISOString(),
    });
    if (!tracked) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    res.status(201).json({ ok: true });
  }));

  publicRouter.post('/reports', asyncHandler(async (req, res) => {
    const workerId = cleanPlainText(req.body?.workerId, 80);
    const reason = cleanPlainText(req.body?.reason, 500);
    const contact = cleanPlainText(req.body?.contact, 120);

    if (!workerId) return res.status(400).json({ error: 'Missing professional profile id.' });
    if (reason.length < 5) return res.status(400).json({ error: 'Please describe the issue (at least 5 characters).' });

    const created = await store.createReport({
      workerId,
      reason,
      contact,
      nowIso: new Date().toISOString(),
    });
    if (!created) return res.status(404).json({ error: 'Profile not found.' });

    res.status(201).json({ ok: true, id: created.id });
  }));

  meWorkerRouter.get('/', requireUser, asyncHandler(async (req, res) => {
    res.json(await store.getMyWorker(req.user.id));
  }));

  meWorkerRouter.put('/', requireUser, asyncHandler(async (req, res) => {
    const parsed = validateWorkerInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { trialDays } = getPlanConfig();
    const resObj = await store.upsertMyWorker({
      userId: req.user.id,
      data: parsed.data,
      trialDays,
      now: new Date(),
    });
    res.status(resObj.created ? 201 : 200).json(resObj.worker);
  }));

  meWorkerRouter.patch('/availability', requireUser, asyncHandler(async (req, res) => {
    const parsed = validateAvailabilityPatch(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const out = await store.patchMyAvailability({
      userId: req.user.id,
      availability: parsed.data.availability,
      availabilityNote: parsed.data.availabilityNote,
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out.worker);
  }));

  meWorkerRouter.delete('/', requireUser, asyncHandler(async (req, res) => {
    await store.deleteMyWorker(req.user.id);
    res.json({ ok: true });
  }));

  meWorkerRouter.post('/photo', requireUser, handleMulter(upload.single('photo')), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file.' });
    }
    const checked = inspectAndStripImage(req.file.buffer);
    if (checked.error) return res.status(400).json({ error: checked.error });

    const out = await store.uploadWorkerPhoto({
      userId: req.user.id,
      buffer: checked.buffer,
      ext: checked.ext,
      mime: checked.mime,
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json({ url: out.url });
  }));

  meWorkerRouter.post('/portfolio', requireUser, handleMulter(upload.single('photo')), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file.' });
    }
    const checked = inspectAndStripImage(req.file.buffer);
    if (checked.error) return res.status(400).json({ error: checked.error });

    const title = cleanPlainText(req.body?.title, 60);
    const out = await store.addPortfolioPhoto({
      userId: req.user.id,
      buffer: checked.buffer,
      ext: checked.ext,
      mime: checked.mime,
      title,
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.status(201).json(out.item);
  }));

  meWorkerRouter.delete('/portfolio/:id', requireUser, asyncHandler(async (req, res) => {
    const out = await store.deletePortfolioPhoto({
      userId: req.user.id,
      itemId: req.params.id,
    });
    if (out.error) return res.status(out.status || 404).json({ error: out.error });
    res.json({ ok: true });
  }));

  meWorkerRouter.get('/analytics', requireUser, asyncHandler(async (req, res) => {
    res.json(await store.getWorkerAnalytics(req.user.id));
  }));

  meWorkerRouter.get('/verify-request', requireUser, asyncHandler(async (req, res) => {
    res.json(await store.getLatestVerificationRequest(req.user.id));
  }));

  meWorkerRouter.post('/verify-request', requireUser, handleMulter(upload.single('document')), asyncHandler(async (req, res) => {
    const parsed = validateVerificationRequest(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const { docType, docRef, notes } = parsed.data;

    let file = null;
    if (req.file) {
      const checked = inspectAndStripImage(req.file.buffer);
      if (checked.error) return res.status(400).json({ error: checked.error });
      file = checked;
    }

    const out = await store.createVerificationRequest({
      userId: req.user.id,
      docType,
      docRef,
      notes,
      file,
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.status(201).json({ latest: out.latest });
  }));

  meBookmarksRouter.get('/', requireUser, asyncHandler(async (req, res) => {
    res.json(await store.listBookmarks(req.user.id));
  }));

  meBookmarksRouter.post('/', requireUser, asyncHandler(async (req, res) => {
    const incoming = [];
    if (typeof req.body?.workerId === 'string') incoming.push(req.body.workerId.trim());
    if (Array.isArray(req.body?.workerIds)) {
      for (const v of req.body.workerIds.slice(0, 50)) {
        if (typeof v === 'string' && v.trim()) incoming.push(v.trim());
      }
    }
    res.json(await store.addBookmarks({
      userId: req.user.id,
      workerIds: incoming,
      nowIso: new Date().toISOString(),
    }));
  }));

  meBookmarksRouter.delete('/:workerId', requireUser, asyncHandler(async (req, res) => {
    const workerId = String(req.params.workerId || '').trim();
    const out = await store.removeBookmark({ userId: req.user.id, workerId });
    res.json({ ok: true, ids: out.ids });
  }));

  return { publicRouter, meWorkerRouter, meBookmarksRouter };
}

module.exports = { createWorkersRouter };
