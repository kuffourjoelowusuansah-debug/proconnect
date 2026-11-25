const { parseCookies, hashToken, clearSessionCookie } = require('./security');

const USER_COOKIE = 'pc_session';
const ADMIN_COOKIE = 'pc_admin';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const ADMIN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function attachSession(db) {
  return (req, res, next) => {
    const cookies = parseCookies(req);
    const raw = cookies[USER_COOKIE];
    if (!raw) {
      req.user = null;
      return next();
    }
    const tokenHash = hashToken(raw);
    const row = db.prepare(`
      SELECT u.id, u.name, u.phone, u.email, u.terms_accepted_at, u.terms_version, u.created_at, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
    `).get(tokenHash);

    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      if (row) {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      }
      clearSessionCookie(res, USER_COOKIE);
      req.user = null;
      return next();
    }

    req.user = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      termsAcceptedAt: row.terms_accepted_at,
      termsVersion: row.terms_version,
      createdAt: row.created_at,
    };
    req.sessionTokenHash = tokenHash;
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  next();
}

function requireAdmin(db) {
  return (req, res, next) => {
    const cookies = parseCookies(req);
    const raw = cookies[ADMIN_COOKIE];
    if (!raw) {
      return res.status(401).json({ error: 'Admin sign in required.' });
    }
    const tokenHash = hashToken(raw);
    const row = db.prepare('SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = ?').get(tokenHash);
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
      if (row) {
        db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
      }
      clearSessionCookie(res, ADMIN_COOKIE);
      return res.status(401).json({ error: 'Admin session expired. Please sign in again.' });
    }
    req.adminTokenHash = tokenHash;
    next();
  };
}

module.exports = {
  USER_COOKIE,
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  ADMIN_TTL_SECONDS,
  attachSession,
  requireUser,
  requireAdmin,
};
