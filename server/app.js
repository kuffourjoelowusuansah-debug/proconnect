const fs = require('fs');
const path = require('path');
const express = require('express');
const { attachSession } = require('./middleware');
const { csrfCheck, corsCheck } = require('./security');
const { resolveSafeUploadPath } = require('./images');
const { createAuthRouter } = require('./routes/auth');
const { createWorkersRouter } = require('./routes/workers');
const { createBillingRouter } = require('./routes/billing');
const { createReviewsRouter } = require('./routes/reviews');
const { createAdminRouter } = require('./routes/admin');

function createApp({ db, uploadsDir, verificationsDir, staticDir }) {
  const app = express();
  app.set('trust proxy', true);

  const rootStatic = staticDir || path.resolve(__dirname, '..');
  const safeUploadsDir = uploadsDir || path.resolve(__dirname, '..', 'uploads');
  const safeVerificationsDir = verificationsDir || path.resolve(__dirname, '..', 'data', 'verifications');
  fs.mkdirSync(safeUploadsDir, { recursive: true });
  fs.mkdirSync(safeVerificationsDir, { recursive: true });

  const { meBillingRouter, paystackWebhookHandler } = createBillingRouter(db);

  // Paystack webhook requires raw body for HMAC SHA-512 signature verification
  app.post('/api/webhooks/paystack', express.raw({ type: 'application/json', limit: '1mb' }), paystackWebhookHandler);

  app.use(corsCheck);
  app.use(express.json({ limit: '1mb' }));
  app.use(csrfCheck);
  app.use(attachSession(db));

  const { authRouter, meRouter } = createAuthRouter(db, safeUploadsDir, safeVerificationsDir);
  const { publicRouter, meWorkerRouter, meBookmarksRouter } = createWorkersRouter(db, safeUploadsDir, safeVerificationsDir);
  const { meInvitesRouter, publicInvitesRouter } = createReviewsRouter(db);
  const adminRouter = createAdminRouter(db, safeUploadsDir, safeVerificationsDir);

  app.use('/api/auth', authRouter);
  app.use('/api/me/bookmarks', meBookmarksRouter);
  app.use('/api/me/worker', meWorkerRouter);
  app.use('/api/me/billing', meBillingRouter);
  app.use('/api/me/invites', meInvitesRouter);
  app.use('/api/me', meRouter);
  app.use('/api/invites', publicInvitesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);

  // Safe image upload serving with path-traversal confinement
  app.get('/uploads/:userId/:filename', (req, res) => {
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

  // Protect server/ and data/ directories from static access
  app.use(['/server', '/data', '/.env', '/.env.example'], (req, res) => {
    res.status(404).end();
  });

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
