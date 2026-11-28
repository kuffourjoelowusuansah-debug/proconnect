const express = require('express');
const { cleanPlainText, validateFeedbackInput } = require('../rules');
const { hashIp, createRateLimiter } = require('../security');
const { requireUser } = require('../middleware');
const { ensureStore, asyncHandler } = require('../store');

const TOKEN_RE = /^[A-Za-z0-9_-]{6,80}$/;

function createReviewsRouter(dbOrStore) {
  const store = ensureStore(dbOrStore);
  const meInvitesRouter = express.Router();
  const publicInvitesRouter = express.Router();

  const submitLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyFn: (req) => `fb:${req.ip}`,
    message: 'Too many feedback submissions from this network. Please try again later.',
  });

  meInvitesRouter.post('/', requireUser, asyncHandler(async (req, res) => {
    const clientName = cleanPlainText(req.body?.clientName, 30);
    const out = await store.createFeedbackInvite({
      userId: req.user.id,
      clientName,
      now: new Date(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.status(201).json({ token: out.token, expiresAt: out.expiresAt });
  }));

  publicInvitesRouter.get('/:token', asyncHandler(async (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!TOKEN_RE.test(token)) {
      return res.status(404).json({ error: 'This feedback link is invalid.' });
    }

    const out = await store.lookupFeedbackInvite({
      token,
      viewerUserId: req.user ? req.user.id : null,
    });
    if (out.error) return res.status(out.status || 404).json({ error: out.error });
    res.json({ worker: out.worker, clientName: out.clientName });
  }));

  publicInvitesRouter.post('/:token/feedback', submitLimiter, asyncHandler(async (req, res) => {
    const token = String(req.params.token || '').trim();
    if (!TOKEN_RE.test(token)) {
      return res.status(404).json({ error: 'This feedback link is invalid.' });
    }

    const parsed = validateFeedbackInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const out = await store.redeemFeedbackInvite({
      token,
      viewerUserId: req.user ? req.user.id : null,
      data: parsed.data,
      ipHash: hashIp(req.ip),
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.status(201).json({ ok: true });
  }));

  return { meInvitesRouter, publicInvitesRouter };
}

module.exports = { createReviewsRouter };
