const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function generateToken(byteLength = 24) {
  return crypto.randomBytes(byteLength).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 24);
}

function verifyPaystackSignature(rawBodyBuffer, signatureHeader, secretKey) {
  if (!rawBodyBuffer || !signatureHeader || !secretKey) return false;
  const computed = crypto
    .createHmac('sha512', secretKey)
    .update(rawBodyBuffer)
    .digest('hex');
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(String(signatureHeader).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function setSessionCookie(res, name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
  ];
  if (typeof maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  res.append('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res, name) {
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Max-Age=0',
  ];
  res.append('Set-Cookie', parts.join('; '));
}

function isAllowedOrigin(origin, req, siteUrl = process.env.SITE_URL) {
  if (!origin) return true;
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host && originUrl.host === host) {
    return true;
  }
  if (siteUrl) {
    try {
      const configuredOrigin = new URL(siteUrl).origin;
      if (originUrl.origin === configuredOrigin) return true;
    } catch {}
  }
  return false;
}

function corsCheck(req, res, next) {
  if (!req.path.startsWith('/api/') || req.path === '/api/webhooks/paystack') {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin) return next();

  if (!isAllowedOrigin(origin, req)) {
    return res.status(403).json({ error: 'Cross-origin request not allowed.' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

function csrfCheck(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  if (req.path === '/api/webhooks/paystack') {
    return next();
  }
  const xrw = req.headers['x-requested-with'];
  const hasCustomHeader = xrw === 'Nkabom' || xrw === 'ProConnect';
  const origin = req.headers.origin;
  const sameOrigin = origin ? isAllowedOrigin(origin, req) : false;
  if (!hasCustomHeader && !sameOrigin) {
    return res.status(403).json({ error: 'Request blocked by origin check.' });
  }
  next();
}

function createRateLimiter({ windowMs, max, keyFn, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = keyFn ? keyFn(req) : (req.ip || 'global');
    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 5000) {
      for (const [k, v] of hits.entries()) {
        if (now > v.resetAt) hits.delete(k);
      }
    }
    if (entry.count > max) {
      return res.status(429).json({ error: message || 'Too many attempts. Please wait a moment and try again.' });
    }
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  hashIp,
  verifyPaystackSignature,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  isAllowedOrigin,
  corsCheck,
  csrfCheck,
  createRateLimiter,
};
