const express = require('express');
const {
  normalizeClientPassCode,
  validateClientPassPin,
} = require('../rules');
const {
  parseCookies,
  setSessionCookie,
  createRateLimiter,
} = require('../security');
const { ensureStore, asyncHandler } = require('../store');

const PASS_COOKIE = 'nkabom_pass';
const PASS_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days

function createClientPassRouter(dbOrStore) {
  const store = ensureStore(dbOrStore);
  const router = express.Router();

  const restoreLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyFn: (req) => `cp_res:${req.ip}`,
    message: 'Too many restore attempts. Please wait 15 minutes and try again.',
  });

  async function ensurePassCookie(req, res) {
    const cookies = parseCookies(req);
    const current = cookies[PASS_COOKIE] || null;
    if (current) {
      const check = await store.getOrInitClientPass({
        passCookie: current,
        nowIso: new Date().toISOString(),
      });
      if (check.newCookieToken) {
        setSessionCookie(res, PASS_COOKIE, check.newCookieToken, PASS_TTL_SECONDS);
        return check.newCookieToken;
      }
      return current;
    }
    const init = await store.getOrInitClientPass({
      passCookie: null,
      nowIso: new Date().toISOString(),
    });
    if (init.newCookieToken) {
      setSessionCookie(res, PASS_COOKIE, init.newCookieToken, PASS_TTL_SECONDS);
      return init.newCookieToken;
    }
    return null;
  }

  router.get('/', asyncHandler(async (req, res) => {
    const cookies = parseCookies(req);
    const passCookie = cookies[PASS_COOKIE] || null;
    const out = await store.getOrInitClientPass({
      passCookie,
      nowIso: new Date().toISOString(),
    });
    if (out.newCookieToken) {
      setSessionCookie(res, PASS_COOKIE, out.newCookieToken, PASS_TTL_SECONDS);
    }
    res.json(out.pass);
  }));

  router.post('/pin', asyncHandler(async (req, res) => {
    const parsed = validateClientPassPin(req.body?.pin);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const passCookie = await ensurePassCookie(req, res);
    const out = await store.setClientPassPin({
      passCookie,
      pin: parsed.data,
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  }));

  router.post('/restore', restoreLimiter, asyncHandler(async (req, res) => {
    const code = normalizeClientPassCode(req.body?.code);
    const pin = String(req.body?.pin ?? '').trim();
    if (!code || !/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ error: 'Enter a valid Client Pass ID (e.g. USER4821) and 4–8 digit Sync PIN.' });
    }
    const out = await store.restoreClientPass({
      code,
      pin,
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 401).json({ error: out.error });
    if (out.newCookieToken) {
      setSessionCookie(res, PASS_COOKIE, out.newCookieToken, PASS_TTL_SECONDS);
    }
    res.json(out.pass);
  }));

  router.post('/searches', asyncHandler(async (req, res) => {
    const passCookie = await ensurePassCookie(req, res);
    const out = await store.recordClientSearch({
      passCookie,
      query: req.body?.query || '',
      location: req.body?.location || '',
      category: req.body?.category || '',
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  }));

  router.delete('/searches/:id', asyncHandler(async (req, res) => {
    const cookies = parseCookies(req);
    const passCookie = cookies[PASS_COOKIE] || null;
    if (!passCookie) return res.json({ searches: [] });
    const out = await store.deleteClientSearch({
      passCookie,
      searchId: req.params.id,
    });
    if (out.error) return res.status(out.status || 401).json({ error: out.error });
    res.json(out);
  }));

  router.delete('/searches', asyncHandler(async (req, res) => {
    const cookies = parseCookies(req);
    const passCookie = cookies[PASS_COOKIE] || null;
    if (!passCookie) return res.json({ searches: [] });
    const out = await store.clearClientSearches({ passCookie });
    if (out.error) return res.status(out.status || 401).json({ error: out.error });
    res.json(out);
  }));

  router.post('/bookmarks', asyncHandler(async (req, res) => {
    const incoming = [];
    if (typeof req.body?.workerId === 'string' && req.body.workerId.trim()) {
      incoming.push(req.body.workerId.trim());
    }
    if (Array.isArray(req.body?.workerIds)) {
      for (const v of req.body.workerIds.slice(0, 50)) {
        if (typeof v === 'string' && v.trim()) incoming.push(v.trim());
      }
    }
    const passCookie = await ensurePassCookie(req, res);
    const out = await store.addClientBookmarks({
      passCookie,
      workerIds: incoming,
      nowIso: new Date().toISOString(),
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    res.json(out);
  }));

  router.delete('/bookmarks/:workerId', asyncHandler(async (req, res) => {
    const cookies = parseCookies(req);
    const passCookie = cookies[PASS_COOKIE] || null;
    if (!passCookie) return res.json({ bookmarkIds: [], savedWorkers: [] });
    const out = await store.removeClientBookmark({
      passCookie,
      workerId: req.params.workerId,
    });
    if (out.error) return res.status(out.status || 401).json({ error: out.error });
    res.json(out);
  }));

  return router;
}

module.exports = { createClientPassRouter, PASS_COOKIE, PASS_TTL_SECONDS };
