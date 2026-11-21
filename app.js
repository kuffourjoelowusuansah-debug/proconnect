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
  const done = () => setTimeout(hide, Math.max(0, 1400 - (Date.now() - t0)));
  if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
  setTimeout(hide, 5000); // failsafe: never stay stuck on the splash
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
 "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /> <path d=\"m9 12 2 2 4-4\" />",
 "share-2": "<circle cx=\"18\" cy=\"5\" r=\"3\" /> <circle cx=\"6\" cy=\"12\" r=\"3\" /> <circle cx=\"18\" cy=\"19\" r=\"3\" /> <line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\" /> <line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\" />",
 "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\" />",
 "quote": "<path d=\"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z\" /> <path d=\"M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z\" />",
 "link": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\" /> <path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\" />",
 "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />",
 "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /> <path d=\"M20 3v4\" /> <path d=\"M22 5h-4\" /> <path d=\"M4 17v2\" /> <path d=\"M5 18H3\" />"
};

/* ===== ProConnect: plain JavaScript app ===== */
const icon = (name, size = 18, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICONS[name]}</svg>`;

/* ---------- Pricing (change the price or trial length here) ---------- */
const PLAN = { price: 20, trialDays: 30 };
const ghs = (n) => 'GH₵' + n;

/* ---------- Data ---------- */
const CATEGORIES = [
  { name: 'Plumbing', icon: 'wrench' }, { name: 'Electrical', icon: 'zap' },
  { name: 'Carpentry', icon: 'hammer' }, { name: 'Painting', icon: 'paint-bucket' },
  { name: 'Masonry', icon: 'layers' },
];
const TINTS = [['#1F3A5F', '#3B6FB6'], ['#0F766E', '#34D399'], ['#9A3412', '#FB923C'], ['#6D28D9', '#A78BFA'], ['#BE123C', '#FB7185'], ['#0369A1', '#38BDF8']];
/* SAMPLE DATA: replace these six demo professionals (and their blazes and testimonials) with real ones before launch */
const SEED = [
  { id: 1, name: 'Kwame Mensah', blazes: 312, testimonials: [{ name: 'Abena', rating: 5, text: 'Fixed my leaking tap in under an hour and cleaned up after. Very honest about the price.', date: 'October 2026' }, { name: 'Kojo', rating: 5, text: 'Came the same day and our water pressure problem is finally solved.', date: 'September 2026' }], type: 'Personal', category: 'Plumbing', area: 'Kumasi – Ahodwo', rating: 4.9, reviews: 128, years: 12, verified: true, phone: '0244000001', tint: 0, bio: 'Burst pipes, leaking taps, water tank installs and bathroom fittings. I show up on time and clean up after the job.' },
  { id: 2, name: 'Voltline Electricals', blazes: 187, testimonials: [{ name: 'Mrs. Owusu', rating: 5, text: 'They rewired the whole house neatly and explained every step. No mess, no surprises.', date: 'August 2026' }], type: 'Business', category: 'Electrical', area: 'Kumasi – Asokwa', rating: 4.8, reviews: 214, years: 9, verified: true, phone: '0204000002', tint: 1, bio: 'House wiring, DB board upgrades, solar and inverter setups. Licensed team of four.' },
  { id: 3, name: 'Ama Boateng', blazes: 96, testimonials: [{ name: 'Efe', rating: 4, text: 'Beautiful finish on the living room walls. Finished a day early.', date: 'October 2026' }], type: 'Personal', category: 'Painting', area: 'Accra – East Legon', rating: 4.7, reviews: 76, years: 6, verified: true, phone: '0554000003', tint: 2, bio: 'Interior and exterior painting, textured walls and POP ceiling finishing with clean edges.' },
  { id: 4, name: 'Yaw Oppong & Sons', blazes: 254, testimonials: [], type: 'Business', category: 'Carpentry', area: 'Kumasi – Suame', rating: 4.9, reviews: 301, years: 20, verified: true, phone: '0274000004', tint: 3, bio: 'Wardrobes, kitchen cabinets, doors and roofing frames. Three generations of woodwork.' },
  { id: 5, name: 'Solid Rock Masonry', blazes: 41, testimonials: [], type: 'Business', category: 'Masonry', area: 'Takoradi – Market Circle', rating: 4.6, reviews: 58, years: 8, verified: false, phone: '0504000005', tint: 4, bio: 'Block laying, plastering, tiling and perimeter walls. Free site visits for quotes.' },
  { id: 6, name: 'Efua Asante', blazes: 133, testimonials: [], type: 'Personal', category: 'Electrical', area: 'Accra – Madina', rating: 4.8, reviews: 92, years: 7, verified: true, phone: '0244000006', tint: 5, bio: 'Fault finding, lighting design and socket installs. Same-day callouts across Accra.' },
];
const PORTFOLIO = {
  Plumbing: ['Rooftop tank install', 'Bathroom re-pipe', 'Kitchen sink fit', 'Borehole connection', 'Water heater', 'Drain repair'],
  Electrical: ['Full house wiring', 'DB board upgrade', 'Solar rooftop set', 'Security lights', 'Inverter setup', 'Office rewiring'],
  Carpentry: ['Walk-in wardrobe', 'Kitchen cabinets', 'Hardwood doors', 'Roof framing', 'TV console', 'Office desks'],
  Painting: ['Living room refresh', 'Exterior coat', 'Textured feature wall', 'POP ceiling', 'Gate & fence', 'Office repaint'],
  Masonry: ['Perimeter wall', 'Floor tiling', 'Plastering job', 'Block foundation', 'Staircase', 'Retaining wall'],
};

/* ---------- State ---------- */
const freshDraft = () => ({ type: 'Personal', name: '', category: 'Plumbing', area: '', phone: '', years: 3, bio: '', photo: null });
const state = { screen: 'landing', role: 'customer', selected: null, query: '', location: '', category: '', workers: [...SEED], draft: freshDraft(), landing: { svc: '', loc: '' }, verifiedOnly: false, minRating: 0, sort: 'rating' };

/* ================= ACCOUNT LAYER =================
   AUTH is the ONLY part your developer has to connect to the real backend.
   Every function returns a Promise. Until they are connected the UI says so honestly. */
const NOT_CONNECTED = () => Promise.reject(new Error('NOT_CONNECTED'));
const AUTH = {
  signUp: (/* { name, phone, email, password } */) => NOT_CONNECTED(),   // resolve { id, name, phone, email } (or null if email confirmation is needed)
  signIn: (/* { email, password } */) => NOT_CONNECTED(),                // resolve { id, name, phone, email }
  signOut: () => NOT_CONNECTED(),
  restoreSession: () => Promise.resolve(null),                           // resolve the logged-in user, or null
  updateAccount: (/* { name, phone } */) => NOT_CONNECTED(),             // resolve the updated user
  getMyWorkerProfile: () => Promise.resolve(null),                       // resolve this user's worker profile, or null
  saveMyWorkerProfile: (/* profile incl. userId */) => NOT_CONNECTED(),  // create or update, resolve the saved profile
};
const authError = (e) => e.message === 'NOT_CONNECTED' ? 'Accounts are not connected yet. Browsing is open to everyone.' : e.message;
Object.assign(state, { user: null, myProfile: null, busy: '', acct: { error: '' }, auth: { mode: 'login', error: '', info: '', reason: '', values: {} } });

async function startSession(user) {
  state.user = user;
  try { state.myProfile = await AUTH.getMyWorkerProfile(); } catch (e) { state.myProfile = null; }
  try { state.sub = await BILLING.getStatus(); } catch (e) { state.sub = null; }
  state.draft = state.myProfile ? { ...freshDraft(), ...state.myProfile } : { ...freshDraft(), name: user.name || '', phone: user.phone || '' };
}
async function submitAuth(f) {
  const a = state.auth, wantsWorker = !!a.reason, signup = a.mode === 'signup';
  a.error = ''; a.info = ''; a.values = { name: f.name, phone: f.phone, email: f.email }; state.busy = 'auth'; render();
  try {
    const user = signup
      ? await AUTH.signUp({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), password: f.password })
      : await AUTH.signIn({ email: f.email.trim(), password: f.password });
    state.busy = '';
    if (!user) { a.mode = 'login'; a.info = 'Account created. Check your email to confirm it, then log in.'; return render(); }
    await startSession(user);
    wantsWorker ? setRole('worker') : go('account');
  } catch (e) { state.busy = ''; a.error = authError(e); render(); }
}
async function saveAccount(f) {
  state.acct.error = ''; state.busy = 'acct'; render();
  try { state.user = await AUTH.updateAccount({ name: f.name.trim(), phone: f.phone.trim() }); toast('Account updated.'); }
  catch (e) { state.acct.error = authError(e); }
  state.busy = ''; render();
}
async function saveProfile() {
  if (!draftReady()) return;
  const isNew = !state.myProfile; state.busy = 'save'; render();
  try {
    state.myProfile = await AUTH.saveMyWorkerProfile({ ...state.draft, userId: state.user.id });
    /* your developer: reload the public worker list here so the new profile shows in the marketplace */
    toast(isNew ? 'Profile published.' : 'Profile saved.');
  } catch (e) { toast(authError(e)); }
  state.busy = ''; render();
}

const authScreen = () => {
  const a = state.auth, su = a.mode === 'signup', v = a.values || {};
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  const field = (label, name, type = 'text', extra = '') => `<label class="grid gap-1 text-sm font-semibold">${label}<input name="${name}" type="${type}" required value="${type === 'password' ? '' : esc(v[name])}" class="${input}" ${extra}></label>`;
  return `
  <section class="max-w-md mx-auto px-5 py-12 pop"><div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
    <h2 class="text-2xl font-extrabold">${su ? 'Create your account' : 'Welcome back'}</h2>
    <p class="text-slate-500 mt-1">${esc(a.reason) || (su ? 'One account for your details and your worker profile.' : 'Log in to manage your account and worker profile.')}</p>
    <form data-form="auth" class="mt-6 grid gap-4">
      ${su ? field('Full name', 'name', 'text', 'autocomplete="name"') + field('Phone / WhatsApp', 'phone', 'tel', 'autocomplete="tel"') : ''}
      ${field('Email', 'email', 'email', 'autocomplete="email"')}
      ${field('Password', 'password', 'password', `minlength="6" autocomplete="${su ? 'new-password' : 'current-password'}"`)}
      ${su ? `<label class="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" name="agree" required class="mt-1"><span>I agree to the <button type="button" data-action="terms" class="font-semibold text-brand hover:underline">Terms of Service</button>.</span></label>` : ''}
      ${a.error ? `<p class="text-sm text-red-600" role="alert">${esc(a.error)}</p>` : ''}
      ${a.info ? `<p class="text-sm text-emerald-700" role="status">${esc(a.info)}</p>` : ''}
      <button class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-3.5 transition-colors" ${state.busy === 'auth' ? 'disabled' : ''}>${state.busy === 'auth' ? 'Please wait…' : su ? 'Sign up' : 'Log in'}</button>
    </form>
    <button data-action="auth-mode" class="mt-4 text-sm font-semibold text-brand hover:underline">${su ? 'Already have an account? Log in' : 'New here? Create an account'}</button>
    <button data-action="skip" class="mt-2 block text-sm text-slate-500 hover:underline">Continue as guest</button>
  </div></section>`;
};

const accountScreen = () => {
  const u = state.user; if (!u) return authScreen();
  const mp = state.myProfile;
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  return `
  <section class="max-w-3xl mx-auto px-5 py-8 grid gap-6 pop">
    <div class="flex items-center gap-4">${avatar({ name: u.name, tint: 0 }, 64)}
      <div><h2 class="text-2xl font-extrabold">${esc(u.name) || 'Your account'}</h2><p class="text-slate-500">${esc(u.email)}</p></div></div>
    <form data-form="account" class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 grid gap-4">
      <h3 class="font-bold text-lg">Personal info</h3>
      <label class="grid gap-1 text-sm font-semibold">Full name<input name="name" required value="${esc(u.name)}" class="${input}"></label>
      <label class="grid gap-1 text-sm font-semibold">Phone / WhatsApp<input name="phone" inputmode="tel" value="${esc(u.phone)}" class="${input}"></label>
      <label class="grid gap-1 text-sm font-semibold">Email<input value="${esc(u.email)}" disabled class="${input} bg-slate-50 text-slate-500"></label>
      ${state.acct.error ? `<p class="text-sm text-red-600" role="alert">${esc(state.acct.error)}</p>` : ''}
      <button class="justify-self-start rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold px-6 py-3 transition-colors" ${state.busy === 'acct' ? 'disabled' : ''}>${state.busy === 'acct' ? 'Saving…' : 'Save changes'}</button>
    </form>
    ${planCard()}
    <div class="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
      <h3 class="font-bold text-lg">My worker profile</h3>
      ${mp ? `<p class="text-slate-500 text-sm mt-1 mb-4">This is how customers see you. It is linked to your account.</p>
        <div class="max-w-sm">${workerCard({ tint: 0, rating: 5, reviews: 0, ...mp }, true)}</div>
        <button data-action="edit-worker" class="mt-4 rounded-xl border-2 border-brand text-brand font-bold px-6 py-2.5 hover:bg-brand-soft transition-colors">Edit worker profile</button>`
      : `<p class="text-slate-500 text-sm mt-1">You have not created a worker profile yet. Offer your services and get hired through WhatsApp.</p>
        <button data-action="edit-worker" class="mt-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-6 py-2.5 transition-colors">Create worker profile</button>`}
    </div>
    <button data-action="signout" class="justify-self-start text-sm font-semibold text-slate-600 hover:underline">Sign out</button>
  </section>`;
};

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toWa = (p) => { let d = (p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '233' + d.slice(1); return d; };
const catIcon = (name) => (CATEGORIES.find((c) => c.name === name) || CATEGORIES[0]).icon;
let toastTimer;
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
};
const draftWorker = () => ({ ...state.draft, id: 0, tint: 0, rating: 5.0, reviews: 0, blazes: 0, testimonials: [], verified: !!(state.myProfile && state.myProfile.verified) });
const draftReady = () => state.draft.name.trim() && state.draft.area.trim() && state.draft.phone.replace(/\D/g, '').length >= 9;

/* ---------- Small building blocks ---------- */
const avatar = (w, size = 56) => {
  if (w.photo) return `<img src="${w.photo}" alt="" style="width:${size}px;height:${size}px" class="rounded-full object-cover shrink-0">`;
  const [a, b] = TINTS[w.tint % TINTS.length];
  const ini = esc((w.name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase());
  return `<div style="width:${size}px;height:${size}px;font-size:${size * 0.36}px;background:linear-gradient(135deg,${a},${b})" class="rounded-full grid place-items-center text-white font-bold shrink-0">${ini}</div>`;
};
const rating = (w) => `<span class="inline-flex items-center gap-1 text-sm font-semibold">${icon('star', 15, 'fill-amber-rate text-amber-rate')} ${w.rating}<span class="font-normal text-slate-500">(${w.reviews})</span></span>`;
const badge = (text, ic, tone = 'brand') => `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-soft text-brand'}">${ic ? icon(ic, 13) : ''}${esc(text)}</span>`;
const waButton = (w, big = false) => {
  const msg = encodeURIComponent(`Hi ${w.name}, I found you on ProConnect and need a ${w.category.toLowerCase()} job done.`);
  return `<a href="https://wa.me/${toWa(w.phone)}?text=${msg}" target="_blank" rel="noopener noreferrer" class="w-full ${big ? 'py-3.5 text-base' : 'py-2.5 text-sm'} inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold shadow-sm transition-colors">${icon('message-circle', big ? 20 : 18)} Chat on WhatsApp</a>`;
};
const workerCard = (w, preview = false) => {
  const strip = [0, 1, 2].map((i) => { const [c1, c2] = TINTS[(w.tint + i) % TINTS.length]; return `<span class="flex-1" style="background:linear-gradient(135deg,${c1},${c2})"></span>`; }).join('');
  return `
  <article ${preview ? '' : `data-action="open" data-id="${w.id}" tabindex="0" role="button"`} class="card-lift bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col ${preview ? '' : 'cursor-pointer'}">
    <div class="flex h-16">${strip}</div>
    <div class="p-4 pt-0 flex flex-col gap-3">
      <div class="flex items-end justify-between -mt-7">
        <div class="ring-4 ring-white rounded-full">${avatar(w, 56)}</div>
        ${w.verified ? badge('Verified', 'badge-check', 'green') : ''}
      </div>
      <div>
        <h3 class="text-lg font-bold leading-tight truncate">${esc(w.name) || 'Your name'}</h3>
        <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">${icon(catIcon(w.category), 14)} ${esc(w.category)} · ${esc(w.type)}</p>
      </div>
      <div class="flex items-center justify-between gap-2">${rating(w)}${blazeChip(w)}</div>
      <div class="flex items-center justify-between gap-2 text-sm text-slate-500"><span class="flex items-center gap-1 min-w-0"><span class="shrink-0">${icon('map-pin', 15)}</span><span class="truncate">${esc(w.area) || 'Your service area'}</span></span><span class="shrink-0">${esc(w.years)} yrs</span></div>
      ${waButton(w)}
    </div>
  </article>`;
};


/* ---------- Screens ---------- */
const header = () => `
  <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
      <button data-action="home" class="flex items-center gap-2 font-extrabold text-lg text-brand">
        <img src="logo-icon.png" alt="" class="w-9 h-9 object-contain" onerror="this.style.display='none'">ProConnect</button>
      <div class="hidden md:inline-flex p-1 bg-slate-100 rounded-xl text-sm font-semibold">
        <button data-action="role" data-role="customer" class="px-4 py-2 rounded-lg inline-flex items-center gap-1.5 ${state.role === 'customer' ? 'bg-white shadow text-brand' : 'text-slate-500'}">${icon('users', 16)}Find a Professional</button>
        <button data-action="role" data-role="worker" class="px-4 py-2 rounded-lg inline-flex items-center gap-1.5 ${state.role === 'worker' ? 'bg-white shadow text-brand' : 'text-slate-500'}">${icon('briefcase', 16)}I'm a Worker</button>
      </div>
      <button data-action="${state.user ? 'account' : 'auth'}" data-mode="login" class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline whitespace-nowrap">${state.user ? `${icon('user', 18)}${esc((state.user.name || 'Account').split(' ')[0])}` : 'Sign in'}</button>
    </div>
  </header>`;

const bottomNav = () => {
  if (['landing', 'profile', 'review'].includes(state.screen)) return '';
  const item = (action, attrs, ic, label, on) => `<button data-action="${action}" ${attrs} class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${on ? 'text-brand' : 'text-slate-500'}">${icon(ic, 22)}${label}</button>`;
  return `<div class="md:hidden h-20"></div>
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 flex pb-[env(safe-area-inset-bottom)]">
    ${item('role', 'data-role="customer"', 'search', 'Find', state.screen === 'market')}
    ${item('role', 'data-role="worker"', 'briefcase', 'Worker', state.screen === 'dashboard')}
    ${item(state.user ? 'account' : 'auth', 'data-mode="login"', 'user', state.user ? 'Account' : 'Sign in', state.screen === 'account' || state.screen === 'auth')}
  </nav>`;
};


const landing = () => `
  <div class="hero-bg">
  <section class="max-w-6xl mx-auto px-5 pt-12 pb-12 pop">
    <div class="grid lg:grid-cols-2 gap-10 items-center">
      <div class="text-center lg:text-left">
        ${badge('Every pro is reachable on WhatsApp in one tap', 'shield-check', 'green')}
        <h1 class="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink leading-[1.05]">Find trusted local experts or <span class="hl">get hired instantly.</span></h1>
        <p class="mt-5 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">Plumbers, electricians, carpenters, designers and more near you. No forms, no waiting. Just chat and agree on the job.</p>
        <form data-form="landing" class="mt-8 max-w-xl mx-auto lg:mx-0 bg-white rounded-2xl shadow-lg border border-slate-200 p-2 flex flex-col sm:flex-row gap-2 text-left">
          <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50">${icon('search', 20, 'text-brand')}
            <input data-field="landing.svc" value="${esc(state.landing.svc)}" placeholder="What do you need? e.g. plumber" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
          <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 sm:border-l border-slate-200">${icon('map-pin', 20, 'text-brand')}
            <input data-field="landing.loc" value="${esc(state.landing.loc)}" placeholder="Location e.g. Kumasi" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
          <button class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-7 py-3 transition-colors">Search</button>
        </form>
        <div class="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3">
          <button data-action="skip" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold px-8 py-4 text-lg shadow-lg shadow-emerald-200 transition-colors">${icon('sparkles', 20)} Skip Login &amp; Explore</button>
          <button data-action="auth" data-mode="login" class="w-full sm:w-auto rounded-xl border-2 border-brand text-brand font-bold px-8 py-3.5 hover:bg-brand-soft transition-colors">Log in</button>
          <button data-action="auth" data-mode="signup" class="w-full sm:w-auto rounded-xl bg-brand text-white font-bold px-8 py-3.5 hover:bg-brand-dark transition-colors">Sign up</button>
        </div>
        <p class="mt-4 text-sm text-slate-500">Browsing as a guest takes zero details. You can sign up whenever you like.</p>
      </div>
      <div class="bob">${phoneMock()}<p class="mt-5 text-center text-xs text-slate-400">Sample conversation</p></div>
    </div>
    <div class="mt-12 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
      ${[['1,200+', 'Verified pros'], ['4.8', 'Average rating'], ['< 5 min', 'To first reply']].map(([n, l]) => `<div class="bg-white/80 rounded-2xl border border-slate-200 py-4 text-center"><div class="text-2xl font-extrabold text-brand">${esc(n)}</div><div class="text-xs sm:text-sm text-slate-500">${l}</div></div>`).join('')}
    </div>
  </section></div>

  <section class="reveal max-w-5xl mx-auto px-5 py-12">
    <p class="text-center text-xs font-bold tracking-widest text-amber-rate uppercase">Simple by design</p>
    <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-center">How it works</h2>
    <div class="mt-8 grid sm:grid-cols-3 gap-4">
      ${[['search', 'Search', 'Pick a trade and your area.'], ['message-circle', 'Chat on WhatsApp', 'Message the pro directly. No sign-up needed.'], ['check', 'Get it done', 'Agree on the job and the price together.']].map(([ic, t, d], i) => `<div class="card-lift bg-white rounded-2xl border border-slate-200 p-6"><span class="grid place-items-center w-11 h-11 rounded-xl bg-brand-soft text-brand">${icon(ic, 22)}</span><div class="mt-4 text-xs font-bold text-amber-rate">STEP ${i + 1}</div><h3 class="mt-1 text-lg font-bold">${t}</h3><p class="mt-1 text-slate-500 text-sm">${d}</p></div>`).join('')}
    </div>
  </section>

  ${state.workers.length ? `<section class="reveal max-w-6xl mx-auto px-5 pb-12">
    <div class="flex items-end justify-between"><h2 class="text-2xl sm:text-3xl font-extrabold">Top-rated pros</h2><button data-action="skip" class="text-sm font-semibold text-brand hover:underline">See all</button></div>
    <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${state.workers.slice(0, 3).map((w) => workerCard(w)).join('')}</div>
  </section>` : ''}

  <section class="reveal max-w-5xl mx-auto px-5 pb-14">
    <p class="text-center text-xs font-bold tracking-widest text-amber-rate uppercase">For professionals</p>
    <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-center">Simple pricing</h2>
    <div class="mt-8 grid md:grid-cols-5 gap-4">
      <div class="md:col-span-2 band rounded-3xl text-white p-8 flex flex-col justify-center">
        <div class="text-xs font-bold tracking-widest text-amber-rate uppercase">First month free</div>
        <div class="mt-3 flex items-end gap-2"><span class="text-5xl font-extrabold">${ghs(PLAN.price)}</span><span class="pb-1 text-white/70">per month</span></div>
        <p class="mt-2 text-white/80">After your free month. Cancel any time.</p>
        <button data-action="role" data-role="worker" class="mt-6 rounded-xl bg-amber-rate hover:brightness-95 text-ink font-bold px-6 py-3.5 transition">Start your free month</button>
      </div>
      <div class="md:col-span-3 bg-white rounded-3xl border border-slate-200 p-8">
        <h3 class="text-lg font-bold">Everything a professional needs</h3>
        <ul class="mt-4 grid sm:grid-cols-2 gap-3">${['A public profile with your photo, bio and category', 'Customers contact you directly on WhatsApp', 'A portfolio of your best work', 'Blazes, ratings and testimonials from real clients', 'A private feedback link to send after each job', 'Job briefs: clear leads instead of “hello”'].map((t) => `<li class="flex gap-2 text-sm text-slate-600"><span class="mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">${icon('check', 13)}</span>${t}</li>`).join('')}</ul>
        <p class="mt-5 text-sm text-slate-500">Customers always use ProConnect for free. No commission on your jobs.</p>
      </div>
    </div>
  </section>

  <section class="reveal max-w-3xl mx-auto px-5 pb-14">
    <p class="text-center text-xs font-bold tracking-widest text-amber-rate uppercase">Good to know</p>
    <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold text-center">Frequently asked questions</h2>
    <div class="mt-8 grid gap-3">
      ${[['Do I need an account to find a pro?', 'No. You can browse, open profiles and chat on WhatsApp as a guest. An account is only needed if you want to offer your services.'],
         ['How do I contact a professional?', 'Tap Chat on WhatsApp on any profile. WhatsApp opens with a ready message, and you talk to the pro directly. You can also send a short job brief first.'],
         ['How much does ProConnect cost?', `It is free for customers. Professionals pay ${ghs(PLAN.price)} per month, and every new professional gets their first month free.`],
         ['Does ProConnect take a commission?', 'No. Professionals pay a flat monthly subscription. You and the professional agree the job and the price between yourselves.'],
         ['What are Blazes, ratings and testimonials?', 'After a job, a professional can send you a private link. You can give a Blaze (a fire reaction for great work), a star rating, a testimonial, or all three.'],
         ['What does the Verified badge mean?', 'Pros with the Verified badge have had their details checked by us. Always agree the price and the work before it starts.'],
         ['I am a tradesperson or creative. How do I join?', `Tap I am a Worker, sign up and create your profile. Your first month is free, then it is ${ghs(PLAN.price)} per month. Choose one of the main categories or type your own, such as Graphic Design or Video Editing.`],
         ['Is payment for jobs handled on ProConnect?', 'No. Agree on payment directly with the pro, and keep your chat on WhatsApp as a record of what was agreed.']]
        .map(([q, a]) => `<details class="faq bg-white rounded-2xl border border-slate-200 hover:border-brand/40 px-5 py-4"><summary class="flex items-center justify-between gap-4 cursor-pointer font-semibold list-none">${q}<span class="faq-plus shrink-0">+</span></summary><p class="mt-3 text-slate-600 text-sm leading-relaxed">${a}</p></details>`).join('')}
    </div>
  </section>

  <section class="reveal max-w-5xl mx-auto px-5 pb-16">
    <div class="band rounded-3xl text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-5">
      <div><h2 class="text-2xl sm:text-3xl font-extrabold">Are you a pro? Get hired on WhatsApp.</h2>
        <p class="mt-1 text-white/80">Your first month is free, then ${ghs(PLAN.price)} per month. Plumbers, electricians, designers, video editors and more.</p></div>
      <button data-action="role" data-role="worker" class="shrink-0 rounded-xl bg-amber-rate hover:brightness-95 text-ink font-bold px-7 py-3.5 transition">Start your free month</button>
    </div>
  </section>
  <footer class="band text-white">
    <div class="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
      <div class="flex items-center gap-3"><img src="logo-white.png" alt="ProConnect" class="h-12 w-auto" onerror="this.style.display='none'"><div><div class="font-extrabold text-lg">ProConnect</div><div class="text-sm text-white/70">Find trusted local experts</div></div></div>
      <div class="text-sm text-white/70"><button data-action="terms" class="underline hover:text-white">Terms of Service</button><p class="mt-1">Free for customers. Professionals: ${ghs(PLAN.price)} per month, first month free.</p></div>
    </div>
  </footer>`;


const SORTS = {
  rating: ['Top rated', (a, b) => (b.reviews ? b.rating : 0) - (a.reviews ? a.rating : 0) || b.reviews - a.reviews],
  blazes: ['Most blazed', (a, b) => (b.blazes || 0) - (a.blazes || 0)],
  experience: ['Most experienced', (a, b) => b.years - a.years],
  reviews: ['Most reviews', (a, b) => b.reviews - a.reviews],
};
const filtered = () => state.workers.filter((w) =>
  (!state.category || w.category === state.category) &&
  (!state.verifiedOnly || w.verified) &&
  (!state.minRating || (w.reviews > 0 && w.rating >= state.minRating)) &&
  (!state.query || (w.name + w.category + w.bio).toLowerCase().includes(state.query.toLowerCase())) &&
  (!state.location || w.area.toLowerCase().includes(state.location.toLowerCase()))
).sort((SORTS[state.sort] || SORTS.rating)[1]);

const tilesHTML = () => {
  const extra = [...new Set(state.workers.map((w) => w.category))].filter((c) => c && !CATEGORIES.some((k) => k.name === c));
  return [...CATEGORIES, ...extra.map((name) => ({ name, icon: 'briefcase' }))].map(({ name, icon: ic }) => {
    const on = state.category === name;
    return `<button data-action="category" data-name="${esc(name)}" class="card-lift rounded-2xl border p-4 flex flex-col items-center gap-2 font-semibold transition ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 hover:border-brand/40'}"><span class="grid place-items-center w-11 h-11 rounded-xl ${on ? 'bg-white/15' : 'bg-brand-soft text-brand'}">${icon(ic, 22)}</span>${esc(name)}</button>`;
  }).join('');
};

const toolbarHTML = () => {
  const cities = [...new Set(state.workers.map((w) => (w.area || '').split(' – ')[0]).filter(Boolean))].slice(0, 6);
  const chip = (on, attrs, label, ic) => `<button ${attrs} class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border transition ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600 hover:border-brand/40'}">${ic ? icon(ic, 15) : ''}${label}</button>`;
  const active = state.verifiedOnly || state.minRating || state.category || state.query || state.location;
  return `
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-sm font-semibold text-slate-500 mr-1">Near you</span>
    ${cities.map((c) => chip(state.location.toLowerCase() === c.toLowerCase(), `data-action="city" data-name="${esc(c)}"`, esc(c), 'map-pin')).join('')}
  </div>
  <div class="mt-3 flex flex-wrap items-center gap-2">
    ${chip(state.verifiedOnly, 'data-action="verified"', 'Verified only', 'badge-check')}
    ${chip(!!state.minRating, 'data-action="rating"', '4.8+ rating', 'star')}
    ${active ? '<button data-action="clear" class="text-sm font-semibold text-brand hover:underline px-1">Clear all</button>' : ''}
    <label class="ml-auto inline-flex items-center gap-2 text-sm text-slate-500">Sort
      <select data-field="sort" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">${Object.entries(SORTS).map(([k, [label]]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
  </div>`;
};

const resultsHTML = () => {
  const list = filtered();
  return `<div class="mt-6 flex items-baseline justify-between"><h3 class="text-lg font-bold">${esc(state.category) || 'All'} professionals</h3><span class="text-sm text-slate-500">${list.length} found</span></div>` +
    (list.length === 0
      ? `<div class="mt-4 bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No professionals match these filters yet.<div><button data-action="clear" class="mt-3 rounded-xl bg-brand text-white font-bold px-5 py-2.5 text-sm hover:bg-brand-dark transition-colors">Clear all filters</button></div></div>`
      : `<div class="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${list.map((w) => workerCard(w)).join('')}</div>`);
};
const updateMarket = () => {
  $('#tiles').innerHTML = tilesHTML(); $('#toolbar').innerHTML = toolbarHTML(); $('#results').innerHTML = resultsHTML();
  [['query', state.query], ['location', state.location]].forEach(([k, v]) => { const i = $(`[data-field="${k}"]`); if (i && i.value !== v) i.value = v; });
};

const marketplace = () => `
  <div class="band">
    <section class="max-w-6xl mx-auto px-5 py-10 text-white pop">
      <p class="text-xs font-bold tracking-widest text-amber-rate uppercase">Find a professional</p>
      <h2 class="mt-1 text-3xl sm:text-4xl font-extrabold">Who do you need today?</h2>
      <p class="mt-2 text-white/80">Search by trade or name, then chat with the pro on WhatsApp.</p>
      <div class="mt-5 bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 text-ink shadow-lg">
        <label class="flex-1 flex items-center gap-2 px-3 py-2">${icon('search', 18, 'text-brand')}<input data-field="query" value="${esc(state.query)}" placeholder="Search name or service" class="w-full outline-none"></label>
        <label class="flex-1 flex items-center gap-2 px-3 py-2 sm:border-l border-slate-200">${icon('map-pin', 18, 'text-brand')}<input data-field="location" value="${esc(state.location)}" placeholder="Area or city" class="w-full outline-none"></label>
      </div>
    </section>
  </div>
  <section class="max-w-6xl mx-auto px-5 py-8">
    <div id="tiles" class="grid grid-cols-2 sm:grid-cols-5 gap-3">${tilesHTML()}</div>
    <div id="toolbar" class="mt-6">${toolbarHTML()}</div>
    <div id="results">${resultsHTML()}</div>
  </section>`;

const profileDetail = () => {
  const w = state.selected; const [a, b] = TINTS[w.tint % TINTS.length]; const ic = catIcon(w.category);
  const tiles = PORTFOLIO[w.category].map((t, i) => {
    const [c1, c2] = TINTS[(w.tint + i) % TINTS.length];
    return `<figure class="relative aspect-[4/3] rounded-2xl overflow-hidden text-white" style="background:linear-gradient(135deg,${c1},${c2})">${icon(ic, 54, 'absolute -right-2 -bottom-2 opacity-20')}<figcaption class="absolute left-3 bottom-3 right-3 text-sm font-semibold drop-shadow">${t}</figcaption></figure>`;
  }).join('');
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
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('star', 16, 'fill-amber-rate text-amber-rate')}${w.rating}</div><div class="text-xs text-slate-500">${w.reviews} reviews</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg">${w.years} yrs</div><div class="text-xs text-slate-500">Experience</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('flame', 18, 'fill-orange-400 text-orange-500')}${esc(w.blazes || 0)}</div><div class="text-xs text-slate-500">Blazes</div></div>
        </div>
        <h3 class="mt-6 font-bold">About</h3><p class="mt-1 text-slate-600 leading-relaxed">${esc(w.bio)}</p>
        <h3 class="mt-6 font-bold">What clients say</h3>${testimonialsHTML(w)}
        <div class="mt-6 rounded-2xl bg-brand-soft p-4 flex items-center justify-between gap-3"><div><div class="font-bold text-brand">Not sure what to say?</div><div class="text-sm text-slate-600">Describe your job in 20 seconds. We write the WhatsApp message for you.</div></div><button data-action="brief" class="shrink-0 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-4 py-2.5 text-sm transition-colors">Send job brief</button></div>
        <div class="mt-4 text-xs text-slate-500 leading-relaxed">ProConnect only connects you. Agree the price and the work with the pro directly. <button data-action="terms" class="underline hover:text-brand">Terms</button> · <a href="mailto:${SITE.email}?subject=${encodeURIComponent('Report profile: ' + w.name)}" class="underline hover:text-brand">Report this profile</a>
          <details class="mt-2"><summary class="cursor-pointer font-semibold text-slate-600">Safety tips</summary><ol class="mt-2 list-decimal pl-5 grid gap-1"><li>Agree on the work and price in writing on WhatsApp before starting.</li><li>Do not pay everything upfront.</li><li>Check the pro's previous work and ask for references.</li><li>Meet in a safe place, and tell someone when a stranger is coming to your home.</li><li>Report suspicious profiles to us.</li></ol></details></div>
        <h3 class="mt-6 font-bold">Portfolio</h3><div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">${tiles}</div>
        <p class="mt-2 text-xs text-slate-400">Prototype tiles. Real photos will appear here once workers upload them.</p>
      </div>
    </div>
    <div class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3">
      <div class="max-w-3xl mx-auto flex gap-3"><div class="flex-1">${waButton(w, true)}</div>
        <a href="tel:+${toWa(w.phone)}" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand text-brand font-bold px-5 hover:bg-brand-soft">${icon('phone', 20)}<span class="hidden sm:inline">Call</span></a>
        <a href="https://wa.me/?text=${encodeURIComponent(`${w.name} on ProConnect: ${location.href}`)}" target="_blank" rel="noopener noreferrer" aria-label="Share this profile" class="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 px-4 hover:bg-slate-50">${icon('share-2', 20)}</a></div>
    </div>
  </section>`;
};

const dashboard = () => {
  const d = state.draft;
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  return `
  <section class="max-w-6xl mx-auto px-5 py-8 grid lg:grid-cols-5 gap-6 pop">
    <div class="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
      <h2 class="text-2xl font-extrabold">Create your public profile</h2>
      <p class="text-slate-500 mt-1">Customers chat with you directly on WhatsApp. No commission, no middleman.</p>
      ${state.user ? `<p class="text-sm text-slate-500 mt-2">Linked to your account (${esc(state.user.email)}). <button data-action="account" class="font-semibold text-brand hover:underline">View account</button></p>` : ''}
      <div class="mt-5 grid gap-4">
        <div class="inline-flex p-1 bg-slate-100 rounded-xl w-fit">
          ${['Personal', 'Business'].map((t) => `<button data-action="draft-type" data-type="${t}" class="px-4 py-2 rounded-lg text-sm font-semibold ${d.type === t ? 'bg-white shadow text-brand' : 'text-slate-500'}">${t} name</button>`).join('')}
        </div>
        <label class="grid gap-1 text-sm font-semibold">${d.type === 'Business' ? 'Business name' : 'Your full name'}
          <input class="${input}" data-field="draft.name" value="${esc(d.name)}" placeholder="${d.type === 'Business' ? 'e.g. Mensah Plumbing Works' : 'e.g. Kwame Mensah'}"></label>
        <div class="flex items-center gap-4">${avatar(draftWorker(), 72)}
          <label class="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-400 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">${icon('upload', 18)} Upload photo
            <input type="file" accept="image/*" data-file="photo" class="hidden"></label></div>
        <div><div class="text-sm font-semibold mb-2">Category</div><div class="flex flex-wrap gap-2">
          ${CATEGORIES.map(({ name, icon: ic }) => `<button data-action="draft-cat" data-name="${name}" class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border ${d.category === name ? 'bg-brand text-white border-brand' : 'border-slate-300 hover:border-brand/50'}">${icon(ic, 15)}${name}</button>`).join('')}
        </div></div>
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="grid gap-1 text-sm font-semibold">Service area<input class="${input}" data-field="draft.area" value="${esc(d.area)}" placeholder="e.g. Kumasi – Ahodwo"></label>
          <label class="grid gap-1 text-sm font-semibold">WhatsApp number<input class="${input}" inputmode="tel" data-field="draft.phone" value="${esc(d.phone)}" placeholder="024 000 0000"></label>
        </div>
        <label class="grid gap-1 text-sm font-semibold">Years of experience<input type="number" min="0" class="${input}" data-field="draft.years" value="${esc(d.years)}"></label>
        <label class="grid gap-1 text-sm font-semibold">Short bio<textarea rows="3" class="${input}" data-field="draft.bio" placeholder="What you do best and how you work.">${esc(d.bio)}</textarea></label>
        <button id="publish" data-action="publish" class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 transition-colors" ${draftReady() ? '' : 'disabled'}>${icon('check', 18)} ${state.busy === 'save' ? 'Saving…' : state.myProfile ? 'Save changes' : 'Publish profile'}</button>
        <p id="hint" class="text-xs text-slate-500 -mt-2 ${draftReady() ? 'hidden' : ''}">Add your name, service area and a WhatsApp number to publish.</p>
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

/* ---------- Hero chat mockup, scroll reveal, Job Brief ---------- */
const phoneMock = () => `
  <div class="phone mx-auto">
    <div class="flex items-center gap-3 bg-[#075E54] text-white px-4 pt-5 pb-3">
      <span class="w-9 h-9 rounded-full grid place-items-center bg-white/20 font-bold">K</span>
      <div class="leading-tight"><div class="font-semibold text-sm flex items-center gap-1">Kwame Mensah ${icon('badge-check', 14)}</div><div class="text-xs text-white/70">Plumber · online</div></div>
    </div>
    <div id="chat" class="chat-bg p-3 flex flex-col gap-2 text-[13px] h-[21rem] justify-end">
      ${[['out', 'Hi Kwame, my kitchen tap is leaking badly. Can you come today?', '10:02'], ['in', 'Hello! Yes, I can be there by 3pm. Which area are you in?', '10:03'], ['out', 'Ahodwo, Kumasi. Can you send a quote?', '10:03'], ['in', 'Inspection is free. Most tap repairs are quick. See you at 3.', '10:04']]
        .map(([d, t, time]) => `<div class="msg ${d === 'out' ? 'self-end bg-[#DCF8C6]' : 'self-start bg-white'} rounded-xl px-3 py-2 max-w-[82%] shadow-sm">${t}<span class="block text-[10px] text-slate-400 text-right mt-0.5">${time}</span></div>`).join('')}
    </div>
    <div class="bg-slate-100 px-3 py-2 text-xs text-slate-400">Type a message</div>
  </div>`;

let chatTimer;
function runChat() {
  clearTimeout(chatTimer);
  const msgs = [...document.querySelectorAll('#chat .msg')]; if (!msgs.length) return;
  msgs.forEach((m) => m.classList.remove('show'));
  let i = 0;
  const next = () => {
    if (!document.body.contains(msgs[0])) return;
    if (i < msgs.length) { msgs[i++].classList.add('show'); chatTimer = setTimeout(next, 1400); }
    else chatTimer = setTimeout(runChat, 5000);
  };
  chatTimer = setTimeout(next, 500);
}
function afterRender() {
  document.documentElement.classList.add('js');
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.1 });
    items.forEach((el) => io.observe(el));
  } else items.forEach((el) => el.classList.add('in'));
  if (state.screen === 'landing') runChat();
}

const BRIEF_KINDS = ['Fix a problem', 'New work', 'Just a quote'], BRIEF_WHEN = ['Today', 'This week', 'Flexible'];
const briefText = (w, b) => `Hi ${w.name}, I found you on ProConnect.\n\nJob: ${b.kind} (${w.category})\nWhen: ${b.when}\nLocation: ${b.area || 'to be confirmed'}${b.note ? `\nDetails: ${b.note}` : ''}\n\nCan you help, and roughly what would it cost?`;
const briefLink = (w, b) => `https://wa.me/${toWa(w.phone)}?text=${encodeURIComponent(briefText(w, b))}`;
const updateBrief = () => { $('#brief-preview').textContent = briefText(state.selected, state.brief); $('#brief-send').href = briefLink(state.selected, state.brief); };
const briefSheet = () => {
  const b = state.brief, w = state.selected; if (!b || state.screen !== 'profile' || !w) return '';
  const chips = (list, val, action) => list.map((v) => `<button data-action="${action}" data-v="${v}" class="rounded-full px-3.5 py-2 text-sm font-semibold border ${val === v ? 'bg-brand text-white border-brand' : 'border-slate-300 hover:border-brand/50'}">${v}</button>`).join('');
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
        <div><div class="text-xs font-semibold text-slate-500 mb-1">Preview of your WhatsApp message</div><div id="brief-preview" class="whitespace-pre-line text-sm bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-3">${esc(briefText(w, b))}</div></div>
        <a id="brief-send" href="${briefLink(w, b)}" target="_blank" rel="noopener noreferrer" class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold py-3.5 transition-colors">${icon('message-circle', 20)} Send on WhatsApp</a>
      </div>
    </div>
  </div>`;
};

/* ---------- Terms of Service ---------- */
/* FILL THESE IN before you publish */
const SITE = {
  updated: '21 November 2026',
  contact: 'REPLACE THIS: your email or WhatsApp number',
  email: 'REPLACE-THIS@example.com',
  verifiedMeans: 'REPLACE THIS: describe exactly what you check, for example their ID card',
  renewal: 'REPLACE THIS: say whether the subscription renews automatically or the professional pays each month',
  refunds: 'REPLACE THIS: write your refund policy',
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
    `You can cancel at any time. Your profile stays live until the end of the period you have already paid for.`,
    `If a payment is missed or a subscription is cancelled, your profile may be hidden from search until the subscription is active again.`,
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

/* ---------- Subscription, feedback links and Blazes ---------- */
const softError = (e, msg) => (e.message === 'NOT_CONNECTED' ? msg : e.message);
/* Your developer connects these two objects to the real backend. Every function returns a Promise. */
const BILLING = {
  getStatus: () => Promise.resolve(null),   // resolve { status: 'trial' | 'active' | 'expired', endsAt: '2026-12-21' } for the logged-in professional
  subscribe: () => NOT_CONNECTED(),         // open checkout for the monthly plan, then resolve the new { status, endsAt }
  cancel: () => NOT_CONNECTED(),            // resolve the updated { status, endsAt }
};
const REVIEWS = {
  createInvite: (/* { clientName } */) => NOT_CONNECTED(),   // make a single-use token on the server, resolve { token }
  lookupInvite: (/* token */) => NOT_CONNECTED(),            // resolve { worker: { name, category, area, photo } }
  submit: (/* { token, blaze, rating, testimonial, name } */) => NOT_CONNECTED(),
};
Object.assign(state, { sub: null, review: null, invite: { name: '', url: '', error: '', busy: false } });

const stars = (n, size = 14) => [1, 2, 3, 4, 5].map((i) => icon('star', size, i <= n ? 'fill-amber-rate text-amber-rate' : 'text-slate-300')).join('');
const blazeChip = (w) => (w.blazes ? `<span class="inline-flex items-center gap-1 text-sm font-semibold text-orange-600" title="Blazes">${icon('flame', 15, 'fill-orange-400 text-orange-500')}${esc(w.blazes)}</span>` : '');
const testimonialsHTML = (w) => ((w.testimonials || []).length
  ? `<div class="mt-2 grid gap-3">${w.testimonials.map((t) => `<figure class="rounded-2xl bg-slate-50 p-4"><div class="flex items-center gap-0.5">${stars(t.rating || 0)}</div><blockquote class="mt-2 text-slate-700 leading-relaxed">“${esc(t.text)}”</blockquote><figcaption class="mt-2 text-sm text-slate-500">${esc(t.name)}${t.date ? ' · ' + esc(t.date) : ''}</figcaption></figure>`).join('')}</div>`
  : '<p class="mt-2 text-sm text-slate-500">No testimonials yet.</p>');

const planCard = () => {
  const s = state.sub; const left = s && s.endsAt ? Math.max(0, Math.ceil((new Date(s.endsAt) - Date.now()) / 864e5)) : 0;
  const date = s && s.endsAt ? new Date(s.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const btn = (action, label, solid) => `<button data-action="${action}" class="mt-3 rounded-xl ${solid ? 'bg-brand hover:bg-brand-dark text-white' : 'border-2 border-brand text-brand hover:bg-brand-soft'} font-bold px-5 py-2.5 text-sm transition-colors">${label}</button>`;
  let head = 'Your plan', body = `Your first month is free. After that it is ${ghs(PLAN.price)} per month to keep your profile live.`, act = '';
  if (s && s.status === 'trial') { head = `Free month: ${left} ${left === 1 ? 'day' : 'days'} left`; body = `Your profile is live. After your free month it is ${ghs(PLAN.price)} per month.`; act = btn('bill-subscribe', `Subscribe now (${ghs(PLAN.price)})`, false); }
  if (s && s.status === 'active') { head = 'Subscription active'; body = `Paid until ${date}.`; act = `<button data-action="bill-cancel" class="mt-3 text-sm font-semibold text-slate-500 hover:underline">Cancel subscription</button>`; }
  if (s && s.status === 'expired') { head = 'Subscription ended'; body = 'Your profile is hidden from search until you renew.'; act = btn('bill-subscribe', `Renew for ${ghs(PLAN.price)}`, true); }
  return `<div class="rounded-3xl bg-brand-soft border border-brand/10 p-5"><div class="text-xs font-bold tracking-widest text-brand uppercase">For professionals</div><h3 class="mt-1 text-lg font-bold">${head}</h3><p class="mt-1 text-sm text-slate-600">${body}</p>${act}</div>`;
};

const inviteCard = () => {
  const i = state.invite, me = state.myProfile;
  if (!me) return `<div class="rounded-3xl bg-white border border-slate-200 p-5"><h3 class="font-bold flex items-center gap-2">${icon('flame', 18, 'fill-orange-400 text-orange-500')} Ask a client for feedback</h3><p class="mt-1 text-sm text-slate-500">Publish your profile first. Then you can send clients a private link to give you a Blaze, a rating or a testimonial.</p></div>`;
  const msg = `Hi${i.name ? ' ' + i.name : ''}, thank you for choosing ${me.name}. Could you give me quick feedback? It takes 30 seconds: ${i.url}`;
  return `<div class="rounded-3xl bg-white border border-slate-200 p-5">
    <h3 class="font-bold flex items-center gap-2">${icon('flame', 18, 'fill-orange-400 text-orange-500')} Ask a client for feedback</h3>
    <p class="mt-1 text-sm text-slate-500">Send a private link. Your client can give a Blaze, a star rating, a testimonial, or all three. Each link works once.</p>
    <label class="mt-3 grid gap-1 text-sm font-semibold">Client's first name (optional)<input data-field="invite.name" value="${esc(i.name)}" placeholder="e.g. Abena" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"></label>
    <button data-action="invite-create" class="mt-3 w-full rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 text-white font-bold py-2.5 text-sm transition-colors" ${i.busy ? 'disabled' : ''}>${i.busy ? 'Creating link…' : 'Create feedback link'}</button>
    ${i.error ? `<p class="mt-3 text-sm text-red-600" role="alert">${esc(i.error)}</p>` : ''}
    ${i.url ? `<div class="mt-3 rounded-2xl bg-slate-50 p-3"><div class="text-xs font-semibold text-slate-500">Your private link</div><div class="mt-1 text-xs break-all text-slate-700">${esc(i.url)}</div>
      <div class="mt-3 flex gap-2"><button data-action="invite-copy" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">${icon('copy', 16)} Copy link</button>
      <a href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-wa hover:bg-wa-dark text-white px-3 py-2 text-sm font-bold">${icon('message-circle', 16)} WhatsApp</a></div></div>` : ''}
  </div>`;
};

async function billAct(kind) {
  try { state.sub = await BILLING[kind](); toast(kind === 'subscribe' ? 'Subscription updated.' : 'Subscription cancelled.'); }
  catch (e) { toast(softError(e, 'Billing is not connected yet.')); }
  render();
}
async function createInvite() {
  const i = state.invite; i.error = ''; i.url = ''; i.busy = true; render();
  try { const r = await REVIEWS.createInvite({ clientName: i.name.trim() }); i.url = location.href.split('#')[0] + '#rate/' + r.token; }
  catch (e) { i.error = softError(e, 'Feedback links are not connected yet.'); }
  i.busy = false; render();
}
function copyInvite() {
  const u = state.invite.url; if (!u) return;
  if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast('Link copied.'), () => prompt('Copy this link:', u)); else prompt('Copy this link:', u);
}

const reviewReady = () => { const r = state.review; return !!(r && (r.blaze || r.rating || r.text.trim()) && !r.busy); };
const paintReview = () => { const b = $('#rv-send'); if (b) b.disabled = !reviewReady(); const c = $('#rv-count'); if (c) c.textContent = state.review.text.length + '/400'; };
async function submitReview() {
  const r = state.review; if (!reviewReady()) return;
  r.formError = ''; r.busy = true; render();
  try { await REVIEWS.submit({ token: r.token, blaze: r.blaze, rating: r.rating, testimonial: r.text.trim(), name: r.name.trim() }); r.done = true; }
  catch (e) { r.formError = softError(e, 'Feedback is not switched on yet. Please try again later.'); }
  r.busy = false; render();
}
function routeFromHash() {
  const m = location.hash.match(/^#rate\/([A-Za-z0-9_-]{6,80})$/); if (!m) return;
  state.review = { token: m[1], loading: true, error: '', formError: '', worker: null, blaze: false, rating: 0, text: '', name: '', done: false, busy: false };
  go('review');
  REVIEWS.lookupInvite(m[1])
    .then((info) => { state.review.worker = info.worker; state.review.loading = false; })
    .catch((e) => { state.review.loading = false; state.review.error = softError(e, 'Feedback links are not switched on yet.'); })
    .then(() => { if (state.screen === 'review') render(); });
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
  const s = state.screen;
  $('#app').innerHTML =
    header() +
    (s === 'landing' ? landing() : s === 'market' ? marketplace() : s === 'profile' ? profileDetail() : s === 'auth' ? authScreen() : s === 'account' ? accountScreen() : s === 'terms' ? termsScreen() : s === 'review' ? reviewScreen() : dashboard()) + bottomNav() + briefSheet();
  afterRender();
}
function go(screen) { state.brief = null; state.screen = screen; render(); window.scrollTo(0, 0); }
function setRole(r) {
  if (r === 'worker' && !state.user) {
    state.role = 'customer';
    state.auth = { mode: 'login', error: '', info: '', values: {}, reason: 'Sign in to create or edit your worker profile. Browsing stays open to everyone.' };
    return go('auth');
  }
  state.role = r; go(r === 'worker' ? 'dashboard' : 'market');
}

/* ---------- Events (one listener per type, using data-attributes) ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;                     // let WhatsApp / call links work normally
  const el = e.target.closest('[data-action]'); if (!el) return;
  const d = el.dataset;
  switch (d.action) {
    case 'skip': setRole('customer'); break;
    case 'auth': state.auth = { mode: d.mode || 'login', error: '', info: '', reason: '', values: {} }; go('auth'); break;
    case 'auth-mode': state.auth.mode = state.auth.mode === 'login' ? 'signup' : 'login'; state.auth.error = ''; render(); break;
    case 'account': go('account'); break;
    case 'edit-worker': setRole('worker'); break;
    case 'signout': AUTH.signOut().catch(() => {}).finally(() => { state.user = null; state.myProfile = null; state.draft = freshDraft(); toast('Signed out.'); go('landing'); }); break;
    case 'home': go('landing'); break;
    case 'role': setRole(d.role); break;
    case 'category': state.category = state.category === d.name ? '' : d.name; updateMarket(); break;
    case 'open': state.selected = state.workers.find((w) => w.id === +d.id); go('profile'); break;
    case 'back': go('market'); break;
    case 'bill-subscribe': billAct('subscribe'); break;
    case 'bill-cancel': if (confirm('Cancel your subscription?')) billAct('cancel'); break;
    case 'invite-create': createInvite(); break;
    case 'invite-copy': copyInvite(); break;
    case 'rv-blaze': state.review.blaze = !state.review.blaze; render(); break;
    case 'rv-star': state.review.rating = state.review.rating === +d.v ? 0 : +d.v; render(); break;
    case 'rv-home': history.replaceState(null, '', location.pathname + location.search); state.review = null; go('landing'); break;
    case 'city': state.location = state.location.toLowerCase() === d.name.toLowerCase() ? '' : d.name; updateMarket(); break;
    case 'verified': state.verifiedOnly = !state.verifiedOnly; updateMarket(); break;
    case 'rating': state.minRating = state.minRating ? 0 : 4.8; updateMarket(); break;
    case 'clear': state.category = ''; state.query = ''; state.location = ''; state.verifiedOnly = false; state.minRating = 0; updateMarket(); break;
    case 'draft-type': state.draft.type = d.type; render(); break;
    case 'draft-cat': state.draft.category = d.name; render(); break;
    case 'publish': saveProfile(); break;
    case 'brief': state.brief = { kind: BRIEF_KINDS[0], when: BRIEF_WHEN[0], area: state.location || '', note: '' }; render(); break;
    case 'brief-close': state.brief = null; render(); break;
    case 'brief-kind': state.brief.kind = d.v; render(); break;
    case 'brief-when': state.brief.when = d.v; render(); break;
    case 'noop': break;
    case 'terms': {
      const af = document.querySelector('[data-form="auth"]');
      if (af) { const v = Object.fromEntries(new FormData(af)); state.auth.values = { name: v.name, phone: v.phone, email: v.email }; }
      state.prev = state.screen; go('terms'); break;
    }
    case 'terms-back': go(state.prev || 'landing'); break;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.brief) { state.brief = null; render(); return; }
  const el = e.target.closest && e.target.closest('[data-action="open"]');
  if (el && e.key === 'Enter') el.click();
});
document.addEventListener('input', (e) => {
  const f = e.target.dataset && e.target.dataset.field; if (!f) return;
  const v = e.target.value;
  if (f === 'query' || f === 'location') { state[f] = v; updateMarket(); }
  else if (f === 'sort') { state.sort = v; updateMarket(); }
  else if (f.startsWith('invite.')) state.invite[f.split('.')[1]] = v;
  else if (f.startsWith('rv.')) { state.review[f.split('.')[1]] = v; paintReview(); }
  else if (f.startsWith('brief.')) { state.brief[f.split('.')[1]] = v; updateBrief(); }
  else if (f.startsWith('landing.')) state.landing[f.split('.')[1]] = v;
  else if (f.startsWith('draft.')) {
    state.draft[f.split('.')[1]] = v;
    $('#preview').innerHTML = workerCard(draftWorker(), true);
    $('#publish').disabled = !draftReady();
    $('#hint').classList.toggle('hidden', !!draftReady());
  }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.file === 'photo' && e.target.files[0]) {
    state.draft.photo = URL.createObjectURL(e.target.files[0]); render();
  }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const kind = e.target.dataset.form, f = Object.fromEntries(new FormData(e.target));
  if (kind === 'landing') { state.query = state.landing.svc; state.location = state.landing.loc; setRole('customer'); }
  if (kind === 'auth') submitAuth(f);
  if (kind === 'review') submitReview();
  if (kind === 'account') saveAccount(f);
});

render();
window.addEventListener('hashchange', routeFromHash); routeFromHash();
AUTH.restoreSession().then(async (u) => { if (u) { await startSession(u); render(); } }).catch(() => {});
   
