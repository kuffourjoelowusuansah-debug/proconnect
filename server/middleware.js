const { parseCookies, hashToken, setSessionCookie, clearSessionCookie } = require('./security');
const { ensureStore, asyncHandler } = require('./store');

const USER_COOKIE = 'pc_session';
const USER_REFRESH_COOKIE = 'pc_refresh';
const ADMIN_COOKIE = 'pc_admin';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ADMIN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function setAuthCookies(res, sessionToken, refreshToken) {
  if (sessionToken) {
    setSessionCookie(res, USER_COOKIE, sessionToken, SESSION_TTL_SECONDS);
  }
  if (refreshToken) {
    setSessionCookie(res, USER_REFRESH_COOKIE, refreshToken, SESSION_TTL_SECONDS);
  }
}

function clearAuthCookies(res) {
  clearSessionCookie(res, USER_COOKIE);
  clearSessionCookie(res, USER_REFRESH_COOKIE);
}

function attachSession(dbOrStore) {
  const store = ensureStore(dbOrStore);
  return asyncHandler(async (req, res, next) => {
    const cookies = parseCookies(req);
    const raw = cookies[USER_COOKIE] || null;
    const refresh = cookies[USER_REFRESH_COOKIE] || null;

    if (!raw && !refresh) {
      req.user = null;
      return next();
    }

    const resolved = await store.resolveSession({ accessToken: raw, refreshToken: refresh });
    if (!resolved || !resolved.user) {
      if (resolved && resolved.expired) {
        clearAuthCookies(res);
      }
      req.user = null;
      return next();
    }

    if (resolved.refreshedAccessToken) {
      setAuthCookies(res, resolved.refreshedAccessToken, resolved.refreshedRefreshToken || refresh);
    }

    req.user = resolved.user;
    req.sessionTokenHash = resolved.sessionTokenHash || null;
    req.sessionAccessToken = resolved.refreshedAccessToken || raw || null;
    next();
  });
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  next();
}

function requireAdmin(dbOrStore) {
  const store = ensureStore(dbOrStore);
  return asyncHandler(async (req, res, next) => {
    const cookies = parseCookies(req);
    const raw = cookies[ADMIN_COOKIE];
    if (!raw) {
      return res.status(401).json({ error: 'Admin sign in required.' });
    }
    const tokenHash = hashToken(raw);
    const valid = await store.isAdminSessionValid(tokenHash);
    if (!valid) {
      clearSessionCookie(res, ADMIN_COOKIE);
      return res.status(401).json({ error: 'Admin session expired. Please sign in again.' });
    }
    req.adminTokenHash = tokenHash;
    next();
  });
}

module.exports = {
  USER_COOKIE,
  USER_REFRESH_COOKIE,
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  ADMIN_TTL_SECONDS,
  setAuthCookies,
  clearAuthCookies,
  attachSession,
  requireUser,
  requireAdmin,
};
