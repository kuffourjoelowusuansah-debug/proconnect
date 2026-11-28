import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createStore, isSupabaseConfigured } = require('./store/index.js');
const { createSupabaseStore } = require('./store/supabase.js');
const { createApp } = require('./app.js');
const { processVerifiedPayment } = require('./paystack.js');

const FK_MAP = {
  workers: {
    subscriptions: { local: 'id', foreign: 'worker_id', single: true },
    users: { local: 'user_id', foreign: 'id', single: true },
  },
  feedback_invites: {
    workers: { local: 'worker_id', foreign: 'id', single: true },
  },
  feedback: {
    workers: { local: 'worker_id', foreign: 'id', single: true },
  },
  reports: {
    workers: { local: 'worker_id', foreign: 'id', single: true },
  },
  payments: {
    workers: { local: 'worker_id', foreign: 'id', single: true },
  },
  verification_requests: {
    workers: { local: 'worker_id', foreign: 'id', single: true },
  },
};

function createMockSupabaseEnvironment() {
  const tables = {
    users: [],
    sessions: [],
    password_resets: [],
    workers: [],
    portfolio_items: [],
    feedback_invites: [],
    feedback: [],
    subscriptions: [],
    payments: [],
    trial_phone_claims: [],
    reports: [],
    notification_logs: [],
    admin_sessions: [],
    admin_audit_logs: [],
    app_settings: [],
    bookmarks: [],
    worker_events: [],
    verification_requests: [],
    client_passes: [],
    client_pass_searches: [],
    client_pass_bookmarks: [],
  };

  const authUsers = new Map(); // id -> { id, email, password, user_metadata }
  const tokens = new Map(); // access_token -> { userId, expired }
  const refreshTokens = new Map(); // refresh_token -> userId
  const buckets = {
    'nkabom-media': new Map(), // path -> { buffer, contentType }
    'nkabom-verifications': new Map(),
  };

  function issueTokens(userId) {
    const access = 'sb_acc_' + crypto.randomBytes(12).toString('hex');
    const refresh = 'sb_ref_' + crypto.randomBytes(12).toString('hex');
    tokens.set(access, { userId, expired: false });
    refreshTokens.set(refresh, userId);
    return { access_token: access, refresh_token: refresh };
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.action = 'select';
      this.selectSpec = '*';
      this.selectOpts = {};
      this.filters = [];
      this.orderBy = null;
      this.limitNum = null;
      this.singleMode = null;
      this.payload = null;
      this.upsertOpts = null;
    }

    select(spec = '*', opts = {}) {
      if (this.action === 'select') {
        this.selectSpec = spec;
        this.selectOpts = opts;
      } else {
        this.selectOpts = { ...opts, returnRows: true };
      }
      return this;
    }

    insert(payload) {
      this.action = 'insert';
      this.payload = payload;
      return this;
    }

    upsert(payload, opts = {}) {
      this.action = 'upsert';
      this.payload = payload;
      this.upsertOpts = opts;
      return this;
    }

    update(payload) {
      this.action = 'update';
      this.payload = payload;
      return this;
    }

    delete(opts = {}) {
      this.action = 'delete';
      this.selectOpts = opts;
      return this;
    }

    eq(col, val) {
      this.filters.push((r) => r[col] === val);
      return this;
    }

    in(col, vals) {
      const set = new Set(vals);
      this.filters.push((r) => set.has(r[col]));
      return this;
    }

    is(col, val) {
      this.filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
      return this;
    }

    not(col, op, val) {
      if (op === 'is' && val === null) {
        this.filters.push((r) => r[col] !== null && r[col] !== undefined);
      }
      return this;
    }

    gte(col, val) {
      this.filters.push((r) => String(r[col] || '') >= String(val));
      return this;
    }

    lte(col, val) {
      this.filters.push((r) => String(r[col] || '') <= String(val));
      return this;
    }

    order(col, { ascending = true } = {}) {
      this.orderBy = { col, ascending };
      return this;
    }

    limit(n) {
      this.limitNum = n;
      return this;
    }

    single() {
      this.singleMode = 'single';
      return this;
    }

    maybeSingle() {
      this.singleMode = 'maybe';
      return this;
    }

    _attachJoins(row) {
      const copy = { ...row };
      const spec = String(this.selectSpec || '');
      const relDefs = FK_MAP[this.table] || {};
      for (const [relTable, def] of Object.entries(relDefs)) {
        if (spec.includes(`${relTable}(`) || spec.includes(`${relTable}!inner(`)) {
          const matches = tables[relTable].filter((target) => target[def.foreign] === copy[def.local]);
          if (spec.includes(`${relTable}!inner(`) && matches.length === 0) return null;
          copy[relTable] = def.single ? (matches[0] ? { ...matches[0] } : null) : matches.map((m) => ({ ...m }));
        }
      }
      return copy;
    }

    _exec() {
      const rows = tables[this.table];

      if (this.action === 'insert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const item of list) {
          if (this.table === 'app_settings' && rows.some((r) => r.key === item.key)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value' } };
          }
          if (this.table === 'payments' && rows.some((r) => r.paystack_reference === item.paystack_reference)) {
            return { data: null, error: { code: '23505', message: 'duplicate paystack_reference' } };
          }
          if (this.table === 'users' && rows.some((r) => r.email === item.email)) {
            return { data: null, error: { code: '23505', message: 'duplicate email' } };
          }
          if (this.table === 'client_passes' && rows.some((r) => r.code === item.code)) {
            return { data: null, error: { code: '23505', message: 'duplicate client_passes code' } };
          }
          if (this.table === 'workers' && item.slug && rows.some((r) => r.slug === item.slug)) {
            return { data: null, error: { code: '23505', message: 'duplicate workers slug' } };
          }
        }
        const inserted = list.map((item) => ({ ...item }));
        rows.push(...inserted);
        if (this.singleMode) return { data: inserted[0] || null, error: null };
        return { data: inserted, error: null };
      }

      if (this.action === 'upsert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload];
        const keyCols = String(this.upsertOpts?.onConflict || 'id').split(',').map((s) => s.trim());
        const out = [];
        for (const item of list) {
          const idx = rows.findIndex((r) => keyCols.every((k) => r[k] === item[k]));
          if (idx >= 0) {
            if (!this.upsertOpts?.ignoreDuplicates) {
              rows[idx] = { ...rows[idx], ...item };
            }
            out.push({ ...rows[idx] });
          } else {
            const rec = { ...item };
            rows.push(rec);
            out.push({ ...rec });
          }
        }
        if (this.singleMode) return { data: out[0] || null, error: null };
        return { data: out, error: null };
      }

      if (this.action === 'update') {
        const matched = rows.filter((r) => this.filters.every((fn) => fn(r)));
        for (const r of matched) {
          Object.assign(r, this.payload);
        }
        const out = matched.map((r) => ({ ...r }));
        if (this.singleMode === 'maybe') return { data: out[0] || null, error: null };
        if (this.singleMode === 'single') return { data: out[0] || null, error: out[0] ? null : { message: 'Not found' } };
        return { data: out, error: null };
      }

      if (this.action === 'delete') {
        const kept = [];
        const deleted = [];
        for (const r of rows) {
          if (this.filters.every((fn) => fn(r))) deleted.push(r);
          else kept.push(r);
        }
        tables[this.table] = kept;

        // Simulate ON DELETE CASCADE cleanly
        if (this.table === 'users') {
          const delUserIds = new Set(deleted.map((u) => u.id));
          const removedWorkers = tables.workers.filter((w) => delUserIds.has(w.user_id));
          tables.workers = tables.workers.filter((w) => !delUserIds.has(w.user_id));
          tables.bookmarks = tables.bookmarks.filter((b) => !delUserIds.has(b.user_id));
          const remWids = new Set(removedWorkers.map((w) => w.id));
          for (const t of ['portfolio_items', 'feedback_invites', 'feedback', 'subscriptions', 'payments', 'reports', 'worker_events', 'verification_requests']) {
            tables[t] = tables[t].filter((x) => !remWids.has(x.worker_id));
          }
        } else if (this.table === 'workers') {
          const remWids = new Set(deleted.map((w) => w.id));
          for (const t of ['portfolio_items', 'feedback_invites', 'feedback', 'subscriptions', 'payments', 'reports', 'bookmarks', 'client_pass_bookmarks', 'worker_events', 'verification_requests']) {
            tables[t] = tables[t].filter((x) => !remWids.has(x.worker_id));
          }
        } else if (this.table === 'client_passes') {
          const remPids = new Set(deleted.map((p) => p.id));
          tables.client_pass_searches = tables.client_pass_searches.filter((x) => !remPids.has(x.pass_id));
          tables.client_pass_bookmarks = tables.client_pass_bookmarks.filter((x) => !remPids.has(x.pass_id));
        }

        return { data: deleted, count: deleted.length, error: null };
      }

      // SELECT
      let result = rows.filter((r) => this.filters.every((fn) => fn(r)));
      result = result.map((r) => this._attachJoins(r)).filter(Boolean);
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        result.sort((a, b) => {
          const av = String(a[col] || '');
          const bv = String(b[col] || '');
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      const totalCount = result.length;
      if (typeof this.limitNum === 'number') {
        result = result.slice(0, this.limitNum);
      }
      if (this.selectOpts?.head) {
        return { data: null, count: totalCount, error: null };
      }
      if (this.singleMode === 'maybe') {
        return { data: result[0] || null, error: null };
      }
      if (this.singleMode === 'single') {
        return result[0] ? { data: result[0], error: null } : { data: null, error: { message: 'Row not found' } };
      }
      return { data: result, count: totalCount, error: null };
    }

    then(resolve, reject) {
      return Promise.resolve()
        .then(() => this._exec())
        .then(resolve, reject);
    }
  }

  const clientFactory = () => ({
    from(table) {
      return new QueryBuilder(table);
    },
    auth: {
      admin: {
        async createUser({ email, password, user_metadata }) {
          for (const u of authUsers.values()) {
            if (u.email === email) return { data: null, error: { message: 'User already registered' } };
          }
          const id = crypto.randomUUID();
          const user = { id, email, password, user_metadata: user_metadata || {} };
          authUsers.set(id, user);
          return { data: { user: { id, email, user_metadata: user.user_metadata } }, error: null };
        },
        async updateUserById(userId, patch) {
          const u = authUsers.get(userId);
          if (!u) return { data: null, error: { message: 'User not found' } };
          if (patch.password) u.password = patch.password;
          if (patch.user_metadata) u.user_metadata = { ...u.user_metadata, ...patch.user_metadata };
          return { data: { user: u }, error: null };
        },
        async deleteUser(userId) {
          authUsers.delete(userId);
          return { data: {}, error: null };
        },
        async signOut(accessToken) {
          tokens.delete(accessToken);
          return { error: null };
        },
      },
      async getUser(accessToken) {
        const entry = tokens.get(accessToken);
        if (!entry || entry.expired) return { data: { user: null }, error: { message: 'JWT expired' } };
        const user = authUsers.get(entry.userId);
        if (!user) return { data: { user: null }, error: { message: 'User not found' } };
        return { data: { user: { id: user.id, email: user.email, user_metadata: user.user_metadata } }, error: null };
      },
      async signInWithPassword({ email, password }) {
        let found = null;
        for (const u of authUsers.values()) {
          if (u.email === email && u.password === password) {
            found = u;
            break;
          }
        }
        if (!found) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        const session = issueTokens(found.id);
        return {
          data: {
            user: { id: found.id, email: found.email, user_metadata: found.user_metadata },
            session,
          },
          error: null,
        };
      },
      async refreshSession({ refresh_token }) {
        const userId = refreshTokens.get(refresh_token);
        if (!userId || !authUsers.has(userId)) {
          return { data: { user: null, session: null }, error: { message: 'Invalid refresh token' } };
        }
        const found = authUsers.get(userId);
        refreshTokens.delete(refresh_token);
        const session = issueTokens(found.id);
        return {
          data: {
            user: { id: found.id, email: found.email, user_metadata: found.user_metadata },
            session,
          },
          error: null,
        };
      },
    },
    storage: {
      from(bucketName) {
        if (!buckets[bucketName]) buckets[bucketName] = new Map();
        const b = buckets[bucketName];
        return {
          async upload(storagePath, buffer, opts = {}) {
            b.set(storagePath, { buffer: Buffer.from(buffer), contentType: opts.contentType || 'application/octet-stream' });
            return { data: { path: storagePath }, error: null };
          },
          getPublicUrl(storagePath) {
            return { data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucketName}/${storagePath}` } };
          },
          async download(storagePath) {
            const obj = b.get(storagePath);
            if (!obj) return { data: null, error: { message: 'Object not found' } };
            return { data: new Blob([obj.buffer], { type: obj.contentType }), error: null };
          },
          async remove(paths) {
            for (const p of paths || []) b.delete(p);
            return { data: [], error: null };
          },
        };
      },
    },
  });

  return { clientFactory, tables, authUsers, tokens, buckets };
}

function makeTinyPng(withMeta = false) {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (!withMeta) return Buffer.concat([pngHeader, iend]);
  const textKey = Buffer.from('tEXtSecretGPS\0PrivateAccraCoord');
  const chunk = Buffer.alloc(12 + textKey.length);
  chunk.writeUInt32BE(textKey.length, 0);
  chunk.write('tEXt', 4, 'ascii');
  textKey.copy(chunk, 8);
  return Buffer.concat([pngHeader, chunk, iend]);
}

test('Store auto-selection detects Supabase vs SQLite env cleanly', () => {
  assert.equal(isSupabaseConfigured({}), false);
  assert.equal(isSupabaseConfigured({ SUPABASE_URL: 'https://abc.supabase.co' }), false);
  assert.equal(
    isSupabaseConfigured({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc_key' }),
    true
  );

  const mock = createMockSupabaseEnvironment();
  const store = createStore({
    env: {
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_ANON_KEY: 'anon_key',
      SUPABASE_SERVICE_ROLE_KEY: 'svc_key',
    },
    clientFactory: mock.clientFactory,
  });
  assert.equal(store.mode, 'supabase');
});

test('Supabase mode end-to-end: Auth, refresh fallback, Media & private Verification buckets, Paystack idempotency, Cron, and Account deletion', async () => {
  const mock = createMockSupabaseEnvironment();
  const store = createSupabaseStore({
    url: 'https://mock.supabase.co',
    anonKey: 'anon_key',
    serviceRoleKey: 'service_role_key',
    clientFactory: mock.clientFactory,
  });

  process.env.CRON_SECRET = 'test_cron_secret_123';
  const app = createApp({ store });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const cookieMap = new Map();
  const apiFetch = async (urlPath, opts = {}) => {
    const headers = { 'X-Requested-With': 'Nkabom', ...(opts.headers || {}) };
    if (cookieMap.size > 0) {
      headers.Cookie = [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    let body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(baseUrl + urlPath, { method: opts.method || 'GET', headers, body });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const sc of setCookies) {
      const kv = sc.split(';')[0];
      const eq = kv.indexOf('=');
      const k = kv.slice(0, eq);
      const v = decodeURIComponent(kv.slice(eq + 1));
      if (!v) cookieMap.delete(k);
      else cookieMap.set(k, v);
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => null) : await res.arrayBuffer();
    return { status: res.status, headers: res.headers, data };
  };

  try {
    // 1. Signup via Supabase Auth -> sets pc_session + pc_refresh
    const signup = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Kofi Mensah', phone: '0244112233', email: 'kofi@example.com', password: 'password123', agree: true },
    });
    assert.equal(signup.status, 201);
    assert.ok(cookieMap.get('pc_session')?.startsWith('sb_acc_'));
    assert.ok(cookieMap.get('pc_refresh')?.startsWith('sb_ref_'));
    const userId = signup.data.id;

    // Duplicate signup blocked with 409
    const dup = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Kofi 2', phone: '0244112234', email: 'kofi@example.com', password: 'password123', agree: true },
    });
    assert.equal(dup.status, 409);

    // 2. Token expiration automatically refreshes via pc_refresh cookie
    const oldAccess = cookieMap.get('pc_session');
    mock.tokens.get(oldAccess).expired = true;
    const meRes = await apiFetch('/api/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.email, 'kofi@example.com');
    assert.notEqual(cookieMap.get('pc_session'), oldAccess);

    // 3. Create worker profile & upload profile photo -> goes to nkabom-media bucket
    const wRes = await apiFetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Kofi Electrical',
        category: 'Electrical',
        area: 'Osu, Accra',
        phone: '0244112233',
        years: 5,
        bio: 'Residential and solar electrical installations in Accra.',
        availability: 'available',
      },
    });
    assert.equal(wRes.status, 201);
    const workerId = wRes.data.id;

    const photoFd = new FormData();
    photoFd.append('photo', new Blob([makeTinyPng()], { type: 'image/png' }), 'avatar.png');
    const photoRes = await apiFetch('/api/me/worker/photo', { method: 'POST', body: photoFd });
    assert.equal(photoRes.status, 200);
    assert.ok(photoRes.data.url.includes('/nkabom-media/'));
    assert.equal(mock.buckets['nkabom-media'].size, 1);

    // 4. Upload verification document -> goes strictly to private nkabom-verifications bucket & strips EXIF/tEXt
    const verFd = new FormData();
    verFd.append('docType', 'Ghana Card');
    verFd.append('docRef', 'GHA-999888777-1');
    verFd.append('document', new Blob([makeTinyPng(true)], { type: 'image/png' }), 'id.png');
    const vrRes = await apiFetch('/api/me/worker/verify-request', { method: 'POST', body: verFd });
    assert.equal(vrRes.status, 201);
    const vrId = vrRes.data.latest.id;
    assert.equal(mock.buckets['nkabom-verifications'].size, 1);

    // Public/unauth doc access blocked with 401
    const noAuthDoc = await fetch(`${baseUrl}/api/admin/verifications/${vrId}/document`);
    assert.equal(noAuthDoc.status, 401);

    // Admin bootstrap & download verification doc safely
    const boot = await apiFetch('/api/admin/bootstrap', { method: 'POST', body: { passcode: 'adminpass999' } });
    assert.equal(boot.status, 201);
    const adminDoc = await apiFetch(`/api/admin/verifications/${vrId}/document`);
    assert.equal(adminDoc.status, 200);
    assert.equal(adminDoc.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(Buffer.from(adminDoc.data).includes('SecretGPS'), false);

    // 5. Invite creation & atomic single-use redemption (plus self-review blocked)
    const inv = await apiFetch('/api/me/invites', { method: 'POST', body: { clientName: 'Ama' } });
    assert.equal(inv.status, 201);
    const token = inv.data.token;

    const selfFb = await apiFetch(`/api/invites/${token}/feedback`, { method: 'POST', body: { blaze: true, rating: 5 } });
    assert.equal(selfFb.status, 403);

    // Submit anonymously without session cookies
    const anonFb = await fetch(`${baseUrl}/api/invites/${token}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Nkabom' },
      body: JSON.stringify({ blaze: true, rating: 5, testimonial: 'Clean work!', name: 'Ama' }),
    });
    assert.equal(anonFb.status, 201);

    const reuseFb = await fetch(`${baseUrl}/api/invites/${token}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Nkabom' },
      body: JSON.stringify({ blaze: true, rating: 5 }),
    });
    assert.equal(reuseFb.status, 410);

    // 6. Paystack payment idempotency
    const pay1 = await processVerifiedPayment(store, {
      reference: 'ref_supa_001',
      amountPesewas: 2000,
      currency: 'GHS',
      channel: 'mobile_money',
      paidAt: new Date().toISOString(),
      workerId,
      rawEvent: { event: 'charge.success' },
    });
    assert.equal(pay1.alreadyProcessed, false);
    assert.equal(pay1.subscription.status, 'trial');

    const pay2 = await processVerifiedPayment(store, {
      reference: 'ref_supa_001',
      amountPesewas: 2000,
      currency: 'GHS',
      channel: 'mobile_money',
      paidAt: new Date().toISOString(),
      workerId,
      rawEvent: { event: 'charge.success' },
    });
    assert.equal(pay2.alreadyProcessed, true);
    assert.equal(mock.tables.payments.length, 1);

    // 7. Cron endpoint authentication + execution
    const unauthCron = await fetch(`${baseUrl}/api/cron/reminders`);
    assert.equal(unauthCron.status, 401);
    const authCron = await fetch(`${baseUrl}/api/cron/reminders`, {
      headers: { Authorization: 'Bearer test_cron_secret_123' },
    });
    assert.equal(authCron.status, 200);
    const cronJson = await authCron.json();
    assert.equal(cronJson.ok, true);

    // 8. Static protection blocks internal paths
    for (const p of ['/server/db.js', '/supabase/schema.sql', '/package.json', '/vercel.json', '/.env.example']) {
      const blocked = await fetch(`${baseUrl}${p}`);
      assert.equal(blocked.status, 404, `Expected 404 for protected path ${p}`);
    }

    // 8b. Live Availability switch, Slug SSR, Analytics dailySeries, and Client Pass parity in Supabase store
    const patchAvail = await apiFetch('/api/me/worker/availability', {
      method: 'PATCH',
      body: { availability: 'appointment', availabilityNote: 'Osu mornings only' },
    });
    assert.equal(patchAvail.status, 200);
    assert.equal(patchAvail.data.availability, 'appointment');
    assert.equal(patchAvail.data.availabilityNote, 'Osu mornings only');
    const slug = patchAvail.data.slug;
    assert.ok(slug);

    const trackSlug = await fetch(`${baseUrl}/api/workers/${encodeURIComponent(slug)}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Nkabom' },
      body: JSON.stringify({ type: 'view' }),
    });
    assert.equal(trackSlug.status, 201);

    const supaAn = await apiFetch('/api/me/worker/analytics');
    assert.equal(supaAn.status, 200);
    assert.equal(supaAn.data.views30d, 1);
    assert.equal(supaAn.data.dailySeries.length, 7);

    const ssrSupa = await fetch(`${baseUrl}/pro/${encodeURIComponent(slug)}`).then((r) => r.text());
    assert.ok(ssrSupa.includes('id="nkabom-preload"'));
    assert.ok(ssrSupa.includes('Osu mornings only'));

    // Client pass init, search, bookmark, pin, and restore
    const passA = await apiFetch('/api/client-pass');
    assert.equal(passA.status, 200);
    assert.match(passA.data.code, /^USER\d{4,}$/);
    await apiFetch('/api/client-pass/searches', { method: 'POST', body: { query: 'Solar', location: 'Accra' } });
    await apiFetch('/api/client-pass/bookmarks', { method: 'POST', body: { workerId } });
    const pinRes = await apiFetch('/api/client-pass/pin', { method: 'POST', body: { pin: '5512' } });
    assert.equal(pinRes.status, 200);

    const freshRes = await fetch(`${baseUrl}/api/client-pass/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Nkabom' },
      body: JSON.stringify({ code: passA.data.code, pin: '5512' }),
    });
    assert.equal(freshRes.status, 200);
    const restoredPass = await freshRes.json();
    assert.equal(restoredPass.searches.length, 1);
    assert.deepEqual(restoredPass.bookmarkIds, [workerId]);

    // 9. Delete account cleans up buckets, public.users, cascade tables, AND Supabase Auth user
    const delRes = await apiFetch('/api/me', { method: 'DELETE' });
    assert.equal(delRes.status, 200);
    assert.equal(mock.tables.users.length, 0);
    assert.equal(mock.tables.workers.length, 0);
    assert.equal(mock.authUsers.has(userId), false);
    assert.equal(mock.buckets['nkabom-media'].size, 0);
    assert.equal(mock.buckets['nkabom-verifications'].size, 0);
  } finally {
    delete process.env.CRON_SECRET;
    server.close();
  }
});

test('Vercel serverless handler (api/index.js) loads without calling listen and serves requests', async () => {
  const serverlessHandler = require('../api/index.js');
  assert.equal(typeof serverlessHandler, 'function');

  const server = http.createServer(serverlessHandler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/config`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.paystackConfigured, 'boolean');
  } finally {
    server.close();
  }
});
