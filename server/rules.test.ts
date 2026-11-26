import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rules = require('./rules.js');
const security = require('./security.js');
const images = require('./images.js');
const { openDatabase } = require('./db.js');
const { createApp } = require('./app.js');
const { processVerifiedPayment } = require('./paystack.js');
const { runRetentionCleanup } = require('./notifications.js');

test('subscription status & stacking extension math', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  const trial = {
    trial_ends_at: '2026-12-25T12:00:00.000Z',
    paid_until: '2026-12-25T12:00:00.000Z',
  };
  assert.equal(rules.computeSubscriptionStatus(trial, now).status, 'trial');

  const active = {
    trial_ends_at: '2026-11-20T12:00:00.000Z',
    paid_until: '2026-12-20T12:00:00.000Z',
  };
  assert.equal(rules.computeSubscriptionStatus(active, now).status, 'active');

  const expired = {
    trial_ends_at: '2026-11-01T12:00:00.000Z',
    paid_until: '2026-11-20T12:00:00.000Z',
  };
  assert.equal(rules.computeSubscriptionStatus(expired, now).status, 'expired');

  // Stacking from future paid_until
  const stacked = rules.computeExtendedPaidUntil(active.paid_until, now, 30);
  assert.equal(stacked, '2027-01-19T12:00:00.000Z');

  // Extending expired starts from now
  const renewed = rules.computeExtendedPaidUntil(expired.paid_until, now, 30);
  assert.equal(renewed, '2026-12-25T12:00:00.000Z');
});

test('worker validation allows custom categories and rejects invalid inputs', () => {
  const valid = rules.validateWorkerInput({
    type: 'Personal',
    name: 'Kofi Mensah',
    category: 'Graphic Design',
    area: 'Accra – Osu',
    phone: '0244123456',
    years: 5,
    bio: 'Brand identity and posters.',
  });
  assert.ok(valid.data);
  assert.equal(valid.data.category, 'Graphic Design');

  const invalid = rules.validateWorkerInput({
    type: 'Personal',
    name: 'A',
    category: 'Plumbing',
    area: 'Accra',
    phone: '0244123456',
    years: 2,
  });
  assert.ok(invalid.error);
});

test('image magic bytes & EXIF stripping', () => {
  // Fake SVG disguised with bytes
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.ok(images.inspectAndStripImage(svg).error);

  // Minimal JPEG with APP1 (EXIF) marker + EOI
  const app1Payload = Buffer.from('Exif\0\0GPSLocationSecret');
  const app1Len = Buffer.alloc(2);
  app1Len.writeUInt16BE(app1Payload.length + 2, 0);
  const jpegWithExif = Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe1]), // APP1
    app1Len,
    app1Payload,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);

  const cleaned = images.inspectAndStripImage(jpegWithExif);
  assert.equal(cleaned.mime, 'image/jpeg');
  assert.equal(cleaned.buffer.includes('GPSLocationSecret'), false);
  assert.deepEqual(cleaned.buffer, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

  // Path confinement
  assert.throws(() => images.resolveSafeUploadPath('/tmp/uploads', '../etc/passwd'));
});

test('Paystack HMAC signature, CSV neutralization & retention cleanup', () => {
  const secret = 'sk_test_12345';
  const body = Buffer.from('{"event":"charge.success"}');
  const sig = crypto.createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(security.verifyPaystackSignature(body, sig, secret), true);
  assert.equal(security.verifyPaystackSignature(body, 'bad_sig', secret), false);
  assert.equal(rules.neutralizeCsvCell('=cmd|calc'), '"\'=cmd|calc"');

  const db = openDatabase(':memory:');
  try {
    db.prepare("INSERT INTO users (id, name, phone, email, password_hash, terms_accepted_at, terms_version, created_at, updated_at) VALUES ('u1','Test','0244111222','t@e.com','h','2026-01-01T00:00:00Z','v1','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')").run();
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ('expired_tok','u1','2020-01-01T00:00:00Z','2020-01-01T00:00:00Z')").run();
    const res = runRetentionCleanup(db, new Date('2026-11-25T00:00:00Z'));
    assert.equal(res.sessionsPurged, 1);
  } finally {
    db.close();
  }
});

test('Full HTTP API acceptance flows (auth, worker, repeat-trial block, custom category, feedback invites, export, CORS, admin, delete)', async () => {
  const db = openDatabase(':memory:');
  const tmpUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-uploads-'));
  const app = createApp({ db, uploadsDir: tmpUploads });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  let cookieJar = '';
  const apiFetch = async (urlPath, opts: any = {}) => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'ProConnect',
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
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  try {
    // 0. Disallowed foreign Origin is rejected by CORS
    const badCors = await fetch(`${baseUrl}/api/stats`, {
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(badCors.status, 403);

    // Fresh database has zero fake/seeded worker profile cards
    const initialStats = await apiFetch('/api/stats');
    assert.equal(initialStats.status, 200);
    assert.equal(initialStats.data.totalPros, 0);
    const initialWorkers = await apiFetch('/api/workers');
    assert.equal(initialWorkers.status, 200);
    assert.equal(initialWorkers.data.total, 0);

    // 1. Signup requires agree checkbox
    const badSignup = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Kofi Test', phone: '0244111222', email: 'kofi@example.com', password: 'password123', agree: false },
    });
    assert.equal(badSignup.status, 400);

    const signup = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Kofi Test', phone: '0244111222', email: 'kofi@example.com', password: 'password123', agree: true },
    });
    assert.equal(signup.status, 201);
    assert.equal(signup.data.email, 'kofi@example.com');

    // Session restores via /api/me with consent metadata
    const me = await apiFetch('/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.data.name, 'Kofi Test');
    assert.ok(me.data.termsAcceptedAt);

    // 2. Create worker with custom category starts 30-day trial
    const createdWorker = await apiFetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Kofi Designs',
        category: 'Graphic Design',
        area: 'Accra – Osu',
        phone: '0244111222',
        years: 4,
        bio: 'Logos and packaging.',
      },
    });
    assert.equal(createdWorker.status, 201);
    const workerId = createdWorker.data.id;
    assert.equal(createdWorker.data.category, 'Graphic Design');
    assert.equal(createdWorker.data.verified, false);

    const billing = await apiFetch('/api/me/billing');
    assert.equal(billing.status, 200);
    assert.equal(billing.data.status, 'trial');

    // Protected field cannot be forged by user
    const forgedUpdate = await apiFetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Kofi Designs',
        category: 'Graphic Design',
        area: 'Accra – Osu',
        phone: '0244111222',
        years: 4,
        bio: 'Logos and packaging.',
        verified: true,
      },
    });
    assert.equal(forgedUpdate.data.verified, false);

    // Appears in public search (single & multi-term across name, skill, bio, area)
    const search = await apiFetch('/api/workers?q=Graphic');
    assert.equal(search.status, 200);
    assert.equal(search.data.total, 1);
    assert.equal(search.data.items[0].id, workerId);

    const multiTerm = await apiFetch('/api/workers?q=graphic%20kofi');
    assert.equal(multiTerm.status, 200);
    assert.equal(multiTerm.data.total, 1);

    const bioAreaTerm = await apiFetch('/api/workers?q=packaging%20osu');
    assert.equal(bioAreaTerm.status, 200);
    assert.equal(bioAreaTerm.data.total, 1);

    const nonMatch = await apiFetch('/api/workers?q=plumbing');
    assert.equal(nonMatch.status, 200);
    assert.equal(nonMatch.data.total, 0);

    // 3. Feedback invite & single-use atomic submission (as guest, no cookie)
    const inv = await apiFetch('/api/me/invites', { method: 'POST', body: { clientName: 'Abena' } });
    assert.equal(inv.status, 201);
    const token = inv.data.token;

    // Self-review blocked on both lookup and submit while logged in as owner
    const selfLookup = await apiFetch(`/api/invites/${token}`);
    assert.equal(selfLookup.status, 403);
    const selfReview = await apiFetch(`/api/invites/${token}/feedback`, {
      method: 'POST',
      body: { blaze: true, rating: 5, testimonial: 'Great', name: 'Abena' },
    });
    assert.equal(selfReview.status, 403);

    // Guest submits feedback
    const guestSubmit = await fetch(`${baseUrl}/api/invites/${token}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ProConnect' },
      body: JSON.stringify({ blaze: true, rating: 5, testimonial: 'Awesome design work!', name: 'Abena' }),
    });
    assert.equal(guestSubmit.status, 201);

    // Second use rejected
    const secondUse = await fetch(`${baseUrl}/api/invites/${token}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ProConnect' },
      body: JSON.stringify({ blaze: true, rating: 5, testimonial: 'Again', name: 'Abena' }),
    });
    assert.equal(secondUse.status, 410);

    const pubProfile = await apiFetch(`/api/workers/${workerId}`);
    assert.equal(pubProfile.data.blazes, 1);
    assert.equal(pubProfile.data.reviews, 1);
    assert.equal(pubProfile.data.rating, 5);
    assert.equal(pubProfile.data.testimonials.length, 1);

    // 4. Idempotent payment processing extends subscription once
    const p1 = processVerifiedPayment(db, {
      reference: 'ref_test_001',
      amountPesewas: 2000,
      currency: 'GHS',
      channel: 'mobile_money',
      paidAt: new Date().toISOString(),
      workerId,
      rawEvent: { test: true },
    });
    assert.equal(p1.alreadyProcessed, false);
    const firstEnd = p1.subscription.paidUntil;

    const p2 = processVerifiedPayment(db, {
      reference: 'ref_test_001',
      amountPesewas: 2000,
      currency: 'GHS',
      channel: 'mobile_money',
      paidAt: new Date().toISOString(),
      workerId,
      rawEvent: { test: true },
    });
    assert.equal(p2.alreadyProcessed, true);
    assert.equal(p2.subscription.paidUntil, firstEnd);

    // Act 843 personal data export includes account, worker, and payment
    const exported = await apiFetch('/api/me/export');
    assert.equal(exported.status, 200);
    assert.equal(exported.data.account.email, 'kofi@example.com');
    assert.equal(exported.data.payments.length, 1);

    // Authenticated password change rejects wrong current password, rotates session, and updates login
    const badPw = await apiFetch('/api/me/password', {
      method: 'POST',
      body: { currentPassword: 'wrongpass', newPassword: 'newpassword123' },
    });
    assert.equal(badPw.status, 401);

    const goodPw = await apiFetch('/api/me/password', {
      method: 'POST',
      body: { currentPassword: 'password123', newPassword: 'newpassword123' },
    });
    assert.equal(goodPw.status, 200);

    const relogin = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email: 'kofi@example.com', password: 'newpassword123' },
    });
    assert.equal(relogin.status, 200);

    // 5. Admin bootstrap, login, verify worker, hide when expired
    const boot = await apiFetch('/api/admin/bootstrap', { method: 'POST', body: { passcode: 'adminpass123' } });
    assert.equal(boot.status, 201);
    const verifyRes = await apiFetch(`/api/admin/workers/${workerId}`, { method: 'PATCH', body: { verified: true } });
    assert.equal(verifyRes.status, 200);
    const pubVerified = await apiFetch(`/api/workers/${workerId}`);
    assert.equal(pubVerified.data.verified, true);

    // Force expire and confirm hidden from public search & profile
    db.prepare("UPDATE subscriptions SET trial_ends_at = '2020-01-01T00:00:00Z', paid_until = '2020-01-01T00:00:00Z' WHERE worker_id = ?").run(workerId);
    const expiredProfile = await apiFetch(`/api/workers/${workerId}`);
    assert.equal(expiredProfile.status, 404);
    const expiredSearch = await apiFetch('/api/workers?q=Graphic');
    assert.equal(expiredSearch.data.total, 0);

    // 6. Deleting & recreating worker profile on same account must NOT grant a second free trial
    const delWorker = await apiFetch('/api/me/worker', { method: 'DELETE' });
    assert.equal(delWorker.status, 200);
    const recreated = await apiFetch('/api/me/worker', {
      method: 'PUT',
      body: {
        type: 'Personal',
        name: 'Kofi Designs 2',
        category: 'Graphic Design',
        area: 'Accra – Osu',
        phone: '0244999999',
        years: 4,
        bio: 'New profile.',
      },
    });
    assert.equal(recreated.status, 201);
    const billingAfterRecreate = await apiFetch('/api/me/billing');
    assert.equal(billingAfterRecreate.data.status, 'expired');

    // 7. Delete account removes user and worker completely
    const delAcct = await apiFetch('/api/me', { method: 'DELETE' });
    assert.equal(delAcct.status, 200);
    const meAfter = await apiFetch('/api/me');
    assert.equal(meAfter.data, null);
  } finally {
    server.close();
    db.close();
    fs.rmSync(tmpUploads, { recursive: true, force: true });
  }
});
