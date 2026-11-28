const { openDatabase, UPLOADS_DIR, VERIFICATIONS_DIR } = require('../db');
const { createSqliteStore } = require('./sqlite');
const { createSupabaseStore } = require('./supabase');

function isSupabaseConfigured(env = process.env) {
  return Boolean(
    env.SUPABASE_URL &&
    String(env.SUPABASE_URL).trim() &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    String(env.SUPABASE_SERVICE_ROLE_KEY).trim()
  );
}

function createStore({ db, uploadsDir, verificationsDir, env = process.env, clientFactory } = {}) {
  // Explicit database handle (e.g. :memory: in unit/integration tests) always uses SQLite
  if (db) {
    return createSqliteStore(db, {
      uploadsDir: uploadsDir || UPLOADS_DIR,
      verificationsDir: verificationsDir || VERIFICATIONS_DIR,
    });
  }

  if (isSupabaseConfigured(env)) {
    return createSupabaseStore({
      url: String(env.SUPABASE_URL).trim(),
      anonKey: env.SUPABASE_ANON_KEY ? String(env.SUPABASE_ANON_KEY).trim() : '',
      serviceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY).trim(),
      mediaBucket: env.SUPABASE_MEDIA_BUCKET || 'nkabom-media',
      verificationsBucket: env.SUPABASE_VERIF_BUCKET || 'nkabom-verifications',
      clientFactory,
    });
  }

  const sqliteDb = openDatabase();
  return createSqliteStore(sqliteDb, {
    uploadsDir: uploadsDir || UPLOADS_DIR,
    verificationsDir: verificationsDir || VERIFICATIONS_DIR,
  });
}

function ensureStore(dbOrStore, opts = {}) {
  if (dbOrStore && typeof dbOrStore.getPublicWorker === 'function' && typeof dbOrStore.signupWithPassword === 'function') {
    return dbOrStore;
  }
  if (dbOrStore) {
    return createSqliteStore(dbOrStore, opts);
  }
  return createStore(opts);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  isSupabaseConfigured,
  createStore,
  ensureStore,
  asyncHandler,
};
