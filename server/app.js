const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { attachSession } = require('./middleware');
const { csrfCheck, corsCheck } = require('./security');
const { resolveSafeUploadPath } = require('./images');
const { ensureStore, asyncHandler } = require('./store');
const { runDailyRemindersJob } = require('./notifications');
const { createAuthRouter } = require('./routes/auth');
const { createWorkersRouter } = require('./routes/workers');
const { createBillingRouter } = require('./routes/billing');
const { createReviewsRouter } = require('./routes/reviews');
const { createAdminRouter } = require('./routes/admin');
const { createClientPassRouter } = require('./routes/client-pass');
const { renderWorkerMetaHtml } = require('./meta');

function safeBearerMatch(authHeader, secret) {
  if (!secret || !authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authHeader.slice(7).trim(), 'utf8');
  const expected = Buffer.from(String(secret).trim(), 'utf8');
  if (!expected.length || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

function createApp({ db, store: explicitStore, uploadsDir, verificationsDir, staticDir }) {
  const app = express();
  app.set('trust proxy', true);

  const rootStatic = staticDir || path.resolve(__dirname, '..');
  const safeUploadsDir = uploadsDir || path.resolve(__dirname, '..', 'uploads');
  const safeVerificationsDir = verificationsDir || path.resolve(__dirname, '..', 'data', 'verifications');

  const store = ensureStore(explicitStore || db, {
    uploadsDir: safeUploadsDir,
    verificationsDir: safeVerificationsDir,
  });

  if (store.mode === 'sqlite') {
    fs.mkdirSync(safeUploadsDir, { recursive: true });
    fs.mkdirSync(safeVerificationsDir, { recursive: true });
  }

  const { meBillingRouter, paystackWebhookHandler } = createBillingRouter(store);

  // Paystack webhook requires raw body for HMAC SHA-512 signature verification
  app.post('/api/webhooks/paystack', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(paystackWebhookHandler));

  app.use(corsCheck);
  app.use(express.json({ limit: '1mb' }));
  app.use(csrfCheck);

  // Authenticated Vercel Cron / scheduled reminder endpoint
  app.get('/api/cron/reminders', asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!safeBearerMatch(req.headers.authorization, secret)) {
      return res.status(401).json({ error: 'Unauthorized cron request.' });
    }
    const summary = await runDailyRemindersJob(store);
    res.json({ ok: true, ...summary });
  }));

  app.use(attachSession(store));

  const { authRouter, meRouter } = createAuthRouter(store, safeUploadsDir, safeVerificationsDir);
  const { publicRouter, meWorkerRouter, meBookmarksRouter } = createWorkersRouter(store, safeUploadsDir, safeVerificationsDir);
  const { meInvitesRouter, publicInvitesRouter } = createReviewsRouter(store);
  const adminRouter = createAdminRouter(store, safeUploadsDir, safeVerificationsDir);
  const clientPassRouter = createClientPassRouter(store);

  app.use('/api/auth', authRouter);
  app.use('/api/client-pass', clientPassRouter);
  app.use('/api/me/bookmarks', meBookmarksRouter);
  app.use('/api/me/worker', meWorkerRouter);
  app.use('/api/me/billing', meBillingRouter);
  app.use('/api/me/invites', meInvitesRouter);
  app.use('/api/me', meRouter);
  app.use('/api/invites', publicInvitesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);

  // Safe local image upload serving with path-traversal confinement
  app.get('/uploads/:userId/:filename', (req, res) => {
    if (store.mode !== 'sqlite') {
      return res.status(404).end();
    }
    try {
      const target = resolveSafeUploadPath(safeUploadsDir, req.params.userId, req.params.filename);
      if (!fs.existsSync(target)) {
        return res.status(404).end();
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(target);
    } catch {
      res.status(400).end();
    }
  });

  // Protect server, data, supabase, config, and env paths from static access
  app.use(['/server', '/data', '/supabase', '/package.json', '/package-lock.json', '/vercel.json', '/.env', '/.env.example'], (req, res) => {
    res.status(404).end();
  });

  app.get(['/pro/:slug', '/w/:id'], asyncHandler(async (req, res) => {
    const key = String(req.params.slug || req.params.id || '').trim();
    const indexPath = path.join(rootStatic, 'index.html');
    const baseHtml = fs.readFileSync(indexPath, 'utf8');
    const worker = key ? await store.getPublicWorker(key) : null;
    const host = req.get('x-forwarded-host') || req.get('host');
    const origin = process.env.SITE_URL || (host ? `${req.protocol}://${host}` : '');
    const rendered = renderWorkerMetaHtml(baseHtml, {
      worker,
      origin,
      requestedSlug: key,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(worker ? 200 : 404).send(rendered);
  }));

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(rootStatic, 'admin.html'));
  });

  app.use(express.static(rootStatic, { index: 'index.html' }));

  app.use((err, req, res, next) => {
    console.error('[Nkabom API Error]', err && err.message ? err.message : err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    res.sendFile(path.join(rootStatic, 'index.html'));
  });

  return app;
}

module.exports = { createApp };
