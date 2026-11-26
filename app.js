/* ===== Loader / splash screen (runs first so it shows right away) ===== */
(() => {
  if (!document.querySelector('link[rel~="icon"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="logo-icon.png">');
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="splash-inner"><img src="logo-white.png" alt="" class="splash-logo" onerror="this.style.display=\'none\'"><div class="splash-name">ProConnect</div><div class="splash-tag">Finding trusted pros near you</div><div class="splash-bar"><span></span></div></div>';
  document.body.appendChild(el);
  const hide = () => { el.classList.add('hide'); setTimeout(() => el.remove(), 700); };
  const t0 = Date.now();
  const done = () => setTimeout(hide, Math.max(0, 800 - (Date.now() - t0)));
  if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
  setTimeout(hide, 4000);
})();

/* Lucide icons (inline SVG paths) */
const ICONS = {
 "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />",
 "map-pin": "<path d=\"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z\" /> <circle cx=\"12\" cy=\"10\" r=\"3\" />",
 "badge-check": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\" /> <path d=\"m9 12 2 2 4-4\" />",
 "star": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\" />",
 "phone": "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\" />",
 "message-circle": "<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\" />",
 "arrow-left": "<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />",
 "upload": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"17 8 12 3 7 8\" /> <line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\" />",
 "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\" /> <rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\" />",
 "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />",
 "check": "<path d=\"M20 6 9 17l-5-5\" />",
 "wrench": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\" />",
 "zap": "<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\" />",
 "hammer": "<path d=\"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9\" /> <path d=\"m18 15 4-4\" /> <path d=\"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5\" />",
 "paint-bucket": "<path d=\"m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z\" /> <path d=\"m5 2 5 5\" /> <path d=\"M2 13h15\" /> <path d=\"M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z\" />",
 "layers": "<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\" /> <path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\" /> <path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\" />",
 "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /> <circle cx=\"9\" cy=\"7\" r=\"4\" /> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />",
 "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <polyline points=\"12 6 12 12 16 14\" />",
 "eye": "<path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
 "eye-off": "<path d=\"M9.88 9.88a3 3 0 1 0 4.24 4.24\" /> <path d=\"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68\" /> <path d=\"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61\" /> <line x1=\"2\" x2=\"22\" y1=\"2\" y2=\"22\" />",
 "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />",
 "share-2": "<circle cx=\"18\" cy=\"5\" r=\"3\" /> <circle cx=\"6\" cy=\"12\" r=\"3\" /> <circle cx=\"18\" cy=\"19\" r=\"3\" /> <line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\" /> <line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\" />",
 "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\" />",
 "quote": "<path d=\"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z\" /> <path d=\"M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z\" />",
 "link": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\" /> <path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\" />",
 "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />",
 "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /> <path d=\"M20 3v4\" /> <path d=\"M22 5h-4\" /> <path d=\"M4 17v2\" /> <path d=\"M5 18H3\" />",
 "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />",
 "moon": "<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\" />",
 "arrow-right": "<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />",
 "menu": "<line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />",
 "x": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
 "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" /> <polyline points=\"16 17 21 12 16 7\" /> <line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\" />",
 "send": "<path d=\"m22 2-7 20-4-9-9-4Z\" /> <path d=\"M22 2 11 13\" />"
};

/* ===== ProConnect: plain JavaScript app ===== */
const icon = (name, size = 18, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICONS[name] || ICONS.briefcase}</svg>`;

/* ---------- Pricing (synced with /api/config) ---------- */
const PLAN = { price: 20, trialDays: 30 };
const ghs = (n) => 'GH₵' + n;

/* ---------- Data ---------- */
const CATEGORIES = [
  { name: 'Plumbing', icon: 'wrench' }, { name: 'Electrical', icon: 'zap' },
  { name: 'Carpentry', icon: 'hammer' }, { name: 'Painting', icon: 'paint-bucket' },
  { name: 'Masonry', icon: 'layers' },
];
const TINTS = [['#1F3A5F', '#3B6FB6'], ['#0F766E', '#34D399'], ['#9A3412', '#FB923C'], ['#6D28D9', '#A78BFA'], ['#BE123C', '#FB7185'], ['#0369A1', '#38BDF8']];

/* ---------- State ---------- */
const freshDraft = () => ({ type: 'Personal', name: '', category: 'Plumbing', area: '', phone: '', years: 3, bio: '', photo: null, portfolio: [] });
const state = {
  screen: 'landing',
  role: 'customer',
  selected: null,
  profileLoading: false,
  profileError: '',
  query: '',
  location: '',
  category: '',
  workers: [],
  workersTotal: 0,
  workersPage: 1,
  workersTotalPages: 1,
  workersLoading: false,
  workersError: '',
  marketCache: null,
  marketSeq: 0,
  marketController: null,
  knownCategories: [],
  knownCities: [],
  stats: { totalPros: 0, verifiedPros: 0, avgRating: 0, totalReviews: 0, topWorkers: [] },
  draft: freshDraft(),
  pendingPhotoFile: null,
  portfolioTitle: '',
  landing: { svc: '', loc: '' },
  landingTab: 'customer',
  landingBrief: { category: 'Plumbing', kind: 'Fix a problem', when: 'Today', area: 'East Legon, Accra' },
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  menuOpen: false,
  showPw: false,
  showAcctPw: false,
  verifiedOnly: false,
  minRating: 0,
  sort: 'rating',
  user: null,
  myProfile: null,
  sub: null,
  busy: '',
  acct: { error: '' },
  pw: { error: '', info: '' },
  auth: { mode: 'login', error: '', info: '', reason: '', values: {}, resetToken: '' },
  review: null,
  invite: { name: '', url: '', error: '', busy: false },
  reportModal: null,
  confirmModal: null,
  paystackPublicKey: '',
  paystackConfigured: false,
};

function applyTheme(next) {
  const isDark = next === 'dark';
  state.theme = isDark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', isDark);
  try { localStorage.setItem('proconnect_theme', state.theme); } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0B1220' : '#1F3A5F');
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  const isDark = state.theme === 'dark';
  const btn = document.querySelector('[data-action="toggle-theme"]');
  if (btn) {
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = icon(isDark ? 'sun' : 'moon', 17);
  }
}

/* ---------- HTTP Client ---------- */
async function api(path, opts = {}) {
  const headers = { 'X-Requested-With': 'ProConnect', ...(opts.headers || {}) };
  let body = opts.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const resp = await fetch('/api' + path, {
    method: opts.method || 'GET',
    credentials: 'same-origin',
    headers,
    body,
    signal: opts.signal,
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    throw new Error((data && data.error) || 'Something went wrong. Please try again.');
  }
  return data;
}

/* ---------- Client-side image resize before upload ---------- */
function resizeImageFile(file, maxDim = 1000) {
  return new Promise((resolve, reject) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return reject(new Error('Only JPEG, PNG, or WebP images are allowed.'));
    }
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not process image.'));
        if (blob.size > 2 * 1024 * 1024) {
          return reject(new Error('Image is still over 2 MB after resizing. Please choose a smaller photo.'));
        }
        resolve(new File([blob], 'upload.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.86);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Could not read the selected image file.'));
    };
    img.src = objUrl;
  });
}

/* ================= ACCOUNT, BILLING, REVIEWS & WORKERS ADAPTERS ================= */
const AUTH = {
  signUp: ({ name, phone, email, password, agree }) =>
    api('/auth/signup', { method: 'POST', body: { name, phone, email, password, agree } }),
  signIn: ({ email, password }) =>
    api('/auth/login', { method: 'POST', body: { email, password } }),
  signOut: () =>
    api('/auth/logout', { method: 'POST' }),
  restoreSession: () =>
    api('/me').catch(() => null),
  updateAccount: ({ name, phone }) =>
    api('/me', { method: 'PATCH', body: { name, phone } }),
  changePassword: ({ currentPassword, newPassword }) =>
    api('/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
  deleteAccount: () =>
    api('/me', { method: 'DELETE' }),
  forgotPassword: ({ email }) =>
    api('/auth/forgot', { method: 'POST', body: { email } }),
  resetPassword: ({ token, password }) =>
    api('/auth/reset', { method: 'POST', body: { token, password } }),
  getMyWorkerProfile: () =>
    api('/me/worker'),
  saveMyWorkerProfile: (profile) =>
    api('/me/worker', { method: 'PUT', body: profile }),
  deleteMyWorkerProfile: () =>
    api('/me/worker', { method: 'DELETE' }),
};

const BILLING = {
  getStatus: () => api('/me/billing'),
  pay: async () => {
    const checkout = await api('/me/billing/checkout', { method: 'POST' });
    if (typeof window.PaystackPop !== 'function') {
      throw new Error('Paystack checkout could not load. Please check your internet connection and try again.');
    }

    const beforeEndsAt = state.sub ? state.sub.endsAt : null;

    await new Promise((resolve, reject) => {
      try {
        const popup = new window.PaystackPop();
        popup.resumeTransaction(checkout.access_code, {
          onSuccess: () => resolve(),
          onCancel: () => reject(new Error('Payment was cancelled.')),
          onError: (err) => reject(new Error((err && err.message) || 'Payment failed.')),
        });
      } catch (err) {
        reject(new Error((err && err.message) || 'Could not open Paystack checkout.'));
      }
    });

    // Poll backend verification until Paystack confirms payment
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i += 1) {
      const check = await api(`/me/billing/verify/${encodeURIComponent(checkout.reference)}`);
      if (check && check.confirmed && check.subscription) {
        return check.subscription;
      }
      const status = await BILLING.getStatus();
      if (status && status.endsAt && status.endsAt !== beforeEndsAt) {
        return status;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Payment is still processing. Please refresh your billing status in a moment.');
  },
};

const REVIEWS = {
  createInvite: ({ clientName }) =>
    api('/me/invites', { method: 'POST', body: { clientName } }),
  lookupInvite: (token) =>
    api(`/invites/${encodeURIComponent(token)}`),
  submit: ({ token, blaze, rating, testimonial, name }) =>
    api(`/invites/${encodeURIComponent(token)}/feedback`, {
      method: 'POST',
      body: { blaze, rating, testimonial, name },
    }),
};

const WORKERS = {
  list: ({ q = '', category = '', area = '', verifiedOnly = false, minRating = 0, sort = 'rating', page = 1 } = {}, opts = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (area) params.set('area', area);
    if (verifiedOnly) params.set('verifiedOnly', '1');
    if (minRating) params.set('minRating', String(minRating));
    if (sort) params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    return api(`/workers?${params.toString()}`, opts);
  },
  get: (id) =>
    api(`/workers/${encodeURIComponent(id)}`),
  uploadPhoto: async (file) => {
    const resized = await resizeImageFile(file, 800);
    const fd = new FormData();
    fd.append('photo', resized);
    return api('/me/worker/photo', { method: 'POST', body: fd });
  },
  addPortfolio: async (file, title = '') => {
    const resized = await resizeImageFile(file, 1200);
    const fd = new FormData();
    fd.append('photo', resized);
    if (title) fd.append('title', title);
    return api('/me/worker/portfolio', { method: 'POST', body: fd });
  },
  removePortfolio: (id) =>
    api(`/me/worker/portfolio/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  report: ({ workerId, reason, contact }) =>
    api('/reports', { method: 'POST', body: { workerId, reason, contact } }),
};

const authError = (e) => e.message === 'NOT_CONNECTED' ? 'Accounts are not connected yet. Browsing is open to everyone.' : e.message;

async function startSession(user) {
  state.user = user;
  try { state.myProfile = await AUTH.getMyWorkerProfile(); } catch (e) { state.myProfile = null; }
  try { state.sub = await BILLING.getStatus(); } catch (e) { state.sub = null; }
  state.draft = state.myProfile ? { ...freshDraft(), ...state.myProfile } : { ...freshDraft(), name: user.name || '', phone: user.phone || '' };
  state.pendingPhotoFile = null;
}

async function submitAuth(f) {
  const a = state.auth, wantsWorker = !!a.reason;
  a.error = ''; a.info = '';
  a.values = { name: f.name, phone: f.phone, email: f.email };
  state.busy = 'auth'; render();

  try {
    if (a.mode === 'forgot') {
      const res = await AUTH.forgotPassword({ email: (f.email || '').trim() });
      state.busy = '';
      a.info = res.message || 'If an account matches that email, a reset link has been sent.';
      return render();
    }
    if (a.mode === 'reset') {
      if ((f.password || '') !== (f.confirmPassword || '')) {
        throw new Error('Passwords do not match.');
      }
      await AUTH.resetPassword({ token: a.resetToken, password: f.password });
      state.busy = '';
      a.mode = 'login';
      a.resetToken = '';
      a.info = 'Password updated. You can now log in with your new password.';
      history.replaceState(null, '', location.pathname + location.search);
      return render();
    }

    const signup = a.mode === 'signup';
    const user = signup
      ? await AUTH.signUp({
        name: (f.name || '').trim(),
        phone: (f.phone || '').trim(),
        email: (f.email || '').trim(),
        password: f.password,
        agree: Boolean(f.agree),
      })
      : await AUTH.signIn({ email: (f.email || '').trim(), password: f.password });
    state.busy = '';
    if (!user) {
      a.mode = 'login';
      a.info = 'Account created. Check your email to confirm it, then log in.';
      return render();
    }
    await startSession(user);
    state.showPw = false;
    wantsWorker ? setRole('worker') : setRole('customer');
  } catch (e) {
    state.busy = '';
    a.error = authError(e);
    render();
  }
}

async function saveAccount(f) {
  state.acct.error = ''; state.busy = 'acct'; render();
  try {
    state.user = await AUTH.updateAccount({ name: f.name.trim(), phone: f.phone.trim() });
    toast('Account updated.');
  } catch (e) {
    state.acct.error = authError(e);
  }
  state.busy = ''; render();
}

async function changePassword(f) {
  state.pw = { error: '', info: '' };
  if ((f.newPassword || '') !== (f.confirmPassword || '')) {
    state.pw.error = 'New passwords do not match.';
    return render();
  }
  state.busy = 'pw'; render();
  try {
    await AUTH.changePassword({ currentPassword: f.currentPassword || '', newPassword: f.newPassword || '' });
    state.pw = { error: '', info: 'Password updated cleanly.' };
    toast('Password updated.');
  } catch (e) {
    state.pw.error = authError(e);
  }
  state.busy = ''; render();
}

async function saveProfile() {
  if (!draftReady()) return;
  const isNew = !state.myProfile;
  state.busy = 'save'; render();
  try {
    const saved = await AUTH.saveMyWorkerProfile({ ...state.draft });
    state.myProfile = saved;
    if (state.pendingPhotoFile) {
      try {
        const up = await WORKERS.uploadPhoto(state.pendingPhotoFile);
        state.myProfile.photo = up.url;
        state.pendingPhotoFile = null;
      } catch (photoErr) {
        toast('Profile saved, but photo upload failed: ' + photoErr.message);
      }
    }
    state.draft = { ...freshDraft(), ...state.myProfile };
    try { state.sub = await BILLING.getStatus(); } catch {}
    state.marketCache = null;
    loadStats();
    loadMarket(1);
    toast(isNew ? 'Profile published! Your 30-day free trial has started.' : 'Profile saved.');
  } catch (e) {
    toast(authError(e));
  }
  state.busy = ''; render();
}

/* ---------- Data loading ---------- */
async function loadConfig() {
  try {
    const cfg = await api('/config');
    if (cfg && cfg.plan) {
      PLAN.price = cfg.plan.price;
      PLAN.trialDays = cfg.plan.trialDays;
    }
    if (cfg) {
      state.paystackPublicKey = cfg.paystackPublicKey || '';
      state.paystackConfigured = Boolean(cfg.paystackConfigured);
    }
    render();
  } catch {}
}

async function loadStats() {
  try {
    const stats = await api('/stats');
    if (stats) {
      state.stats = stats;
      if (state.screen === 'landing') render();
    }
  } catch {}
}

let marketTimer;
function applyLocalFilter(page = 1) {
  if (!Array.isArray(state.marketCache)) return false;
  const qTerms = String(state.query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const catExact = String(state.category || '').trim();
  const areaLower = String(state.location || '').trim().toLowerCase();
  const minR = Number(state.minRating) || 0;

  const filtered = state.marketCache.filter((w) => {
    if (catExact && w.category !== catExact) return false;
    if (state.verifiedOnly && !w.verified) return false;
    if (minR > 0 && !(w.reviews > 0 && w.rating >= minR)) return false;
    if (qTerms.length) {
      const hay = `${w.name} ${w.category} ${w.bio || ''} ${w.area || ''} ${w.type || ''}`.toLowerCase();
      if (!qTerms.every((term) => hay.includes(term))) return false;
    }
    if (areaLower && !String(w.area || '').toLowerCase().includes(areaLower)) return false;
    return true;
  });

  const sorters = {
    rating: (a, b) => (b.reviews ? b.rating : 0) - (a.reviews ? a.rating : 0) || b.reviews - a.reviews,
    blazes: (a, b) => (b.blazes || 0) - (a.blazes || 0) || b.reviews - a.reviews,
    experience: (a, b) => b.years - a.years,
    reviews: (a, b) => b.reviews - a.reviews,
  };
  filtered.sort(sorters[state.sort] || sorters.rating);

  const pageSize = 12;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * pageSize;

  state.workers = filtered.slice(start, start + pageSize);
  state.workersTotal = total;
  state.workersPage = safePage;
  state.workersTotalPages = totalPages;
  state.workersLoading = false;
  state.workersError = '';
  if (state.screen === 'market') updateMarket();
  return true;
}

async function loadMarket(page = state.workersPage, { silent = false } = {}) {
  const pageChanged = page !== state.workersPage;
  state.workersPage = page;
  state.workersError = '';
  const hasAnyFilter = Boolean(state.query.trim() || state.category || state.location.trim() || state.verifiedOnly || state.minRating);

  if (state.marketController) {
    state.marketController.abort();
  }
  const controller = new AbortController();
  state.marketController = controller;
  const seq = ++state.marketSeq;

  if (!silent && ((!state.marketCache && state.workers.length === 0) || pageChanged)) {
    state.workersLoading = true;
    if (state.screen === 'market' && $('#results')) {
      $('#results').innerHTML = marketSkeletonHTML();
    }
  } else {
    state.workersLoading = false;
  }

  try {
    const res = await WORKERS.list({
      q: state.query,
      category: state.category,
      area: state.location,
      verifiedOnly: state.verifiedOnly,
      minRating: state.minRating,
      sort: state.sort,
      page: state.workersPage,
    }, { signal: controller.signal });
    if (seq !== state.marketSeq) return;
    state.workers = res.items || [];
    state.workersTotal = res.total || 0;
    state.workersPage = res.page || 1;
    state.workersTotalPages = res.totalPages || 1;
    state.knownCategories = res.categories || [];
    state.knownCities = res.cities || [];
    if (!hasAnyFilter && page === 1 && (res.total || 0) <= (res.items || []).length) {
      state.marketCache = res.items || [];
    }
    state.workersLoading = false;
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    if (seq !== state.marketSeq) return;
    state.workersLoading = false;
    state.workersError = e.message || 'Could not load professionals right now.';
  }
  if (state.screen === 'market') updateMarket();
}

function scheduleMarketLoad(page = 1) {
  applyLocalFilter(page);
  clearTimeout(marketTimer);
  marketTimer = setTimeout(() => loadMarket(page, { silent: true }), 120);
}

async function openWorkerById(id, pushHash = true) {
  if (pushHash) {
    history.replaceState(null, '', `#pro/${encodeURIComponent(id)}`);
  }
  const cached = state.workers.find((w) => String(w.id) === String(id)) || state.stats.topWorkers.find((w) => String(w.id) === String(id));
  state.selected = cached || null;
  state.profileLoading = !cached;
  state.profileError = '';
  go('profile');
  try {
    const fresh = await WORKERS.get(id);
    if (state.screen === 'profile') {
      state.selected = fresh;
      state.profileLoading = false;
      render();
    }
  } catch (e) {
    if (state.screen === 'profile') {
      state.selected = null;
      state.profileLoading = false;
      state.profileError = e.message || 'This profile is not available right now.';
      render();
    }
  }
}

/* ---------- Auth & Account Screens ---------- */
const authScreen = () => {
  const a = state.auth, mode = a.mode, su = mode === 'signup', v = a.values || {};
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  const field = (label, name, type = 'text', extra = '') => `<label class="grid gap-1 text-sm font-semibold">${label}<input name="${name}" type="${type}" required value="${type === 'password' ? '' : esc(v[name])}" class="${input}" ${extra}></label>`;
  const pwField = (label, name, extra = '', hint = '') => `
    <label class="grid gap-1 text-sm font-semibold">
      <span class="flex items-center justify-between gap-2">${label}${hint ? `<span class="text-xs font-normal text-slate-400">${hint}</span>` : ''}</span>
      <span class="relative block">
        <input name="${name}" data-pw-field="1" type="${state.showPw ? 'text' : 'password'}" required class="${input} pr-11" ${extra}>
        <button type="button" data-action="toggle-pw" aria-label="${state.showPw ? 'Hide password' : 'Show password'}" aria-pressed="${state.showPw}" class="pc-pw-toggle">${icon(state.showPw ? 'eye-off' : 'eye', 17)}</button>
      </span>
    </label>`;

  const authAside = `
    <div class="lg:col-span-5 band rounded-3xl p-7 sm:p-8 text-white flex flex-col justify-between gap-6">
      <div>
        <div class="text-xs font-bold tracking-widest text-amber-rate uppercase">ProConnect Ghana</div>
        <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight text-balance">Direct WhatsApp leads with zero job commission.</h2>
        <p class="mt-3 text-sm text-white/80 leading-relaxed">Browse skilled professionals freely or publish your own profile in two minutes. First month free, then ${ghs(PLAN.price)}/month.</p>
        <ul class="mt-5 grid gap-3 text-sm text-white/80">
          <li class="flex items-start gap-2.5"><span class="mt-0.5 grid place-items-center w-5 h-5 rounded-lg bg-white/15 text-amber-rate shrink-0">${icon('check', 13)}</span><span>Customers contact you directly on WhatsApp</span></li>
          <li class="flex items-start gap-2.5"><span class="mt-0.5 grid place-items-center w-5 h-5 rounded-lg bg-white/15 text-amber-rate shrink-0">${icon('check', 13)}</span><span>Private one-time links for Blazes &amp; client testimonials</span></li>
          <li class="flex items-start gap-2.5"><span class="mt-0.5 grid place-items-center w-5 h-5 rounded-lg bg-white/15 text-amber-rate shrink-0">${icon('check', 13)}</span><span>EXIF &amp; GPS metadata stripped automatically on photo upload</span></li>
        </ul>
      </div>
      <div class="rounded-2xl bg-white/15 border border-brand/10 p-4 grid gap-2.5">
        <div class="flex items-center justify-between text-xs text-white/70 font-semibold">
          <span>Your public listing</span>
          <span class="text-amber-rate">30-day free trial</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-bold text-sm text-white truncate">Direct WhatsApp button</div>
            <div class="text-xs text-white/70 truncate">Flat ${ghs(PLAN.price)}/mo after trial · Keep 100% of every job</div>
          </div>
          <span class="w-9 h-9 rounded-xl bg-wa text-white grid place-items-center shrink-0">${icon('message-circle', 18)}</span>
        </div>
      </div>
    </div>`;

  if (mode === 'forgot') {
    return `
    <section class="max-w-5xl mx-auto px-5 py-10 pop">
      <div class="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        ${authAside}
        <div class="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-center">
          <div class="max-w-md mx-auto w-full">
            <h1 class="text-2xl font-extrabold text-ink">Reset your password</h1>
            <p class="text-slate-500 mt-1 text-sm">Enter your account email and we will send a password reset link.</p>
            <form data-form="auth" class="mt-6 grid gap-4">
              ${field('Email', 'email', 'email', 'autocomplete="email" placeholder="you@example.com"')}
              ${a.error ? `<p class="text-sm text-red-600" role="alert">${esc(a.error)}</p>` : ''}
              ${a.info ? `<p class="text-sm text-emerald-700" role="status">${esc(a.info)}</p>` : ''}
              <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-3.5 transition-colors" ${state.busy === 'auth' ? 'disabled' : ''}>${state.busy === 'auth' ? 'Please wait…' : 'Send reset link'}</button>
            </form>
            <button type="button" data-action="auth-login" class="mt-4 text-sm font-semibold text-brand hover:underline">Back to log in</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  if (mode === 'reset') {
    return `
    <section class="max-w-5xl mx-auto px-5 py-10 pop">
      <div class="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        ${authAside}
        <div class="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-center">
          <div class="max-w-md mx-auto w-full">
            <h1 class="text-2xl font-extrabold text-ink">Choose a new password</h1>
            <p class="text-slate-500 mt-1 text-sm">Enter a new password for your ProConnect account.</p>
            <form data-form="auth" class="mt-6 grid gap-4">
              ${pwField('New password', 'password', 'minlength="6" autocomplete="new-password"', 'Min. 6 characters')}
              ${pwField('Confirm new password', 'confirmPassword', 'minlength="6" autocomplete="new-password"')}
              ${a.error ? `<p class="text-sm text-red-600" role="alert">${esc(a.error)}</p>` : ''}
              <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-3.5 transition-colors" ${state.busy === 'auth' ? 'disabled' : ''}>${state.busy === 'auth' ? 'Saving…' : 'Update password'}</button>
            </form>
          </div>
        </div>
      </div>
    </section>`;
  }

  return `
  <section class="max-w-5xl mx-auto px-5 py-10 pop">
    <div class="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
      ${authAside}
      <div class="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-center">
        <div class="max-w-md mx-auto w-full">
          <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6 text-sm font-semibold">
            <button type="button" data-action="auth-mode-set" data-mode="login" class="py-2 rounded-lg transition-colors ${!su ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">Log in</button>
            <button type="button" data-action="auth-mode-set" data-mode="signup" class="py-2 rounded-lg transition-colors ${su ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">Create account</button>
          </div>
          <h1 class="text-2xl font-extrabold text-ink">${su ? 'Create your account' : 'Welcome back'}</h1>
          <p class="text-slate-500 mt-1 text-sm">${esc(a.reason) || (su ? 'One account to manage your details and list your services.' : 'Sign in to find trusted pros or manage your worker profile.')}</p>
          <form data-form="auth" class="mt-6 grid gap-4">
            ${su ? field('Full name', 'name', 'text', 'autocomplete="name" placeholder="e.g. Kwame Mensah"') + field('Phone / WhatsApp', 'phone', 'tel', 'autocomplete="tel" placeholder="024 000 0000"') : ''}
            ${field('Email', 'email', 'email', 'autocomplete="email" placeholder="you@example.com"')}
            ${pwField('Password', 'password', `minlength="6" autocomplete="${su ? 'new-password' : 'current-password'}"`, su ? 'Min. 6 characters' : '')}
            ${su ? `<label class="flex items-start gap-2.5 text-sm text-slate-600"><input type="checkbox" name="agree" required class="mt-1"><span>I agree to the <button type="button" data-action="terms" class="font-semibold text-brand hover:underline">Terms of Service</button> and <button type="button" data-action="privacy" class="font-semibold text-brand hover:underline">Privacy Policy</button></span></label>` : ''}
            ${a.error ? `<p class="text-sm text-red-600" role="alert">${esc(a.error)}</p>` : ''}
            ${a.info ? `<p class="text-sm text-emerald-700" role="status">${esc(a.info)}</p>` : ''}
            <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-3.5 transition-colors" ${state.busy === 'auth' ? 'disabled' : ''}>${state.busy === 'auth' ? 'Please wait…' : su ? 'Create account' : 'Sign in'}</button>
          </form>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" data-action="auth-mode" class="font-semibold text-brand hover:underline">${su ? 'Already have an account? Log in' : 'New here? Create an account'}</button>
            ${su ? '' : '<button type="button" data-action="auth-forgot" class="text-slate-500 hover:text-brand hover:underline">Forgot password?</button>'}
          </div>
          <div class="mt-5 pt-4 border-t border-slate-200">
            <button type="button" data-action="skip" class="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:border-brand/40 hover:text-brand transition-colors">Browse professionals without signing in</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
};

const accountScreen = () => {
  const u = state.user; if (!u) return authScreen();
  const mp = state.myProfile;
  const sub = state.sub;
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  const pwInput = (label, name, ac) => `
    <label class="grid gap-1 text-sm font-semibold">${label}
      <span class="relative block">
        <input name="${name}" data-acct-pw-field="1" type="${state.showAcctPw ? 'text' : 'password'}" required ${ac === 'current-password' ? '' : 'minlength="6" '}autocomplete="${ac}" class="${input} pr-11">
        <button type="button" data-action="toggle-acct-pw" aria-label="${state.showAcctPw ? 'Hide passwords' : 'Show passwords'}" aria-pressed="${state.showAcctPw}" class="pc-pw-toggle">${icon(state.showAcctPw ? 'eye-off' : 'eye', 17)}</button>
      </span>
    </label>`;
  const roleSummary = mp
    ? `Worker profile live (${esc(mp.category)})${sub ? ` · ${sub.status === 'trial' ? 'Free trial' : sub.status === 'active' ? 'Active plan' : 'Payment needed'}` : ''}`
    : 'Customer account · No worker profile yet';

  return `
  <section class="max-w-5xl mx-auto px-5 py-8 grid gap-6 pop">
    <div class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 overflow-hidden">
      <div class="flex items-center gap-4 min-w-0 w-full flex-1">
        ${avatar({ name: u.name, tint: 0, photo: mp ? mp.photo : null }, 64)}
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Account &amp; Settings</span>
            <span aria-hidden="true">·</span>
            <button type="button" data-action="role" data-role="customer" class="text-brand hover:underline">Back to Find Pros</button>
          </div>
          <h1 class="mt-0.5 text-2xl font-extrabold text-ink truncate">${esc(u.name) || 'Your account'}</h1>
          <p class="text-sm text-slate-500 truncate">${esc(u.email)}</p>
          <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">${roleSummary}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <button type="button" data-action="edit-worker" class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-4 py-2.5 text-sm transition-colors whitespace-nowrap shrink-0">${mp ? 'Worker dashboard' : 'List a service'}</button>
        <button type="button" data-action="signout" class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand/40 hover:text-brand transition-colors whitespace-nowrap shrink-0">${icon('log-out', 15)} Sign out</button>
      </div>
    </div>

    <div class="grid lg:grid-cols-12 gap-6 items-start">
      <aside class="lg:col-span-4 lg:sticky lg:top-20 grid gap-4">
        <nav aria-label="Account sections" class="bg-white rounded-3xl border border-slate-200 p-3 grid gap-1">
          <div class="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">Settings menu</div>
          <button type="button" data-action="acct-jump" data-target="acct-personal" class="pc-settings-link"><span>Personal details</span>${icon('user', 16)}</button>
          <button type="button" data-action="acct-jump" data-target="acct-appearance" class="pc-settings-link"><span>Appearance</span>${icon(state.theme === 'dark' ? 'moon' : 'sun', 16)}</button>
          <button type="button" data-action="acct-jump" data-target="acct-security" class="pc-settings-link"><span>Security &amp; password</span>${icon('shield-check', 16)}</button>
          <button type="button" data-action="acct-jump" data-target="acct-worker" class="pc-settings-link"><span>Worker profile &amp; plan</span>${icon('briefcase', 16)}</button>
          <button type="button" data-action="acct-jump" data-target="acct-privacy" class="pc-settings-link"><span>Privacy &amp; account deletion</span>${icon('clock', 16)}</button>
        </nav>
        ${planCard()}
      </aside>

      <div class="lg:col-span-8 grid gap-6">
        <form id="acct-personal" data-form="account" class="scroll-mt-24 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 grid gap-4">
          <div>
            <h2 class="font-bold text-lg text-ink">Personal details</h2>
            <p class="text-sm text-slate-500">Update your display name and contact phone number.</p>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <label class="grid gap-1 text-sm font-semibold">Full name<input name="name" required value="${esc(u.name)}" class="${input}"></label>
            <label class="grid gap-1 text-sm font-semibold">Phone / WhatsApp<input name="phone" inputmode="tel" value="${esc(u.phone)}" class="${input}"></label>
          </div>
          <label class="grid gap-1 text-sm font-semibold">Email address<input value="${esc(u.email)}" disabled class="${input} bg-slate-50 text-slate-500"></label>
          ${state.acct.error ? `<p class="text-sm text-red-600" role="alert">${esc(state.acct.error)}</p>` : ''}
          <div class="flex items-center justify-between gap-3 pt-1">
            <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold px-6 py-2.5 text-sm transition-colors" ${state.busy === 'acct' ? 'disabled' : ''}>${state.busy === 'acct' ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>

        <div id="acct-appearance" class="scroll-mt-24 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-bold text-lg text-ink">Appearance</h2>
            <p class="text-sm text-slate-500">Choose how ProConnect looks on this device.</p>
          </div>
          <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-sm font-semibold shrink-0">
            <button type="button" data-action="set-theme" data-theme="light" class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${state.theme !== 'dark' ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">${icon('sun', 15)} Light</button>
            <button type="button" data-action="set-theme" data-theme="dark" class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${state.theme === 'dark' ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">${icon('moon', 15)} Dark</button>
          </div>
        </div>

        <form id="acct-security" data-form="password" class="scroll-mt-24 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 grid gap-4">
          <div>
            <h2 class="font-bold text-lg text-ink">Security &amp; password</h2>
            <p class="text-sm text-slate-500">Changing your password refreshes your active sign-in session.</p>
          </div>
          ${pwInput('Current password', 'currentPassword', 'current-password')}
          <div class="grid sm:grid-cols-2 gap-4">
            ${pwInput('New password (min. 6 characters)', 'newPassword', 'new-password')}
            ${pwInput('Confirm new password', 'confirmPassword', 'new-password')}
          </div>
          ${state.pw.error ? `<p class="text-sm text-red-600" role="alert">${esc(state.pw.error)}</p>` : ''}
          ${state.pw.info ? `<p class="text-sm text-emerald-700" role="status">${esc(state.pw.info)}</p>` : ''}
          <div>
            <button class="rounded-xl border-2 border-brand text-brand hover:bg-brand-soft disabled:bg-slate-300 font-bold px-6 py-2.5 text-sm transition-colors" ${state.busy === 'pw' ? 'disabled' : ''}>${state.busy === 'pw' ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>

        <div id="acct-worker" class="scroll-mt-24 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
          <h2 class="font-bold text-lg text-ink">My worker profile</h2>
          ${mp ? `<p class="text-slate-500 text-sm mt-1 mb-4">This is how customers see you in search results.</p>
            <div class="max-w-sm">${workerCard({ tint: 0, rating: 0, reviews: 0, ...mp }, true)}</div>
            <div class="mt-4 flex flex-wrap gap-3">
              <button type="button" data-action="edit-worker" class="rounded-xl border-2 border-brand text-brand font-bold px-5 py-2.5 text-sm hover:bg-brand-soft transition-colors">Edit worker profile</button>
              <button type="button" data-action="confirm-delete-worker" class="rounded-xl border border-red-200 text-red-700 font-semibold px-5 py-2.5 text-sm hover:bg-red-50 transition-colors">Delete worker profile</button>
            </div>`
          : `<p class="text-slate-500 text-sm mt-1">You have not created a worker profile yet. Offer your services and get hired directly on WhatsApp.</p>
            <button type="button" data-action="edit-worker" class="mt-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-6 py-2.5 text-sm transition-colors">Create worker profile</button>`}
        </div>

        <div id="acct-privacy" class="scroll-mt-24 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 grid gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="font-bold text-lg text-ink">Data &amp; privacy</h2>
              <p class="text-sm text-slate-500">${u.termsAcceptedAt ? `Terms (${esc(u.termsVersion || SITE.updated)}) accepted ${new Date(u.termsAcceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Manage your personal export and privacy choices.'}</p>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <a href="/api/me/export" download="proconnect-my-data.json" class="text-brand hover:underline">Download my data</a>
              <button type="button" data-action="privacy" class="text-slate-600 hover:text-brand hover:underline">Privacy Policy</button>
              <button type="button" data-action="terms" class="text-slate-600 hover:text-brand hover:underline">Terms</button>
            </div>
          </div>
          <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="text-sm text-slate-500">Permanently remove your account, worker listing, photos, and feedback.</div>
            <button type="button" data-action="confirm-delete-account" class="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-5 py-2.5 text-sm transition-colors whitespace-nowrap shrink-0">Delete my account</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
};

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toWa = (p) => { let d = (p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '233' + d.slice(1); return d; };
const catIcon = (name) => (CATEGORIES.find((c) => c.name.toLowerCase() === String(name || '').toLowerCase()) || { icon: 'briefcase' }).icon;
let toastTimer;
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
};
const draftWorker = () => ({
  ...state.draft,
  id: state.myProfile ? state.myProfile.id : 'preview',
  tint: state.myProfile ? state.myProfile.tint : 0,
  rating: state.myProfile ? state.myProfile.rating : 0,
  reviews: state.myProfile ? state.myProfile.reviews : 0,
  blazes: state.myProfile ? state.myProfile.blazes : 0,
  testimonials: state.myProfile ? state.myProfile.testimonials : [],
  verified: !!(state.myProfile && state.myProfile.verified),
});
const draftReady = () => state.draft.name.trim().length >= 2 && state.draft.category.trim().length >= 2 && state.draft.area.trim().length >= 2 && state.draft.phone.replace(/\D/g, '').length >= 9;

/* ---------- Small building blocks ---------- */
const avatar = (w, size = 56) => {
  if (w.photo) return `<img src="${esc(w.photo)}" alt="" style="width:${size}px;height:${size}px" class="rounded-full object-cover shrink-0">`;
  const [a, b] = TINTS[(w.tint || 0) % TINTS.length];
  const ini = esc((w.name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase());
  return `<div style="width:${size}px;height:${size}px;font-size:${size * 0.36}px;background:linear-gradient(135deg,${a},${b})" class="rounded-full grid place-items-center text-white font-bold shrink-0">${ini}</div>`;
};
const rating = (w) => w.reviews > 0
  ? `<span class="inline-flex items-center gap-1 text-sm font-semibold">${icon('star', 15, 'fill-amber-rate text-amber-rate')} ${w.rating}<span class="font-normal text-slate-500">(${w.reviews})</span></span>`
  : `<span class="inline-flex items-center gap-1 text-xs text-slate-400">${icon('star', 14, 'text-slate-300')} New</span>`;
const badge = (text, ic, tone = 'brand') => `<span class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-soft text-brand'}">${ic ? icon(ic, 13) : ''}${esc(text)}</span>`;
const waButton = (w, big = false) => {
  const msg = encodeURIComponent(`Hi ${w.name}, I found you on ProConnect and need a ${(w.category || 'service').toLowerCase()} job done.`);
  return `<a href="https://wa.me/${toWa(w.phone)}?text=${msg}" target="_blank" rel="noopener noreferrer" class="w-full ${big ? 'py-3.5 text-base' : 'py-2.5 text-sm'} inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold shadow-sm transition-colors">${icon('message-circle', big ? 20 : 18)} Chat on WhatsApp</a>`;
};
const workerCard = (w, preview = false) => {
  const strip = [0, 1, 2].map((i) => { const [c1, c2] = TINTS[((w.tint || 0) + i) % TINTS.length]; return `<span class="flex-1" style="background:linear-gradient(135deg,${c1},${c2})"></span>`; }).join('');
  return `
  <article ${preview ? '' : `data-action="open" data-id="${esc(w.id)}" tabindex="0" role="button"`} class="card-lift bg-white rounded-2xl border border-slate-200 hover:border-brand/40 overflow-hidden flex flex-col ${preview ? '' : 'cursor-pointer'}">
    <div class="flex h-10">${strip}</div>
    <div class="p-4 pt-0 flex-1 flex flex-col gap-3">
      <div class="flex items-end justify-between -mt-7">
        <div class="ring-4 ring-white rounded-full">${avatar(w, 56)}</div>
        ${w.verified ? `<span class="pc-verified-inline">${icon('badge-check', 13)}Verified</span>` : ''}
      </div>
      <div>
        <h3 class="text-lg font-bold leading-tight truncate text-ink">${esc(w.name) || 'Your name'}</h3>
        <p class="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">${icon(catIcon(w.category), 14)} <span class="truncate">${esc(w.category)} · ${esc(w.type)}</span></p>
      </div>
      ${w.bio ? `<p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">${esc(w.bio)}</p>` : ''}
      <div class="mt-auto flex items-center justify-between gap-2 pt-1 tabular-nums">${rating(w)}${blazeChip(w)}</div>
      <div class="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 tabular-nums"><span class="flex items-center gap-1 min-w-0"><span class="shrink-0">${icon('map-pin', 14)}</span><span class="truncate">${esc(w.area) || 'Your service area'}</span></span><span class="shrink-0">${esc(w.years)} yrs exp</span></div>
      ${waButton(w)}
    </div>
  </article>`;
};

/* ---------- Screens ---------- */
const header = () => {
  const isDark = state.theme === 'dark';
  const u = state.user;
  const mp = state.myProfile;
  const navCls = (on) => `pc-nav-link whitespace-nowrap shrink-0 transition-colors ${on ? 'text-brand font-bold' : 'text-slate-600 hover:text-brand'}`;
  const mobItem = (action, attrs, label, on) =>
    `<button data-action="${action}" ${attrs} class="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${on ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-slate-50'}">${label}</button>`;
  const acctOn = state.screen === 'account';
  return `
  <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-3">
      <button data-action="home" class="flex items-center gap-2 font-extrabold text-lg text-brand whitespace-nowrap shrink-0">
        <img src="logo-icon.png" alt="" class="w-9 h-9 object-contain pc-logo-badge" onerror="this.style.display='none'">ProConnect</button>
      <nav aria-label="Primary" class="hidden md:inline-flex items-center gap-6 text-sm font-semibold">
        <button data-action="role" data-role="customer" data-active="${state.screen === 'market'}" class="${navCls(state.screen === 'market')}">Find Pros</button>
        <button data-action="role" data-role="worker" data-active="${state.screen === 'dashboard'}" class="${navCls(state.screen === 'dashboard')}">For Workers</button>
        <button data-action="about" data-active="${state.screen === 'about'}" class="${navCls(state.screen === 'about')}">About</button>
        <button data-action="privacy" data-active="${state.screen === 'privacy'}" class="${navCls(state.screen === 'privacy')}">Privacy</button>
      </nav>
      <div class="flex items-center gap-2 shrink-0">
        <button data-action="toggle-theme" aria-pressed="${isDark}" aria-label="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}" title="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}" class="theme-toggle">${icon(isDark ? 'sun' : 'moon', 17)}</button>
        <button data-action="${u ? 'account' : 'auth'}" data-mode="login" aria-label="${u ? 'Account and settings' : 'Sign in'}" class="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${u && acctOn ? 'bg-brand-soft border-brand/30 text-brand' : 'border-slate-200 text-brand hover:bg-brand-soft'}">${u ? `${avatar({ name: u.name, tint: 0, photo: mp ? mp.photo : null }, 22)}<span>Account</span>` : 'Sign in'}</button>
        <button data-action="toggle-menu" aria-expanded="${state.menuOpen}" aria-label="${state.menuOpen ? 'Close menu' : 'Open menu'}" class="md:hidden pc-icon-btn">${icon(state.menuOpen ? 'x' : 'menu', 18)}</button>
      </div>
    </div>
    ${state.menuOpen ? `
    <nav aria-label="Mobile menu" class="md:hidden pc-mobile-menu px-4 py-3 grid gap-1">
      ${mobItem('role', 'data-role="customer"', 'Find a Professional', state.screen === 'market')}
      ${mobItem('role', 'data-role="worker"', "I'm a Worker", state.screen === 'dashboard')}
      ${u ? mobItem('account', '', 'Account &amp; Settings', state.screen === 'account') : ''}
      ${mobItem('about', '', 'About ProConnect', state.screen === 'about')}
      ${mobItem('privacy', '', 'Privacy Policy', state.screen === 'privacy')}
      ${mobItem('terms', '', 'Terms of Service', state.screen === 'terms')}
      ${u ? mobItem('signout', '', 'Sign out', false) : ''}
    </nav>` : ''}
  </header>`;
};

const bottomNav = () => {
  if (['landing', 'profile', 'review', 'privacy', 'terms', 'about'].includes(state.screen)) return '';
  const item = (action, attrs, ic, label, on) => `<button data-action="${action}" ${attrs} class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${on ? 'text-brand' : 'text-slate-500'}">${icon(ic, 22)}${label}</button>`;
  return `<div class="md:hidden h-20"></div>
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 flex pb-[env(safe-area-inset-bottom)]">
    ${item('role', 'data-role="customer"', 'search', 'Find', state.screen === 'market')}
    ${item('role', 'data-role="worker"', 'briefcase', 'Worker', state.screen === 'dashboard')}
    ${item(state.user ? 'account' : 'auth', 'data-mode="login"', 'user', state.user ? 'Account' : 'Sign in', state.screen === 'account' || state.screen === 'auth')}
  </nav>`;
};

const HOME_TRADES = [
  { name: 'Plumbing', hint: 'Leaks, pipes & taps', icon: 'wrench', mode: 'category' },
  { name: 'Electrical', hint: 'Wiring, sockets & faults', icon: 'zap', mode: 'category' },
  { name: 'Carpentry', hint: 'Doors, roofs & furniture', icon: 'hammer', mode: 'category' },
  { name: 'Painting', hint: 'Interior & exterior finish', icon: 'paint-bucket', mode: 'category' },
  { name: 'Masonry', hint: 'Blocks, tiling & concrete', icon: 'layers', mode: 'category' },
  { name: 'Graphic Design', hint: 'Logos, flyers & branding', icon: 'sparkles', mode: 'query' },
  { name: 'Solar Installation', hint: 'Inverters & panels', icon: 'sun', mode: 'query' },
  { name: 'AC & Fridge Repair', hint: 'Cooling & servicing', icon: 'wrench', mode: 'query' },
];

const QUICK_SEARCHES = [
  { label: 'Plumber · Accra', svc: 'Plumbing', loc: 'Accra' },
  { label: 'Electrician · Kumasi', svc: 'Electrical', loc: 'Kumasi' },
  { label: 'Graphic Design', svc: 'Graphic Design', loc: '' },
  { label: 'Solar', svc: 'Solar', loc: '' },
];

const landingBriefText = (lb = state.landingBrief) =>
  `Hi, I found you on ProConnect.\n\nJob: ${lb.kind} (${lb.category})\nWhen: ${lb.when}\nLocation: ${lb.area || 'to be confirmed'}\n\nAre you available, and roughly what would it cost?`;

const updateLandingBriefPreview = () => {
  const pre = $('#home-brief-preview');
  if (pre) pre.textContent = landingBriefText();
};

const siteFooter = () => `
  <footer class="pc-footer">
    <div class="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
      <div class="lg:col-span-4 grid gap-3.5">
        <div class="flex items-center gap-3">
          <img src="logo-white.png" alt="ProConnect" class="h-10 w-auto" onerror="this.style.display='none'">
          <div>
            <div class="font-extrabold text-lg leading-tight">ProConnect</div>
            <div class="text-xs text-white/70">Accra · Kumasi · Takoradi · Nationwide</div>
          </div>
        </div>
        <p class="text-sm text-white/80 leading-relaxed max-w-sm">Ghana’s direct-connection directory for trusted local tradespeople and creative specialists. No middleman, no commission.</p>
        <div class="text-xs font-semibold text-white/70 pt-1">Act 843 Data Compliant · 0% Job Commission</div>
      </div>

      <div class="lg:col-span-3 grid gap-2.5 text-sm">
        <div class="text-xs font-bold uppercase tracking-widest text-amber-rate">Popular trades</div>
        <button type="button" data-action="home-trade" data-name="Plumbing" data-mode="category" class="text-left pc-footer-link">Plumbing</button>
        <button type="button" data-action="home-trade" data-name="Electrical" data-mode="category" class="text-left pc-footer-link">Electrical</button>
        <button type="button" data-action="home-trade" data-name="Carpentry" data-mode="category" class="text-left pc-footer-link">Carpentry</button>
        <button type="button" data-action="home-trade" data-name="Painting" data-mode="category" class="text-left pc-footer-link">Painting &amp; Finishes</button>
        <button type="button" data-action="home-trade" data-name="Graphic Design" data-mode="query" class="text-left pc-footer-link">Graphic Design</button>
      </div>

      <div class="lg:col-span-3 grid gap-2.5 text-sm">
        <div class="text-xs font-bold uppercase tracking-widest text-amber-rate">Platform</div>
        <button type="button" data-action="role" data-role="customer" class="text-left pc-footer-link">Find a professional</button>
        <button type="button" data-action="role" data-role="worker" class="text-left pc-footer-link">List your service</button>
        <button type="button" data-action="${state.user ? 'account' : 'auth'}" data-mode="login" class="text-left pc-footer-link">${state.user ? 'Account &amp; settings' : 'Sign in / Create account'}</button>
        <a href="mailto:${esc(SITE.email)}" class="pc-footer-link">${esc(SITE.email)}</a>
      </div>

      <div class="lg:col-span-2 grid gap-2.5 text-sm">
        <div class="text-xs font-bold uppercase tracking-widest text-amber-rate">Company &amp; Legal</div>
        <button type="button" data-action="about" class="text-left pc-footer-link">About ProConnect</button>
        <button type="button" data-action="terms" class="text-left pc-footer-link">Terms of Service</button>
        <button type="button" data-action="privacy" class="text-left pc-footer-link">Privacy Policy</button>
        <a href="/admin" class="pc-footer-link">Admin portal</a>
      </div>
    </div>

    <div class="pc-footer-divider">
      <div class="max-w-6xl mx-auto px-5 py-5 text-xs text-white/70 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 ProConnect Ghana. Free for customers.</span>
        <span>Professionals: ${ghs(PLAN.price)}/month after 30-day free trial · Secured by Paystack</span>
      </div>
    </div>
  </footer>`;

const landing = () => {
  const st = state.stats;
  const lb = state.landingBrief;
  const tab = state.landingTab === 'worker' ? 'worker' : 'customer';
  const trustItems = [
    st.totalPros > 0
      ? [String(st.totalPros), 'Active local pros', 'Verified & live listings across Ghana']
      : ['0%', 'Job commission', 'Keep 100% of every job'],
    st.avgRating > 0
      ? [`${st.avgRating} / 5`, 'Average rating', `From ${st.totalReviews} client reviews`]
      : ['1-tap', 'Direct WhatsApp', 'No forms or middleman'],
    ['30 days', 'Free pro trial', `Then ${ghs(PLAN.price)}/mo, no lock-in`],
  ];
  const customerSteps = [
    ['01', 'Search by trade or name', 'Filter live by skill, category, service area, and verified ID status with zero signup required.'],
    ['02', 'Check real portfolios', 'Review work photos, years of experience, Blazes, and single-use feedback left by previous clients.'],
    ['03', 'Chat directly on WhatsApp', 'Send a clear 20-second job brief straight to the expert and agree on price and timing together.'],
  ];
  const workerSteps = [
    ['01', 'Publish in 2 minutes', 'Create your profile with any trade or creative skill, upload up to 12 portfolio photos, and start your 30-day free trial.'],
    ['02', 'Keep 100% of your pay', 'Clients message your WhatsApp directly. ProConnect charges a flat GH₵20/month after trial with zero job commission.'],
    ['03', 'Build verified proof', 'Send clients a private one-time feedback link after each job to collect Blazes, star ratings, and testimonials.'],
  ];
  const activeSteps = tab === 'worker' ? workerSteps : customerSteps;

  return `
  <div class="hero-bg">
  <section class="max-w-6xl mx-auto px-5 pt-12 pb-12 pop">
    <div class="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
      <div class="lg:col-span-7 text-center lg:text-left">
        <div class="pc-eyebrow justify-center lg:justify-start">${icon('shield-check', 16)}<span>Every pro is reachable on WhatsApp in one tap</span></div>
        <h1 class="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink leading-[1.05] text-balance tracking-tight">Find trusted local experts or <span class="hl">get hired instantly.</span></h1>
        <p class="mt-5 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">Plumbers, electricians, carpenters, designers and technicians near you. Browse freely with no signup and agree on the job directly on WhatsApp.</p>
        <form data-form="landing" class="mt-7 max-w-xl mx-auto lg:mx-0 bg-white rounded-2xl shadow-lg border border-slate-200 p-2 flex flex-col sm:flex-row gap-2 text-left pc-search-bar">
          <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50">${icon('search', 19, 'text-brand')}
            <input data-field="landing.svc" value="${esc(state.landing.svc)}" placeholder="What do you need?" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
          <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 sm:border-l border-slate-200">${icon('map-pin', 19, 'text-brand')}
            <input data-field="landing.loc" value="${esc(state.landing.loc)}" placeholder="City e.g. Kumasi" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
          <button class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 transition-colors whitespace-nowrap shrink-0">Find Pros</button>
        </form>
        <div class="mt-3.5 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-slate-500">
          <span class="font-semibold">Popular:</span>
          ${QUICK_SEARCHES.map((q, idx) => `${idx > 0 ? '<span aria-hidden="true" class="text-slate-300">·</span>' : ''}<button type="button" data-action="quick-search" data-svc="${esc(q.svc)}" data-loc="${esc(q.loc)}" class="font-semibold text-slate-600 hover:text-brand hover:underline transition-colors whitespace-nowrap shrink-0">${esc(q.label)}</button>`).join('')}
        </div>
        <div class="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
          <button type="button" data-action="skip" class="pc-btn-hero-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap shrink-0">Explore all professionals ${icon('arrow-right', 16)}</button>
          <button type="button" data-action="role" data-role="worker" class="pc-btn-hero-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap shrink-0">${icon('briefcase', 16)} List your service · First month free</button>
        </div>
      </div>
      <div class="lg:col-span-5 bob">${phoneMock()}<p class="mt-4 text-center text-xs font-medium text-slate-500">Direct WhatsApp chat · No middleman</p></div>
    </div>

    <div class="mt-12 bg-white rounded-2xl border border-slate-200 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
      ${trustItems.map(([val, title, desc]) => `
        <div class="px-6 py-5 flex items-center justify-between sm:justify-start gap-4">
          <div class="text-2xl sm:text-3xl font-extrabold text-brand tabular-nums shrink-0">${esc(val)}</div>
          <div class="min-w-0 text-right sm:text-left">
            <div class="text-sm font-bold text-ink">${esc(title)}</div>
            <div class="text-xs text-slate-500 truncate">${esc(desc)}</div>
          </div>
        </div>`).join('')}
    </div>
  </section></div>

  <section class="reveal max-w-6xl mx-auto px-5 py-12">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">Directory shortcuts</p>
        <h2 class="mt-1 text-2xl sm:text-3xl font-extrabold text-ink text-balance">Explore by trade &amp; skill</h2>
      </div>
      <button data-action="skip" class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline whitespace-nowrap shrink-0">Browse all categories ${icon('arrow-right', 16)}</button>
    </div>
    <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${HOME_TRADES.map((t) => `
        <button data-action="home-trade" data-name="${esc(t.name)}" data-mode="${t.mode}" class="card-lift text-left bg-white rounded-2xl border border-slate-200 hover:border-brand/40 p-4 flex items-center justify-between gap-3 transition-colors">
          <span class="flex items-start gap-3 min-w-0">
            <span class="pc-trade-icon grid place-items-center w-11 h-11 rounded-xl bg-brand-soft text-brand shrink-0">${icon(t.icon, 20)}</span>
            <span class="min-w-0">
              <span class="block font-bold text-sm text-ink truncate">${esc(t.name)}</span>
              <span class="block text-xs text-slate-500 mt-0.5 truncate">${esc(t.hint)}</span>
            </span>
          </span>
          <span class="pc-trade-arrow text-brand shrink-0 hidden sm:inline">${icon('arrow-right', 15)}</span>
        </button>`).join('')}
    </div>
  </section>

  <section class="reveal max-w-5xl mx-auto px-5 pb-12">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="text-center sm:text-left">
        <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">Simple by design</p>
        <h2 class="mt-1 text-2xl sm:text-3xl font-extrabold text-ink text-balance">How ProConnect works</h2>
      </div>
      <div class="inline-flex p-1 bg-slate-100 rounded-xl text-sm font-semibold shrink-0">
        <button data-action="landing-tab" data-tab="customer" class="px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${tab === 'customer' ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">For customers</button>
        <button data-action="landing-tab" data-tab="worker" class="px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${tab === 'worker' ? 'bg-white shadow text-brand' : 'text-slate-500 hover:text-brand'}">For professionals</button>
      </div>
    </div>
    <div class="mt-6 grid sm:grid-cols-3 gap-4">
      ${activeSteps.map(([num, title, desc]) => `
        <div class="card-lift bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-2">
          <div class="pc-step-num">${num}</div>
          <h3 class="mt-1 text-lg font-bold text-ink">${esc(title)}</h3>
          <p class="text-slate-600 text-sm leading-relaxed">${esc(desc)}</p>
        </div>`).join('')}
    </div>
    <div class="mt-5 flex justify-center sm:justify-end">
      ${tab === 'worker'
        ? `<button data-action="role" data-role="worker" class="inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 text-sm transition-colors whitespace-nowrap shrink-0">Create your pro profile ${icon('arrow-right', 16)}</button>`
        : `<button data-action="skip" class="inline-flex items-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold px-6 py-3 text-sm transition-colors whitespace-nowrap shrink-0">Explore professionals ${icon('arrow-right', 16)}</button>`}
    </div>
  </section>

  <section class="reveal max-w-5xl mx-auto px-5 pb-12">
    <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 grid lg:grid-cols-5 gap-6 items-center">
      <div class="lg:col-span-3 grid gap-4">
        <div>
          <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">Interactive Job Brief</p>
          <h2 class="mt-1 text-2xl sm:text-3xl font-extrabold text-ink text-balance">Skip the awkward “hello” — send a clear brief.</h2>
          <p class="mt-2 text-sm text-slate-600">Preview how ProConnect formats your WhatsApp inquiry in 20 seconds so professionals can quote accurately right away.</p>
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-2">Trade</div>
          <div class="flex flex-wrap gap-2">
            ${['Plumbing', 'Electrical', 'Carpentry', 'Graphic Design', 'Solar Installation'].map((c) => `<button type="button" data-action="lb-cat" data-v="${esc(c)}" class="rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${lb.category === c ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600 hover:border-brand/50'}">${esc(c)}</button>`).join('')}
          </div>
        </div>
        <div class="grid gap-3">
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-2">What do you need?</div>
            <div class="flex flex-wrap gap-2">
              ${BRIEF_KINDS.map((k) => `<button type="button" data-action="lb-kind" data-v="${esc(k)}" class="rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${lb.kind === k ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600 hover:border-brand/50'}">${esc(k)}</button>`).join('')}
            </div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 mb-2">When?</div>
            <div class="flex flex-wrap gap-2">
              ${BRIEF_WHEN.map((w) => `<button type="button" data-action="lb-when" data-v="${esc(w)}" class="rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${lb.when === w ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600 hover:border-brand/50'}">${esc(w)}</button>`).join('')}
            </div>
          </div>
        </div>
        <label class="grid gap-1 text-xs font-semibold text-slate-500">Neighborhood or city
          <input data-field="landingBrief.area" value="${esc(lb.area)}" maxlength="80" placeholder="e.g. East Legon, Accra" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
        </label>
      </div>
      <div class="lg:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-5 grid gap-3">
        <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>WhatsApp message preview</span>
          <span>20 sec</span>
        </div>
        <div id="home-brief-preview" class="wa-msg-out whitespace-pre-line text-sm rounded-2xl rounded-tr-sm p-4 shadow-sm">${esc(landingBriefText(lb))}</div>
        <button type="button" data-action="lb-find" class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold py-3 text-sm transition-colors whitespace-nowrap shrink-0">${icon('search', 16)} Find matching pros</button>
      </div>
    </div>
  </section>

  ${st.topWorkers && st.topWorkers.length ? `<section class="reveal max-w-6xl mx-auto px-5 pb-12">
    <div class="flex items-end justify-between"><h2 class="text-2xl sm:text-3xl font-extrabold text-ink">Top-rated pros</h2><button data-action="skip" class="text-sm font-semibold text-brand hover:underline">See all</button></div>
    <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${st.topWorkers.slice(0, 3).map((w) => workerCard(w)).join('')}</div>
  </section>` : ''}

  <section class="reveal max-w-5xl mx-auto px-5 pb-14">
    <p class="text-center text-xs font-bold tracking-widest text-amber-rate uppercase">For professionals</p>
    <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-center text-ink text-balance">Simple pricing</h2>
    <div class="mt-8 grid md:grid-cols-5 gap-4 items-stretch">
      <div class="md:col-span-2 band rounded-3xl text-white p-8 flex flex-col justify-center">
        <div class="text-xs font-bold tracking-widest text-amber-rate uppercase">First month free</div>
        <div class="mt-3 flex items-end gap-2"><span class="text-5xl font-extrabold tabular-nums">${ghs(PLAN.price)}</span><span class="pb-1 text-white/70">per month</span></div>
        <p class="mt-2 text-white/80">After your free month. Pay month by month, no contract.</p>
        <button data-action="role" data-role="worker" class="mt-6 rounded-xl bg-amber-rate hover:brightness-95 text-ink font-bold px-6 py-3.5 transition">Start your free month</button>
      </div>
      <div class="md:col-span-3 bg-white rounded-3xl border border-slate-200 p-8">
        <h3 class="text-lg font-bold text-ink">Everything a professional needs</h3>
        <ul class="mt-4 grid sm:grid-cols-2 gap-3">${['A public profile with your photo, bio and category', 'Customers contact you directly on WhatsApp', 'A portfolio of your best work', 'Blazes, ratings and testimonials from real clients', 'A private feedback link to send after each job', 'Job briefs: clear leads instead of “hello”'].map((t) => `<li class="flex gap-2 text-sm text-slate-600"><span class="mt-0.5 grid place-items-center w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">${icon('check', 13)}</span>${t}</li>`).join('')}</ul>
        <p class="mt-5 text-sm text-slate-500">Customers always use ProConnect for free. No commission on your jobs.</p>
      </div>
    </div>
  </section>

  <section class="reveal max-w-3xl mx-auto px-5 pb-14">
    <p class="text-center text-xs font-bold tracking-widest text-amber-rate uppercase">Good to know</p>
    <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-center text-ink">Frequently asked questions</h2>
    <div class="mt-8 grid gap-3">
      ${[['Do I need an account to find a pro?', 'No. You can browse, open profiles and chat on WhatsApp as a guest. An account is only needed if you want to offer your services.'],
         ['How do I contact a professional?', 'Tap Chat on WhatsApp on any profile. WhatsApp opens with a ready message, and you talk to the pro directly. You can also send a short job brief first.'],
         ['How much does ProConnect cost?', `It is free for customers. Professionals pay ${ghs(PLAN.price)} per month, and every new professional gets their first month free.`],
         ['Does ProConnect take a commission?', 'No. Professionals pay a flat monthly subscription. You and the professional agree the job and the price between yourselves.'],
         ['What are Blazes, ratings and testimonials?', 'After a job, a professional can send you a private link. You can give a Blaze (a fire reaction for great work), a star rating, a testimonial, or all three.'],
         ['How do professionals pay?', `Once a month, by mobile money or card. Nothing renews automatically, so you only pay when you choose to. If you skip a month, your profile is hidden from search until you pay again.`],
         ['What does the Verified badge mean?', 'Pros with the Verified badge have had their details checked by us. Always agree the price and the work before it starts.'],
         ['I am a tradesperson or creative. How do I join?', `Tap For Workers, sign up and create your profile. Your first month is free, then it is ${ghs(PLAN.price)} per month. Choose one of the main categories or type your own, such as Graphic Design or Video Editing.`],
         ['Is payment for jobs handled on ProConnect?', 'No. Agree on payment directly with the pro, and keep your chat on WhatsApp as a record of what was agreed.']]
        .map(([q, a]) => `<details class="faq bg-white rounded-2xl border border-slate-200 hover:border-brand/40 px-5 py-4"><summary class="flex items-center justify-between gap-4 cursor-pointer font-semibold text-ink list-none">${q}<span class="faq-plus shrink-0">+</span></summary><p class="mt-3 text-slate-600 text-sm leading-relaxed">${a}</p></details>`).join('')}
    </div>
  </section>

  <section class="reveal max-w-5xl mx-auto px-5 pb-16">
    <div class="band rounded-3xl text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-5">
      <div><h2 class="text-2xl sm:text-3xl font-extrabold">Are you a pro? Get hired on WhatsApp.</h2>
        <p class="mt-1 text-white/80">Your first month is free, then ${ghs(PLAN.price)} per month. Plumbers, electricians, designers, video editors and more.</p></div>
      <button data-action="role" data-role="worker" class="shrink-0 rounded-xl bg-amber-rate hover:brightness-95 text-ink font-bold px-7 py-3.5 transition">Start your free month</button>
    </div>
  </section>`;
};

const SORTS = {
  rating: 'Top rated',
  blazes: 'Most blazed',
  experience: 'Most experienced',
  reviews: 'Most reviews',
};

const tilesHTML = () => {
  const extra = state.knownCategories.filter((c) => c && !CATEGORIES.some((k) => k.name === c));
  const items = [
    { name: '', label: 'All trades', icon: 'users' },
    ...CATEGORIES.map((c) => ({ ...c, label: c.name })),
    ...extra.map((name) => ({ name, label: name, icon: 'briefcase' })),
  ];
  return items.map(({ name, label, icon: ic }) => {
    const on = state.category === name;
    return `<button type="button" data-action="category" data-name="${esc(name)}" data-active="${on}" class="pc-cat-chip">${icon(ic, 16)}<span>${esc(label)}</span></button>`;
  }).join('');
};

const toolbarHTML = () => {
  const cities = state.knownCities.slice(0, 6);
  const chip = (on, attrs, label, ic) => `<button type="button" ${attrs} class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600 hover:border-brand/40 hover:text-brand'}">${ic ? icon(ic, 15) : ''}${label}</button>`;
  const active = state.verifiedOnly || state.minRating || state.category || state.query || state.location;
  return `
  ${cities.length ? `<div class="flex flex-wrap items-center gap-2 mb-3">
    <span class="text-xs font-bold uppercase tracking-widest text-slate-500 mr-1">Near you</span>
    ${cities.map((c) => chip(state.location.toLowerCase() === c.toLowerCase(), `data-action="city" data-name="${esc(c)}"`, esc(c), 'map-pin')).join('')}
  </div>` : ''}
  <div class="flex flex-wrap items-center gap-2">
    ${chip(state.verifiedOnly, 'data-action="verified"', 'Verified only', 'badge-check')}
    ${chip(!!state.minRating, 'data-action="rating"', '4.8+ rating', 'star')}
    ${active ? '<button type="button" data-action="clear" class="rounded-xl px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft transition-colors whitespace-nowrap shrink-0">Reset filters</button>' : ''}
    <label class="ml-auto inline-flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap shrink-0"><span>Sort</span>
      <select data-field="sort" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">${Object.entries(SORTS).map(([k, label]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
  </div>`;
};

const workerCardSkeletonHTML = () => `
  <article aria-hidden="true" class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
    <div class="h-10 pc-skel"></div>
    <div class="p-4 pt-0 flex-1 flex flex-col gap-3">
      <div class="flex items-end justify-between -mt-7">
        <div class="ring-4 ring-white rounded-full"><div style="width:56px;height:56px" class="rounded-full pc-skel"></div></div>
        <div class="h-4 w-16 rounded-lg pc-skel"></div>
      </div>
      <div class="grid gap-1.5">
        <div class="h-4 w-40 rounded-lg pc-skel"></div>
        <div class="h-3.5 w-32 rounded-lg pc-skel"></div>
      </div>
      <div class="grid gap-1.5">
        <div class="h-3 w-full rounded-lg pc-skel"></div>
        <div class="h-3 w-5/6 rounded-lg pc-skel"></div>
      </div>
      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <div class="h-4 w-20 rounded-lg pc-skel"></div>
        <div class="h-4 w-16 rounded-lg pc-skel"></div>
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="h-3 w-28 rounded-lg pc-skel"></div>
        <div class="h-3 w-16 rounded-lg pc-skel"></div>
      </div>
      <div class="h-10 w-full rounded-xl pc-skel"></div>
    </div>
  </article>`;

const marketSkeletonHTML = (count = 6) => `
  <div class="mt-6" aria-busy="true" aria-label="Loading professionals">
    <div class="flex items-baseline justify-between gap-3">
      <div class="h-6 w-40 rounded-lg pc-skel"></div>
      <div class="h-4 w-20 rounded-lg pc-skel"></div>
    </div>
    <div class="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${Array.from({ length: count }, workerCardSkeletonHTML).join('')}
    </div>
  </div>`;

const profileSkeletonHTML = () => `
  <section class="max-w-3xl mx-auto px-5 py-6 pb-32" aria-busy="true" aria-label="Loading profile">
    <div class="h-4 w-32 rounded-lg pc-skel"></div>
    <div class="mt-4 bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div class="h-36 sm:h-44 pc-skel"></div>
      <div class="px-5 pb-6 -mt-10">
        <div class="ring-4 ring-white rounded-full w-fit"><div style="width:80px;height:80px" class="rounded-full pc-skel"></div></div>
        <div class="mt-3 h-7 w-56 rounded-lg pc-skel"></div>
        <div class="mt-2 h-4 w-40 rounded-lg pc-skel"></div>
        <div class="mt-3 flex flex-wrap gap-2">
          <div class="h-7 w-24 rounded-lg pc-skel"></div>
          <div class="h-7 w-24 rounded-lg pc-skel"></div>
          <div class="h-7 w-20 rounded-lg pc-skel"></div>
        </div>
        <div class="mt-5 grid grid-cols-3 gap-3">
          <div class="rounded-2xl bg-slate-50 py-3 px-3 grid gap-2 justify-items-center"><div class="h-6 w-16 rounded-lg pc-skel"></div><div class="h-3 w-20 rounded-lg pc-skel"></div></div>
          <div class="rounded-2xl bg-slate-50 py-3 px-3 grid gap-2 justify-items-center"><div class="h-6 w-16 rounded-lg pc-skel"></div><div class="h-3 w-20 rounded-lg pc-skel"></div></div>
          <div class="rounded-2xl bg-slate-50 py-3 px-3 grid gap-2 justify-items-center"><div class="h-6 w-16 rounded-lg pc-skel"></div><div class="h-3 w-20 rounded-lg pc-skel"></div></div>
        </div>
        <div class="mt-6 h-4 w-20 rounded-lg pc-skel"></div>
        <div class="mt-2 grid gap-2">
          <div class="h-3.5 w-full rounded-lg pc-skel"></div>
          <div class="h-3.5 w-5/6 rounded-lg pc-skel"></div>
          <div class="h-3.5 w-3/4 rounded-lg pc-skel"></div>
        </div>
        <div class="mt-6 h-4 w-24 rounded-lg pc-skel"></div>
        <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div class="aspect-[4/3] rounded-2xl pc-skel"></div>
          <div class="aspect-[4/3] rounded-2xl pc-skel"></div>
          <div class="aspect-[4/3] rounded-2xl pc-skel"></div>
        </div>
      </div>
    </div>
  </section>`;

const resultsHTML = () => {
  if (state.workersLoading) {
    return marketSkeletonHTML();
  }
  if (state.workersError) {
    return `<div class="mt-6 rounded-2xl bg-white border border-red-200 p-10 text-center text-red-700">${esc(state.workersError)}<div><button data-action="retry-market" class="mt-3 rounded-xl bg-brand text-white font-bold px-5 py-2.5 text-sm">Try again</button></div></div>`;
  }
  const list = state.workers;
  const hasFilters = Boolean(state.verifiedOnly || state.minRating || state.category || state.query.trim() || state.location.trim());
  const pager = state.workersTotalPages > 1
    ? `<div class="mt-8 flex items-center justify-center gap-3">
        <button data-action="page" data-page="${state.workersPage - 1}" ${state.workersPage <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-20">Previous</button>
        <span class="text-sm text-slate-500 tabular-nums">Page ${state.workersPage} of ${state.workersTotalPages}</span>
        <button data-action="page" data-page="${state.workersPage + 1}" ${state.workersPage >= state.workersTotalPages ? 'disabled' : ''} class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-20">Next</button>
      </div>`
    : '';
  return `<div class="mt-6 flex items-baseline justify-between gap-3"><h3 class="text-lg font-bold text-ink">${esc(state.category) || 'All'} professionals</h3><span class="text-sm font-semibold text-slate-500 tabular-nums">${state.workersTotal} found</span></div>` +
    (list.length === 0
      ? (hasFilters
        ? `<div class="mt-4 bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
            <div class="mx-auto w-12 h-12 rounded-xl bg-brand-soft text-brand grid place-items-center mb-3">${icon('search', 22)}</div>
            <p class="font-bold text-ink">No matching professionals found</p>
            <p class="text-sm mt-1 max-w-md mx-auto">Try a broader keyword, another city, or reset your active filters.</p>
            <button data-action="clear" class="mt-4 rounded-xl bg-brand text-white font-bold px-5 py-2.5 text-sm hover:bg-brand-dark transition-colors">Reset filters</button>
          </div>`
        : `<div class="mt-4 bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
            <p class="font-bold text-ink">No professionals listed yet</p>
            <p class="text-sm mt-1">Profiles published by skilled pros will appear here.</p>
          </div>`)
      : `<div class="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${list.map((w) => workerCard(w)).join('')}</div>` + pager);
};

const syncSearchClearButtons = () => {
  const cq = $('[data-clear-btn="query"]');
  if (cq) cq.classList.toggle('hidden', !state.query);
  const cl = $('[data-clear-btn="location"]');
  if (cl) cl.classList.toggle('hidden', !state.location);
};

const updateMarket = () => {
  if (!$('#tiles')) return;
  $('#tiles').innerHTML = tilesHTML();
  $('#toolbar').innerHTML = toolbarHTML();
  $('#results').innerHTML = resultsHTML();
  [['query', state.query], ['location', state.location]].forEach(([k, v]) => { const i = $(`[data-field="${k}"]`); if (i && i.value !== v) i.value = v; });
  syncSearchClearButtons();
};

const marketplace = () => {
  const firstName = state.user ? esc((state.user.name || 'there').split(' ')[0]) : '';
  return `
  <div class="band">
    <section class="max-w-6xl mx-auto px-5 py-8 sm:py-10 text-white pop">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">${state.user ? `Welcome back, ${firstName}` : 'Find a professional'}</p>
          <h1 class="mt-1 text-3xl sm:text-4xl font-extrabold">Who do you need today?</h1>
          <p class="mt-1.5 text-white/80 text-sm sm:text-base">Filter in real time by skill, trade, or name, then chat directly on WhatsApp.</p>
        </div>
        ${state.user ? `<div class="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" data-action="account" class="rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold px-4 py-2 text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0">Account &amp; settings</button>
          <button type="button" data-action="role" data-role="worker" class="rounded-xl bg-amber-rate hover:brightness-95 text-ink font-bold px-4 py-2 text-xs sm:text-sm transition whitespace-nowrap shrink-0">${state.myProfile ? 'Worker profile' : 'List a service'}</button>
        </div>` : ''}
      </div>
      <div class="mt-5 bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 text-ink shadow-lg border border-slate-200 pc-search-bar">
        <label class="flex-1 flex items-center gap-2 px-3 py-2">${icon('search', 18, 'text-brand')}
          <input data-field="query" value="${esc(state.query)}" placeholder="Search by skill, service, or name" class="w-full bg-transparent outline-none">
          <button type="button" data-action="clear-query" data-clear-btn="query" aria-label="Clear search" class="${state.query ? '' : 'hidden '}w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">×</button>
        </label>
        <label class="flex-1 flex items-center gap-2 px-3 py-2 sm:border-l border-slate-200">${icon('map-pin', 18, 'text-brand')}
          <input data-field="location" value="${esc(state.location)}" placeholder="Area or city" class="w-full bg-transparent outline-none">
          <button type="button" data-action="clear-location" data-clear-btn="location" aria-label="Clear location" class="${state.location ? '' : 'hidden '}w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">×</button>
        </label>
      </div>
    </section>
  </div>
  <section class="max-w-6xl mx-auto px-5 py-7 pb-16">
    <div id="tiles" class="flex flex-wrap gap-2">${tilesHTML()}</div>
    <div id="toolbar" class="mt-5 pt-5 border-t border-slate-200">${toolbarHTML()}</div>
    <div id="results">${resultsHTML()}</div>
  </section>`;
};

const profileDetail = () => {
  if (state.profileLoading) {
    return profileSkeletonHTML();
  }
  if (state.profileError || !state.selected) {
    return `<section class="max-w-xl mx-auto px-5 py-12 pop"><div class="bg-white rounded-3xl border border-slate-200 p-8 text-center">
      <h2 class="text-2xl font-extrabold">Profile unavailable</h2>
      <p class="mt-2 text-slate-600">${esc(state.profileError || 'This profile is not available right now.')}</p>
      <button data-action="back" class="mt-5 rounded-xl bg-brand text-white font-bold px-6 py-3">Browse professionals</button>
    </div></section>`;
  }
  const w = state.selected; const [a, b] = TINTS[(w.tint || 0) % TINTS.length]; const ic = catIcon(w.category);
  const portfolioItems = w.portfolio || [];
  const portfolioHTML = portfolioItems.length
    ? `<div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">${portfolioItems.map((item) => `<figure class="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"><img src="${esc(item.image_url)}" alt="${esc(item.title || 'Work sample')}" class="w-full h-full object-cover">${item.title ? `<figcaption class="absolute inset-x-0 bottom-0 bg-black/40 text-white px-3 py-1.5 text-xs font-semibold truncate">${esc(item.title)}</figcaption>` : ''}</figure>`).join('')}</div>`
    : `<p class="mt-2 text-sm text-slate-500">No portfolio photos uploaded yet.</p>`;

  const shareUrl = `${location.href.split('#')[0]}#pro/${encodeURIComponent(w.id)}`;

  return `
  <section class="max-w-3xl mx-auto px-5 py-6 pb-32 pop">
    <button data-action="back" class="inline-flex items-center gap-1 text-slate-600 font-semibold hover:text-brand">${icon('arrow-left', 18)} Back to results</button>
    <div class="mt-4 bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div class="h-36 sm:h-44" style="background:linear-gradient(120deg,${a},${b})"></div>
      <div class="px-5 pb-6 -mt-10">
        <div class="ring-4 ring-white rounded-full w-fit">${avatar(w, 80)}</div>
        <h2 class="mt-3 text-2xl font-extrabold flex items-center gap-2">${esc(w.name)}${w.verified ? icon('badge-check', 24, 'text-sky-500') : ''}</h2>
        <p class="text-slate-500 flex items-center gap-1 mt-1">${icon('map-pin', 16)} ${esc(w.area)}</p>
        <div class="mt-3 flex flex-wrap gap-2">${badge(w.category, ic)}${w.verified ? badge('ID verified', 'shield-check', 'green') : ''}${badge(w.type, w.type === 'Business' ? 'briefcase' : 'user')}</div>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('star', 16, 'fill-amber-rate text-amber-rate')}${w.reviews > 0 ? w.rating : '—'}</div><div class="text-xs text-slate-500">${w.reviews} reviews</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg">${w.years} yrs</div><div class="text-xs text-slate-500">Experience</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('flame', 18, 'fill-orange-400 text-orange-500')}${esc(w.blazes || 0)}</div><div class="text-xs text-slate-500">Blazes</div></div>
        </div>
        <h3 class="mt-6 font-bold">About</h3><p class="mt-1 text-slate-600 leading-relaxed">${esc(w.bio) || 'No bio added yet.'}</p>
        <h3 class="mt-6 font-bold">What clients say</h3>${testimonialsHTML(w)}
        <div class="mt-6 rounded-2xl bg-brand-soft p-4 flex items-center justify-between gap-3"><div><div class="font-bold text-brand">Not sure what to say?</div><div class="text-sm text-slate-600">Describe your job in 20 seconds. We write the WhatsApp message for you.</div></div><button data-action="brief" class="shrink-0 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-4 py-2.5 text-sm transition-colors">Send job brief</button></div>
        <div class="mt-4 text-xs text-slate-500 leading-relaxed">ProConnect only connects you. Agree the price and the work with the pro directly. <button data-action="terms" class="underline hover:text-brand">Terms</button> · <button data-action="report-open" class="underline hover:text-brand">Report this profile</button>
          <details class="mt-2"><summary class="cursor-pointer font-semibold text-slate-600">Safety tips</summary><ol class="mt-2 list-decimal pl-5 grid gap-1"><li>Agree on the work and price in writing on WhatsApp before starting.</li><li>Do not pay everything upfront.</li><li>Check the pro's previous work and ask for references.</li><li>Meet in a safe place, and tell someone when a stranger is coming to your home.</li><li>Report suspicious profiles to us.</li></ol></details></div>
        <h3 class="mt-6 font-bold">Portfolio</h3>${portfolioHTML}
      </div>
    </div>
    <div class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3">
      <div class="max-w-3xl mx-auto flex gap-3"><div class="flex-1">${waButton(w, true)}</div>
        <a href="tel:+${toWa(w.phone)}" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand text-brand font-bold px-5 hover:bg-brand-soft">${icon('phone', 20)}<span class="hidden sm:inline">Call</span></a>
        <a href="https://wa.me/?text=${encodeURIComponent(`${w.name} on ProConnect: ${shareUrl}`)}" target="_blank" rel="noopener noreferrer" aria-label="Share this profile" class="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 px-4 hover:bg-slate-50">${icon('share-2', 20)}</a></div>
    </div>
  </section>`;
};

const dashboard = () => {
  const d = state.draft;
  const mp = state.myProfile;
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  const portfolioList = (mp && mp.portfolio) || [];
  return `
  <section class="max-w-6xl mx-auto px-5 py-8 grid lg:grid-cols-5 gap-6 pop">
    <div class="lg:col-span-3 grid gap-6">
      <div class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        <h2 class="text-2xl font-extrabold">${mp ? 'Edit your public profile' : 'Create your public profile'}</h2>
        <p class="text-slate-500 mt-1">Customers chat with you directly on WhatsApp. No commission, no middleman.</p>
        ${state.user ? `<p class="text-sm text-slate-500 mt-2">Linked to your account (${esc(state.user.email)}). <button data-action="account" class="font-semibold text-brand hover:underline">View account</button></p>` : ''}
        <div class="mt-5 grid gap-4">
          <div class="inline-flex p-1 bg-slate-100 rounded-xl w-fit">
            ${['Personal', 'Business'].map((t) => `<button data-action="draft-type" data-type="${t}" class="px-4 py-2 rounded-lg text-sm font-semibold ${d.type === t ? 'bg-white shadow text-brand' : 'text-slate-500'}">${t} name</button>`).join('')}
          </div>
          <label class="grid gap-1 text-sm font-semibold">${d.type === 'Business' ? 'Business name' : 'Your full name'}
            <input class="${input}" data-field="draft.name" maxlength="80" value="${esc(d.name)}" placeholder="${d.type === 'Business' ? 'e.g. Mensah Plumbing Works' : 'e.g. Kwame Mensah'}"></label>
          <div class="flex items-center gap-4">${avatar(draftWorker(), 72)}
            <label class="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">${icon('upload', 18)} ${state.busy === 'photo' ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" data-file="photo" class="hidden"></label></div>
          <div><div class="text-sm font-semibold mb-2">Category</div><div class="flex flex-wrap gap-2">
            ${CATEGORIES.map(({ name, icon: ic }) => `<button type="button" data-action="draft-cat" data-name="${name}" class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 ${d.category === name ? 'bg-brand text-white border-brand' : 'border-slate-300 hover:border-brand/50'}">${icon(ic, 15)}${name}</button>`).join('')}
          </div>
          <label class="mt-3 grid gap-1 text-xs font-semibold text-slate-500">Or type your own category (e.g. Graphic Design, Video Editing)
            <input class="${input} text-sm text-ink" data-field="draft.category" maxlength="40" value="${esc(d.category)}" placeholder="e.g. Graphic Design"></label></div>
          <div class="grid sm:grid-cols-2 gap-4">
            <label class="grid gap-1 text-sm font-semibold">Service area<input class="${input}" data-field="draft.area" maxlength="80" value="${esc(d.area)}" placeholder="e.g. Kumasi – Ahodwo"></label>
            <label class="grid gap-1 text-sm font-semibold">WhatsApp number<input class="${input}" inputmode="tel" maxlength="20" data-field="draft.phone" value="${esc(d.phone)}" placeholder="024 000 0000"></label>
          </div>
          <label class="grid gap-1 text-sm font-semibold">Years of experience<input type="number" min="0" max="70" class="${input}" data-field="draft.years" value="${esc(d.years)}"></label>
          <label class="grid gap-1 text-sm font-semibold">Short bio<textarea rows="3" maxlength="600" class="${input}" data-field="draft.bio" placeholder="What you do best and how you work.">${esc(d.bio)}</textarea></label>
          <button id="publish" data-action="publish" class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 transition-colors" ${draftReady() && state.busy !== 'save' ? '' : 'disabled'}>${icon('check', 18)} ${state.busy === 'save' ? 'Saving…' : mp ? 'Save changes' : 'Publish profile'}</button>
          <p id="hint" class="text-xs text-slate-500 -mt-2 ${draftReady() ? 'hidden' : ''}">Add your name, category, service area and a WhatsApp number to publish.</p>
        </div>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        <div class="flex items-center justify-between gap-2">
          <div><h3 class="font-bold text-lg">Portfolio photos</h3><p class="text-sm text-slate-500">Show up to 12 photos of your real work (JPEG, PNG or WebP, max 2 MB).</p></div>
          <span class="text-xs font-semibold text-slate-500">${portfolioList.length}/12</span>
        </div>
        ${mp ? `
          <div class="mt-4 flex flex-col sm:flex-row gap-3">
            <input class="${input} flex-1" data-field="portfolioTitle" maxlength="60" value="${esc(state.portfolioTitle)}" placeholder="Photo caption (optional, e.g. Kitchen tiling)">
            <label class="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand text-brand font-bold px-5 py-2.5 text-sm hover:bg-brand-soft transition-colors ${portfolioList.length >= 12 ? 'opacity-20' : ''}">${icon('upload', 16)} ${state.busy === 'portfolio' ? 'Uploading…' : 'Add work photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" data-file="portfolio" class="hidden" ${portfolioList.length >= 12 || state.busy === 'portfolio' ? 'disabled' : ''}></label>
          </div>
          ${portfolioList.length ? `<div class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">${portfolioList.map((item) => `
            <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
              <img src="${esc(item.image_url)}" alt="${esc(item.title || 'Work sample')}" class="w-full h-36 object-cover">
              ${item.title ? `<div class="px-2.5 py-1.5 text-xs font-semibold truncate">${esc(item.title)}</div>` : ''}
              <button type="button" data-action="portfolio-del" data-id="${esc(item.id)}" aria-label="Remove portfolio photo" class="absolute top-2 right-2 rounded-full bg-white/95 text-red-700 px-2.5 py-1 text-xs font-bold shadow hover:bg-red-50">Remove</button>
            </div>`).join('')}</div>` : '<p class="mt-4 text-sm text-slate-500">No work photos uploaded yet.</p>'}
        ` : `<p class="mt-3 text-sm text-slate-500">Publish your profile first to upload portfolio photos.</p>`}
      </div>
    </div>

    <aside class="lg:col-span-2"><div class="lg:sticky lg:top-20 grid gap-4">
      ${planCard()}
      <div><div class="flex items-center gap-2 font-bold mb-3">${icon('eye', 18)} How customers see you</div>
        <div id="preview">${workerCard(draftWorker(), true)}</div>
        <p class="mt-3 text-sm text-slate-500">The green button opens WhatsApp with a ready-made message to your number.</p></div>
      ${inviteCard()}
    </div></aside>
  </section>`;
};

/* ---------- Hero chat mockup, scroll reveal, Job Brief, Report & Confirm Modals ---------- */
const phoneMock = () => `
  <div class="pc-phone-stage mx-auto">
    <div class="pc-phone-glow" aria-hidden="true"></div>
    <div class="phone mx-auto">
      <div class="flex items-center gap-3 bg-[#075E54] text-white px-4 pt-6 pb-3">
        <span class="w-9 h-9 rounded-full grid place-items-center bg-white/20 font-bold shrink-0">K</span>
        <div class="leading-tight min-w-0">
          <div class="font-semibold text-sm flex items-center gap-1">Kwame Mensah ${icon('badge-check', 14)}</div>
          <div id="phone-status" class="text-xs text-white/80">Plumber · online</div>
        </div>
      </div>
      <div id="chat" class="chat-bg p-3 flex flex-col gap-2 text-[13px] h-[21rem] justify-end overflow-hidden">
        ${[['out', 'Hi Kwame, my kitchen tap is leaking badly. Can you come today?', '10:02'],
           ['in', 'Hello! Yes, I can be there by 3pm. Which area are you in?', '10:03'],
           ['out', 'Ahodwo, Kumasi. Can you send a quote?', '10:03'],
           ['in', 'Inspection is free. Most tap repairs are quick. See you at 3.', '10:04']]
          .map(([d, t, time]) => `<div class="msg ${d === 'out' ? 'self-end wa-msg-out pc-msg-out-pop' : 'self-start wa-msg-in pc-msg-in-pop'} rounded-xl px-3 py-2 max-w-[82%] shadow-sm">${t}<span class="block text-[10px] text-slate-400 text-right mt-0.5">${time}${d === 'out' ? ' ✓✓' : ''}</span></div>`).join('')}
        <div id="chat-typing" class="pc-typing-bubble hidden-slot self-start" aria-hidden="true"><span class="pc-typing-dot"></span><span class="pc-typing-dot"></span><span class="pc-typing-dot"></span></div>
      </div>
      <div class="pc-wa-inputbar px-3 py-2 flex items-center gap-2">
        <div class="pc-wa-pill flex-1 rounded-full px-3 py-1.5 text-xs truncate">Message Kwame…</div>
        <span class="w-9 h-9 rounded-full bg-wa text-white grid place-items-center shrink-0" aria-hidden="true">${icon('send', 14)}</span>
      </div>
    </div>
    <div class="pc-phone-callout flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
      <span class="text-brand inline-flex items-center gap-1">${icon('shield-check', 14)}Verified ID</span>
      <span class="text-slate-400" aria-hidden="true">·</span>
      <span class="inline-flex items-center gap-1">${icon('star', 13, 'fill-amber-rate text-amber-rate')}4.9</span>
      <span class="text-slate-400" aria-hidden="true">·</span>
      <span>0% Commission</span>
    </div>
  </div>`;

let chatTimer;
function runChat() {
  clearTimeout(chatTimer);
  const chat = document.getElementById('chat');
  const statusEl = document.getElementById('phone-status');
  const typingEl = document.getElementById('chat-typing');
  const msgs = [...document.querySelectorAll('#chat .msg')];
  if (!chat || !msgs.length) return;

  const setTyping = (on) => {
    if (statusEl) statusEl.textContent = on ? 'typing…' : 'Plumber · online';
    if (!typingEl) return;
    if (on) {
      typingEl.classList.remove('hidden-slot');
      requestAnimationFrame(() => typingEl.classList.add('show'));
    } else {
      typingEl.classList.remove('show');
      typingEl.classList.add('hidden-slot');
    }
  };

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    chat.classList.remove('pc-chat-fade');
    setTyping(false);
    msgs.forEach((m) => m.classList.add('show'));
    return;
  }

  chat.classList.remove('pc-chat-fade');
  setTyping(false);
  msgs.forEach((m) => m.classList.remove('show'));

  const schedule = (ms, fn) => {
    chatTimer = setTimeout(() => {
      if (!document.body.contains(chat)) return;
      fn();
    }, ms);
  };

  schedule(360, () => {
    msgs[0].classList.add('show');
    schedule(650, () => {
      setTyping(true);
      schedule(1050, () => {
        setTyping(false);
        msgs[1].classList.add('show');
        schedule(950, () => {
          msgs[2].classList.add('show');
          schedule(600, () => {
            setTyping(true);
            schedule(1050, () => {
              setTyping(false);
              msgs[3].classList.add('show');
              schedule(3800, () => {
                chat.classList.add('pc-chat-fade');
                schedule(400, () => runChat());
              });
            });
          });
        });
      });
    });
  });
}

const syncHeaderScroll = () => {
  const h = document.querySelector('header');
  if (h) h.classList.toggle('pc-header-scrolled', window.scrollY > 10);
};
if (!window.__pcScrollBound) {
  window.__pcScrollBound = true;
  window.addEventListener('scroll', syncHeaderScroll, { passive: true });
}

function afterRender() {
  document.documentElement.classList.add('js');
  syncHeaderScroll();
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  } else items.forEach((el) => el.classList.add('in'));
  if (state.screen === 'landing') runChat();
}

const BRIEF_KINDS = ['Fix a problem', 'New work', 'Just a quote'], BRIEF_WHEN = ['Today', 'This week', 'Flexible'];
const briefText = (w, b) => `Hi ${w.name}, I found you on ProConnect.\n\nJob: ${b.kind} (${w.category})\nWhen: ${b.when}\nLocation: ${b.area || 'to be confirmed'}${b.note ? `\nDetails: ${b.note}` : ''}\n\nCan you help, and roughly what would it cost?`;
const briefLink = (w, b) => `https://wa.me/${toWa(w.phone)}?text=${encodeURIComponent(briefText(w, b))}`;
const updateBrief = () => { $('#brief-preview').textContent = briefText(state.selected, state.brief); $('#brief-send').href = briefLink(state.selected, state.brief); };
const briefSheet = () => {
  const b = state.brief, w = state.selected; if (!b || state.screen !== 'profile' || !w) return '';
  const chips = (list, val, action) => list.map((v) => `<button type="button" data-action="${action}" data-v="${v}" class="rounded-xl px-3.5 py-2 text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 ${val === v ? 'bg-brand text-white border-brand' : 'border-slate-300 hover:border-brand/50'}">${v}</button>`).join('');
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  return `
  <div data-action="brief-close" class="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
    <div data-action="noop" class="pop bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-3"><div><h3 class="text-xl font-extrabold">Send a job brief</h3><p class="text-sm text-slate-500">to ${esc(w.name)}. Takes 20 seconds.</p></div><button data-action="brief-close" aria-label="Close" class="w-9 h-9 rounded-full bg-slate-100 text-lg font-bold">×</button></div>
      <div class="mt-5 grid gap-4">
        <div><div class="text-sm font-semibold mb-2">What do you need?</div><div class="flex flex-wrap gap-2">${chips(BRIEF_KINDS, b.kind, 'brief-kind')}</div></div>
        <div><div class="text-sm font-semibold mb-2">When?</div><div class="flex flex-wrap gap-2">${chips(BRIEF_WHEN, b.when, 'brief-when')}</div></div>
        <label class="grid gap-1 text-sm font-semibold">Where is the job?<input data-field="brief.area" value="${esc(b.area)}" placeholder="e.g. Ahodwo, Kumasi" class="${input}"></label>
        <label class="grid gap-1 text-sm font-semibold">Details (optional)<textarea rows="3" data-field="brief.note" placeholder="Tell them what is wrong or what you want." class="${input}">${esc(b.note)}</textarea></label>
        <div><div class="text-xs font-semibold text-slate-500 mb-1">Preview of your WhatsApp message</div><div id="brief-preview" class="wa-msg-out whitespace-pre-line text-sm rounded-2xl rounded-tr-sm p-3">${esc(briefText(w, b))}</div></div>
        <a id="brief-send" href="${briefLink(w, b)}" target="_blank" rel="noopener noreferrer" class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold py-3.5 transition-colors">${icon('message-circle', 20)} Send on WhatsApp</a>
      </div>
    </div>
  </div>`;
};

const reportSheet = () => {
  const rm = state.reportModal, w = state.selected;
  if (!rm || !w) return '';
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  return `
  <div data-action="report-close" class="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center sm:p-4">
    <div data-action="noop" class="pop bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3"><div><h3 class="text-xl font-extrabold">Report profile</h3><p class="text-sm text-slate-500">${esc(w.name)}</p></div><button data-action="report-close" aria-label="Close" class="w-9 h-9 rounded-full bg-slate-100 text-lg font-bold">×</button></div>
      <form data-form="report" class="mt-4 grid gap-4">
        <label class="grid gap-1 text-sm font-semibold">What happened?<textarea name="reason" rows="3" required minlength="5" maxlength="500" placeholder="Tell our team why this profile should be reviewed." class="${input}">${esc(rm.reason)}</textarea></label>
        <label class="grid gap-1 text-sm font-semibold">Your phone or email (optional)<input name="contact" maxlength="120" value="${esc(rm.contact)}" placeholder="So we can follow up if needed" class="${input}"></label>
        ${rm.error ? `<p class="text-sm text-red-600" role="alert">${esc(rm.error)}</p>` : ''}
        <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-3 transition-colors" ${rm.busy ? 'disabled' : ''}>${rm.busy ? 'Sending…' : 'Submit report'}</button>
      </form>
    </div>
  </div>`;
};

const confirmSheet = () => {
  const cm = state.confirmModal;
  if (!cm) return '';
  return `
  <div data-action="confirm-close" class="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
    <div data-action="noop" class="pop bg-white w-full max-w-md rounded-3xl p-6">
      <h3 class="text-xl font-extrabold">${esc(cm.title)}</h3>
      <p class="mt-2 text-sm text-slate-600">${esc(cm.message)}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button data-action="confirm-close" class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
        <button data-action="confirm-proceed" class="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-bold" ${cm.busy ? 'disabled' : ''}>${cm.busy ? 'Deleting…' : esc(cm.confirmLabel)}</button>
      </div>
    </div>
  </div>`;
};

/* ---------- Terms of Service & Privacy Policy ---------- */
const SITE = {
  updated: '22 November 2026',
  contact: 'Email support@proconnectgh.com for help, reports, or data requests.',
  email: 'support@proconnectgh.com',
  verifiedMeans: 'we have checked the professional’s Ghana Card or business registration details',
  renewal: 'Subscriptions do not renew automatically. Each month the professional pays to keep their profile live, for example by mobile money. We may send a reminder before the paid period ends',
  refunds: 'Monthly fees are non-refundable once the 30-day period starts, except for verified duplicate payments',
};
const TERMS = [
  { h: 'What ProConnect is', p: [`ProConnect is an online directory that helps people find local professionals and contact them directly, mainly through WhatsApp. We only make the introduction. We are a gateway. We are not a contractor, employer, agent or insurer, and we do not handle payments for jobs between customers and professionals.`] },
  { h: 'We are only the gateway', ul: [
    `Any job, agreement, price, schedule, payment or contract is strictly between the customer and the professional. ProConnect is not part of it.`,
    `We do not supervise or guarantee the quality, safety, legality, timing or pricing of any work. We also do not guarantee that a professional will show up or that a customer will pay.`,
    `Any problem that happens outside ProConnect is between the people involved. That includes poor workmanship, damage, injury, theft, no-shows, non-payment, disputes, scams, and anything said or done on WhatsApp, by phone or in person. We cannot settle, refund or compensate for these.`,
    `Profiles are written by the professionals themselves. We do not promise they are accurate.`] },
  { h: 'Pricing and subscriptions', ul: [
    `ProConnect is free for customers.`,
    `Professionals pay a subscription of ${ghs(PLAN.price)} per month to keep a public profile on ProConnect.`,
    `Every new professional gets their first month free. Billing starts after the free month ends.`,
    `${SITE.renewal}.`,
    `There is nothing to cancel. If you do not pay for the next month, your profile is hidden from search when your paid period ends, and it shows again once you pay.`,
    `Refunds: ${SITE.refunds}.`,
    `We may change the price. We will tell subscribers before a new price applies to them.`,
    `Subscription payments are handled by Paystack under Paystack's own terms. We never see or store your card or mobile money details.`,
    `A subscription does not buy a Verified badge, a higher ranking or any guarantee of work.`] },
  { h: 'Who may use ProConnect', p: [`You must be 18 or older. If you are under 18, please use ProConnect only with a parent or guardian, and do not create a worker profile.`] },
  { h: 'Accounts', p: [`You can browse without an account. You need an account to create a worker profile. Give accurate information, keep your password private, and understand that you are responsible for what happens under your account. One profile per person or business.`] },
  { h: 'For professionals', ul: [
    `Your profile is public. It shows your name, category, area, photo, bio, WhatsApp number and the feedback you receive, and by publishing it you agree that people may contact you.`,
    `Be truthful about your skills, experience and qualifications, and hold any licence or permit your trade needs.`,
    `Do not use someone else's name, photos or work as your own.`,
    `You set your own prices and terms. You are responsible for the quality, safety, insurance and taxes of your work.`] },
  { h: 'For customers', p: [`Check the professional before you hire. Agree the work, price and timing before anything starts, and keep it in writing on WhatsApp. Avoid paying everything upfront. Take sensible care when you let someone into your home or meet someone in person.`] },
  { h: 'The Verified badge', p: [`Verified means ${SITE.verifiedMeans}. It is not a guarantee of quality, honesty or ability.`] },
  { h: 'Blazes, ratings and testimonials', ul: [
    `After a job, a professional can send a client a private feedback link. The client can give a Blaze, a star rating, a testimonial, or all three. Each link works once.`,
    `Feedback must be honest and based on a real job. A testimonial and the client's first name are shown publicly on the professional's profile.`,
    `Professionals must not pay for, fake or pressure clients into feedback, and must not create links for jobs that did not happen.`,
    `We may remove fake, abusive or misleading feedback.`] },
  { h: 'What is not allowed', p: [`Fake or misleading profiles, pretending to be someone else, scams or fraud, illegal services, harassment or abuse, hateful, sexual or violent content, spam, copying data from the site, and anything meant to harm or disrupt it.`] },
  { h: 'Your content', p: [`You keep ownership of what you upload, such as photos and text. You give ProConnect a free, non-exclusive right to display it on the site, and in previews of it, so that we can run and promote the service. Only upload things you have the right to use.`] },
  { h: 'Other services', p: [`WhatsApp, Paystack, our hosting provider and other third parties have their own terms and privacy rules. We are not responsible for them.`] },
  { h: 'Privacy', p: [`We collect only what we need: account details (name, email, phone), profile details, photos and feedback. Worker profile details and feedback are public. We do not sell personal data. Our Privacy Policy gives the full details, including how to ask us to correct or delete your information. We will handle personal data in line with Ghana's Data Protection Act, 2012 (Act 843).`] },
  { h: 'Removal and suspension', p: [`We may remove content or suspend accounts that break these terms or put others at risk, sometimes without warning. You can delete your profile at any time.`] },
  { h: 'No warranty and limit of liability', p: [`ProConnect is provided "as is" and "as available". It may be interrupted or contain errors. To the fullest extent the law allows, ProConnect and its owner(s) are not liable for any loss, damage, injury or expense arising from using the site or from any dealings between users. Nothing here removes any right or liability that the law does not allow to be removed.`] },
  { h: 'Changes', p: [`We may update these terms. The date above will change, and continuing to use ProConnect means you accept the update.`] },
  { h: 'Governing law', p: [`These terms are governed by the laws of Ghana.`] },
  { h: 'Contact', p: [`${SITE.contact}`] },
];

const termsScreen = () => `
  <section class="max-w-3xl mx-auto px-5 py-8 pop">
    <button data-action="terms-back" class="inline-flex items-center gap-1 text-slate-600 font-semibold hover:text-brand">${icon('arrow-left', 18)} Back</button>
    <article class="mt-4 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10">
      <h1 class="text-3xl font-extrabold">ProConnect Terms of Service</h1>
      <p class="mt-1 text-sm text-slate-500">Last updated: ${esc(SITE.updated)}</p>
      <div class="mt-6 grid gap-6">
        ${TERMS.map((s, i) => `<section><h2 class="text-lg font-bold">${i + 1}. ${s.h}</h2>${(s.p || []).map((t) => `<p class="mt-2 text-slate-600 leading-relaxed">${t}</p>`).join('')}${s.ul ? `<ul class="mt-2 list-disc pl-5 grid gap-1.5 text-slate-600 leading-relaxed">${s.ul.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}</section>`).join('')}
      </div>
    </article>
  </section>`;

const PRIVACY = [
  {
    h: 'Who we are and scope',
    p: [`ProConnect operates an online directory in Ghana that helps customers find local tradespeople and creatives and message them directly on WhatsApp. This Privacy Policy explains what personal data we collect, how we use and protect it, and your rights under Ghana’s Data Protection Act, 2012 (Act 843).`],
  },
  {
    h: 'Information we collect',
    ul: [
      `<strong>Visitors &amp; customers:</strong> You can search and browse professionals without creating an account. If you submit feedback through a single-use invite link, we collect your first name, optional star rating, Blaze, and testimonial text. If you submit a profile report, we record your report reason and any optional contact note you provide.`,
      `<strong>Registered professionals:</strong> When you create an account, we collect your full name, email address, phone number, a securely salted password hash, and a timestamped record of your agreement to our Terms of Service and Privacy Policy.`,
      `<strong>Public profile &amp; portfolio content:</strong> Trade or category, service area, years of experience, bio, WhatsApp number, profile photo, and portfolio photos you choose to publish.`,
      `<strong>Billing &amp; security records:</strong> Monthly subscription dates, Paystack transaction references, and limited server security logs used for rate-limiting and abuse prevention.`,
    ],
  },
  {
    h: 'Public vs. private information',
    ul: [
      `<strong>Visible publicly:</strong> Published worker profiles (name, trade, service area, experience, bio, WhatsApp link, profile and portfolio photos, Verified badge status, Blazes, star ratings, and client testimonials with the client’s first name).`,
      `<strong>Kept private:</strong> Your account email, password hash, Paystack payment references, unused feedback invite tokens, moderation reports, and account settings.`,
    ],
  },
  {
    h: 'Photos & automatic metadata stripping',
    p: [`Before saving any uploaded profile photo or portfolio image, our servers validate the file signature and automatically strip EXIF, camera, and GPS location metadata so hidden location data is never published.`],
  },
  {
    h: 'How we use your information',
    ul: [
      `Operate the directory, real-time search filters, and direct WhatsApp job briefs.`,
      `Verify accounts, manage free trials and monthly subscriptions, and review Verified badge requests.`,
      `Send essential account emails or SMS messages such as password resets and upcoming subscription expiry reminders when notifications are enabled.`,
      `Investigate reported profiles, prevent spam or fake reviews, and protect the security of our users.`,
    ],
  },
  {
    h: 'Payments & third-party services',
    ul: [
      `<strong>Paystack:</strong> Monthly professional subscriptions (${ghs(PLAN.price)}/month) are processed by Paystack under Paystack’s privacy policy. ProConnect never sees or stores your card number, CVV, or mobile money PIN.`,
      `<strong>WhatsApp:</strong> When you tap to message a professional, your conversation takes place directly inside WhatsApp and is governed by WhatsApp’s own terms and privacy policy.`,
      `<strong>Delivery partners:</strong> Optional transactional email and SMS providers may process your email address or phone number solely to deliver account messages you request.`,
    ],
  },
  {
    h: 'Cookies & browser storage',
    p: [`Signed-in accounts use an HTTP-only session cookie so you stay logged in safely across page reloads. We also use local browser storage solely to remember your light or dark theme preference. We do not use third-party advertising cookies or cross-site ad trackers.`],
  },
  {
    h: 'Data retention & deletion',
    ul: [
      `If a professional’s subscription expires, their public profile is automatically hidden from directory search results.`,
      `Expired sessions, used password-reset tokens, and temporary security logs are purged automatically on a rolling schedule (within 90 days).`,
      `You can edit your details anytime from your Account page, delete your public worker profile, or permanently delete your entire account—which immediately removes your records and uploaded photos from our database and storage.`,
    ],
  },
  {
    h: 'Security & age requirement',
    p: [`Passwords are stored using salted cryptographic hashing, and sensitive actions are protected with session validation and CSRF checks. ProConnect worker profiles are strictly for individuals aged 18 and older.`],
  },
  {
    h: 'Your rights & contact',
    p: [`We do not sell personal data. Under the Data Protection Act, 2012 (Act 843), you have the right to request access to, correction of, or deletion of your personal data at any time. Use your Account page, or email ${esc(SITE.email)} for help, reports, or data requests.`],
  },
];

const privacyScreen = () => `
  <section class="max-w-3xl mx-auto px-5 py-8 pop">
    <button data-action="terms-back" class="inline-flex items-center gap-1 text-slate-600 font-semibold hover:text-brand">${icon('arrow-left', 18)} Back</button>
    <article class="mt-4 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 grid gap-6 text-slate-600 leading-relaxed">
      <div>
        <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">Privacy &amp; Data Protection</p>
        <h1 class="mt-2 text-3xl font-extrabold text-ink">ProConnect Privacy Policy</h1>
        <p class="mt-1 text-sm text-slate-500">Last updated: ${esc(SITE.updated)} · Ghana Data Protection Act, 2012 (Act 843)</p>
      </div>

      <div class="grid sm:grid-cols-3 gap-3">
        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div class="text-sm font-bold text-ink">No data selling</div>
          <p class="mt-1 text-xs text-slate-500">We never sell or rent customer or pro contact details to third parties.</p>
        </div>
        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div class="text-sm font-bold text-ink">EXIF stripped</div>
          <p class="mt-1 text-xs text-slate-500">Hidden GPS and camera metadata is removed automatically from uploads.</p>
        </div>
        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div class="text-sm font-bold text-ink">Instant deletion</div>
          <p class="mt-1 text-xs text-slate-500">Delete your worker profile or entire account permanently anytime.</p>
        </div>
      </div>

      <div class="grid gap-6">
        ${PRIVACY.map((s, i) => `<section><h2 class="text-lg font-bold text-ink">${i + 1}. ${s.h}</h2>${(s.p || []).map((t) => `<p class="mt-2">${t}</p>`).join('')}${s.ul ? `<ul class="mt-2 list-disc pl-5 grid gap-1.5">${s.ul.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}</section>`).join('')}
      </div>

      <div class="rounded-2xl bg-brand-soft border border-brand/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="font-bold text-ink">Questions or data requests?</div>
          <div class="text-sm text-slate-600">${esc(SITE.contact)}</div>
        </div>
        <div class="flex flex-wrap gap-3">
          <button data-action="terms" class="rounded-xl border border-brand/30 bg-white hover:bg-slate-50 text-brand font-bold px-4 py-2 text-sm transition-colors">Terms of Service</button>
          <button data-action="about" class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-4 py-2 text-sm transition-colors">About ProConnect</button>
        </div>
      </div>
    </article>
  </section>`;

const aboutScreen = () => `
  <section class="max-w-4xl mx-auto px-5 py-8 pop">
    <button data-action="terms-back" class="inline-flex items-center gap-1 text-slate-600 font-semibold hover:text-brand">${icon('arrow-left', 18)} Back</button>
    <article class="mt-4 bg-white rounded-3xl border border-slate-200 overflow-hidden text-slate-600 leading-relaxed">
      <div class="band p-7 sm:p-10 text-white">
        <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">About ProConnect</p>
        <h1 class="mt-2 text-2xl sm:text-4xl font-extrabold text-white text-balance">Connecting Ghana directly with trusted local professionals.</h1>
        <p class="mt-3 text-sm sm:text-base text-white/80 max-w-2xl">Direct WhatsApp introductions with zero commission, verified client reviews, and transparent flat-rate pricing for local experts.</p>
      </div>

      <div class="p-6 sm:p-10 grid gap-6">
        <p class="text-base text-slate-600">ProConnect makes it effortless to find skilled tradespeople and creatives near you — from plumbers, electricians, and carpenters to graphic designers and technicians — and reach them directly on WhatsApp in one tap.</p>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="w-11 h-11 rounded-xl bg-brand-soft text-brand grid place-items-center">${icon('users', 20)}</div>
            <h2 class="mt-3 text-lg font-bold text-ink">For customers</h2>
            <p class="mt-1 text-sm">Browsing is completely free and requires no account. Filter by skill, name, or location, check portfolios and client feedback, and chat directly on WhatsApp with no middleman.</p>
          </div>
          <div class="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">${icon('briefcase', 20)}</div>
            <h2 class="mt-3 text-lg font-bold text-ink">For professionals</h2>
            <p class="mt-1 text-sm">Publish a public profile with your service area, portfolio photos, and WhatsApp link. Enjoy your first ${PLAN.trialDays} days free, then ${ghs(PLAN.price)} per month with zero commission on your jobs and no auto-renewal surprises.</p>
          </div>
        </div>

        <section>
          <h2 class="text-lg font-bold text-ink">Trust, transparency &amp; real feedback</h2>
          <ul class="mt-2 list-disc pl-5 grid gap-1.5 text-sm">
            <li><strong>No fake listings:</strong> Every card in our directory belongs to a real professional with an active trial or monthly subscription.</li>
            <li><strong>Verified client reviews:</strong> Feedback links work once per completed job and cannot be submitted by the professional themselves.</li>
            <li><strong>ID verification:</strong> Profiles carrying the Verified badge have had their Ghana Card or business registration reviewed by our team.</li>
            <li><strong>Privacy first:</strong> Uploaded photos automatically have location metadata stripped, and user data is handled under Ghana's Data Protection Act, 2012 (Act 843).</li>
          </ul>
        </section>

        <div class="rounded-2xl bg-brand-soft border border-brand/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="font-bold text-ink">Ready to get started?</div>
            <div class="text-sm text-slate-600">Questions? ${esc(SITE.contact)}</div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button data-action="role" data-role="customer" class="rounded-xl bg-wa hover:bg-wa-dark text-white font-bold px-5 py-2.5 text-sm transition-colors">Browse professionals</button>
            <button data-action="role" data-role="worker" class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-5 py-2.5 text-sm transition-colors">Join as a pro</button>
          </div>
        </div>
      </div>
    </article>
  </section>`;

/* ---------- Subscription, feedback links and Blazes ---------- */
const softError = (e, msg) => (e.message === 'NOT_CONNECTED' ? msg : e.message);

const stars = (n, size = 14) => [1, 2, 3, 4, 5].map((i) => icon('star', size, i <= n ? 'fill-amber-rate text-amber-rate' : 'text-slate-300')).join('');
const blazeChip = (w) => (w.blazes ? `<span class="inline-flex items-center gap-1 text-sm font-semibold text-orange-600" title="Blazes">${icon('flame', 15, 'fill-orange-400 text-orange-500')}${esc(w.blazes)}</span>` : '');
const testimonialsHTML = (w) => ((w.testimonials || []).length
  ? `<div class="mt-2 grid gap-3">${w.testimonials.map((t) => `<figure class="rounded-2xl bg-slate-50 p-4"><div class="flex items-center gap-0.5">${stars(t.rating || 0)}</div><blockquote class="mt-2 text-slate-700 leading-relaxed">“${esc(t.text)}”</blockquote><figcaption class="mt-2 text-sm text-slate-500">${esc(t.name)}${t.date ? ' · ' + esc(t.date) : ''}</figcaption></figure>`).join('')}</div>`
  : '<p class="mt-2 text-sm text-slate-500">No testimonials yet.</p>');

const planCard = () => {
  const s = state.sub; const left = s && s.endsAt ? Math.max(0, Math.ceil((new Date(s.endsAt) - Date.now()) / 864e5)) : 0;
  const date = s && s.endsAt ? new Date(s.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const btn = (action, label, solid) => `<button data-action="${action}" class="mt-3 rounded-xl ${solid ? 'bg-brand hover:bg-brand-dark text-white' : 'border-2 border-brand text-brand hover:bg-brand-soft'} font-bold px-5 py-2.5 text-sm transition-colors" ${state.busy === 'pay' ? 'disabled' : ''}>${state.busy === 'pay' ? 'Processing…' : label}</button>`;
  let head = 'Your plan', body = `Your first month is free. After that, pay ${ghs(PLAN.price)} each month to keep your profile live.`, act = '';
  if (s && s.status === 'trial') { head = `Free month: ${left} ${left === 1 ? 'day' : 'days'} left`; body = `Your profile is live. When the free month ends, pay ${ghs(PLAN.price)} each month to keep it live.`; act = btn('bill-pay', `Add a month (${ghs(PLAN.price)})`, false); }
  if (s && s.status === 'active') { head = 'Profile live'; body = `Paid until ${date}. Pay again before then to keep your profile live.`; act = btn('bill-pay', `Add a month (${ghs(PLAN.price)})`, false); }
  if (s && s.status === 'expired') { head = 'Payment needed'; body = 'Your profile is hidden from search until you pay.'; act = btn('bill-pay', `Pay ${ghs(PLAN.price)}`, true); }
  const payments = (s && Array.isArray(s.payments)) ? s.payments.slice(0, 3) : [];
  const receipts = payments.length
    ? `<div class="mt-4 pt-4 border-t border-brand/10"><div class="text-xs font-bold text-slate-500 uppercase">Recent payments</div><div class="mt-2 grid gap-1.5">${payments.map((p) => `<div class="flex items-center justify-between text-xs text-slate-600"><span>${new Date(p.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${esc(p.channel === 'mobile_money' ? 'Mobile money' : p.channel)}</span><span class="font-bold text-ink">${ghs(Math.round(Number(p.amount_pesewas) / 100))}</span></div>`).join('')}</div></div>`
    : '';
  return `<div class="rounded-3xl bg-brand-soft border border-brand/10 p-5"><div class="text-xs font-bold tracking-widest text-brand uppercase">For professionals</div><h3 class="mt-1 text-lg font-bold">${head}</h3><p class="mt-1 text-sm text-slate-600">${body}</p>${act}${receipts}</div>`;
};

const inviteCard = () => {
  const i = state.invite, me = state.myProfile;
  if (!me) return `<div class="rounded-3xl bg-white border border-slate-200 p-5"><h3 class="font-bold flex items-center gap-2">${icon('flame', 18, 'fill-orange-400 text-orange-500')} Ask a client for feedback</h3><p class="mt-1 text-sm text-slate-500">Publish your profile first. Then you can send clients a private link to give you a Blaze, a rating or a testimonial.</p></div>`;
  const msg = `Hi${i.name ? ' ' + i.name : ''}, thank you for choosing ${me.name}. Could you give me quick feedback? It takes 30 seconds: ${i.url}`;
  return `<div class="rounded-3xl bg-white border border-slate-200 p-5">
    <h3 class="font-bold flex items-center gap-2">${icon('flame', 18, 'fill-orange-400 text-orange-500')} Ask a client for feedback</h3>
    <p class="mt-1 text-sm text-slate-500">Send a private link. Your client can give a Blaze, a star rating, a testimonial, or all three. Each link works once.</p>
    <label class="mt-3 grid gap-1 text-sm font-semibold">Client's first name (optional)<input data-field="invite.name" value="${esc(i.name)}" maxlength="30" placeholder="e.g. Abena" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"></label>
    <button data-action="invite-create" class="mt-3 w-full rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-2.5 text-sm transition-colors" ${i.busy ? 'disabled' : ''}>${i.busy ? 'Creating link…' : 'Create feedback link'}</button>
    ${i.error ? `<p class="mt-3 text-sm text-red-600" role="alert">${esc(i.error)}</p>` : ''}
    ${i.url ? `<div class="mt-3 rounded-2xl bg-slate-50 p-3"><div class="text-xs font-semibold text-slate-500">Your private link</div><div class="mt-1 text-xs break-all text-slate-700">${esc(i.url)}</div>
      <div class="mt-3 flex gap-2"><button data-action="invite-copy" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">${icon('copy', 16)} Copy link</button>
      <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-wa hover:bg-wa-dark text-white px-3 py-2 text-sm font-bold">${icon('message-circle', 16)} WhatsApp</a></div></div>` : ''}
  </div>`;
};

async function billAct(kind) {
  state.busy = 'pay'; render();
  try {
    state.sub = await BILLING[kind]();
    toast('Payment confirmed. Thank you!');
    loadMarket(1);
  } catch (e) {
    toast(softError(e, 'Billing is not connected yet.'));
  }
  state.busy = ''; render();
}

async function createInvite() {
  const i = state.invite; i.error = ''; i.url = ''; i.busy = true; render();
  try { const r = await REVIEWS.createInvite({ clientName: i.name.trim() }); i.url = location.href.split('#')[0] + '#rate/' + r.token; }
  catch (e) { i.error = softError(e, 'Feedback links are not connected yet.'); }
  i.busy = false; render();
}

function copyInvite() {
  const u = state.invite.url; if (!u) return;
  if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast('Link copied.'), () => toast('Copy failed — select the link above.'));
  else toast('Select and copy the link above.');
}

const reviewReady = () => { const r = state.review; return !!(r && (r.blaze || r.rating || r.text.trim()) && !r.busy); };
const paintReview = () => { const b = $('#rv-send'); if (b) b.disabled = !reviewReady(); const c = $('#rv-count'); if (c) c.textContent = state.review.text.length + '/400'; };
async function submitReview() {
  const r = state.review; if (!reviewReady()) return;
  r.formError = ''; r.busy = true; render();
  try {
    await REVIEWS.submit({ token: r.token, blaze: r.blaze, rating: r.rating, testimonial: r.text.trim(), name: r.name.trim() });
    r.done = true;
    state.marketCache = null;
    loadStats();
    loadMarket(1);
  } catch (e) {
    r.formError = softError(e, 'Feedback is not switched on yet. Please try again later.');
  }
  r.busy = false; render();
}

function routeFromHash() {
  const h = location.hash || '';
  const rateMatch = h.match(/^#rate\/([A-Za-z0-9_-]{6,80})$/);
  if (rateMatch) {
    state.review = { token: rateMatch[1], loading: true, error: '', formError: '', worker: null, blaze: false, rating: 0, text: '', name: '', done: false, busy: false };
    go('review');
    REVIEWS.lookupInvite(rateMatch[1])
      .then((info) => {
        state.review.worker = info.worker;
        if (info.clientName) state.review.name = info.clientName;
        state.review.loading = false;
      })
      .catch((e) => { state.review.loading = false; state.review.error = softError(e, 'Feedback links are not switched on yet.'); })
      .then(() => { if (state.screen === 'review') render(); });
    return;
  }

  const proMatch = h.match(/^#pro\/([A-Za-z0-9_-]{1,80})$/);
  if (proMatch) {
    openWorkerById(decodeURIComponent(proMatch[1]), false);
    return;
  }

  const resetMatch = h.match(/^#reset\/([A-Za-z0-9_-]{6,120})$/);
  if (resetMatch) {
    state.auth = { mode: 'reset', error: '', info: '', reason: '', values: {}, resetToken: resetMatch[1] };
    go('auth');
    return;
  }

  if (h === '#about' || location.pathname === '/about') {
    state.prev = state.screen;
    go('about');
    return;
  }
  if (h === '#privacy' || location.pathname === '/privacy') {
    state.prev = state.screen;
    go('privacy');
    return;
  }
  if (h === '#terms' || location.pathname === '/terms') {
    state.prev = state.screen;
    go('terms');
  }
}

const reviewScreen = () => {
  const r = state.review; const wrap = (x) => `<section class="max-w-xl mx-auto px-5 py-10 pop">${x}</section>`;
  if (!r || r.loading) return wrap('<p class="text-center text-slate-500">Loading…</p>');
  if (r.error) return wrap(`<div class="bg-white rounded-3xl border border-slate-200 p-8 text-center"><h1 class="text-2xl font-extrabold">This link cannot be used</h1><p class="mt-2 text-slate-600">${esc(r.error)}</p><button data-action="rv-home" class="mt-5 rounded-xl bg-brand text-white font-bold px-6 py-3">Go to ProConnect</button></div>`);
  const w = { tint: 0, ...r.worker };
  if (r.done) return wrap(`<div class="bg-white rounded-3xl border border-slate-200 p-8 text-center"><div class="mx-auto w-20 h-20 rounded-full bg-orange-50 grid place-items-center">${icon('flame', 40, 'fill-orange-400 text-orange-500')}</div><h1 class="mt-5 text-3xl font-extrabold">Thank you!</h1><p class="mt-2 text-slate-600">Your feedback is now on ${esc(w.name)}'s profile. It helps other people choose with confidence.</p><button data-action="rv-home" class="mt-6 rounded-xl bg-brand text-white font-bold px-6 py-3">Find a professional</button></div>`);
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  return wrap(`
    <div class="flex items-center gap-4">${avatar(w, 64)}<div><p class="text-sm text-slate-500">Feedback for</p><h1 class="text-2xl font-extrabold leading-tight">${esc(w.name)}</h1><p class="text-sm text-slate-500">${esc(w.category || '')}${w.area ? ' · ' + esc(w.area) : ''}</p></div></div>
    <p class="mt-5 text-slate-600">How was your experience? Do one, two or all three. Every part is optional.</p>
    <form data-form="review" class="mt-5 grid gap-4">
      <button type="button" data-action="rv-blaze" aria-pressed="${r.blaze}" class="rounded-2xl border-2 p-5 flex items-center gap-4 text-left transition ${r.blaze ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300'}"><span class="grid place-items-center w-14 h-14 rounded-2xl ${r.blaze ? 'bg-orange-400' : 'bg-orange-50'}">${icon('flame', 30, r.blaze ? 'text-white fill-white' : 'fill-orange-400 text-orange-500')}</span><span><span class="block font-extrabold text-lg">${r.blaze ? 'Blaze given!' : 'Give a Blaze'}</span><span class="block text-sm text-slate-500">Tap if the work was on fire.</span></span></button>
      <div class="rounded-2xl border border-slate-200 bg-white p-5"><div class="font-bold">Rate the professional</div><div class="mt-2 flex gap-1">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-action="rv-star" data-v="${n}" aria-label="${n} star${n > 1 ? 's' : ''}" class="p-1">${icon('star', 34, n <= r.rating ? 'fill-amber-rate text-amber-rate' : 'text-slate-300')}</button>`).join('')}</div></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 grid gap-3"><div class="font-bold">Write a testimonial</div>
        <textarea rows="4" maxlength="400" data-field="rv.text" placeholder="What was it like working with ${esc(w.name)}?" class="${input}">${esc(r.text)}</textarea><div id="rv-count" class="-mt-2 text-right text-xs text-slate-400">${r.text.length}/400</div>
        <label class="grid gap-1 text-sm font-semibold">Your first name<input data-field="rv.name" value="${esc(r.name)}" maxlength="30" placeholder="e.g. Abena" class="${input}"></label></div>
      ${r.formError ? `<p class="text-sm text-red-600" role="alert">${esc(r.formError)}</p>` : ''}
      <button id="rv-send" class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 transition-colors" ${reviewReady() ? '' : 'disabled'}>${r.busy ? 'Sending…' : 'Send feedback'}</button>
      <p class="text-xs text-slate-500">Your testimonial and first name will be public on the profile. This link works once.</p>
    </form>`);
};

/* ---------- Render ---------- */
function render() {
  const s = (state.screen === 'landing' && state.user) ? 'market' : state.screen;
  const showFooter = ['landing', 'market', 'about', 'privacy', 'terms'].includes(s);
  $('#app').innerHTML =
    header() +
    (s === 'landing' ? landing()
      : s === 'market' ? marketplace()
      : s === 'profile' ? profileDetail()
      : s === 'auth' ? authScreen()
      : s === 'account' ? accountScreen()
      : s === 'terms' ? termsScreen()
      : s === 'privacy' ? privacyScreen()
      : s === 'about' ? aboutScreen()
      : s === 'review' ? reviewScreen()
      : dashboard()) +
    (showFooter ? siteFooter() : '') +
    bottomNav() + briefSheet() + reportSheet() + confirmSheet();
  afterRender();
}

function go(screen) {
  let target = screen;
  if (target === 'landing' && state.user) {
    target = 'market';
    state.role = 'customer';
    loadMarket(1);
  }
  state.menuOpen = false;
  state.brief = null;
  state.reportModal = null;
  state.confirmModal = null;
  state.screen = target;
  render();
  window.scrollTo(0, 0);
}

function setRole(r) {
  if (['#terms', '#privacy', '#about'].includes(location.hash) || ['/terms', '/privacy', '/about'].includes(location.pathname)) {
    history.replaceState(null, '', '/' + location.search);
  }
  if (r === 'worker' && !state.user) {
    state.role = 'customer';
    state.showPw = false;
    state.auth = { mode: 'login', error: '', info: '', values: {}, reason: 'Sign in to create or edit your worker profile. Browsing stays open to everyone.' };
    return go('auth');
  }
  state.role = r;
  if (r === 'customer') {
    go('market');
    loadMarket(1);
  } else {
    go('dashboard');
  }
}

/* ---------- Events ---------- */
document.addEventListener('click', async (e) => {
  if (e.target.closest('a')) return;
  const el = e.target.closest('[data-action]'); if (!el) return;
  const d = el.dataset;
  switch (d.action) {
    case 'skip': setRole('customer'); break;
    case 'auth': state.showPw = false; state.auth = { mode: d.mode || 'login', error: '', info: '', reason: '', values: {}, resetToken: '' }; go('auth'); break;
    case 'auth-mode': {
      const af = document.querySelector('[data-form="auth"]');
      if (af) { const v = Object.fromEntries(new FormData(af)); state.auth.values = { ...state.auth.values, name: v.name ?? state.auth.values?.name, phone: v.phone ?? state.auth.values?.phone, email: v.email ?? state.auth.values?.email }; }
      state.showPw = false; state.auth.mode = state.auth.mode === 'login' ? 'signup' : 'login'; state.auth.error = ''; state.auth.info = ''; render();
      break;
    }
    case 'auth-mode-set': {
      const af = document.querySelector('[data-form="auth"]');
      if (af) { const v = Object.fromEntries(new FormData(af)); state.auth.values = { ...state.auth.values, name: v.name ?? state.auth.values?.name, phone: v.phone ?? state.auth.values?.phone, email: v.email ?? state.auth.values?.email }; }
      state.showPw = false; state.auth.mode = d.mode === 'signup' ? 'signup' : 'login'; state.auth.error = ''; state.auth.info = ''; render();
      break;
    }
    case 'toggle-pw': {
      state.showPw = !state.showPw;
      document.querySelectorAll('form[data-form="auth"] input[data-pw-field]').forEach((inp) => {
        inp.type = state.showPw ? 'text' : 'password';
      });
      document.querySelectorAll('[data-action="toggle-pw"]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(state.showPw));
        btn.setAttribute('aria-label', state.showPw ? 'Hide password' : 'Show password');
        btn.innerHTML = icon(state.showPw ? 'eye-off' : 'eye', 17);
      });
      break;
    }
    case 'toggle-acct-pw': {
      state.showAcctPw = !state.showAcctPw;
      document.querySelectorAll('form[data-form="password"] input[data-acct-pw-field]').forEach((inp) => {
        inp.type = state.showAcctPw ? 'text' : 'password';
      });
      document.querySelectorAll('[data-action="toggle-acct-pw"]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(state.showAcctPw));
        btn.setAttribute('aria-label', state.showAcctPw ? 'Hide passwords' : 'Show passwords');
        btn.innerHTML = icon(state.showAcctPw ? 'eye-off' : 'eye', 17);
      });
      break;
    }
    case 'set-theme':
      applyTheme(d.theme === 'dark' ? 'dark' : 'light');
      render();
      break;
    case 'acct-jump': {
      const target = d.target ? document.getElementById(d.target) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'auth-forgot': state.showPw = false; state.auth.mode = 'forgot'; state.auth.error = ''; state.auth.info = ''; render(); break;
    case 'auth-login': state.showPw = false; state.auth.mode = 'login'; state.auth.error = ''; state.auth.info = ''; render(); break;
    case 'account': state.showAcctPw = false; go('account'); break;
    case 'edit-worker': setRole('worker'); break;
    case 'signout':
      AUTH.signOut().catch(() => {}).finally(() => {
        state.user = null; state.myProfile = null; state.sub = null; state.draft = freshDraft(); state.invite = { name: '', url: '', error: '', busy: false };
        toast('Signed out.'); go('landing');
      });
      break;
    case 'home':
      if (location.hash || ['/terms', '/privacy', '/about'].includes(location.pathname)) {
        history.replaceState(null, '', '/' + location.search);
      }
      if (state.user) setRole('customer');
      else go('landing');
      break;
    case 'toggle-theme': toggleTheme(); break;
    case 'toggle-menu': state.menuOpen = !state.menuOpen; render(); break;
    case 'quick-search':
      state.category = '';
      state.query = d.svc || '';
      state.location = d.loc || '';
      setRole('customer');
      break;
    case 'home-trade':
      state.location = '';
      if (d.mode === 'category') {
        state.category = d.name || '';
        state.query = '';
      } else {
        state.category = '';
        state.query = d.name || '';
      }
      setRole('customer');
      break;
    case 'landing-tab':
      state.landingTab = d.tab === 'worker' ? 'worker' : 'customer';
      render();
      break;
    case 'lb-cat':
      state.landingBrief.category = d.v || 'Plumbing';
      render();
      break;
    case 'lb-kind':
      state.landingBrief.kind = d.v || BRIEF_KINDS[0];
      render();
      break;
    case 'lb-when':
      state.landingBrief.when = d.v || BRIEF_WHEN[0];
      render();
      break;
    case 'lb-find': {
      const cat = state.landingBrief.category;
      const isMain = CATEGORIES.some((c) => c.name === cat);
      state.category = isMain ? cat : '';
      state.query = isMain ? '' : cat;
      state.location = (state.landingBrief.area || '').trim();
      setRole('customer');
      break;
    }
    case 'role': setRole(d.role); break;
    case 'category': {
      const next = d.name || '';
      state.category = !next ? '' : (state.category === next ? '' : next);
      applyLocalFilter(1);
      loadMarket(1, { silent: true });
      break;
    }
    case 'open': openWorkerById(d.id, true); break;
    case 'back':
      history.replaceState(null, '', location.pathname + location.search);
      setRole('customer');
      break;
    case 'page': loadMarket(Number(d.page) || 1); break;
    case 'retry-market': loadMarket(state.workersPage); break;
    case 'bill-pay': billAct('pay'); break;
    case 'invite-create': createInvite(); break;
    case 'invite-copy': copyInvite(); break;
    case 'rv-blaze': state.review.blaze = !state.review.blaze; render(); break;
    case 'rv-star': state.review.rating = state.review.rating === +d.v ? 0 : +d.v; render(); break;
    case 'rv-home':
      history.replaceState(null, '', location.pathname + location.search);
      state.review = null;
      if (state.user) setRole('customer');
      else go('landing');
      break;
    case 'city': state.location = state.location.toLowerCase() === d.name.toLowerCase() ? '' : d.name; applyLocalFilter(1); loadMarket(1, { silent: true }); break;
    case 'verified': state.verifiedOnly = !state.verifiedOnly; applyLocalFilter(1); loadMarket(1, { silent: true }); break;
    case 'rating': state.minRating = state.minRating ? 0 : 4.8; applyLocalFilter(1); loadMarket(1, { silent: true }); break;
    case 'clear': state.category = ''; state.query = ''; state.location = ''; state.verifiedOnly = false; state.minRating = 0; applyLocalFilter(1); loadMarket(1, { silent: true }); break;
    case 'clear-query': state.query = ''; applyLocalFilter(1); loadMarket(1, { silent: true }); { const el = $('[data-field="query"]'); if (el) { el.value = ''; el.focus(); } syncSearchClearButtons(); } break;
    case 'clear-location': state.location = ''; applyLocalFilter(1); loadMarket(1, { silent: true }); { const el = $('[data-field="location"]'); if (el) { el.value = ''; el.focus(); } syncSearchClearButtons(); } break;
    case 'draft-type': state.draft.type = d.type; render(); break;
    case 'draft-cat': state.draft.category = d.name; render(); break;
    case 'publish': saveProfile(); break;
    case 'portfolio-del': {
      try {
        await WORKERS.removePortfolio(d.id);
        state.myProfile = await AUTH.getMyWorkerProfile();
        state.draft = { ...freshDraft(), ...state.myProfile };
        toast('Portfolio photo removed.');
        render();
      } catch (err) {
        toast(err.message);
      }
      break;
    }
    case 'brief': state.brief = { kind: BRIEF_KINDS[0], when: BRIEF_WHEN[0], area: state.location || '', note: '' }; render(); break;
    case 'brief-close': state.brief = null; render(); break;
    case 'brief-kind': state.brief.kind = d.v; render(); break;
    case 'brief-when': state.brief.when = d.v; render(); break;
    case 'report-open': state.reportModal = { reason: '', contact: '', error: '', busy: false }; render(); break;
    case 'report-close': state.reportModal = null; render(); break;
    case 'confirm-delete-worker':
      state.confirmModal = {
        kind: 'worker',
        title: 'Delete worker profile?',
        message: 'This removes your public profile, portfolio photos, and feedback permanently.',
        confirmLabel: 'Delete profile',
        busy: false,
      };
      render();
      break;
    case 'confirm-delete-account':
      state.confirmModal = {
        kind: 'account',
        title: 'Delete your entire account?',
        message: 'This permanently deletes your account, worker profile, uploaded photos, and feedback. This cannot be undone.',
        confirmLabel: 'Delete account',
        busy: false,
      };
      render();
      break;
    case 'confirm-close': state.confirmModal = null; render(); break;
    case 'confirm-proceed': {
      const cm = state.confirmModal;
      if (!cm || cm.busy) break;
      cm.busy = true; render();
      try {
        if (cm.kind === 'worker') {
          await AUTH.deleteMyWorkerProfile();
          state.myProfile = null;
          state.sub = null;
          state.draft = { ...freshDraft(), name: state.user?.name || '', phone: state.user?.phone || '' };
          state.confirmModal = null;
          state.marketCache = null;
          toast('Worker profile deleted.');
          loadStats();
          loadMarket(1);
          render();
        } else if (cm.kind === 'account') {
          await AUTH.deleteAccount();
          state.user = null;
          state.myProfile = null;
          state.sub = null;
          state.draft = freshDraft();
          state.confirmModal = null;
          state.marketCache = null;
          toast('Account deleted.');
          loadStats();
          loadMarket(1);
          go('landing');
        }
      } catch (err) {
        cm.busy = false;
        toast(err.message || 'Could not complete deletion.');
        render();
      }
      break;
    }
    case 'noop': break;
    case 'about':
      if (!['about', 'terms', 'privacy'].includes(state.screen)) state.prev = state.screen;
      history.replaceState(null, '', '#about');
      go('about');
      break;
    case 'terms': {
      const af = document.querySelector('[data-form="auth"]');
      if (af) { const v = Object.fromEntries(new FormData(af)); state.auth.values = { name: v.name, phone: v.phone, email: v.email }; }
      if (!['about', 'terms', 'privacy'].includes(state.screen)) state.prev = state.screen;
      history.replaceState(null, '', '#terms'); go('terms'); break;
    }
    case 'privacy': {
      const af = document.querySelector('[data-form="auth"]');
      if (af) { const v = Object.fromEntries(new FormData(af)); state.auth.values = { name: v.name, phone: v.phone, email: v.email }; }
      if (!['about', 'terms', 'privacy'].includes(state.screen)) state.prev = state.screen;
      history.replaceState(null, '', '#privacy'); go('privacy'); break;
    }
    case 'terms-back': {
      if (['#terms', '#privacy', '#about'].includes(location.hash) || ['/terms', '/privacy', '/about'].includes(location.pathname)) {
        history.replaceState(null, '', '/' + location.search);
      }
      const prev = state.prev && !['terms', 'privacy', 'about'].includes(state.prev) ? state.prev : (state.user ? 'market' : 'landing');
      go(prev);
      break;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.menuOpen) { state.menuOpen = false; render(); return; }
    if (state.brief) { state.brief = null; render(); return; }
    if (state.reportModal) { state.reportModal = null; render(); return; }
    if (state.confirmModal) { state.confirmModal = null; render(); return; }
  }
  const el = e.target.closest && e.target.closest('[data-action="open"]');
  if (el && e.key === 'Enter') el.click();
});

document.addEventListener('input', (e) => {
  const f = e.target.dataset && e.target.dataset.field; if (!f) return;
  const v = e.target.value;
  if (f === 'query' || f === 'location') { state[f] = v; syncSearchClearButtons(); scheduleMarketLoad(1); }
  else if (f === 'sort') { state.sort = v; applyLocalFilter(1); loadMarket(1, { silent: true }); }
  else if (f === 'portfolioTitle') { state.portfolioTitle = v; }
  else if (f.startsWith('invite.')) state.invite[f.split('.')[1]] = v;
  else if (f.startsWith('rv.')) { state.review[f.split('.')[1]] = v; paintReview(); }
  else if (f.startsWith('brief.')) { state.brief[f.split('.')[1]] = v; updateBrief(); }
  else if (f.startsWith('landingBrief.')) { state.landingBrief[f.split('.')[1]] = v; updateLandingBriefPreview(); }
  else if (f.startsWith('landing.')) state.landing[f.split('.')[1]] = v;
  else if (f.startsWith('draft.')) {
    state.draft[f.split('.')[1]] = v;
    if ($('#preview')) $('#preview').innerHTML = workerCard(draftWorker(), true);
    if ($('#publish')) $('#publish').disabled = !draftReady() || state.busy === 'save';
    if ($('#hint')) $('#hint').classList.toggle('hidden', !!draftReady());
  }
});

document.addEventListener('change', async (e) => {
  const fileKind = e.target.dataset && e.target.dataset.file;
  const file = e.target.files && e.target.files[0];
  if (!fileKind || !file) return;

  if (fileKind === 'photo') {
    if (!state.myProfile) {
      try {
        const resized = await resizeImageFile(file, 800);
        if (state.draft.photo && state.draft.photo.startsWith('blob:')) {
          URL.revokeObjectURL(state.draft.photo);
        }
        state.pendingPhotoFile = resized;
        state.draft.photo = URL.createObjectURL(resized);
        toast('Photo ready — click Publish profile to save.');
        render();
      } catch (err) {
        toast(err.message);
      }
      return;
    }
    state.busy = 'photo'; render();
    try {
      const res = await WORKERS.uploadPhoto(file);
      state.draft.photo = res.url;
      state.myProfile.photo = res.url;
      toast('Profile photo updated.');
    } catch (err) {
      toast(err.message);
    }
    state.busy = ''; render();
  }

  if (fileKind === 'portfolio') {
    state.busy = 'portfolio'; render();
    try {
      await WORKERS.addPortfolio(file, state.portfolioTitle.trim());
      state.portfolioTitle = '';
      state.myProfile = await AUTH.getMyWorkerProfile();
      state.draft = { ...freshDraft(), ...state.myProfile };
      toast('Portfolio photo added.');
    } catch (err) {
      toast(err.message);
    }
    state.busy = ''; render();
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const kind = e.target.dataset.form, f = Object.fromEntries(new FormData(e.target));
  if (kind === 'landing') { state.query = state.landing.svc; state.location = state.landing.loc; setRole('customer'); }
  if (kind === 'auth') submitAuth(f);
  if (kind === 'review') submitReview();
  if (kind === 'account') saveAccount(f);
  if (kind === 'password') changePassword(f);
  if (kind === 'report' && state.reportModal && state.selected) {
    state.reportModal.error = '';
    state.reportModal.reason = f.reason || '';
    state.reportModal.contact = f.contact || '';
    state.reportModal.busy = true;
    render();
    try {
      await WORKERS.report({ workerId: state.selected.id, reason: f.reason, contact: f.contact });
      state.reportModal = null;
      toast('Thank you. Our team will review this report.');
    } catch (err) {
      state.reportModal.busy = false;
      state.reportModal.error = err.message;
    }
    render();
  }
});

render();
loadConfig();
loadStats();
window.addEventListener('hashchange', routeFromHash);
routeFromHash();
AUTH.restoreSession().then(async (u) => {
  if (u) {
    await startSession(u);
    if (state.screen === 'landing') {
      state.role = 'customer';
      go('market');
      loadMarket(1);
    } else {
      render();
    }
  }
}).catch(() => {});
