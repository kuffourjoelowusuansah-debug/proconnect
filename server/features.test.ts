import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rules = require('./rules.js');
const { openDatabase } = require('./db.js');
const { createApp } = require('./app.js');
const qr = require('../qr.js');

test('QR generator produces valid Version 1–10 matrices, SVG, and respects finder/timing invariants', () => {
  const shortQr = qr.encodeMatrix('https://nkabom.gh/#pro/w_abc123');
  assert.ok(shortQr.size >= 25 && shortQr.size <= 57);
  // Top-left 7x7 finder outer ring + center 3x3 should be dark
  assert.equal(shortQr.modules[0][0], true);
  assert.equal(shortQr.modules[0][6], true);
  assert.equal(shortQr.modules[6][0], true);
  assert.equal(shortQr.modules[3][3], true);
  assert.equal(shortQr.modules[1][1], false);

  // Version 7+ (~130 byte URL) exercises 18-bit version info + multi-block RS
  const longUrl = 'https://ais-dev-example-subdomain.asia-southeast1.run.app/#pro/w_verylongidentifier_0123456789abcdefghijklmnopqrstuvwxyz_extra';
  const longQr = qr.encodeMatrix(longUrl);
  assert.ok(longQr.version >= 7 && longQr.version <= 10);
  const svg = qr.toSvg(longUrl, { px: 180 });
  assert.ok(svg.startsWith('<svg') && svg.includes('<path d="M'));
});

test('Availability, rateNote, and profile strength scoring work cleanly', () => {
  const valid = rules.validateWorkerInput({
    type: 'Personal',
    name: 'Ama Owusu',
    category: 'Electrical',
    area: 'East Legon, Osu, Tema',
    phone: '0244555666',
    years: 6,
    bio: 'Certified domestic and commercial wiring specialist across Accra.',
    availability: 'appointment',
    rateNote: 'Inspection from GH₵50',
  });
  assert.ok(valid.data);
  assert.equal(valid.data.availability, 'appointment');
  assert.equal(valid.data.rateNote, 'Inspection from GH₵50');

  // Unknown availability gracefully defaults to available
  const fallback = rules.validateWorkerInput({
    type: 'Personal',
    name: 'Ama Owusu',
    category: 'Electrical',
    area: 'Accra',
    phone: '0244555666',
    years: 6,
    bio: 'Wiring.',
    availability: 'bogus_status',
  });
  assert.equal(fallback.data.availability, 'available');

  const strength = rules.computeProfileStrength(
    { photo: '/uploads/u/p.jpg', bio: 'Certified wiring specialist with 6+ years field work.', rateNote: 'Free site quote', verified: false },
    { portfolioCount: 3, inviteCount: 1 }
  );
  assert.equal(strength.score, 100);
  assert.equal(strength.completedCount, 5);
});

test('End-to-end features: availability filter, bookmarks, analytics tracking, and private ID verification approval', async () => {
  const db = openDatabase(':memory:');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nkabom-feat-'));
  const tmpUploads = path.join(tmpRoot, 'uploads');
  const tmpVerifs = path.join(tmpRoot, 'verifications');
  const app = createApp({ db, uploadsDir: tmpUploads, verificationsDir: tmpVerifs });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  let cookieJar = '';
  const apiFetch = async (urlPath, opts: any = {}) => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'Nkabom',
      ...(opts.headers || {}),
    };
    if (cookieJar) headers.Cookie = cookieJar;
    let body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(baseUrl + urlPath, {
      method: opts.method || 'GET',
      headers,
      body,
    });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (setCookies.length > 0) {
      const map = new Map();
      for (const pair of cookieJar.split(';').map((s) => s.trim()).filter(Boolean)) {
        const eq = pair.indexOf('=');
        map.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      for (const sc of setCookies) {
        const kv = sc.split(';')[0];
        const eq = kv.indexOf('=');
        const k = kv.slice(0, eq);
        const v = kv.slice(eq + 1);
        if (!v) map.delete(k);
        else map.set(k, v);
      }
      cookieJar = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => null) : await res.arrayBuffer();
    return { status: res.status, headers: res.headers, data };
  };

  try {
    // Sign up worker 1 (available) and worker 2 (busy)
    await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Yaw Appiah', phone: '0244100200', email: 'yaw@example.com', password: 'password123', agree: true },
    });
    const w1 = await apiFetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Yaw Plumbing',
        category: 'Plumbing',
        area: 'East Legon, Osu, Tema',
        phone: '0244100200',
        years: 7,
        bio: 'Fast leak detection and pipe repairs across Accra neighborhoods.',
        availability: 'available',
        rateNote: 'Free site quote',
      },
    });
    assert.equal(w1.status, 201);
    assert.equal(w1.data.availability, 'available');
    assert.equal(w1.data.rateNote, 'Free site quote');
    const w1Id = w1.data.id;

    // Multi-area search + availableOnly filter
    const areaSearch = await fetch(`${baseUrl}/api/workers?area=Osu&availableOnly=1`).then((r) => r.json());
    assert.equal(areaSearch.total, 1);
    assert.equal(areaSearch.items[0].id, w1Id);

    // Track public view + WhatsApp click
    const vTrack = await apiFetch(`/api/workers/${w1Id}/track`, { method: 'POST', body: { type: 'view' } });
    const wTrack = await apiFetch(`/api/workers/${w1Id}/track`, { method: 'POST', body: { type: 'wa_click' } });
    assert.equal(vTrack.status, 201);
    assert.equal(wTrack.status, 201);

    const analytics = await apiFetch('/api/me/worker/analytics');
    assert.equal(analytics.status, 200);
    assert.equal(analytics.data.totalViews, 1);
    assert.equal(analytics.data.totalWaClicks, 1);
    assert.equal(analytics.data.views7d, 1);
    assert.equal(analytics.data.strength.completedCount, 2); // bio >= 30 + rateNote

    // Bookmarks API
    const bmAdd = await apiFetch('/api/me/bookmarks', { method: 'POST', body: { workerId: w1Id } });
    assert.equal(bmAdd.status, 200);
    assert.deepEqual(bmAdd.data.ids, [w1Id]);

    const bmGet = await apiFetch('/api/me/bookmarks');
    assert.equal(bmGet.status, 200);
    assert.equal(bmGet.data.items.length, 1);

    // Verification request with minimal PNG containing secret tEXt metadata
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const textKey = Buffer.from('tEXtSecretGPS\0AccraPrivate');
    const textChunk = Buffer.alloc(12 + textKey.length);
    textChunk.writeUInt32BE(textKey.length, 0);
    textChunk.write('tEXt', 4, 'ascii');
    textKey.copy(textChunk, 8);
    const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const fakePngWithMeta = Buffer.concat([pngHeader, textChunk, iendChunk]);

    const fd = new FormData();
    fd.append('docType', 'Ghana Card');
    fd.append('docRef', 'GHA-123456789-0');
    fd.append('notes', 'Front side Ghana card');
    fd.append('document', new Blob([fakePngWithMeta], { type: 'image/png' }), 'id.png');

    const vrRes = await apiFetch('/api/me/worker/verify-request', { method: 'POST', body: fd });
    assert.equal(vrRes.status, 201);
    assert.equal(vrRes.data.latest.status, 'pending');
    assert.equal(vrRes.data.latest.hasDocument, true);
    const vrId = vrRes.data.latest.id;

    // Duplicate pending request blocked
    const dupVr = await apiFetch('/api/me/worker/verify-request', {
      method: 'POST',
      body: { docType: 'Ghana Card', docRef: 'GHA-123456789-0' },
    });
    assert.equal(dupVr.status, 409);

    // Private verification doc MUST NOT be accessible without admin auth
    const unauthDoc = await fetch(`${baseUrl}/api/admin/verifications/${vrId}/document`);
    assert.equal(unauthDoc.status, 401);
    // And verification doc is NOT in public /uploads
    assert.equal(fs.existsSync(tmpUploads) ? fs.readdirSync(tmpUploads).length : 0, 0);

    // Admin bootstrap & approve verification
    const boot = await apiFetch('/api/admin/bootstrap', { method: 'POST', body: { passcode: 'adminpass123' } });
    assert.equal(boot.status, 201);

    const adminList = await apiFetch('/api/admin/verifications');
    assert.equal(adminList.status, 200);
    assert.equal(adminList.data.items.length, 1);

    // Admin can fetch private doc and EXIF/tEXt metadata was stripped
    const adminDoc = await apiFetch(`/api/admin/verifications/${vrId}/document`);
    assert.equal(adminDoc.status, 200);
    assert.equal(adminDoc.headers.get('x-content-type-options'), 'nosniff');
    const docBuf = Buffer.from(adminDoc.data);
    assert.equal(docBuf.includes('SecretGPS'), false);

    const approve = await apiFetch(`/api/admin/verifications/${vrId}`, {
      method: 'PATCH',
      body: { status: 'approved', adminNote: 'Ghana Card confirmed.' },
    });
    assert.equal(approve.status, 200);

    const pubAfter = await apiFetch(`/api/workers/${w1Id}`);
    assert.equal(pubAfter.data.verified, true);
  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Client Pass persistence + PIN restore, Live Availability quick switch, Pro Studio insights, and /pro/:slug SSR meta with XSS protection', async () => {
  const db = openDatabase(':memory:');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nkabom-dyn-'));
  const app = createApp({
    db,
    uploadsDir: path.join(tmpRoot, 'uploads'),
    verificationsDir: path.join(tmpRoot, 'verifications'),
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const makeClient = () => {
    const cookies = new Map();
    return {
      cookies,
      async fetch(urlPath, opts: any = {}) {
        const headers: Record<string, string> = {
          'X-Requested-With': 'Nkabom',
          ...(opts.headers || {}),
        };
        if (cookies.size > 0) {
          headers.Cookie = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
        }
        let body = opts.body;
        if (body && !(body instanceof FormData) && typeof body !== 'string') {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(body);
        }
        const res = await fetch(baseUrl + urlPath, {
          method: opts.method || 'GET',
          headers,
          body,
        });
        const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
        for (const sc of setCookies) {
          const kv = sc.split(';')[0];
          const eq = kv.indexOf('=');
          const k = kv.slice(0, eq);
          const v = decodeURIComponent(kv.slice(eq + 1));
          if (!v) cookies.delete(k);
          else cookies.set(k, v);
        }
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text();
        return { status: res.status, headers: res.headers, data };
      },
    };
  };

  try {
    const pro = makeClient();
    await pro.fetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Kofi Mensah', phone: '0244112233', email: 'kofi@nkabom.gh', password: 'password123', agree: true },
    });

    // Include </script> payload to test XSS escaping inside #nkabom-preload and <meta> tags
    const created = await pro.fetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Kwame <script>alert(1)</script> Mensah',
        category: 'Plumbing',
        area: 'Kumasi, Ahodwo',
        phone: '0244112233',
        years: 8,
        bio: 'Emergency pipe repairs </script><img src=x onerror=alert(2)> in Kumasi.',
        availability: 'available',
        availabilityNote: 'Ready in Ahodwo today',
      },
    });
    assert.equal(created.status, 201);
    const workerId = created.data.id;
    const slug = created.data.slug;
    assert.ok(slug && slug.includes('kwame'));
    assert.equal(created.data.availabilityNote, 'Ready in Ahodwo today');
    assert.ok(created.data.freshnessLabel);

    // Quick Availability Switch PATCH
    const quick = await pro.fetch('/api/me/worker/availability', {
      method: 'PATCH',
      body: { availability: 'busy', availabilityNote: 'Back Mon 8am' },
    });
    assert.equal(quick.status, 200);
    assert.equal(quick.data.availability, 'busy');
    assert.equal(quick.data.availabilityNote, 'Back Mon 8am');

    const badQuick = await pro.fetch('/api/me/worker/availability', {
      method: 'PATCH',
      body: { availability: 'invalid_state', availabilityNote: 'Test' },
    });
    assert.equal(badQuick.status, 400);

    // Track events via slug & inspect expanded Pro Studio analytics
    const trkView = await pro.fetch(`/api/workers/${encodeURIComponent(slug)}/track`, { method: 'POST', body: { type: 'view' } });
    const trkWa = await pro.fetch(`/api/workers/${encodeURIComponent(slug)}/track`, { method: 'POST', body: { type: 'wa_click' } });
    assert.equal(trkView.status, 201);
    assert.equal(trkWa.status, 201);

    const an = await pro.fetch('/api/me/worker/analytics');
    assert.equal(an.status, 200);
    assert.equal(an.data.views30d, 1);
    assert.equal(an.data.waClicks30d, 1);
    assert.equal(an.data.conversionRate, 100);
    assert.equal(an.data.dailySeries.length, 7);

    // Lookup by slug returns same profile
    const bySlug = await fetch(`${baseUrl}/api/workers/${encodeURIComponent(slug)}`).then((r) => r.json());
    assert.equal(bySlug.id, workerId);
    assert.equal(bySlug.availability, 'busy');
    assert.equal(bySlug.availabilityNote, 'Back Mon 8am');

    // SSR /pro/:slug injects OG/Twitter meta + XSS-escaped preload JSON
    const ssrRes = await pro.fetch(`/pro/${encodeURIComponent(slug)}`);
    assert.equal(ssrRes.status, 200);
    assert.ok(ssrRes.data.includes('<meta property="og:title"'));
    assert.ok(ssrRes.data.includes(`<link rel="canonical"`));
    assert.ok(ssrRes.data.includes('id="nkabom-preload"'));
    assert.equal(ssrRes.data.includes('</script><img'), false);
    assert.ok(ssrRes.data.includes('\\u003c/script\\u003e'));

    const missingSsr = await pro.fetch('/pro/does-not-exist-999');
    assert.equal(missingSsr.status, 404);
    assert.ok(missingSsr.data.includes('"worker":null'));

    // Guest Client Pass persistence + PIN + Cross-device restore
    const guest1 = makeClient();
    const passInit = await guest1.fetch('/api/client-pass');
    assert.equal(passInit.status, 200);
    assert.match(passInit.data.code, /^USER\d{4,}$/);
    assert.ok(guest1.cookies.get('nkabom_pass'));
    const passCode = passInit.data.code;

    // Record & dedupe search history
    await guest1.fetch('/api/client-pass/searches', { method: 'POST', body: { query: 'Plumber', location: 'Kumasi', category: 'Plumbing' } });
    const s2 = await guest1.fetch('/api/client-pass/searches', { method: 'POST', body: { query: 'Electrician', location: 'Accra', category: '' } });
    assert.equal(s2.data.searches.length, 2);
    const s3 = await guest1.fetch('/api/client-pass/searches', { method: 'POST', body: { query: 'Plumber', location: 'Kumasi', category: 'Plumbing' } });
    assert.equal(s3.data.searches.length, 2); // deduped

    // Guest bookmark persistence
    const bm = await guest1.fetch('/api/client-pass/bookmarks', { method: 'POST', body: { workerId } });
    assert.equal(bm.status, 200);
    assert.deepEqual(bm.data.bookmarkIds, [workerId]);

    // Unpinned pass cannot be restored on another device
    const guest2 = makeClient();
    const unpinnedRestore = await guest2.fetch('/api/client-pass/restore', {
      method: 'POST',
      body: { code: passCode, pin: '4820' },
    });
    assert.equal(unpinnedRestore.status, 401);

    // Set valid PIN on guest1, reject invalid PIN first
    const badPin = await guest1.fetch('/api/client-pass/pin', { method: 'POST', body: { pin: 'abc' } });
    assert.equal(badPin.status, 400);
    const setPin = await guest1.fetch('/api/client-pass/pin', { method: 'POST', body: { pin: '4820' } });
    assert.equal(setPin.status, 200);
    assert.equal(setPin.data.hasPin, true);

    // Restore on fresh guest2 device using code + PIN -> recovers searches & bookmarks
    const wrongPinRestore = await guest2.fetch('/api/client-pass/restore', {
      method: 'POST',
      body: { code: passCode, pin: '9999' },
    });
    assert.equal(wrongPinRestore.status, 401);

    const okRestore = await guest2.fetch('/api/client-pass/restore', {
      method: 'POST',
      body: { code: passCode, pin: '4820' },
    });
    assert.equal(okRestore.status, 200);
    assert.equal(okRestore.data.code, passCode);
    assert.equal(okRestore.data.hasPin, true);
    assert.equal(okRestore.data.searches.length, 2);
    assert.deepEqual(okRestore.data.bookmarkIds, [workerId]);

    // Delete individual search & clear all searches
    const delSearch = await guest2.fetch(`/api/client-pass/searches/${okRestore.data.searches[0].id}`, { method: 'DELETE' });
    assert.equal(delSearch.status, 200);
    assert.equal(delSearch.data.searches.length, 1);

    const clearAll = await guest2.fetch('/api/client-pass/searches', { method: 'DELETE' });
    assert.equal(clearAll.status, 200);
    assert.equal(clearAll.data.searches.length, 0);
  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

