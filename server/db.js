const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  computeSubscriptionStatus,
  isWorkerVisible,
  formatMonthYear,
  slugifyWorkerBase,
  formatRelativeFreshness,
} = require('./rules');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const VERIFICATIONS_DIR = path.resolve(DATA_DIR, 'verifications');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(VERIFICATIONS_DIR, { recursive: true });
}

function openDatabase(dbPath = path.join(DATA_DIR, 'nkabom.db')) {
  if (dbPath !== ':memory:') {
    ensureDirs();
    const defaultPath = path.join(DATA_DIR, 'nkabom.db');
    const legacyPath = path.join(DATA_DIR, 'proconnect.db');
    if (dbPath === defaultPath && !fs.existsSync(defaultPath) && fs.existsSync(legacyPath)) {
      for (const ext of ['', '-wal', '-shm']) {
        if (fs.existsSync(legacyPath + ext)) {
          fs.renameSync(legacyPath + ext, defaultPath + ext);
        }
      }
    }
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      terms_accepted_at TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      trial_claimed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('Personal', 'Business')),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      years INTEGER NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      availability TEXT NOT NULL DEFAULT 'available',
      availability_note TEXT NOT NULL DEFAULT '',
      availability_updated_at TEXT,
      last_active_at TEXT,
      rate_note TEXT NOT NULL DEFAULT '',
      photo_url TEXT,
      photo_path TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'suspended')),
      tint INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_invites (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      client_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      invite_id TEXT UNIQUE NOT NULL REFERENCES feedback_invites(id) ON DELETE CASCADE,
      blaze INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      testimonial TEXT,
      client_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
      ip_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      worker_id TEXT PRIMARY KEY REFERENCES workers(id) ON DELETE CASCADE,
      trial_ends_at TEXT NOT NULL,
      paid_until TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      amount_pesewas INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      paystack_reference TEXT UNIQUE NOT NULL,
      channel TEXT NOT NULL DEFAULT 'mobile_money',
      status TEXT NOT NULL,
      paid_at TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      raw_event TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trial_phone_claims (
      normalized_phone TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      reporter_contact TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, worker_id)
    );

    CREATE TABLE IF NOT EXISTS worker_events (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('view', 'wa_click')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_requests (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      doc_ref TEXT NOT NULL DEFAULT '',
      doc_path TEXT,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS client_passes (
      code TEXT PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      recovery_pin_hash TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_pass_searches (
      id TEXT PRIMARY KEY,
      pass_code TEXT NOT NULL REFERENCES client_passes(code) ON DELETE CASCADE,
      query TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      searched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_pass_bookmarks (
      pass_code TEXT NOT NULL REFERENCES client_passes(code) ON DELETE CASCADE,
      worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (pass_code, worker_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
    CREATE INDEX IF NOT EXISTS idx_feedback_worker_status ON feedback(worker_id, status);
    CREATE INDEX IF NOT EXISTS idx_invites_worker ON feedback_invites(worker_id);
    CREATE INDEX IF NOT EXISTS idx_payments_worker ON payments(worker_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_worker_events_lookup ON worker_events(worker_id, event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_verifications_status ON verification_requests(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_client_pass_searches_pass ON client_pass_searches(pass_code, searched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_client_pass_bookmarks_pass ON client_pass_bookmarks(pass_code, created_at DESC);
  `);

  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('trial_claimed_at')) {
    db.exec('ALTER TABLE users ADD COLUMN trial_claimed_at TEXT;');
  }

  const workerCols = db.prepare('PRAGMA table_info(workers)').all().map((c) => c.name);
  if (!workerCols.includes('availability')) {
    db.exec("ALTER TABLE workers ADD COLUMN availability TEXT NOT NULL DEFAULT 'available';");
  }
  if (!workerCols.includes('rate_note')) {
    db.exec("ALTER TABLE workers ADD COLUMN rate_note TEXT NOT NULL DEFAULT '';");
  }
  if (!workerCols.includes('slug')) {
    db.exec('ALTER TABLE workers ADD COLUMN slug TEXT;');
  }
  if (!workerCols.includes('availability_note')) {
    db.exec("ALTER TABLE workers ADD COLUMN availability_note TEXT NOT NULL DEFAULT '';");
  }
  if (!workerCols.includes('availability_updated_at')) {
    db.exec('ALTER TABLE workers ADD COLUMN availability_updated_at TEXT;');
  }
  if (!workerCols.includes('last_active_at')) {
    db.exec('ALTER TABLE workers ADD COLUMN last_active_at TEXT;');
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_slug ON workers(slug);');

  const missingSlugs = db.prepare("SELECT id, name, area, updated_at, created_at FROM workers WHERE slug IS NULL OR TRIM(slug) = ''").all();
  if (missingSlugs.length > 0) {
    const existingSlugs = new Set(
      db.prepare('SELECT slug FROM workers WHERE slug IS NOT NULL').all().map((r) => r.slug)
    );
    const updStmt = db.prepare('UPDATE workers SET slug = ?, availability_updated_at = COALESCE(availability_updated_at, ?), last_active_at = COALESCE(last_active_at, ?) WHERE id = ?');
    for (const row of missingSlugs) {
      const base = slugifyWorkerBase(row.name, row.area, row.id);
      let candidate = base;
      let idx = 2;
      while (existingSlugs.has(candidate)) {
        candidate = `${base}-${idx}`;
        idx += 1;
      }
      existingSlugs.add(candidate);
      const ts = row.updated_at || row.created_at || new Date().toISOString();
      updStmt.run(candidate, ts, ts, row.id);
    }
  }

  // Ensure previously seeded fake demo profiles are removed while preserving real accounts
  db.prepare("DELETE FROM users WHERE password_hash = '!seeded_demo!'").run();
}

function getWorkerMetrics(db, workerId) {
  const agg = db.prepare(`
    SELECT
      COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) AS reviews,
      ROUND(AVG(CASE WHEN rating IS NOT NULL THEN CAST(rating AS REAL) END), 1) AS avg_rating,
      COALESCE(SUM(CASE WHEN blaze = 1 THEN 1 ELSE 0 END), 0) AS blazes
    FROM feedback
    WHERE worker_id = ? AND status = 'published'
  `).get(workerId);

  const testimonials = db.prepare(`
    SELECT client_name, rating, testimonial, created_at
    FROM feedback
    WHERE worker_id = ? AND status = 'published' AND testimonial IS NOT NULL AND TRIM(testimonial) != ''
    ORDER BY created_at DESC
    LIMIT 20
  `).all(workerId).map((row) => ({
    name: row.client_name || 'A client',
    rating: row.rating || 0,
    text: row.testimonial,
    date: formatMonthYear(row.created_at),
  }));

  const portfolio = db.prepare(`
    SELECT id, image_url, title, created_at
    FROM portfolio_items
    WHERE worker_id = ?
    ORDER BY created_at DESC
    LIMIT 12
  `).all(workerId);

  return {
    rating: agg.reviews > 0 ? Number(agg.avg_rating || 0) : 0,
    reviews: Number(agg.reviews || 0),
    blazes: Number(agg.blazes || 0),
    testimonials,
    portfolio,
  };
}

function buildWorkerDTO(db, workerRow) {
  if (!workerRow) return null;
  const metrics = getWorkerMetrics(db, workerRow.id);
  const freshnessTs = workerRow.availability_updated_at || workerRow.last_active_at || workerRow.updated_at || null;
  return {
    id: workerRow.id,
    slug: workerRow.slug || workerRow.id,
    name: workerRow.name,
    type: workerRow.type,
    category: workerRow.category,
    area: workerRow.area,
    phone: workerRow.phone,
    years: Number(workerRow.years),
    bio: workerRow.bio || '',
    availability: workerRow.availability || 'available',
    availabilityNote: workerRow.availability_note || '',
    availabilityUpdatedAt: workerRow.availability_updated_at || workerRow.updated_at || null,
    lastActiveAt: workerRow.last_active_at || workerRow.updated_at || null,
    freshnessLabel: formatRelativeFreshness(freshnessTs),
    rateNote: workerRow.rate_note || '',
    photo: workerRow.photo_url || null,
    verified: Boolean(workerRow.verified),
    tint: Number(workerRow.tint || 0),
    rating: metrics.rating,
    reviews: metrics.reviews,
    blazes: metrics.blazes,
    testimonials: metrics.testimonials,
    portfolio: metrics.portfolio,
  };
}

function listVisibleWorkers(db, { q = '', category = '', area = '', verifiedOnly = false, availableOnly = false, minRating = 0, ids = null, sort = 'rating', page = 1, pageSize = 12 } = {}) {
  const now = new Date();
  const rows = db.prepare(`
    SELECT w.*, s.trial_ends_at, s.paid_until
    FROM workers w
    JOIN subscriptions s ON s.worker_id = w.id
    WHERE w.status = 'active'
  `).all();

  const visible = [];
  const allCategories = new Set();
  const allCities = new Set();

  for (const row of rows) {
    if (!isWorkerVisible(row, row, now)) continue;
    if (row.category) allCategories.add(row.category);
    const parts = String(row.area || '').split(/[,/]+/);
    for (const part of parts) {
      const city = part.split(' – ')[0].split('-')[0].trim();
      if (city) allCities.add(city);
    }
    visible.push(buildWorkerDTO(db, row));
  }

  const qTerms = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const catExact = String(category || '').trim();
  const areaTerms = String(area || '').trim().toLowerCase().split(/[,\s]+/).filter(Boolean);
  const minR = Number(minRating) || 0;
  const idSet = Array.isArray(ids) && ids.length ? new Set(ids.map((v) => String(v))) : null;

  const filtered = visible.filter((w) => {
    if (idSet && !idSet.has(String(w.id))) return false;
    if (catExact && w.category !== catExact) return false;
    if (verifiedOnly && !w.verified) return false;
    if (availableOnly && w.availability !== 'available') return false;
    if (minR > 0 && !(w.reviews > 0 && w.rating >= minR)) return false;
    if (qTerms.length) {
      const hay = `${w.name} ${w.category} ${w.bio} ${w.area} ${w.type} ${w.rateNote || ''}`.toLowerCase();
      if (!qTerms.every((term) => hay.includes(term))) return false;
    }
    if (areaTerms.length) {
      const areaHay = String(w.area || '').toLowerCase();
      if (!areaTerms.every((term) => areaHay.includes(term))) return false;
    }
    return true;
  });

  const sorters = {
    rating: (a, b) => (b.reviews ? b.rating : 0) - (a.reviews ? a.rating : 0) || b.reviews - a.reviews,
    blazes: (a, b) => (b.blazes || 0) - (a.blazes || 0) || b.reviews - a.reviews,
    experience: (a, b) => b.years - a.years,
    reviews: (a, b) => b.reviews - a.reviews,
  };
  filtered.sort(sorters[sort] || sorters.rating);

  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 12));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const start = (safePage - 1) * safePageSize;

  return {
    items: filtered.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    categories: [...allCategories],
    cities: [...allCities].slice(0, 8),
  };
}

function getMarketplaceStats(db) {
  const { items, total } = listVisibleWorkers(db, { sort: 'rating', page: 1, pageSize: 50 });
  const verifiedPros = items.filter((w) => w.verified).length;
  const rated = items.filter((w) => w.reviews > 0);
  const avgRating = rated.length
    ? Number((rated.reduce((sum, w) => sum + w.rating, 0) / rated.length).toFixed(1))
    : 0;
  const totalReviews = items.reduce((sum, w) => sum + w.reviews, 0);
  return {
    totalPros: total,
    verifiedPros,
    avgRating,
    totalReviews,
    topWorkers: items.slice(0, 3),
  };
}

function logAdminAudit(db, { action, targetType, targetId, details = {} }) {
  const id = 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  db.prepare(`
    INSERT INTO admin_audit_logs (id, action, target_type, target_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, action, targetType, String(targetId), JSON.stringify(details), new Date().toISOString());
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  VERIFICATIONS_DIR,
  openDatabase,
  buildWorkerDTO,
  listVisibleWorkers,
  getMarketplaceStats,
  logAdminAudit,
};
