const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const {
  computeSubscriptionStatus,
  computeExtendedPaidUntil,
  computeProfileStrength,
  normalizePhoneDigits,
  isWorkerVisible,
  formatMonthYear,
  getPlanConfig,
  slugifyWorkerBase,
  formatRelativeFreshness,
  buildAnalyticsSummary,
  normalizeClientPassCode,
  cleanPlainText,
  DAY_MS,
} = require('../rules');
const { generateToken, hashToken, hashPassword, verifyPassword } = require('../security');
const { formatVerificationDTO } = require('./sqlite');

function assertSuccess(result, context) {
  if (result && result.error) {
    const err = new Error(result.error.message || context || 'Database operation failed.');
    err.code = result.error.code;
    err.status = result.error.status;
    throw err;
  }
  return result ? result.data : null;
}

function safeSegment(seg) {
  const s = String(seg || '').trim();
  if (!s || s.includes('..') || s.includes('/') || s.includes('\\')) {
    throw new Error('Invalid storage path segment');
  }
  return s;
}

function contentTypeFromPath(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function mapUserDTO(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    termsAcceptedAt: row.terms_accepted_at,
    termsVersion: row.terms_version,
    createdAt: row.created_at,
  };
}

function createSupabaseStore({
  url,
  anonKey,
  serviceRoleKey,
  mediaBucket = 'nkabom-media',
  verificationsBucket = 'nkabom-verifications',
  clientFactory = createClient,
} = {}) {
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase mode.');
  }

  const clientOpts = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  };

  const adminClient = clientFactory(url, serviceRoleKey, clientOpts);
  const authClient = clientFactory(url, anonKey || serviceRoleKey, clientOpts);

  async function removeStorageObjects(bucket, paths) {
    const valid = (paths || []).filter(Boolean);
    if (!valid.length) return;
    await adminClient.storage.from(bucket).remove(valid).catch(() => {});
  }

  async function fetchWorkerMetricsMap(workerIds) {
    const map = new Map();
    for (const id of workerIds) {
      map.set(id, { rating: 0, reviews: 0, blazes: 0, testimonials: [], portfolio: [] });
    }
    if (!workerIds.length) return map;

    const [fbRes, pfRes] = await Promise.all([
      adminClient
        .from('feedback')
        .select('worker_id, blaze, rating, testimonial, client_name, created_at')
        .in('worker_id', workerIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      adminClient
        .from('portfolio_items')
        .select('id, worker_id, image_url, title, created_at')
        .in('worker_id', workerIds)
        .order('created_at', { ascending: false }),
    ]);

    const feedbackRows = assertSuccess(fbRes, 'Failed to load feedback metrics') || [];
    const portfolioRows = assertSuccess(pfRes, 'Failed to load portfolio items') || [];

    const ratingSums = new Map();
    for (const fb of feedbackRows) {
      const m = map.get(fb.worker_id);
      if (!m) continue;
      if (fb.rating !== null && fb.rating !== undefined) {
        m.reviews += 1;
        ratingSums.set(fb.worker_id, (ratingSums.get(fb.worker_id) || 0) + Number(fb.rating));
      }
      if (Number(fb.blaze) === 1) {
        m.blazes += 1;
      }
      if (fb.testimonial && String(fb.testimonial).trim() && m.testimonials.length < 20) {
        m.testimonials.push({
          name: fb.client_name || 'A client',
          rating: fb.rating || 0,
          text: fb.testimonial,
          date: formatMonthYear(fb.created_at),
        });
      }
    }

    for (const [wid, m] of map.entries()) {
      if (m.reviews > 0) {
        m.rating = Number(((ratingSums.get(wid) || 0) / m.reviews).toFixed(1));
      }
    }

    for (const pf of portfolioRows) {
      const m = map.get(pf.worker_id);
      if (m && m.portfolio.length < 12) {
        m.portfolio.push({
          id: pf.id,
          image_url: pf.image_url,
          title: pf.title,
          created_at: pf.created_at,
        });
      }
    }

    return map;
  }

  function assembleWorkerDTO(workerRow, metrics) {
    if (!workerRow) return null;
    const m = metrics || { rating: 0, reviews: 0, blazes: 0, testimonials: [], portfolio: [] };
    return {
      id: workerRow.id,
      slug: workerRow.slug || null,
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
      freshnessLabel: formatRelativeFreshness(
        workerRow.last_active_at || workerRow.availability_updated_at || workerRow.updated_at
      ),
      rateNote: workerRow.rate_note || '',
      photo: workerRow.photo_url || null,
      verified: Boolean(workerRow.verified),
      tint: Number(workerRow.tint || 0),
      rating: m.rating,
      reviews: m.reviews,
      blazes: m.blazes,
      testimonials: m.testimonials,
      portfolio: m.portfolio,
    };
  }

  async function buildSingleWorkerDTO(workerRow) {
    if (!workerRow) return null;
    const map = await fetchWorkerMetricsMap([workerRow.id]);
    return assembleWorkerDTO(workerRow, map.get(workerRow.id));
  }

  async function allocateUniqueSlug(name, area, fallbackId, excludeWorkerId = null) {
    const base = slugifyWorkerBase(name, area, fallbackId);
    let candidate = base;
    for (let i = 0; i < 25; i += 1) {
      if (i > 0) candidate = `${base}-${i + 1}`;
      const row = assertSuccess(
        await adminClient.from('workers').select('id').eq('slug', candidate).maybeSingle(),
        'Failed to check worker slug'
      );
      if (!row || (excludeWorkerId && row.id === excludeWorkerId)) {
        return candidate;
      }
    }
    return `${base}-${generateToken(3).toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now().toString(36)}`;
  }

  async function generateClientPassCode() {
    for (let i = 0; i < 20; i += 1) {
      const code = `USER${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = assertSuccess(
        await adminClient.from('client_passes').select('code').eq('code', code).maybeSingle(),
        'Failed to check client pass code'
      );
      if (!exists) return code;
    }
    for (let i = 0; i < 20; i += 1) {
      const code = `USER${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = assertSuccess(
        await adminClient.from('client_passes').select('code').eq('code', code).maybeSingle(),
        'Failed to check client pass code'
      );
      if (!exists) return code;
    }
    return `USER${Date.now().toString().slice(-6)}`;
  }

  async function resolveClientPassRow(passCookie) {
    if (!passCookie) return null;
    const th = hashToken(passCookie);
    return assertSuccess(
      await adminClient.from('client_passes').select('*').eq('token_hash', th).maybeSingle(),
      'Failed to load client pass'
    );
  }

  async function listClientSearches(passCode) {
    const rows = assertSuccess(
      await adminClient
        .from('client_pass_searches')
        .select('id, query, location, category, searched_at')
        .eq('pass_code', passCode)
        .order('searched_at', { ascending: false })
        .limit(15),
      'Failed to load search history'
    ) || [];
    return rows.map((r) => ({
      id: r.id,
      query: r.query || '',
      location: r.location || '',
      category: r.category || '',
      searchedAt: r.searched_at,
    }));
  }

  async function listClientBookmarkPayload(passCode) {
    const rows = assertSuccess(
      await adminClient
        .from('client_pass_bookmarks')
        .select('worker_id')
        .eq('pass_code', passCode)
        .order('created_at', { ascending: false })
        .limit(50),
      'Failed to load client bookmarks'
    ) || [];
    const bookmarkIds = rows.map((r) => r.worker_id);
    const savedWorkers = bookmarkIds.length
      ? (await listVisibleWorkers({ ids: bookmarkIds, page: 1, pageSize: 50 })).items
      : [];
    return { bookmarkIds, savedWorkers };
  }

  async function buildClientPassPayload(passRow) {
    const [searches, bmPayload] = await Promise.all([
      listClientSearches(passRow.code),
      listClientBookmarkPayload(passRow.code),
    ]);
    return {
      code: passRow.code,
      hasPin: Boolean(passRow.recovery_pin_hash),
      searches,
      bookmarkIds: bmPayload.bookmarkIds,
      savedWorkers: bmPayload.savedWorkers,
    };
  }

  async function logAdminAudit({ action, targetType, targetId, details = {} }) {
    const id = 'aud_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    await adminClient.from('admin_audit_logs').insert({
      id,
      action,
      target_type: targetType,
      target_id: String(targetId),
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  }

  async function listVisibleWorkers(filters = {}) {
    const {
      q = '',
      category = '',
      area = '',
      verifiedOnly = false,
      availableOnly = false,
      minRating = 0,
      ids = null,
      sort = 'rating',
      page = 1,
      pageSize = 12,
    } = filters;

    const now = new Date();
    const workersData = assertSuccess(
      await adminClient
        .from('workers')
        .select('*, subscriptions(trial_ends_at, paid_until)')
        .eq('status', 'active'),
      'Failed to list workers'
    ) || [];

    const visibleRows = [];
    const allCategories = new Set();
    const allCities = new Set();

    for (const row of workersData) {
      const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      if (!isWorkerVisible(row, sub, now)) continue;
      if (row.category) allCategories.add(row.category);
      const parts = String(row.area || '').split(/[,/]+/);
      for (const part of parts) {
        const city = part.split(' – ')[0].split('-')[0].trim();
        if (city) allCities.add(city);
      }
      visibleRows.push(row);
    }

    const metricsMap = await fetchWorkerMetricsMap(visibleRows.map((r) => r.id));
    const visible = visibleRows.map((row) => assembleWorkerDTO(row, metricsMap.get(row.id)));

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

  return {
    mode: 'supabase',

    async signupWithPassword({ name, phone, email, password, termsVersion, nowIso }) {
      const existing = assertSuccess(
        await adminClient.from('users').select('id').eq('email', email).maybeSingle(),
        'Failed to check existing user'
      );
      if (existing) {
        return {
          status: 409,
          error: 'An account with this email already exists. Try logging in instead.',
        };
      }

      const createdAuth = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone },
      });

      if (createdAuth.error) {
        const msg = String(createdAuth.error.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
          return {
            status: 409,
            error: 'An account with this email already exists. Try logging in instead.',
          };
        }
        return {
          status: 400,
          error: createdAuth.error.message || 'Unable to create account.',
        };
      }

      const userId = createdAuth.data.user.id;
      const insertRes = await adminClient.from('users').insert({
        id: userId,
        name,
        phone,
        email,
        password_hash: 'supabase_auth',
        terms_accepted_at: nowIso,
        terms_version: termsVersion,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (insertRes.error) {
        await adminClient.auth.admin.deleteUser(userId).catch(() => {});
        throw new Error(insertRes.error.message || 'Failed to save account record.');
      }

      const signInRes = await authClient.auth.signInWithPassword({ email, password });
      if (signInRes.error || !signInRes.data?.session) {
        throw new Error(signInRes.error?.message || 'Account created, but session initialization failed.');
      }

      return {
        user: {
          id: userId,
          name,
          phone,
          email,
          termsAcceptedAt: nowIso,
          termsVersion,
        },
        sessionToken: signInRes.data.session.access_token,
        refreshToken: signInRes.data.session.refresh_token || null,
      };
    },

    async loginWithPassword({ email, password }) {
      const signInRes = await authClient.auth.signInWithPassword({ email, password });
      if (signInRes.error || !signInRes.data?.user || !signInRes.data?.session) {
        return { status: 401, error: 'Incorrect email or password.' };
      }

      const authUser = signInRes.data.user;
      let row = assertSuccess(
        await adminClient
          .from('users')
          .select('id, name, phone, email, terms_accepted_at, terms_version, created_at')
          .eq('id', authUser.id)
          .maybeSingle(),
        'Failed to load user profile'
      );

      if (!row) {
        const nowIso = new Date().toISOString();
        const meta = authUser.user_metadata || {};
        const fallback = {
          id: authUser.id,
          name: String(meta.name || authUser.email?.split('@')[0] || 'Nkabom User').slice(0, 80),
          phone: String(meta.phone || '0000000000').slice(0, 25),
          email: String(authUser.email || email).toLowerCase(),
          password_hash: 'supabase_auth',
          terms_accepted_at: nowIso,
          terms_version: '22 November 2026',
          created_at: nowIso,
          updated_at: nowIso,
        };
        assertSuccess(await adminClient.from('users').insert(fallback), 'Failed to sync user record');
        row = fallback;
      }

      try {
        await adminClient.from('workers').update({ last_active_at: new Date().toISOString() }).eq('user_id', row.id);
      } catch {}

      return {
        user: mapUserDTO(row),
        sessionToken: signInRes.data.session.access_token,
        refreshToken: signInRes.data.session.refresh_token || null,
      };
    },

    async resolveSession({ accessToken, refreshToken }) {
      if (!accessToken && !refreshToken) return { user: null };

      if (accessToken) {
        const { data, error } = await adminClient.auth.getUser(accessToken);
        if (!error && data?.user) {
          const row = assertSuccess(
            await adminClient
              .from('users')
              .select('id, name, phone, email, terms_accepted_at, terms_version, created_at')
              .eq('id', data.user.id)
              .maybeSingle(),
            'Failed to load user'
          );
          if (row) {
            return { user: mapUserDTO(row), accessToken };
          }
        }
      }

      if (refreshToken) {
        const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
        if (!error && data?.session && data?.user) {
          const row = assertSuccess(
            await adminClient
              .from('users')
              .select('id, name, phone, email, terms_accepted_at, terms_version, created_at')
              .eq('id', data.user.id)
              .maybeSingle(),
            'Failed to load refreshed user'
          );
          if (row) {
            return {
              user: mapUserDTO(row),
              refreshedAccessToken: data.session.access_token,
              refreshedRefreshToken: data.session.refresh_token || refreshToken,
            };
          }
        }
      }

      return { user: null, expired: true };
    },

    async logoutSession({ accessToken }) {
      if (accessToken && typeof adminClient.auth?.admin?.signOut === 'function') {
        await adminClient.auth.admin.signOut(accessToken, 'local').catch(() => {});
      }
    },

    async requestPasswordReset({ email, ttlMs }) {
      const user = assertSuccess(
        await adminClient
          .from('users')
          .select('id, name, email, password_hash')
          .eq('email', email)
          .maybeSingle(),
        'Failed to look up user for reset'
      );
      if (!user || user.password_hash === '!seeded_demo!') return null;

      const token = generateToken(24);
      const tokenHash = hashToken(token);
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();

      assertSuccess(
        await adminClient.from('password_resets').insert({
          token_hash: tokenHash,
          user_id: user.id,
          expires_at: expiresAt,
          used_at: null,
          created_at: nowIso,
        }),
        'Failed to create reset token'
      );

      return { user, token, tokenHash };
    },

    async resetPasswordWithToken({ token, newPassword }) {
      const tokenHash = hashToken(token);
      const row = assertSuccess(
        await adminClient
          .from('password_resets')
          .select('*')
          .eq('token_hash', tokenHash)
          .maybeSingle(),
        'Failed to load password reset'
      );
      if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
        return { status: 400, error: 'This password reset link is invalid or has expired.' };
      }

      const updAuth = await adminClient.auth.admin.updateUserById(row.user_id, { password: newPassword });
      if (updAuth.error) {
        return { status: 400, error: updAuth.error.message || 'Could not update password.' };
      }

      const nowIso = new Date().toISOString();
      await adminClient.from('password_resets').update({ used_at: nowIso }).eq('token_hash', tokenHash);
      await adminClient.from('users').update({ updated_at: nowIso }).eq('id', row.user_id);
      return { ok: true };
    },

    async updateUserProfile({ userId, name, phone, nowIso }) {
      const row = assertSuccess(
        await adminClient
          .from('users')
          .update({ name, phone, updated_at: nowIso })
          .eq('id', userId)
          .select('id, name, phone, email, terms_accepted_at, terms_version, created_at')
          .single(),
        'Failed to update profile'
      );
      await adminClient.auth.admin.updateUserById(userId, { user_metadata: { name, phone } }).catch(() => {});
      return mapUserDTO(row);
    },

    async changeUserPassword({ userId, email, currentPassword, newPassword }) {
      const checkRes = await authClient.auth.signInWithPassword({ email, password: currentPassword });
      if (checkRes.error || !checkRes.data?.user || checkRes.data.user.id !== userId) {
        return { status: 401, error: 'Current password is incorrect.' };
      }

      const updRes = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
      if (updRes.error) {
        return { status: 400, error: updRes.error.message || 'Unable to update password.' };
      }

      await adminClient.from('users').update({ updated_at: new Date().toISOString() }).eq('id', userId);
      const fresh = await authClient.auth.signInWithPassword({ email, password: newPassword });
      return {
        ok: true,
        sessionToken: fresh.data?.session?.access_token || null,
        refreshToken: fresh.data?.session?.refresh_token || null,
      };
    },

    async exportUserData(userId) {
      const userRow = assertSuccess(
        await adminClient
          .from('users')
          .select('id, name, phone, email, terms_accepted_at, terms_version, trial_claimed_at, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle(),
        'Failed to export account'
      );

      const workerRow = assertSuccess(
        await adminClient
          .from('workers')
          .select('id, slug, type, name, category, area, phone, years, bio, availability, availability_note, availability_updated_at, last_active_at, rate_note, photo_url, verified, status, published_at, created_at, updated_at')
          .eq('user_id', userId)
          .maybeSingle(),
        'Failed to export worker'
      );

      const [portfolio, subscription, payments, verificationRequests, bookmarks] = await Promise.all([
        workerRow
          ? adminClient.from('portfolio_items').select('id, image_url, title, created_at').eq('worker_id', workerRow.id).order('created_at', { ascending: false }).then((r) => assertSuccess(r) || [])
          : Promise.resolve([]),
        workerRow
          ? adminClient.from('subscriptions').select('trial_ends_at, paid_until, updated_at').eq('worker_id', workerRow.id).maybeSingle().then((r) => assertSuccess(r))
          : Promise.resolve(null),
        workerRow
          ? adminClient.from('payments').select('id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end').eq('worker_id', workerRow.id).order('paid_at', { ascending: false }).then((r) => assertSuccess(r) || [])
          : Promise.resolve([]),
        workerRow
          ? adminClient.from('verification_requests').select('id, doc_type, doc_ref, notes, status, admin_note, created_at, reviewed_at').eq('worker_id', workerRow.id).order('created_at', { ascending: false }).then((r) => assertSuccess(r) || [])
          : Promise.resolve([]),
        adminClient.from('bookmarks').select('worker_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).then((r) => assertSuccess(r) || []),
      ]);

      return {
        exportedAt: new Date().toISOString(),
        account: userRow,
        workerProfile: workerRow || null,
        portfolio,
        subscription,
        payments,
        verificationRequests,
        bookmarks,
      };
    },

    async deleteUserAccount(userId) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id, photo_path').eq('user_id', userId).maybeSingle(),
        'Failed to inspect worker before delete'
      );

      if (worker) {
        const [pfRows, vrRows] = await Promise.all([
          adminClient.from('portfolio_items').select('storage_path').eq('worker_id', worker.id).then((r) => assertSuccess(r) || []),
          adminClient.from('verification_requests').select('doc_path').eq('worker_id', worker.id).then((r) => assertSuccess(r) || []),
        ]);
        await removeStorageObjects(mediaBucket, [worker.photo_path, ...pfRows.map((p) => p.storage_path)]);
        await removeStorageObjects(verificationsBucket, vrRows.map((v) => v.doc_path));
      }

      assertSuccess(await adminClient.from('users').delete().eq('id', userId), 'Failed to delete user record');
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    },

    listVisibleWorkers,

    async getMarketplaceStats() {
      const { items, total } = await listVisibleWorkers({ sort: 'rating', page: 1, pageSize: 50 });
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
    },

    async getPublicWorker(idOrSlug) {
      const key = String(idOrSlug || '').trim();
      if (!key) return null;
      let row = assertSuccess(
        await adminClient
          .from('workers')
          .select('*, subscriptions(trial_ends_at, paid_until)')
          .eq('id', key)
          .maybeSingle(),
        'Failed to load worker'
      );
      if (!row) {
        row = assertSuccess(
          await adminClient
            .from('workers')
            .select('*, subscriptions(trial_ends_at, paid_until)')
            .eq('slug', key)
            .maybeSingle(),
          'Failed to load worker by slug'
        );
      }
      if (!row) return null;
      const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      if (!isWorkerVisible(row, sub, new Date())) return null;
      return buildSingleWorkerDTO(row);
    },

    async trackWorkerEvent({ workerId, eventType, nowIso }) {
      const key = String(workerId || '').trim();
      if (!key) return false;
      let row = assertSuccess(
        await adminClient
          .from('workers')
          .select('id, status, subscriptions(trial_ends_at, paid_until)')
          .eq('id', key)
          .maybeSingle(),
        'Failed to verify worker for event'
      );
      if (!row) {
        row = assertSuccess(
          await adminClient
            .from('workers')
            .select('id, status, subscriptions(trial_ends_at, paid_until)')
            .eq('slug', key)
            .maybeSingle(),
          'Failed to verify worker by slug'
        );
      }
      if (!row) return false;
      const sub = Array.isArray(row.subscriptions) ? row.subscriptions[0] : row.subscriptions;
      if (!isWorkerVisible(row, sub, new Date())) return false;

      const evtId = 'evt_' + generateToken(10);
      assertSuccess(
        await adminClient.from('worker_events').insert({
          id: evtId,
          worker_id: row.id,
          event_type: eventType,
          created_at: nowIso,
        }),
        'Failed to record worker event'
      );
      return true;
    },

    async createReport({ workerId, reason, contact, nowIso }) {
      const exists = assertSuccess(
        await adminClient.from('workers').select('id').eq('id', workerId).maybeSingle(),
        'Failed to check worker'
      );
      if (!exists) return null;
      const id = 'rep_' + generateToken(10);
      assertSuccess(
        await adminClient.from('reports').insert({
          id,
          worker_id: workerId,
          reporter_contact: contact,
          reason,
          status: 'open',
          created_at: nowIso,
        }),
        'Failed to create report'
      );
      return { id };
    },

    async getMyWorker(userId) {
      const row = assertSuccess(
        await adminClient.from('workers').select('*').eq('user_id', userId).maybeSingle(),
        'Failed to load worker profile'
      );
      return buildSingleWorkerDTO(row);
    },

    async upsertMyWorker({ userId, data, trialDays, now }) {
      const nowIso = now.toISOString();
      const existing = assertSuccess(
        await adminClient.from('workers').select('*').eq('user_id', userId).maybeSingle(),
        'Failed to check worker profile'
      );

      if (existing) {
        const slug = existing.slug || (await allocateUniqueSlug(data.name, data.area, existing.id, existing.id));
        const availabilityNote = data.availabilityNote || '';
        const availChanged = existing.availability !== data.availability || (existing.availability_note || '') !== availabilityNote;
        const availUpdatedAt = availChanged || !existing.availability_updated_at
          ? nowIso
          : existing.availability_updated_at;

        const updated = assertSuccess(
          await adminClient
            .from('workers')
            .update({
              slug,
              type: data.type,
              name: data.name,
              category: data.category,
              area: data.area,
              phone: data.phone,
              years: data.years,
              bio: data.bio,
              availability: data.availability,
              availability_note: availabilityNote,
              availability_updated_at: availUpdatedAt,
              last_active_at: nowIso,
              rate_note: data.rateNote,
              updated_at: nowIso,
            })
            .eq('id', existing.id)
            .eq('user_id', userId)
            .select('*')
            .single(),
          'Failed to update worker profile'
        );
        return { created: false, worker: await buildSingleWorkerDTO(updated) };
      }

      const normPhone = normalizePhoneDigits(data.phone);
      const userRow = assertSuccess(
        await adminClient.from('users').select('trial_claimed_at').eq('id', userId).maybeSingle(),
        'Failed to check trial eligibility'
      );
      const phoneUsedTrial = normPhone
        ? assertSuccess(
          await adminClient.from('trial_phone_claims').select('user_id').eq('normalized_phone', normPhone).maybeSingle(),
          'Failed to check phone trial claim'
        )
        : null;

      const alreadyClaimed = Boolean(userRow?.trial_claimed_at) || Boolean(phoneUsedTrial);
      const trialEndsAt = alreadyClaimed
        ? nowIso
        : new Date(now.getTime() + trialDays * DAY_MS).toISOString();

      const workerId = 'w_' + generateToken(10);
      const slug = await allocateUniqueSlug(data.name, data.area, workerId, null);
      const tint = Math.floor(Math.random() * 6);
      const availabilityNote = data.availabilityNote || '';

      const created = assertSuccess(
        await adminClient
          .from('workers')
          .insert({
            id: workerId,
            user_id: userId,
            slug,
            type: data.type,
            name: data.name,
            category: data.category,
            area: data.area,
            phone: data.phone,
            years: data.years,
            bio: data.bio,
            availability: data.availability,
            availability_note: availabilityNote,
            availability_updated_at: nowIso,
            last_active_at: nowIso,
            rate_note: data.rateNote,
            photo_url: null,
            photo_path: null,
            verified: 0,
            status: 'active',
            tint,
            published_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('*')
          .single(),
        'Failed to create worker profile'
      );

      assertSuccess(
        await adminClient.from('subscriptions').insert({
          worker_id: workerId,
          trial_ends_at: trialEndsAt,
          paid_until: trialEndsAt,
          updated_at: nowIso,
        }),
        'Failed to create trial subscription'
      );

      if (!alreadyClaimed) {
        await adminClient
          .from('users')
          .update({ trial_claimed_at: nowIso })
          .eq('id', userId)
          .is('trial_claimed_at', null);
      }

      if (normPhone && !phoneUsedTrial) {
        await adminClient.from('trial_phone_claims').upsert(
          { normalized_phone: normPhone, user_id: userId, claimed_at: nowIso },
          { onConflict: 'normalized_phone', ignoreDuplicates: true }
        );
      }

      return { created: true, worker: await buildSingleWorkerDTO(created) };
    },

    async patchMyAvailability({ userId, availability, availabilityNote, nowIso }) {
      const existing = assertSuccess(
        await adminClient.from('workers').select('id').eq('user_id', userId).maybeSingle(),
        'Failed to load worker profile'
      );
      if (!existing) {
        return { status: 404, error: 'Publish your worker profile first before updating availability.' };
      }
      const updated = assertSuccess(
        await adminClient
          .from('workers')
          .update({
            availability,
            availability_note: availabilityNote || '',
            availability_updated_at: nowIso,
            last_active_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', existing.id)
          .eq('user_id', userId)
          .select('*')
          .single(),
        'Failed to update availability'
      );
      return { worker: await buildSingleWorkerDTO(updated) };
    },

    async deleteMyWorker(userId) {
      const existing = assertSuccess(
        await adminClient.from('workers').select('id, photo_path').eq('user_id', userId).maybeSingle(),
        'Failed to load worker profile'
      );
      if (!existing) return;

      const [pfRows, vrRows] = await Promise.all([
        adminClient.from('portfolio_items').select('storage_path').eq('worker_id', existing.id).then((r) => assertSuccess(r) || []),
        adminClient.from('verification_requests').select('doc_path').eq('worker_id', existing.id).then((r) => assertSuccess(r) || []),
      ]);

      assertSuccess(
        await adminClient.from('workers').delete().eq('id', existing.id).eq('user_id', userId),
        'Failed to delete worker profile'
      );

      await removeStorageObjects(mediaBucket, [existing.photo_path, ...pfRows.map((p) => p.storage_path)]);
      await removeStorageObjects(verificationsBucket, vrRows.map((v) => v.doc_path));
    },

    async uploadWorkerPhoto({ userId, buffer, ext, mime }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('*').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) {
        return { status: 400, error: 'Save your worker profile first before uploading a photo.' };
      }

      const safeUser = safeSegment(userId);
      const filename = `profile_${generateToken(8)}.${ext}`;
      const storagePath = `${safeUser}/${filename}`;

      const upRes = await adminClient.storage.from(mediaBucket).upload(storagePath, buffer, {
        contentType: mime,
        upsert: true,
      });
      if (upRes.error) {
        throw new Error(upRes.error.message || 'Failed to upload profile photo.');
      }

      if (worker.photo_path) {
        await removeStorageObjects(mediaBucket, [worker.photo_path]);
      }

      const pub = adminClient.storage.from(mediaBucket).getPublicUrl(storagePath);
      const url = pub?.data?.publicUrl || '';

      assertSuccess(
        await adminClient
          .from('workers')
          .update({ photo_url: url, photo_path: storagePath, updated_at: new Date().toISOString() })
          .eq('id', worker.id),
        'Failed to save worker photo URL'
      );

      return { url };
    },

    async addPortfolioPhoto({ userId, buffer, ext, mime, title }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) {
        return { status: 400, error: 'Save your worker profile first before adding portfolio photos.' };
      }

      const countRes = await adminClient
        .from('portfolio_items')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', worker.id);
      if (countRes.error) throw new Error(countRes.error.message);
      if ((countRes.count || 0) >= 12) {
        return { status: 400, error: 'You can upload up to 12 portfolio photos.' };
      }

      const safeUser = safeSegment(userId);
      const filename = `port_${generateToken(8)}.${ext}`;
      const storagePath = `${safeUser}/${filename}`;

      const upRes = await adminClient.storage.from(mediaBucket).upload(storagePath, buffer, {
        contentType: mime,
        upsert: true,
      });
      if (upRes.error) {
        throw new Error(upRes.error.message || 'Failed to upload portfolio photo.');
      }

      const pub = adminClient.storage.from(mediaBucket).getPublicUrl(storagePath);
      const item = {
        id: 'pf_' + generateToken(10),
        worker_id: worker.id,
        image_url: pub?.data?.publicUrl || '',
        storage_path: storagePath,
        title,
        created_at: new Date().toISOString(),
      };

      assertSuccess(await adminClient.from('portfolio_items').insert(item), 'Failed to save portfolio photo');
      return {
        item: {
          id: item.id,
          image_url: item.image_url,
          title: item.title,
          created_at: item.created_at,
        },
      };
    },

    async deletePortfolioPhoto({ userId, itemId }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return { status: 404, error: 'Worker profile not found.' };

      const item = assertSuccess(
        await adminClient.from('portfolio_items').select('*').eq('id', itemId).eq('worker_id', worker.id).maybeSingle(),
        'Failed to load portfolio item'
      );
      if (!item) return { status: 404, error: 'Portfolio photo not found.' };

      assertSuccess(
        await adminClient.from('portfolio_items').delete().eq('id', item.id).eq('worker_id', worker.id),
        'Failed to delete portfolio item'
      );
      await removeStorageObjects(mediaBucket, [item.storage_path]);
      return { ok: true };
    },

    async getWorkerAnalytics(userId) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('*').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) {
        return {
          ...buildAnalyticsSummary([]),
          inviteCount: 0,
          usedInviteCount: 0,
          strength: computeProfileStrength(null, { portfolioCount: 0, inviteCount: 0 }),
        };
      }

      const [events, invites, pfRes] = await Promise.all([
        adminClient.from('worker_events').select('event_type, created_at').eq('worker_id', worker.id).then((r) => assertSuccess(r) || []),
        adminClient.from('feedback_invites').select('used_at').eq('worker_id', worker.id).then((r) => assertSuccess(r) || []),
        adminClient.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('worker_id', worker.id),
      ]);

      const summary = buildAnalyticsSummary(events, new Date());
      const inviteCount = invites.length;
      const usedInviteCount = invites.filter((i) => Boolean(i.used_at)).length;
      const portfolioCount = pfRes?.count || 0;

      return {
        ...summary,
        inviteCount,
        usedInviteCount,
        strength: computeProfileStrength(worker, { portfolioCount, inviteCount }),
      };
    },

    async getLatestVerificationRequest(userId) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id, verified').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return { latest: null };

      const row = assertSuccess(
        await adminClient
          .from('verification_requests')
          .select('*')
          .eq('worker_id', worker.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        'Failed to load verification status'
      );
      return { latest: formatVerificationDTO(row) };
    },

    async createVerificationRequest({ userId, docType, docRef, notes, file }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id, verified').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) {
        return { status: 400, error: 'Publish your worker profile first before requesting verification.' };
      }
      if (worker.verified) {
        return { status: 409, error: 'Your profile is already ID verified.' };
      }

      const pending = assertSuccess(
        await adminClient
          .from('verification_requests')
          .select('id')
          .eq('worker_id', worker.id)
          .eq('status', 'pending')
          .maybeSingle(),
        'Failed to check pending verification'
      );
      if (pending) {
        return { status: 409, error: 'You already have a verification request awaiting review.' };
      }

      let docRelPath = null;
      if (file) {
        const safeUser = safeSegment(userId);
        const filename = `id_${generateToken(10)}.${file.ext}`;
        docRelPath = `${safeUser}/${filename}`;
        const upRes = await adminClient.storage.from(verificationsBucket).upload(docRelPath, file.buffer, {
          contentType: file.mime,
          upsert: true,
        });
        if (upRes.error) {
          throw new Error(upRes.error.message || 'Failed to upload verification document.');
        }
      } else if (!docRef) {
        return { status: 400, error: 'Please enter your document reference number or upload an ID photo.' };
      }

      const id = 'vr_' + generateToken(10);
      const nowIso = new Date().toISOString();
      const created = assertSuccess(
        await adminClient
          .from('verification_requests')
          .insert({
            id,
            worker_id: worker.id,
            doc_type: docType,
            doc_ref: docRef,
            doc_path: docRelPath,
            notes,
            status: 'pending',
            admin_note: '',
            created_at: nowIso,
            reviewed_at: null,
          })
          .select('*')
          .single(),
        'Failed to submit verification request'
      );

      return { latest: formatVerificationDTO(created) };
    },

    async listBookmarks(userId) {
      const rows = assertSuccess(
        await adminClient
          .from('bookmarks')
          .select('worker_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        'Failed to list bookmarks'
      ) || [];
      const ids = rows.map((r) => r.worker_id);
      const items = ids.length ? (await listVisibleWorkers({ ids, page: 1, pageSize: 50 })).items : [];
      return { ids, items };
    },

    async addBookmarks({ userId, workerIds, nowIso }) {
      const cleanIds = [...new Set(workerIds.filter(Boolean))];
      if (cleanIds.length) {
        const existingWorkers = assertSuccess(
          await adminClient.from('workers').select('id').in('id', cleanIds),
          'Failed to verify bookmarked workers'
        ) || [];
        const validIds = existingWorkers.map((w) => ({ user_id: userId, worker_id: w.id, created_at: nowIso }));
        if (validIds.length) {
          await adminClient.from('bookmarks').upsert(validIds, { onConflict: 'user_id,worker_id', ignoreDuplicates: true });
        }
      }
      const rows = assertSuccess(
        await adminClient.from('bookmarks').select('worker_id').eq('user_id', userId).order('created_at', { ascending: false }),
        'Failed to read bookmarks'
      ) || [];
      return { ids: rows.map((r) => r.worker_id) };
    },

    async removeBookmark({ userId, workerId }) {
      assertSuccess(
        await adminClient.from('bookmarks').delete().eq('user_id', userId).eq('worker_id', workerId),
        'Failed to remove bookmark'
      );
      const rows = assertSuccess(
        await adminClient.from('bookmarks').select('worker_id').eq('user_id', userId).order('created_at', { ascending: false }),
        'Failed to read bookmarks'
      ) || [];
      return { ids: rows.map((r) => r.worker_id) };
    },

    async getOrInitClientPass({ passCookie, nowIso }) {
      const existing = await resolveClientPassRow(passCookie);
      if (existing) {
        await adminClient.from('client_passes').update({ last_seen_at: nowIso }).eq('code', existing.code);
        return { pass: await buildClientPassPayload(existing), newCookieToken: null };
      }
      const code = await generateClientPassCode();
      const rawToken = generateToken(24);
      const tokenHash = hashToken(rawToken);
      assertSuccess(
        await adminClient.from('client_passes').insert({
          code,
          token_hash: tokenHash,
          recovery_pin_hash: null,
          created_at: nowIso,
          last_seen_at: nowIso,
        }),
        'Failed to initialize client pass'
      );
      return {
        pass: { code, hasPin: false, searches: [], bookmarkIds: [], savedWorkers: [] },
        newCookieToken: rawToken,
      };
    },

    async setClientPassPin({ passCookie, pin, nowIso }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      const pinHash = hashPassword(pin);
      assertSuccess(
        await adminClient
          .from('client_passes')
          .update({ recovery_pin_hash: pinHash, last_seen_at: nowIso })
          .eq('code', existing.code),
        'Failed to save Sync PIN'
      );
      return { ok: true, hasPin: true, code: existing.code };
    },

    async restoreClientPass({ code, pin, nowIso }) {
      const normalized = normalizeClientPassCode(code);
      if (!normalized) {
        return { status: 401, error: 'Invalid Client Pass ID or Sync PIN.' };
      }
      const row = assertSuccess(
        await adminClient.from('client_passes').select('*').eq('code', normalized).maybeSingle(),
        'Failed to look up client pass'
      );
      if (!row || !row.recovery_pin_hash || !verifyPassword(pin, row.recovery_pin_hash)) {
        return { status: 401, error: 'Invalid Client Pass ID or Sync PIN.' };
      }
      const rawToken = generateToken(24);
      const tokenHash = hashToken(rawToken);
      assertSuccess(
        await adminClient
          .from('client_passes')
          .update({ token_hash: tokenHash, last_seen_at: nowIso })
          .eq('code', row.code),
        'Failed to restore client pass'
      );
      return {
        pass: await buildClientPassPayload(row),
        newCookieToken: rawToken,
      };
    },

    async recordClientSearch({ passCookie, query, location, category, nowIso }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      const q = cleanPlainText(query, 80);
      const loc = cleanPlainText(location, 80);
      const cat = cleanPlainText(category, 40);
      if (!q && !loc && !cat) {
        return { searches: await listClientSearches(existing.code) };
      }

      const existingRows = assertSuccess(
        await adminClient
          .from('client_pass_searches')
          .select('id, query, location, category, searched_at')
          .eq('pass_code', existing.code)
          .order('searched_at', { ascending: false }),
        'Failed to inspect client searches'
      ) || [];

      const qLow = q.toLowerCase();
      const locLow = loc.toLowerCase();
      const catLow = cat.toLowerCase();
      const dupIds = existingRows
        .filter((r) =>
          String(r.query || '').toLowerCase() === qLow
          && String(r.location || '').toLowerCase() === locLow
          && String(r.category || '').toLowerCase() === catLow
        )
        .map((r) => r.id);

      if (dupIds.length) {
        await adminClient.from('client_pass_searches').delete().in('id', dupIds);
      }

      const remaining = existingRows.filter((r) => !dupIds.includes(r.id));
      if (remaining.length >= 15) {
        const overflowIds = remaining.slice(14).map((r) => r.id);
        if (overflowIds.length) {
          await adminClient.from('client_pass_searches').delete().in('id', overflowIds);
        }
      }

      const id = 'srch_' + generateToken(8);
      assertSuccess(
        await adminClient.from('client_pass_searches').insert({
          id,
          pass_code: existing.code,
          query: q,
          location: loc,
          category: cat,
          searched_at: nowIso,
        }),
        'Failed to record client search'
      );
      await adminClient.from('client_passes').update({ last_seen_at: nowIso }).eq('code', existing.code);
      return { searches: await listClientSearches(existing.code) };
    },

    async deleteClientSearch({ passCookie, searchId }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      assertSuccess(
        await adminClient
          .from('client_pass_searches')
          .delete()
          .eq('pass_code', existing.code)
          .eq('id', String(searchId || '')),
        'Failed to delete search item'
      );
      return { searches: await listClientSearches(existing.code) };
    },

    async clearClientSearches({ passCookie }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      assertSuccess(
        await adminClient.from('client_pass_searches').delete().eq('pass_code', existing.code),
        'Failed to clear searches'
      );
      return { searches: [] };
    },

    async addClientBookmarks({ passCookie, workerIds, nowIso }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      const cleanIds = [...new Set((workerIds || []).filter(Boolean))];
      if (cleanIds.length) {
        const validWorkers = assertSuccess(
          await adminClient.from('workers').select('id').in('id', cleanIds),
          'Failed to verify workers for bookmark'
        ) || [];
        const rows = validWorkers.map((w) => ({ pass_code: existing.code, worker_id: w.id, created_at: nowIso }));
        if (rows.length) {
          await adminClient
            .from('client_pass_bookmarks')
            .upsert(rows, { onConflict: 'pass_code,worker_id', ignoreDuplicates: true });
        }
      }
      await adminClient.from('client_passes').update({ last_seen_at: nowIso }).eq('code', existing.code);
      return listClientBookmarkPayload(existing.code);
    },

    async removeClientBookmark({ passCookie, workerId }) {
      const existing = await resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      assertSuccess(
        await adminClient
          .from('client_pass_bookmarks')
          .delete()
          .eq('pass_code', existing.code)
          .eq('worker_id', String(workerId || '')),
        'Failed to remove client bookmark'
      );
      return listClientBookmarkPayload(existing.code);
    },

    async createFeedbackInvite({ userId, clientName, now }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) {
        return { status: 400, error: 'Publish your worker profile first before creating feedback links.' };
      }

      const sinceIso = new Date(now.getTime() - DAY_MS).toISOString();
      const countRes = await adminClient
        .from('feedback_invites')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', worker.id)
        .gte('created_at', sinceIso);
      if (countRes.error) throw new Error(countRes.error.message);
      if ((countRes.count || 0) >= 20) {
        return { status: 429, error: 'Daily limit reached: you can create up to 20 feedback links per day.' };
      }

      const id = 'inv_' + generateToken(10);
      const token = generateToken(24);
      const nowIso = now.toISOString();
      const expiresAt = new Date(now.getTime() + 30 * DAY_MS).toISOString();

      assertSuccess(
        await adminClient.from('feedback_invites').insert({
          id,
          token,
          worker_id: worker.id,
          client_name: clientName,
          created_at: nowIso,
          expires_at: expiresAt,
          used_at: null,
        }),
        'Failed to create feedback invite'
      );
      return { token, expiresAt };
    },

    async lookupFeedbackInvite({ token, viewerUserId }) {
      const invite = assertSuccess(
        await adminClient
          .from('feedback_invites')
          .select('*, workers(user_id, name, category, area, photo_url, tint, status)')
          .eq('token', token)
          .maybeSingle(),
        'Failed to lookup feedback invite'
      );

      if (!invite || !invite.workers) return { status: 404, error: 'This feedback link could not be found.' };
      const w = Array.isArray(invite.workers) ? invite.workers[0] : invite.workers;
      if (invite.used_at) return { status: 410, error: 'This link has already been used.' };
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return { status: 410, error: 'This feedback link has expired.' };
      }
      if (w.status !== 'active') {
        return { status: 404, error: 'This profile is not available right now.' };
      }
      if (viewerUserId && viewerUserId === w.user_id) {
        return { status: 403, error: 'You cannot leave feedback on your own profile.' };
      }

      return {
        worker: {
          name: w.name,
          category: w.category,
          area: w.area,
          photo: w.photo_url || null,
          tint: Number(w.tint || 0),
        },
        clientName: invite.client_name || '',
      };
    },

    async redeemFeedbackInvite({ token, viewerUserId, data, ipHash, nowIso }) {
      const invite = assertSuccess(
        await adminClient
          .from('feedback_invites')
          .select('*, workers(user_id, status)')
          .eq('token', token)
          .maybeSingle(),
        'Failed to load feedback invite'
      );

      if (!invite || !invite.workers) return { status: 404, error: 'This feedback link could not be found.' };
      const w = Array.isArray(invite.workers) ? invite.workers[0] : invite.workers;
      if (invite.used_at) return { status: 410, error: 'This link has already been used.' };
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return { status: 410, error: 'This feedback link has expired.' };
      }
      if (w.status !== 'active') return { status: 404, error: 'This profile is not available right now.' };
      if (viewerUserId && viewerUserId === w.user_id) {
        return { status: 403, error: 'You cannot leave feedback on your own profile.' };
      }

      // Atomic conditional UPDATE in Postgres ensures single-use invite guarantee under concurrency
      const claimed = assertSuccess(
        await adminClient
          .from('feedback_invites')
          .update({ used_at: nowIso })
          .eq('id', invite.id)
          .is('used_at', null)
          .select('id')
          .maybeSingle(),
        'Failed to claim feedback invite'
      );

      if (!claimed) {
        return { status: 410, error: 'This link has already been used.' };
      }

      const fbId = 'fb_' + generateToken(10);
      assertSuccess(
        await adminClient.from('feedback').insert({
          id: fbId,
          worker_id: invite.worker_id,
          invite_id: invite.id,
          blaze: data.blaze ? 1 : 0,
          rating: data.rating,
          testimonial: data.testimonial,
          client_name: data.clientName,
          status: 'published',
          ip_hash: ipHash,
          created_at: nowIso,
        }),
        'Failed to save feedback'
      );

      return { ok: true };
    },

    async getWorkerForUser(userId) {
      return assertSuccess(
        await adminClient.from('workers').select('id, name').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
    },

    async getMyBilling(userId) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id').eq('user_id', userId).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return null;

      const [sub, payments] = await Promise.all([
        adminClient.from('subscriptions').select('*').eq('worker_id', worker.id).maybeSingle().then((r) => assertSuccess(r)),
        adminClient
          .from('payments')
          .select('id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end')
          .eq('worker_id', worker.id)
          .order('paid_at', { ascending: false })
          .limit(12)
          .then((r) => assertSuccess(r) || []),
      ]);

      return {
        ...computeSubscriptionStatus(sub, new Date()),
        payments,
      };
    },

    async processVerifiedPayment({ reference, amountPesewas, currency, channel, paidAt, workerId, rawEvent }) {
      const { pricePesewas, trialDays } = getPlanConfig();
      const now = new Date();
      const nowIso = now.toISOString();

      if (currency !== 'GHS' || Number(amountPesewas) < pricePesewas) {
        throw new Error('Payment amount or currency did not match the subscription price.');
      }

      const existing = assertSuccess(
        await adminClient.from('payments').select('id').eq('paystack_reference', reference).maybeSingle(),
        'Failed to check existing payment'
      );
      if (existing) {
        const subRow = assertSuccess(
          await adminClient.from('subscriptions').select('*').eq('worker_id', workerId).maybeSingle(),
          'Failed to load subscription'
        );
        return {
          alreadyProcessed: true,
          subscription: computeSubscriptionStatus(subRow, now),
          worker: null,
        };
      }

      const workerRow = assertSuccess(
        await adminClient
          .from('workers')
          .select('id, name, users(email, phone)')
          .eq('id', workerId)
          .maybeSingle(),
        'Failed to load worker for payment'
      );
      if (!workerRow) {
        throw new Error('Worker profile not found for payment.');
      }
      const userObj = Array.isArray(workerRow.users) ? workerRow.users[0] : workerRow.users;
      const worker = {
        id: workerRow.id,
        name: workerRow.name,
        email: userObj?.email || '',
        phone: userObj?.phone || '',
      };

      const sub = assertSuccess(
        await adminClient.from('subscriptions').select('*').eq('worker_id', workerId).maybeSingle(),
        'Failed to load subscription'
      );
      const currentPaidUntil = sub ? sub.paid_until : nowIso;
      const baseMs = Math.max(now.getTime(), new Date(currentPaidUntil).getTime() || 0);
      const periodStart = new Date(baseMs).toISOString();
      const periodEnd = computeExtendedPaidUntil(currentPaidUntil, now, trialDays);

      const payId = 'pay_' + generateToken(8);
      const payInsert = await adminClient.from('payments').insert({
        id: payId,
        worker_id: workerId,
        amount_pesewas: Number(amountPesewas),
        currency,
        paystack_reference: reference,
        channel: String(channel || 'mobile_money'),
        status: 'success',
        paid_at: paidAt || nowIso,
        period_start: periodStart,
        period_end: periodEnd,
        raw_event: JSON.stringify(rawEvent || {}),
        created_at: nowIso,
      });

      if (payInsert.error) {
        if (payInsert.error.code === '23505') {
          const subRow = assertSuccess(
            await adminClient.from('subscriptions').select('*').eq('worker_id', workerId).maybeSingle(),
            'Failed to load subscription'
          );
          return {
            alreadyProcessed: true,
            subscription: computeSubscriptionStatus(subRow, now),
            worker: null,
          };
        }
        throw new Error(payInsert.error.message || 'Failed to record payment.');
      }

      const updatedSub = assertSuccess(
        await adminClient
          .from('subscriptions')
          .upsert(
            {
              worker_id: workerId,
              trial_ends_at: sub ? sub.trial_ends_at : nowIso,
              paid_until: periodEnd,
              updated_at: nowIso,
            },
            { onConflict: 'worker_id' }
          )
          .select('*')
          .single(),
        'Failed to update subscription period'
      );

      return {
        alreadyProcessed: false,
        subscription: computeSubscriptionStatus(updatedSub, now),
        worker,
        periodEnd,
      };
    },

    async hasNotificationLog({ workerId, type, channel }) {
      const row = assertSuccess(
        await adminClient
          .from('notification_logs')
          .select('id')
          .eq('worker_id', workerId)
          .eq('type', type)
          .eq('channel', channel)
          .maybeSingle(),
        'Failed to check notification log'
      );
      return Boolean(row);
    },

    async insertNotificationLog({ workerId, type, channel, recipient, message, sentAt }) {
      const id = 'ntf_' + generateToken(8);
      assertSuccess(
        await adminClient.from('notification_logs').insert({
          id,
          worker_id: workerId,
          type,
          channel,
          recipient: String(recipient || ''),
          message,
          sent_at: sentAt,
        }),
        'Failed to log notification'
      );
    },

    async listActiveWorkersForReminders() {
      const rows = assertSuccess(
        await adminClient
          .from('workers')
          .select('id, name, phone, users!inner(email, password_hash), subscriptions!inner(paid_until)')
          .eq('status', 'active'),
        'Failed to query active workers for reminders'
      ) || [];

      const out = [];
      for (const r of rows) {
        const u = Array.isArray(r.users) ? r.users[0] : r.users;
        const s = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions;
        if (!u || u.password_hash === '!seeded_demo!' || !s) continue;
        out.push({
          worker_id: r.id,
          name: r.name,
          phone: r.phone,
          email: u.email,
          paid_until: s.paid_until,
        });
      }
      return out;
    },

    async purgeRetentionData({ nowIso, resetCutoff, inviteCutoff, notifCutoff }) {
      const [s1, s2, s3a, s3b, s4, s5] = await Promise.all([
        adminClient.from('sessions').delete({ count: 'exact' }).lte('expires_at', nowIso),
        adminClient.from('admin_sessions').delete({ count: 'exact' }).lte('expires_at', nowIso),
        adminClient.from('password_resets').delete({ count: 'exact' }).lte('expires_at', nowIso),
        adminClient.from('password_resets').delete({ count: 'exact' }).not('used_at', 'is', null).lte('used_at', resetCutoff),
        adminClient.from('feedback_invites').delete({ count: 'exact' }).is('used_at', null).lte('expires_at', inviteCutoff),
        adminClient.from('notification_logs').delete({ count: 'exact' }).lte('sent_at', notifCutoff),
      ]);

      return {
        sessionsPurged: (s1.count || 0) + (s2.count || 0),
        resetsPurged: (s3a.count || 0) + (s3b.count || 0),
        expiredInvitesPurged: s4.count || 0,
        logsPurged: s5.count || 0,
      };
    },

    async getStoredAdminPasscodeHash() {
      const row = assertSuccess(
        await adminClient.from('app_settings').select('value').eq('key', 'admin_passcode_hash').maybeSingle(),
        'Failed to read admin passcode setting'
      );
      return row ? row.value : null;
    },

    async claimAdminPasscodeHash(hashed) {
      const ins = await adminClient.from('app_settings').insert({ key: 'admin_passcode_hash', value: hashed });
      if (ins.error) {
        if (ins.error.code === '23505') return { ok: false, conflict: true };
        throw new Error(ins.error.message || 'Failed to claim admin passcode.');
      }
      await logAdminAudit({ action: 'admin.bootstrap', targetType: 'system', targetId: 'admin', details: {} });
      return { ok: true };
    },

    async isAdminSessionValid(tokenHash) {
      const row = assertSuccess(
        await adminClient.from('admin_sessions').select('token_hash, expires_at').eq('token_hash', tokenHash).maybeSingle(),
        'Failed to check admin session'
      );
      if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
        if (row) {
          await adminClient.from('admin_sessions').delete().eq('token_hash', tokenHash);
        }
        return false;
      }
      return true;
    },

    async createAdminSession({ tokenHash, expiresAt, createdAt }) {
      assertSuccess(
        await adminClient.from('admin_sessions').insert({
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: createdAt,
        }),
        'Failed to create admin session'
      );
    },

    async deleteAdminSession(tokenHash) {
      await adminClient.from('admin_sessions').delete().eq('token_hash', tokenHash);
    },

    logAdminAudit,

    async getAdminOverview(now = new Date()) {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const [workers, payRows, openRepRes, pendVrRes] = await Promise.all([
        adminClient.from('workers').select('id, status, subscriptions(trial_ends_at, paid_until)').then((r) => assertSuccess(r) || []),
        adminClient.from('payments').select('amount_pesewas').eq('status', 'success').gte('paid_at', monthStart).then((r) => assertSuccess(r) || []),
        adminClient.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        adminClient.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      let activeCount = 0;
      let trialCount = 0;
      let expiredCount = 0;
      let hiddenCount = 0;
      let suspendedCount = 0;

      for (const w of workers) {
        if (w.status === 'hidden') hiddenCount += 1;
        if (w.status === 'suspended') suspendedCount += 1;
        const subObj = Array.isArray(w.subscriptions) ? w.subscriptions[0] : w.subscriptions;
        const sub = computeSubscriptionStatus(subObj, now);
        if (!sub || sub.status === 'expired') expiredCount += 1;
        else if (sub.status === 'trial') {
          trialCount += 1;
          if (w.status === 'active') activeCount += 1;
        } else if (sub.status === 'active') {
          if (w.status === 'active') activeCount += 1;
        }
      }

      const paymentsThisMonthPesewas = payRows.reduce((sum, p) => sum + Number(p.amount_pesewas || 0), 0);

      return {
        totalWorkers: workers.length,
        activeWorkers: activeCount,
        trialWorkers: trialCount,
        expiredWorkers: expiredCount,
        hiddenWorkers: hiddenCount,
        suspendedWorkers: suspendedCount,
        paymentsThisMonthCount: payRows.length,
        paymentsThisMonthPesewas,
        openReports: Number(openRepRes?.count || 0),
        pendingVerifications: Number(pendVrRes?.count || 0),
      };
    },

    async listAdminWorkers({ q = '', now = new Date() }) {
      const qLower = String(q || '').trim().toLowerCase();
      const rows = assertSuccess(
        await adminClient
          .from('workers')
          .select('*, users(email), subscriptions(trial_ends_at, paid_until)')
          .order('created_at', { ascending: false }),
        'Failed to list admin workers'
      ) || [];

      const workerIds = rows.map((r) => r.id);
      const metricsMap = await fetchWorkerMetricsMap(workerIds);

      return rows
        .map((r) => {
          const userObj = Array.isArray(r.users) ? r.users[0] : r.users;
          const subObj = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions;
          const m = metricsMap.get(r.id) || { reviews: 0, blazes: 0 };
          return {
            id: r.id,
            userId: r.user_id,
            name: r.name,
            type: r.type,
            category: r.category,
            area: r.area,
            phone: r.phone,
            email: userObj?.email || '',
            years: r.years,
            verified: Boolean(r.verified),
            status: r.status,
            reviews: Number(m.reviews || 0),
            blazes: Number(m.blazes || 0),
            subscription: computeSubscriptionStatus(subObj, now),
            createdAt: r.created_at,
          };
        })
        .filter((r) => !qLower || `${r.name} ${r.category} ${r.area} ${r.phone} ${r.email}`.toLowerCase().includes(qLower));
    },

    async updateAdminWorker({ id, verified, status, nowIso }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id').eq('id', id).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return { found: false };

      const patch = {};
      const changes = {};
      if (typeof verified === 'boolean') {
        patch.verified = verified ? 1 : 0;
        changes.verified = verified;
      }
      if (status && ['active', 'hidden', 'suspended'].includes(status)) {
        patch.status = status;
        changes.status = status;
      }
      if (Object.keys(patch).length === 0) return { found: true, invalid: true };

      patch.updated_at = nowIso;
      assertSuccess(await adminClient.from('workers').update(patch).eq('id', id), 'Failed to update worker');
      await logAdminAudit({ action: 'worker.update', targetType: 'worker', targetId: id, details: changes });
      return { found: true };
    },

    async deleteAdminWorker(id) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id, name, photo_path').eq('id', id).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return { found: false };

      const [pfRows, vrRows] = await Promise.all([
        adminClient.from('portfolio_items').select('storage_path').eq('worker_id', id).then((r) => assertSuccess(r) || []),
        adminClient.from('verification_requests').select('doc_path').eq('worker_id', id).then((r) => assertSuccess(r) || []),
      ]);

      assertSuccess(await adminClient.from('workers').delete().eq('id', id), 'Failed to delete worker');
      await logAdminAudit({ action: 'worker.delete', targetType: 'worker', targetId: id, details: { name: worker.name } });

      await removeStorageObjects(mediaBucket, [worker.photo_path, ...pfRows.map((p) => p.storage_path)]);
      await removeStorageObjects(verificationsBucket, vrRows.map((v) => v.doc_path));
      return { found: true };
    },

    async extendAdminWorkerSubscription({ id, days, now = new Date() }) {
      const worker = assertSuccess(
        await adminClient.from('workers').select('id, name').eq('id', id).maybeSingle(),
        'Failed to load worker'
      );
      if (!worker) return { found: false };

      const nowIso = now.toISOString();
      const sub = assertSuccess(
        await adminClient.from('subscriptions').select('*').eq('worker_id', id).maybeSingle(),
        'Failed to load subscription'
      );
      const newPaidUntil = computeExtendedPaidUntil(sub ? sub.paid_until : nowIso, now, days);

      assertSuccess(
        await adminClient.from('subscriptions').upsert(
          {
            worker_id: id,
            trial_ends_at: sub ? sub.trial_ends_at : nowIso,
            paid_until: newPaidUntil,
            updated_at: nowIso,
          },
          { onConflict: 'worker_id' }
        ),
        'Failed to extend subscription'
      );

      await logAdminAudit({
        action: 'subscription.extend',
        targetType: 'worker',
        targetId: id,
        details: { days, newPaidUntil, workerName: worker.name },
      });
      return { found: true, paidUntil: newPaidUntil };
    },

    async listAdminFeedback() {
      const rows = assertSuccess(
        await adminClient
          .from('feedback')
          .select('*, workers(name, category)')
          .order('created_at', { ascending: false })
          .limit(200),
        'Failed to list feedback'
      ) || [];
      return rows.map((r) => {
        const w = Array.isArray(r.workers) ? r.workers[0] : r.workers;
        return {
          ...r,
          workers: undefined,
          worker_name: w?.name || '',
          category: w?.category || '',
        };
      });
    },

    async moderateAdminFeedback({ id, status }) {
      const row = assertSuccess(
        await adminClient.from('feedback').select('id, worker_id').eq('id', id).maybeSingle(),
        'Failed to find feedback'
      );
      if (!row) return { found: false };
      assertSuccess(await adminClient.from('feedback').update({ status }).eq('id', id), 'Failed to update feedback');
      await logAdminAudit({
        action: 'feedback.moderate',
        targetType: 'feedback',
        targetId: row.id,
        details: { status, workerId: row.worker_id },
      });
      return { found: true };
    },

    async listAdminReports() {
      const rows = assertSuccess(
        await adminClient
          .from('reports')
          .select('*, workers(name, status)')
          .order('created_at', { ascending: false })
          .limit(200),
        'Failed to list reports'
      ) || [];
      const mapped = rows.map((r) => {
        const w = Array.isArray(r.workers) ? r.workers[0] : r.workers;
        return {
          ...r,
          workers: undefined,
          worker_name: w?.name || '',
          worker_status: w?.status || '',
        };
      });
      mapped.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1));
      return mapped;
    },

    async updateAdminReport({ id, status }) {
      const row = assertSuccess(
        await adminClient.from('reports').select('id').eq('id', id).maybeSingle(),
        'Failed to load report'
      );
      if (!row) return { found: false };
      assertSuccess(await adminClient.from('reports').update({ status }).eq('id', id), 'Failed to update report');
      await logAdminAudit({ action: 'report.update', targetType: 'report', targetId: row.id, details: { status } });
      return { found: true };
    },

    async listAdminPayments({ limit = 250 } = {}) {
      let query = adminClient
        .from('payments')
        .select('id, worker_id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end, workers(name)')
        .order('paid_at', { ascending: false });
      if (limit > 0) query = query.limit(limit);
      const rows = assertSuccess(await query, 'Failed to list payments') || [];
      return rows.map((r) => {
        const w = Array.isArray(r.workers) ? r.workers[0] : r.workers;
        return {
          id: r.id,
          worker_id: r.worker_id,
          worker_name: w?.name || '',
          amount_pesewas: r.amount_pesewas,
          currency: r.currency,
          paystack_reference: r.paystack_reference,
          channel: r.channel,
          status: r.status,
          paid_at: r.paid_at,
          period_start: r.period_start,
          period_end: r.period_end,
        };
      });
    },

    async listAdminVerifications() {
      const rows = assertSuccess(
        await adminClient
          .from('verification_requests')
          .select('id, worker_id, doc_type, doc_ref, doc_path, notes, status, admin_note, created_at, reviewed_at, workers(name, category, area, phone, verified)')
          .order('created_at', { ascending: false })
          .limit(200),
        'Failed to list verification requests'
      ) || [];
      const mapped = rows.map((r) => {
        const w = Array.isArray(r.workers) ? r.workers[0] : r.workers;
        return {
          id: r.id,
          workerId: r.worker_id,
          workerName: w?.name || '',
          category: w?.category || '',
          area: w?.area || '',
          phone: w?.phone || '',
          workerVerified: Boolean(w?.verified),
          docType: r.doc_type,
          docRef: r.doc_ref,
          hasDocument: Boolean(r.doc_path),
          notes: r.notes,
          status: r.status,
          adminNote: r.admin_note || '',
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at || null,
        };
      });
      mapped.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
      return mapped;
    },

    async getVerificationDocumentBytes(id) {
      const row = assertSuccess(
        await adminClient.from('verification_requests').select('id, doc_path').eq('id', id).maybeSingle(),
        'Failed to load verification record'
      );
      if (!row || !row.doc_path) return { found: false };

      const dl = await adminClient.storage.from(verificationsBucket).download(row.doc_path);
      if (dl.error || !dl.data) return { found: false };
      const ab = await dl.data.arrayBuffer();
      return {
        found: true,
        buffer: Buffer.from(ab),
        contentType: dl.data.type || contentTypeFromPath(row.doc_path),
      };
    },

    async reviewVerification({ id, status, adminNote, nowIso }) {
      const row = assertSuccess(
        await adminClient.from('verification_requests').select('id, worker_id, status').eq('id', id).maybeSingle(),
        'Failed to load verification request'
      );
      if (!row) return { found: false };

      assertSuccess(
        await adminClient
          .from('verification_requests')
          .update({ status, admin_note: adminNote, reviewed_at: nowIso })
          .eq('id', row.id),
        'Failed to update verification request'
      );

      if (status === 'approved') {
        assertSuccess(
          await adminClient.from('workers').update({ verified: 1, updated_at: nowIso }).eq('id', row.worker_id),
          'Failed to mark worker verified'
        );
      }

      await logAdminAudit({
        action: `verification.${status}`,
        targetType: 'verification',
        targetId: row.id,
        details: { workerId: row.worker_id, adminNote },
      });
      return { found: true };
    },

    async listAdminAuditLogs() {
      return assertSuccess(
        await adminClient.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(150),
        'Failed to list audit logs'
      ) || [];
    },
  };
}

module.exports = { createSupabaseStore };
