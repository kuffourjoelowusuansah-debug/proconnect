const fs = require('fs');
const path = require('path');
const {
  computeSubscriptionStatus,
  computeExtendedPaidUntil,
  computeProfileStrength,
  normalizePhoneDigits,
  isWorkerVisible,
  getPlanConfig,
  slugifyWorkerBase,
  buildAnalyticsSummary,
  normalizeClientPassCode,
  cleanPlainText,
  DAY_MS,
} = require('../rules');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
} = require('../security');
const { resolveSafeUploadPath } = require('../images');
const {
  buildWorkerDTO,
  listVisibleWorkers,
  getMarketplaceStats,
  logAdminAudit: logSqliteAudit,
} = require('../db');

function contentTypeFromPath(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function createSqliteStore(db, { uploadsDir, verificationsDir } = {}) {
  const safeUploadsDir = uploadsDir || null;
  const safeVerificationsDir = verificationsDir || null;

  function removeUploadFiles(relPaths) {
    if (!safeUploadsDir) return;
    for (const rel of relPaths.filter(Boolean)) {
      try {
        fs.rmSync(resolveSafeUploadPath(safeUploadsDir, rel), { force: true });
      } catch {}
    }
  }

  function removeVerifFiles(relPaths) {
    if (!safeVerificationsDir) return;
    for (const rel of relPaths.filter(Boolean)) {
      try {
        fs.rmSync(resolveSafeUploadPath(safeVerificationsDir, rel), { force: true });
      } catch {}
    }
  }

  function issueUserSession(userId, sessionTtlSeconds) {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      tokenHash,
      userId,
      expiresAt,
      nowIso
    );
    return raw;
  }

  function allocateUniqueSlug(name, area, fallbackId, excludeWorkerId = null) {
    const base = slugifyWorkerBase(name, area, fallbackId);
    let candidate = base;
    for (let i = 0; i < 25; i += 1) {
      if (i > 0) candidate = `${base}-${i + 1}`;
      const row = db.prepare('SELECT id FROM workers WHERE slug = ?').get(candidate);
      if (!row || (excludeWorkerId && row.id === excludeWorkerId)) {
        return candidate;
      }
    }
    return `${base}-${generateToken(3).toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now().toString(36)}`;
  }

  function generateClientPassCode() {
    for (let i = 0; i < 20; i += 1) {
      const code = `USER${Math.floor(1000 + Math.random() * 9000)}`;
      const exists = db.prepare('SELECT code FROM client_passes WHERE code = ?').get(code);
      if (!exists) return code;
    }
    for (let i = 0; i < 20; i += 1) {
      const code = `USER${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = db.prepare('SELECT code FROM client_passes WHERE code = ?').get(code);
      if (!exists) return code;
    }
    return `USER${Date.now().toString().slice(-6)}`;
  }

  function resolveClientPassRow(passCookie) {
    if (!passCookie) return null;
    const th = hashToken(passCookie);
    return db.prepare('SELECT * FROM client_passes WHERE token_hash = ?').get(th) || null;
  }

  function listClientSearches(passCode) {
    return db.prepare(`
      SELECT id, query, location, category, searched_at AS searchedAt
      FROM client_pass_searches
      WHERE pass_code = ?
      ORDER BY searched_at DESC
      LIMIT 15
    `).all(passCode);
  }

  function listClientBookmarkPayload(passCode) {
    const bookmarkIds = db.prepare(`
      SELECT worker_id
      FROM client_pass_bookmarks
      WHERE pass_code = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(passCode).map((r) => r.worker_id);
    const savedWorkers = bookmarkIds.length
      ? listVisibleWorkers(db, { ids: bookmarkIds, page: 1, pageSize: 50 }).items
      : [];
    return { bookmarkIds, savedWorkers };
  }

  function buildClientPassPayload(passRow) {
    const searches = listClientSearches(passRow.code);
    const { bookmarkIds, savedWorkers } = listClientBookmarkPayload(passRow.code);
    return {
      code: passRow.code,
      hasPin: Boolean(passRow.recovery_pin_hash),
      searches,
      bookmarkIds,
      savedWorkers,
    };
  }

  return {
    mode: 'sqlite',

    async signupWithPassword({ name, phone, email, password, termsVersion, nowIso, sessionTtlSeconds }) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return {
          status: 409,
          error: 'An account with this email already exists. Try logging in instead.',
        };
      }
      const userId = 'u_' + generateToken(12);
      const passwordHash = hashPassword(password);
      db.prepare(`
        INSERT INTO users (id, name, phone, email, password_hash, terms_accepted_at, terms_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, name, phone, email, passwordHash, nowIso, termsVersion, nowIso, nowIso);

      const sessionToken = issueUserSession(userId, sessionTtlSeconds);
      return {
        user: {
          id: userId,
          name,
          phone,
          email,
          termsAcceptedAt: nowIso,
          termsVersion,
        },
        sessionToken,
        refreshToken: null,
      };
    },

    async loginWithPassword({ email, password, sessionTtlSeconds }) {
      const user = db.prepare(
        'SELECT id, name, phone, email, password_hash, terms_accepted_at, terms_version FROM users WHERE email = ?'
      ).get(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return { status: 401, error: 'Incorrect email or password.' };
      }
      const nowIso = new Date().toISOString();
      try {
        db.prepare('UPDATE workers SET last_active_at = ? WHERE user_id = ?').run(nowIso, user.id);
      } catch {}
      const sessionToken = issueUserSession(user.id, sessionTtlSeconds);
      return {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          termsAcceptedAt: user.terms_accepted_at,
          termsVersion: user.terms_version,
        },
        sessionToken,
        refreshToken: null,
      };
    },

    async resolveSession({ accessToken }) {
      if (!accessToken) return { user: null };
      const tokenHash = hashToken(accessToken);
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
        return { user: null, expired: true };
      }

      return {
        user: {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          termsAcceptedAt: row.terms_accepted_at,
          termsVersion: row.terms_version,
          createdAt: row.created_at,
        },
        sessionTokenHash: tokenHash,
      };
    },

    async logoutSession({ tokenHash }) {
      if (tokenHash) {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      }
    },

    async requestPasswordReset({ email, ttlMs }) {
      const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
      if (!user || user.password_hash === '!seeded_demo!') return null;
      const token = generateToken(24);
      const tokenHash = hashToken(token);
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      db.prepare(
        'INSERT INTO password_resets (token_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)'
      ).run(tokenHash, user.id, expiresAt, nowIso);
      return { user, token, tokenHash };
    },

    async resetPasswordWithToken({ token, newPassword }) {
      const tokenHash = hashToken(token);
      const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(tokenHash);
      if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
        return { status: 400, error: 'This password reset link is invalid or has expired.' };
      }
      const nowIso = new Date().toISOString();
      const newHash = hashPassword(newPassword);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, nowIso, row.user_id);
        db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(nowIso, tokenHash);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return { ok: true };
    },

    async updateUserProfile({ userId, name, phone, nowIso }) {
      db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?').run(name, phone, nowIso, userId);
      const row = db.prepare('SELECT id, name, phone, email, terms_accepted_at, terms_version FROM users WHERE id = ?').get(userId);
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        termsAcceptedAt: row.terms_accepted_at,
        termsVersion: row.terms_version,
      };
    },

    async changeUserPassword({ userId, currentPassword, newPassword, sessionTtlSeconds }) {
      const row = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId);
      if (!row || !verifyPassword(currentPassword, row.password_hash)) {
        return { status: 401, error: 'Current password is incorrect.' };
      }
      const nowIso = new Date().toISOString();
      const newHash = hashPassword(newPassword);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, nowIso, userId);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      const sessionToken = issueUserSession(userId, sessionTtlSeconds);
      return { ok: true, sessionToken, refreshToken: null };
    },

    async exportUserData(userId) {
      const userRow = db.prepare(
        'SELECT id, name, phone, email, terms_accepted_at, terms_version, trial_claimed_at, created_at, updated_at FROM users WHERE id = ?'
      ).get(userId);
      const workerRow = db.prepare(
        'SELECT id, slug, type, name, category, area, phone, years, bio, availability, availability_note, availability_updated_at, last_active_at, rate_note, photo_url, verified, status, published_at, created_at, updated_at FROM workers WHERE user_id = ?'
      ).get(userId);
      const portfolio = workerRow
        ? db.prepare('SELECT id, image_url, title, created_at FROM portfolio_items WHERE worker_id = ? ORDER BY created_at DESC').all(workerRow.id)
        : [];
      const subscription = workerRow
        ? db.prepare('SELECT trial_ends_at, paid_until, updated_at FROM subscriptions WHERE worker_id = ?').get(workerRow.id)
        : null;
      const payments = workerRow
        ? db.prepare(
          'SELECT id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end FROM payments WHERE worker_id = ? ORDER BY paid_at DESC'
        ).all(workerRow.id)
        : [];
      const verificationRequests = workerRow
        ? db.prepare(
          'SELECT id, doc_type, doc_ref, notes, status, admin_note, created_at, reviewed_at FROM verification_requests WHERE worker_id = ? ORDER BY created_at DESC'
        ).all(workerRow.id)
        : [];
      const bookmarks = db.prepare('SELECT worker_id, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId);

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
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      if (safeUploadsDir) {
        const userUploadDir = path.resolve(safeUploadsDir, userId);
        if (userUploadDir.startsWith(path.resolve(safeUploadsDir) + path.sep)) {
          fs.rmSync(userUploadDir, { recursive: true, force: true });
        }
      }
      if (safeVerificationsDir) {
        const userVerifDir = path.resolve(safeVerificationsDir, userId);
        if (userVerifDir.startsWith(path.resolve(safeVerificationsDir) + path.sep)) {
          fs.rmSync(userVerifDir, { recursive: true, force: true });
        }
      }
    },

    async listVisibleWorkers(filters) {
      return listVisibleWorkers(db, filters);
    },

    async getMarketplaceStats() {
      return getMarketplaceStats(db);
    },

    async getPublicWorker(idOrSlug) {
      const key = String(idOrSlug || '').trim();
      const row = db.prepare(`
        SELECT w.*, s.trial_ends_at, s.paid_until
        FROM workers w
        LEFT JOIN subscriptions s ON s.worker_id = w.id
        WHERE w.id = ? OR w.slug = ?
      `).get(key, key);
      if (!row || !isWorkerVisible(row, row, new Date())) return null;
      return buildWorkerDTO(db, row);
    },

    async trackWorkerEvent({ workerId, eventType, nowIso }) {
      const key = String(workerId || '').trim();
      const row = db.prepare(`
        SELECT w.id, w.status, s.trial_ends_at, s.paid_until
        FROM workers w
        LEFT JOIN subscriptions s ON s.worker_id = w.id
        WHERE w.id = ? OR w.slug = ?
      `).get(key, key);
      if (!row || !isWorkerVisible(row, row, new Date())) return false;
      const evtId = 'evt_' + generateToken(10);
      db.prepare('INSERT INTO worker_events (id, worker_id, event_type, created_at) VALUES (?, ?, ?, ?)').run(
        evtId,
        row.id,
        eventType,
        nowIso
      );
      return true;
    },

    async createReport({ workerId, reason, contact, nowIso }) {
      const exists = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
      if (!exists) return null;
      const id = 'rep_' + generateToken(10);
      db.prepare(`
        INSERT INTO reports (id, worker_id, reporter_contact, reason, status, created_at)
        VALUES (?, ?, ?, ?, 'open', ?)
      `).run(id, workerId, contact, reason, nowIso);
      return { id };
    },

    async getMyWorker(userId) {
      const row = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!row) return null;
      return buildWorkerDTO(db, row);
    },

    async upsertMyWorker({ userId, data, trialDays, now }) {
      const nowIso = now.toISOString();
      const existing = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (existing) {
        const slug = existing.slug || allocateUniqueSlug(data.name, data.area, existing.id, existing.id);
        const availabilityNote = data.availabilityNote || '';
        const availChanged = existing.availability !== data.availability || (existing.availability_note || '') !== availabilityNote;
        const availUpdatedAt = availChanged || !existing.availability_updated_at
          ? nowIso
          : existing.availability_updated_at;

        db.prepare(`
          UPDATE workers
          SET slug = ?, type = ?, name = ?, category = ?, area = ?, phone = ?, years = ?, bio = ?, availability = ?, availability_note = ?, availability_updated_at = ?, last_active_at = ?, rate_note = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(
          slug,
          data.type,
          data.name,
          data.category,
          data.area,
          data.phone,
          data.years,
          data.bio,
          data.availability,
          availabilityNote,
          availUpdatedAt,
          nowIso,
          data.rateNote,
          nowIso,
          existing.id,
          userId
        );
        const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(existing.id);
        return { created: false, worker: buildWorkerDTO(db, updated) };
      }

      const normPhone = normalizePhoneDigits(data.phone);
      const userRow = db.prepare('SELECT trial_claimed_at FROM users WHERE id = ?').get(userId);
      const phoneUsedTrial = normPhone
        ? db.prepare('SELECT user_id FROM trial_phone_claims WHERE normalized_phone = ?').get(normPhone)
        : null;

      const alreadyClaimed = Boolean(userRow?.trial_claimed_at) || Boolean(phoneUsedTrial);
      const trialEndsAt = alreadyClaimed
        ? nowIso
        : new Date(now.getTime() + trialDays * DAY_MS).toISOString();

      const workerId = 'w_' + generateToken(10);
      const slug = allocateUniqueSlug(data.name, data.area, workerId, null);
      const tint = Math.floor(Math.random() * 6);
      const availabilityNote = data.availabilityNote || '';

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          INSERT INTO workers (id, user_id, slug, type, name, category, area, phone, years, bio, availability, availability_note, availability_updated_at, last_active_at, rate_note, photo_url, photo_path, verified, status, tint, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 'active', ?, ?, ?, ?)
        `).run(
          workerId,
          userId,
          slug,
          data.type,
          data.name,
          data.category,
          data.area,
          data.phone,
          data.years,
          data.bio,
          data.availability,
          availabilityNote,
          nowIso,
          nowIso,
          data.rateNote,
          tint,
          nowIso,
          nowIso,
          nowIso
        );

        db.prepare(`
          INSERT INTO subscriptions (worker_id, trial_ends_at, paid_until, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(workerId, trialEndsAt, trialEndsAt, nowIso);

        if (!alreadyClaimed) {
          db.prepare('UPDATE users SET trial_claimed_at = ? WHERE id = ? AND trial_claimed_at IS NULL').run(nowIso, userId);
        }

        if (normPhone && !phoneUsedTrial) {
          db.prepare('INSERT OR IGNORE INTO trial_phone_claims (normalized_phone, user_id, claimed_at) VALUES (?, ?, ?)').run(
            normPhone,
            userId,
            nowIso
          );
        }

        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      const created = db.prepare('SELECT * FROM workers WHERE id = ?').get(workerId);
      return { created: true, worker: buildWorkerDTO(db, created) };
    },

    async patchMyAvailability({ userId, availability, availabilityNote, nowIso }) {
      const existing = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!existing) {
        return { status: 404, error: 'Publish your worker profile first before updating availability.' };
      }
      db.prepare(`
        UPDATE workers
        SET availability = ?, availability_note = ?, availability_updated_at = ?, last_active_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(availability, availabilityNote || '', nowIso, nowIso, nowIso, existing.id, userId);
      const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(existing.id);
      return { worker: buildWorkerDTO(db, updated) };
    },

    async deleteMyWorker(userId) {
      const existing = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!existing) return;

      const portfolioRows = db.prepare('SELECT storage_path FROM portfolio_items WHERE worker_id = ?').all(existing.id);
      const verifRows = db.prepare('SELECT doc_path FROM verification_requests WHERE worker_id = ?').all(existing.id);
      db.prepare('DELETE FROM workers WHERE id = ? AND user_id = ?').run(existing.id, userId);

      removeUploadFiles([existing.photo_path, ...portfolioRows.map((r) => r.storage_path)]);
      removeVerifFiles(verifRows.map((v) => v.doc_path));
    },

    async uploadWorkerPhoto({ userId, buffer, ext }) {
      const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!worker) {
        return { status: 400, error: 'Save your worker profile first before uploading a photo.' };
      }

      const filename = `profile_${generateToken(8)}.${ext}`;
      const relPath = path.join(userId, filename);
      const fullPath = resolveSafeUploadPath(safeUploadsDir, userId, filename);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);

      if (worker.photo_path) {
        removeUploadFiles([worker.photo_path]);
      }

      const url = `/uploads/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`;
      db.prepare('UPDATE workers SET photo_url = ?, photo_path = ?, updated_at = ? WHERE id = ?').run(
        url,
        relPath,
        new Date().toISOString(),
        worker.id
      );
      return { url };
    },

    async addPortfolioPhoto({ userId, buffer, ext, title }) {
      const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!worker) {
        return { status: 400, error: 'Save your worker profile first before adding portfolio photos.' };
      }
      const count = db.prepare('SELECT COUNT(*) AS cnt FROM portfolio_items WHERE worker_id = ?').get(worker.id).cnt;
      if (count >= 12) {
        return { status: 400, error: 'You can upload up to 12 portfolio photos.' };
      }

      const filename = `port_${generateToken(8)}.${ext}`;
      const relPath = path.join(userId, filename);
      const fullPath = resolveSafeUploadPath(safeUploadsDir, userId, filename);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);

      const item = {
        id: 'pf_' + generateToken(10),
        worker_id: worker.id,
        image_url: `/uploads/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`,
        storage_path: relPath,
        title,
        created_at: new Date().toISOString(),
      };

      db.prepare(`
        INSERT INTO portfolio_items (id, worker_id, image_url, storage_path, title, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.id, item.worker_id, item.image_url, item.storage_path, item.title, item.created_at);

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
      const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(userId);
      if (!worker) return { status: 404, error: 'Worker profile not found.' };

      const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND worker_id = ?').get(itemId, worker.id);
      if (!item) return { status: 404, error: 'Portfolio photo not found.' };

      db.prepare('DELETE FROM portfolio_items WHERE id = ? AND worker_id = ?').run(item.id, worker.id);
      removeUploadFiles([item.storage_path]);
      return { ok: true };
    },

    async getWorkerAnalytics(userId) {
      const worker = db.prepare('SELECT * FROM workers WHERE user_id = ?').get(userId);
      if (!worker) {
        return {
          ...buildAnalyticsSummary([]),
          inviteCount: 0,
          usedInviteCount: 0,
          strength: computeProfileStrength(null, { portfolioCount: 0, inviteCount: 0 }),
        };
      }

      const events = db.prepare('SELECT event_type, created_at FROM worker_events WHERE worker_id = ?').all(worker.id);
      const summary = buildAnalyticsSummary(events, new Date());

      const invAgg = db.prepare(`
        SELECT
          COUNT(*) AS invite_count,
          COALESCE(SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS used_invite_count
        FROM feedback_invites
        WHERE worker_id = ?
      `).get(worker.id);

      const portfolioCount = db.prepare('SELECT COUNT(*) AS cnt FROM portfolio_items WHERE worker_id = ?').get(worker.id).cnt;

      return {
        ...summary,
        inviteCount: Number(invAgg.invite_count || 0),
        usedInviteCount: Number(invAgg.used_invite_count || 0),
        strength: computeProfileStrength(worker, {
          portfolioCount: Number(portfolioCount || 0),
          inviteCount: Number(invAgg.invite_count || 0),
        }),
      };
    },

    async getLatestVerificationRequest(userId) {
      const worker = db.prepare('SELECT id, verified FROM workers WHERE user_id = ?').get(userId);
      if (!worker) return { latest: null };
      const row = db.prepare(`
        SELECT * FROM verification_requests
        WHERE worker_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(worker.id);
      return { latest: formatVerificationDTO(row) };
    },

    async createVerificationRequest({ userId, docType, docRef, notes, file }) {
      const worker = db.prepare('SELECT id, verified FROM workers WHERE user_id = ?').get(userId);
      if (!worker) {
        return { status: 400, error: 'Publish your worker profile first before requesting verification.' };
      }
      if (worker.verified) {
        return { status: 409, error: 'Your profile is already ID verified.' };
      }

      const pending = db.prepare("SELECT id FROM verification_requests WHERE worker_id = ? AND status = 'pending'").get(worker.id);
      if (pending) {
        return { status: 409, error: 'You already have a verification request awaiting review.' };
      }

      let docRelPath = null;
      if (file) {
        if (!safeVerificationsDir) {
          return { status: 500, error: 'Verification document storage is not configured.' };
        }
        const filename = `id_${generateToken(10)}.${file.ext}`;
        docRelPath = path.join(userId, filename);
        const fullPath = resolveSafeUploadPath(safeVerificationsDir, userId, filename);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.buffer);
      } else if (!docRef) {
        return { status: 400, error: 'Please enter your document reference number or upload an ID photo.' };
      }

      const id = 'vr_' + generateToken(10);
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT INTO verification_requests (id, worker_id, doc_type, doc_ref, doc_path, notes, status, admin_note, created_at, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?, NULL)
      `).run(id, worker.id, docType, docRef, docRelPath, notes, nowIso);

      const created = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(id);
      return { latest: formatVerificationDTO(created) };
    },

    async listBookmarks(userId) {
      const ids = db.prepare('SELECT worker_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((r) => r.worker_id);
      const items = ids.length ? listVisibleWorkers(db, { ids, page: 1, pageSize: 50 }).items : [];
      return { ids, items };
    },

    async addBookmarks({ userId, workerIds, nowIso }) {
      for (const workerId of workerIds) {
        const exists = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
        if (exists) {
          db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, worker_id, created_at) VALUES (?, ?, ?)').run(
            userId,
            workerId,
            nowIso
          );
        }
      }
      return {
        ids: db.prepare('SELECT worker_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((r) => r.worker_id),
      };
    },

    async removeBookmark({ userId, workerId }) {
      db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND worker_id = ?').run(userId, workerId);
      return {
        ids: db.prepare('SELECT worker_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((r) => r.worker_id),
      };
    },

    async getOrInitClientPass({ passCookie, nowIso }) {
      const existing = resolveClientPassRow(passCookie);
      if (existing) {
        db.prepare('UPDATE client_passes SET last_seen_at = ? WHERE code = ?').run(nowIso, existing.code);
        return { pass: buildClientPassPayload(existing), newCookieToken: null };
      }
      const code = generateClientPassCode();
      const rawToken = generateToken(24);
      const tokenHash = hashToken(rawToken);
      db.prepare(`
        INSERT INTO client_passes (code, token_hash, recovery_pin_hash, created_at, last_seen_at)
        VALUES (?, ?, NULL, ?, ?)
      `).run(code, tokenHash, nowIso, nowIso);
      return {
        pass: { code, hasPin: false, searches: [], bookmarkIds: [], savedWorkers: [] },
        newCookieToken: rawToken,
      };
    },

    async setClientPassPin({ passCookie, pin, nowIso }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      const pinHash = hashPassword(pin);
      db.prepare('UPDATE client_passes SET recovery_pin_hash = ?, last_seen_at = ? WHERE code = ?').run(
        pinHash,
        nowIso,
        existing.code
      );
      return { ok: true, hasPin: true, code: existing.code };
    },

    async restoreClientPass({ code, pin, nowIso }) {
      const normalized = normalizeClientPassCode(code);
      if (!normalized) {
        return { status: 401, error: 'Invalid Client Pass ID or Sync PIN.' };
      }
      const row = db.prepare('SELECT * FROM client_passes WHERE code = ?').get(normalized);
      if (!row || !row.recovery_pin_hash || !verifyPassword(pin, row.recovery_pin_hash)) {
        return { status: 401, error: 'Invalid Client Pass ID or Sync PIN.' };
      }
      const rawToken = generateToken(24);
      const tokenHash = hashToken(rawToken);
      db.prepare('UPDATE client_passes SET token_hash = ?, last_seen_at = ? WHERE code = ?').run(
        tokenHash,
        nowIso,
        row.code
      );
      return {
        pass: buildClientPassPayload(row),
        newCookieToken: rawToken,
      };
    },

    async recordClientSearch({ passCookie, query, location, category, nowIso }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      const q = cleanPlainText(query, 80);
      const loc = cleanPlainText(location, 80);
      const cat = cleanPlainText(category, 40);
      if (!q && !loc && !cat) {
        return { searches: listClientSearches(existing.code) };
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          DELETE FROM client_pass_searches
          WHERE pass_code = ? AND LOWER(query) = LOWER(?) AND LOWER(location) = LOWER(?) AND LOWER(category) = LOWER(?)
        `).run(existing.code, q, loc, cat);

        const id = 'srch_' + generateToken(8);
        db.prepare(`
          INSERT INTO client_pass_searches (id, pass_code, query, location, category, searched_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, existing.code, q, loc, cat, nowIso);

        db.prepare(`
          DELETE FROM client_pass_searches
          WHERE pass_code = ? AND id NOT IN (
            SELECT id FROM client_pass_searches WHERE pass_code = ? ORDER BY searched_at DESC LIMIT 15
          )
        `).run(existing.code, existing.code);

        db.prepare('UPDATE client_passes SET last_seen_at = ? WHERE code = ?').run(nowIso, existing.code);
        db.exec('COMMIT');
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
      return { searches: listClientSearches(existing.code) };
    },

    async deleteClientSearch({ passCookie, searchId }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      db.prepare('DELETE FROM client_pass_searches WHERE pass_code = ? AND id = ?').run(existing.code, String(searchId || ''));
      return { searches: listClientSearches(existing.code) };
    },

    async clearClientSearches({ passCookie }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      db.prepare('DELETE FROM client_pass_searches WHERE pass_code = ?').run(existing.code);
      return { searches: [] };
    },

    async addClientBookmarks({ passCookie, workerIds, nowIso }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      for (const workerId of (workerIds || [])) {
        const w = db.prepare('SELECT id FROM workers WHERE id = ?').get(workerId);
        if (w) {
          db.prepare('INSERT OR IGNORE INTO client_pass_bookmarks (pass_code, worker_id, created_at) VALUES (?, ?, ?)').run(
            existing.code,
            w.id,
            nowIso
          );
        }
      }
      db.prepare('UPDATE client_passes SET last_seen_at = ? WHERE code = ?').run(nowIso, existing.code);
      return listClientBookmarkPayload(existing.code);
    },

    async removeClientBookmark({ passCookie, workerId }) {
      const existing = resolveClientPassRow(passCookie);
      if (!existing) return { status: 401, error: 'Client Pass session not found.' };
      db.prepare('DELETE FROM client_pass_bookmarks WHERE pass_code = ? AND worker_id = ?').run(
        existing.code,
        String(workerId || '')
      );
      return listClientBookmarkPayload(existing.code);
    },

    async createFeedbackInvite({ userId, clientName, now }) {
      const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(userId);
      if (!worker) {
        return { status: 400, error: 'Publish your worker profile first before creating feedback links.' };
      }

      const sinceIso = new Date(now.getTime() - DAY_MS).toISOString();
      const recentCount = db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM feedback_invites
        WHERE worker_id = ? AND created_at >= ?
      `).get(worker.id, sinceIso).cnt;

      if (recentCount >= 20) {
        return { status: 429, error: 'Daily limit reached: you can create up to 20 feedback links per day.' };
      }

      const id = 'inv_' + generateToken(10);
      const token = generateToken(24);
      const nowIso = now.toISOString();
      const expiresAt = new Date(now.getTime() + 30 * DAY_MS).toISOString();

      db.prepare(`
        INSERT INTO feedback_invites (id, token, worker_id, client_name, created_at, expires_at, used_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `).run(id, token, worker.id, clientName, nowIso, expiresAt);

      return { token, expiresAt };
    },

    async lookupFeedbackInvite({ token, viewerUserId }) {
      const invite = db.prepare(`
        SELECT i.*, w.user_id AS worker_user_id, w.name AS worker_name, w.category, w.area, w.photo_url, w.tint, w.status AS worker_status
        FROM feedback_invites i
        JOIN workers w ON w.id = i.worker_id
        WHERE i.token = ?
      `).get(token);

      if (!invite) return { status: 404, error: 'This feedback link could not be found.' };
      if (invite.used_at) return { status: 410, error: 'This link has already been used.' };
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return { status: 410, error: 'This feedback link has expired.' };
      }
      if (invite.worker_status !== 'active') {
        return { status: 404, error: 'This profile is not available right now.' };
      }
      if (viewerUserId && viewerUserId === invite.worker_user_id) {
        return { status: 403, error: 'You cannot leave feedback on your own profile.' };
      }

      return {
        worker: {
          name: invite.worker_name,
          category: invite.category,
          area: invite.area,
          photo: invite.photo_url || null,
          tint: Number(invite.tint || 0),
        },
        clientName: invite.client_name || '',
      };
    },

    async redeemFeedbackInvite({ token, viewerUserId, data, ipHash, nowIso }) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const invite = db.prepare(`
          SELECT i.*, w.user_id AS worker_user_id, w.status AS worker_status
          FROM feedback_invites i
          JOIN workers w ON w.id = i.worker_id
          WHERE i.token = ?
        `).get(token);

        if (!invite) {
          db.exec('ROLLBACK');
          return { status: 404, error: 'This feedback link could not be found.' };
        }
        if (invite.used_at) {
          db.exec('ROLLBACK');
          return { status: 410, error: 'This link has already been used.' };
        }
        if (new Date(invite.expires_at).getTime() <= Date.now()) {
          db.exec('ROLLBACK');
          return { status: 410, error: 'This feedback link has expired.' };
        }
        if (invite.worker_status !== 'active') {
          db.exec('ROLLBACK');
          return { status: 404, error: 'This profile is not available right now.' };
        }
        if (viewerUserId && viewerUserId === invite.worker_user_id) {
          db.exec('ROLLBACK');
          return { status: 403, error: 'You cannot leave feedback on your own profile.' };
        }

        const updateRes = db.prepare(`
          UPDATE feedback_invites
          SET used_at = ?
          WHERE id = ? AND used_at IS NULL
        `).run(nowIso, invite.id);

        if (updateRes.changes !== 1) {
          db.exec('ROLLBACK');
          return { status: 410, error: 'This link has already been used.' };
        }

        const fbId = 'fb_' + generateToken(10);
        db.prepare(`
          INSERT INTO feedback (id, worker_id, invite_id, blaze, rating, testimonial, client_name, status, ip_hash, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
        `).run(
          fbId,
          invite.worker_id,
          invite.id,
          data.blaze ? 1 : 0,
          data.rating,
          data.testimonial,
          data.clientName,
          ipHash,
          nowIso
        );

        db.exec('COMMIT');
        return { ok: true };
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
    },

    async getWorkerForUser(userId) {
      return db.prepare('SELECT id, name FROM workers WHERE user_id = ?').get(userId) || null;
    },

    async getMyBilling(userId) {
      const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(userId);
      if (!worker) return null;

      const sub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(worker.id);
      const statusObj = computeSubscriptionStatus(sub, new Date());
      const payments = db.prepare(`
        SELECT id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end
        FROM payments
        WHERE worker_id = ?
        ORDER BY paid_at DESC
        LIMIT 12
      `).all(worker.id);

      return { ...statusObj, payments };
    },

    async processVerifiedPayment({ reference, amountPesewas, currency, channel, paidAt, workerId, rawEvent }) {
      const { pricePesewas, trialDays } = getPlanConfig();
      const now = new Date();
      const nowIso = now.toISOString();

      if (currency !== 'GHS' || Number(amountPesewas) < pricePesewas) {
        throw new Error('Payment amount or currency did not match the subscription price.');
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        const existing = db.prepare('SELECT id FROM payments WHERE paystack_reference = ?').get(reference);
        if (existing) {
          const subRow = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(workerId);
          db.exec('COMMIT');
          return {
            alreadyProcessed: true,
            subscription: computeSubscriptionStatus(subRow, now),
            worker: null,
          };
        }

        const worker = db.prepare(`
          SELECT w.id, w.name, u.email, u.phone
          FROM workers w
          JOIN users u ON u.id = w.user_id
          WHERE w.id = ?
        `).get(workerId);
        if (!worker) {
          db.exec('ROLLBACK');
          throw new Error('Worker profile not found for payment.');
        }

        const sub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(workerId);
        const currentPaidUntil = sub ? sub.paid_until : nowIso;
        const baseMs = Math.max(now.getTime(), new Date(currentPaidUntil).getTime() || 0);
        const periodStart = new Date(baseMs).toISOString();
        const periodEnd = computeExtendedPaidUntil(currentPaidUntil, now, trialDays);

        if (sub) {
          db.prepare('UPDATE subscriptions SET paid_until = ?, updated_at = ? WHERE worker_id = ?').run(periodEnd, nowIso, workerId);
        } else {
          db.prepare('INSERT INTO subscriptions (worker_id, trial_ends_at, paid_until, updated_at) VALUES (?, ?, ?, ?)').run(
            workerId,
            nowIso,
            periodEnd,
            nowIso
          );
        }

        const payId = 'pay_' + generateToken(8);
        db.prepare(`
          INSERT INTO payments (id, worker_id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end, raw_event, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?)
        `).run(
          payId,
          workerId,
          Number(amountPesewas),
          currency,
          reference,
          String(channel || 'mobile_money'),
          paidAt || nowIso,
          periodStart,
          periodEnd,
          JSON.stringify(rawEvent || {}),
          nowIso
        );

        const updatedSub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(workerId);
        db.exec('COMMIT');

        return {
          alreadyProcessed: false,
          subscription: computeSubscriptionStatus(updatedSub, now),
          worker,
          periodEnd,
        };
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
    },

    async hasNotificationLog({ workerId, type, channel }) {
      const row = db.prepare('SELECT id FROM notification_logs WHERE worker_id = ? AND type = ? AND channel = ?').get(
        workerId,
        type,
        channel
      );
      return Boolean(row);
    },

    async insertNotificationLog({ workerId, type, channel, recipient, message, sentAt }) {
      const id = 'ntf_' + generateToken(8);
      db.prepare(`
        INSERT INTO notification_logs (id, worker_id, type, channel, recipient, message, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, workerId, type, channel, String(recipient || ''), message, sentAt);
    },

    async listActiveWorkersForReminders() {
      return db.prepare(`
        SELECT w.id AS worker_id, w.name, w.phone, u.email, s.paid_until
        FROM workers w
        JOIN users u ON u.id = w.user_id
        JOIN subscriptions s ON s.worker_id = w.id
        WHERE w.status = 'active' AND u.password_hash != '!seeded_demo!'
      `).all();
    },

    async purgeRetentionData({ nowIso, resetCutoff, inviteCutoff, notifCutoff }) {
      const s1 = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso).changes;
      const s2 = db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(nowIso).changes;
      const s3 = db.prepare('DELETE FROM password_resets WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)').run(nowIso, resetCutoff).changes;
      const s4 = db.prepare('DELETE FROM feedback_invites WHERE used_at IS NULL AND expires_at <= ?').run(inviteCutoff).changes;
      const s5 = db.prepare('DELETE FROM notification_logs WHERE sent_at <= ?').run(notifCutoff).changes;
      return {
        sessionsPurged: s1 + s2,
        resetsPurged: s3,
        expiredInvitesPurged: s4,
        logsPurged: s5,
      };
    },

    async getStoredAdminPasscodeHash() {
      const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get();
      return row ? row.value : null;
    },

    async claimAdminPasscodeHash(hashed) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const existing = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_passcode_hash'").get();
        if (existing) {
          db.exec('ROLLBACK');
          return { ok: false, conflict: true };
        }
        db.prepare("INSERT INTO app_settings (key, value) VALUES ('admin_passcode_hash', ?)").run(hashed);
        logSqliteAudit(db, { action: 'admin.bootstrap', targetType: 'system', targetId: 'admin', details: {} });
        db.exec('COMMIT');
        return { ok: true };
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
    },

    async isAdminSessionValid(tokenHash) {
      const row = db.prepare('SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = ?').get(tokenHash);
      if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
        if (row) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
        return false;
      }
      return true;
    },

    async createAdminSession({ tokenHash, expiresAt, createdAt }) {
      db.prepare('INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)').run(
        tokenHash,
        expiresAt,
        createdAt
      );
    },

    async deleteAdminSession(tokenHash) {
      db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
    },

    async logAdminAudit(entry) {
      logSqliteAudit(db, entry);
    },

    async getAdminOverview(now = new Date()) {
      const workers = db.prepare(`
        SELECT w.id, w.status, s.trial_ends_at, s.paid_until
        FROM workers w
        LEFT JOIN subscriptions s ON s.worker_id = w.id
      `).all();

      let activeCount = 0;
      let trialCount = 0;
      let expiredCount = 0;
      let hiddenCount = 0;
      let suspendedCount = 0;

      for (const w of workers) {
        if (w.status === 'hidden') hiddenCount += 1;
        if (w.status === 'suspended') suspendedCount += 1;
        const sub = computeSubscriptionStatus(w, now);
        if (!sub || sub.status === 'expired') expiredCount += 1;
        else if (sub.status === 'trial') {
          trialCount += 1;
          if (w.status === 'active') activeCount += 1;
        } else if (sub.status === 'active') {
          if (w.status === 'active') activeCount += 1;
        }
      }

      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const payStats = db.prepare(`
        SELECT COUNT(*) AS cnt, COALESCE(SUM(amount_pesewas), 0) AS total_pesewas
        FROM payments
        WHERE status = 'success' AND paid_at >= ?
      `).get(monthStart);

      const openReports = db.prepare("SELECT COUNT(*) AS cnt FROM reports WHERE status = 'open'").get().cnt;
      const pendingVerifications = db.prepare("SELECT COUNT(*) AS cnt FROM verification_requests WHERE status = 'pending'").get().cnt;

      return {
        totalWorkers: workers.length,
        activeWorkers: activeCount,
        trialWorkers: trialCount,
        expiredWorkers: expiredCount,
        hiddenWorkers: hiddenCount,
        suspendedWorkers: suspendedCount,
        paymentsThisMonthCount: Number(payStats.cnt || 0),
        paymentsThisMonthPesewas: Number(payStats.total_pesewas || 0),
        openReports: Number(openReports || 0),
        pendingVerifications: Number(pendingVerifications || 0),
      };
    },

    async listAdminWorkers({ q = '', now = new Date() }) {
      const qLower = String(q || '').trim().toLowerCase();
      const rows = db.prepare(`
        SELECT w.*, u.email AS user_email, s.trial_ends_at, s.paid_until,
          (SELECT COUNT(*) FROM feedback f WHERE f.worker_id = w.id AND f.status = 'published' AND f.rating IS NOT NULL) AS reviews,
          (SELECT COALESCE(SUM(CASE WHEN f.blaze = 1 THEN 1 ELSE 0 END), 0) FROM feedback f WHERE f.worker_id = w.id AND f.status = 'published') AS blazes
        FROM workers w
        JOIN users u ON u.id = w.user_id
        LEFT JOIN subscriptions s ON s.worker_id = w.id
        ORDER BY w.created_at DESC
      `).all();

      return rows
        .filter((r) => !qLower || `${r.name} ${r.category} ${r.area} ${r.phone} ${r.user_email}`.toLowerCase().includes(qLower))
        .map((r) => ({
          id: r.id,
          userId: r.user_id,
          name: r.name,
          type: r.type,
          category: r.category,
          area: r.area,
          phone: r.phone,
          email: r.user_email,
          years: r.years,
          verified: Boolean(r.verified),
          status: r.status,
          reviews: Number(r.reviews || 0),
          blazes: Number(r.blazes || 0),
          subscription: computeSubscriptionStatus(r, now),
          createdAt: r.created_at,
        }));
    },

    async updateAdminWorker({ id, verified, status, nowIso }) {
      const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
      if (!worker) return { found: false };

      const updates = [];
      const params = [];
      const changes = {};

      if (typeof verified === 'boolean') {
        updates.push('verified = ?');
        params.push(verified ? 1 : 0);
        changes.verified = verified;
      }
      if (status && ['active', 'hidden', 'suspended'].includes(status)) {
        updates.push('status = ?');
        params.push(status);
        changes.status = status;
      }
      if (updates.length === 0) return { found: true, invalid: true };

      updates.push('updated_at = ?');
      params.push(nowIso, id);
      db.prepare(`UPDATE workers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      logSqliteAudit(db, { action: 'worker.update', targetType: 'worker', targetId: id, details: changes });
      return { found: true };
    },

    async deleteAdminWorker(id) {
      const worker = db.prepare('SELECT id, name, photo_path FROM workers WHERE id = ?').get(id);
      if (!worker) return { found: false };

      const portfolioRows = db.prepare('SELECT storage_path FROM portfolio_items WHERE worker_id = ?').all(id);
      const verifRows = db.prepare('SELECT doc_path FROM verification_requests WHERE worker_id = ?').all(id);
      db.prepare('DELETE FROM workers WHERE id = ?').run(id);
      logSqliteAudit(db, { action: 'worker.delete', targetType: 'worker', targetId: id, details: { name: worker.name } });

      removeUploadFiles([worker.photo_path, ...portfolioRows.map((p) => p.storage_path)]);
      removeVerifFiles(verifRows.map((v) => v.doc_path));
      return { found: true };
    },

    async extendAdminWorkerSubscription({ id, days, now = new Date() }) {
      const worker = db.prepare('SELECT id, name FROM workers WHERE id = ?').get(id);
      if (!worker) return { found: false };

      const nowIso = now.toISOString();
      const sub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(id);
      const newPaidUntil = computeExtendedPaidUntil(sub ? sub.paid_until : nowIso, now, days);

      if (sub) {
        db.prepare('UPDATE subscriptions SET paid_until = ?, updated_at = ? WHERE worker_id = ?').run(newPaidUntil, nowIso, id);
      } else {
        db.prepare('INSERT INTO subscriptions (worker_id, trial_ends_at, paid_until, updated_at) VALUES (?, ?, ?, ?)').run(
          id,
          nowIso,
          newPaidUntil,
          nowIso
        );
      }

      logSqliteAudit(db, {
        action: 'subscription.extend',
        targetType: 'worker',
        targetId: id,
        details: { days, newPaidUntil, workerName: worker.name },
      });

      return { found: true, paidUntil: newPaidUntil };
    },

    async listAdminFeedback() {
      return db.prepare(`
        SELECT f.*, w.name AS worker_name, w.category
        FROM feedback f
        JOIN workers w ON w.id = f.worker_id
        ORDER BY f.created_at DESC
        LIMIT 200
      `).all();
    },

    async moderateAdminFeedback({ id, status }) {
      const row = db.prepare('SELECT id, worker_id FROM feedback WHERE id = ?').get(id);
      if (!row) return { found: false };
      db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, row.id);
      logSqliteAudit(db, {
        action: 'feedback.moderate',
        targetType: 'feedback',
        targetId: row.id,
        details: { status, workerId: row.worker_id },
      });
      return { found: true };
    },

    async listAdminReports() {
      return db.prepare(`
        SELECT r.*, w.name AS worker_name, w.status AS worker_status
        FROM reports r
        JOIN workers w ON w.id = r.worker_id
        ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC
        LIMIT 200
      `).all();
    },

    async updateAdminReport({ id, status }) {
      const row = db.prepare('SELECT id FROM reports WHERE id = ?').get(id);
      if (!row) return { found: false };
      db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, row.id);
      logSqliteAudit(db, { action: 'report.update', targetType: 'report', targetId: row.id, details: { status } });
      return { found: true };
    },

    async listAdminPayments({ limit = 250 } = {}) {
      const safeLimit = limit > 0 ? limit : 10000;
      return db.prepare(`
        SELECT p.id, p.worker_id, w.name AS worker_name, p.amount_pesewas, p.currency, p.paystack_reference, p.channel, p.status, p.paid_at, p.period_start, p.period_end
        FROM payments p
        LEFT JOIN workers w ON w.id = p.worker_id
        ORDER BY p.paid_at DESC
        LIMIT ?
      `).all(safeLimit);
    },

    async listAdminVerifications() {
      const rows = db.prepare(`
        SELECT vr.id, vr.worker_id, vr.doc_type, vr.doc_ref, vr.doc_path, vr.notes, vr.status, vr.admin_note, vr.created_at, vr.reviewed_at,
          w.name AS worker_name, w.category, w.area, w.phone, w.verified AS worker_verified
        FROM verification_requests vr
        JOIN workers w ON w.id = vr.worker_id
        ORDER BY CASE WHEN vr.status = 'pending' THEN 0 ELSE 1 END, vr.created_at DESC
        LIMIT 200
      `).all();
      return rows.map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        workerName: r.worker_name,
        category: r.category,
        area: r.area,
        phone: r.phone,
        workerVerified: Boolean(r.worker_verified),
        docType: r.doc_type,
        docRef: r.doc_ref,
        hasDocument: Boolean(r.doc_path),
        notes: r.notes,
        status: r.status,
        adminNote: r.admin_note || '',
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at || null,
      }));
    },

    async getVerificationDocumentBytes(id) {
      const row = db.prepare('SELECT id, doc_path FROM verification_requests WHERE id = ?').get(id);
      if (!row || !row.doc_path || !safeVerificationsDir) return { found: false };
      const target = resolveSafeUploadPath(safeVerificationsDir, row.doc_path);
      if (!fs.existsSync(target)) return { found: false };
      return {
        found: true,
        buffer: fs.readFileSync(target),
        contentType: contentTypeFromPath(target),
      };
    },

    async reviewVerification({ id, status, adminNote, nowIso }) {
      const row = db.prepare('SELECT id, worker_id, status FROM verification_requests WHERE id = ?').get(id);
      if (!row) return { found: false };
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE verification_requests SET status = ?, admin_note = ?, reviewed_at = ? WHERE id = ?').run(
          status,
          adminNote,
          nowIso,
          row.id
        );
        if (status === 'approved') {
          db.prepare('UPDATE workers SET verified = 1, updated_at = ? WHERE id = ?').run(nowIso, row.worker_id);
        }
        logSqliteAudit(db, {
          action: `verification.${status}`,
          targetType: 'verification',
          targetId: row.id,
          details: { workerId: row.worker_id, adminNote },
        });
        db.exec('COMMIT');
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch {}
        throw err;
      }
      return { found: true };
    },

    async listAdminAuditLogs() {
      return db.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 150').all();
    },
  };
}

function formatVerificationDTO(row) {
  if (!row) return null;
  return {
    id: row.id,
    docType: row.doc_type,
    docRef: row.doc_ref,
    hasDocument: Boolean(row.doc_path),
    notes: row.notes,
    status: row.status,
    adminNote: row.admin_note || '',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null,
  };
}

module.exports = { createSqliteStore, formatVerificationDTO };
