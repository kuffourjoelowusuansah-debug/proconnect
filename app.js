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
 "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /> <path d=\"M20 3v4\" /> <path d=\"M22 5h-4\" /> <path d=\"M4 17v2\" /> <path d=\"M5 18H3\" />"
};

/* ===== ProConnect: plain JavaScript app ===== */
const icon = (name, size = 18, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICONS[name]}</svg>`;

/* ---------- Data ---------- */
const CATEGORIES = [
  { name: 'Plumbing', icon: 'wrench' }, { name: 'Electrical', icon: 'zap' },
  { name: 'Carpentry', icon: 'hammer' }, { name: 'Painting', icon: 'paint-bucket' },
  { name: 'Masonry', icon: 'layers' },
 
];
const CAT_IDEAS = ['Graphic Design', 'Video Editing', 'Photography', 'Web Development', 'Tailoring', 'Hairdressing', 'Welding', 'Tiling', 'Cleaning', 'Mechanic', 'Catering', 'DJ & Music'];
const isOther = (d) => !CATEGORIES.some((c) => c.name === d.category);
const TINTS = [['#1F3A5F', '#3B6FB6'], ['#0F766E', '#34D399'], ['#9A3412', '#FB923C'], ['#6D28D9', '#A78BFA'], ['#BE123C', '#FB7185'], ['#0369A1', '#38BDF8']];
const SEED = [
  { id: 1, name: 'Kwame Mensah', type: 'Personal', category: 'Plumbing', area: 'Kumasi – Ahodwo', rating: 4.9, reviews: 128, years: 12, verified: true, phone: '0244000001', tint: 0, bio: 'Burst pipes, leaking taps, water tank installs and bathroom fittings. I show up on time and clean up after the job.' },
  { id: 2, name: 'Voltline Electricals', type: 'Business', category: 'Electrical', area: 'Kumasi – Asokwa', rating: 4.8, reviews: 214, years: 9, verified: true, phone: '0204000002', tint: 1, bio: 'House wiring, DB board upgrades, solar and inverter setups. Licensed team of four.' },
  { id: 3, name: 'Ama Boateng', type: 'Personal', category: 'Painting', area: 'Accra – East Legon', rating: 4.7, reviews: 76, years: 6, verified: true, phone: '0554000003', tint: 2, bio: 'Interior and exterior painting, textured walls and POP ceiling finishing with clean edges.' },
  { id: 4, name: 'Yaw Oppong & Sons', type: 'Business', category: 'Carpentry', area: 'Kumasi – Suame', rating: 4.9, reviews: 301, years: 20, verified: true, phone: '0274000004', tint: 3, bio: 'Wardrobes, kitchen cabinets, doors and roofing frames. Three generations of woodwork.' },
  { id: 5, name: 'Solid Rock Masonry', type: 'Business', category: 'Masonry', area: 'Takoradi – Market Circle', rating: 4.6, reviews: 58, years: 8, verified: false, phone: '0504000005', tint: 4, bio: 'Block laying, plastering, tiling and perimeter walls. Free site visits for quotes.' },
  { id: 6, name: 'Efua Asante', type: 'Personal', category: 'Electrical', area: 'Accra – Madina', rating: 4.8, reviews: 92, years: 7, verified: true, phone: '0244000006', tint: 5, bio: 'Fault finding, lighting design and socket installs. Same-day callouts across Accra.' },
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
const state = { screen: 'landing', role: 'customer', selected: null, query: '', location: '', category: '', workers: [...SEED], draft: freshDraft(), landing: { svc: '', loc: '' } };

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toWa = (p) => { let d = (p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '233' + d.slice(1); return d; };
const catIcon = (name) => (CATEGORIES.find((c) => c.name === name) || { icon: 'briefcase' }).icon;
let toastTimer;
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
};
const draftWorker = () => ({ ...state.draft, id: 0, tint: 0, rating: 5.0, reviews: 0, verified: false });
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
const workerCard = (w, preview = false) => `
  <article ${preview ? '' : `data-action="open" data-id="${w.id}" tabindex="0" role="button"`} class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 ${preview ? '' : 'cursor-pointer hover:border-brand/40 hover:shadow-md transition'}">
    <div class="flex items-start gap-3">
      ${avatar(w)}
      <div class="min-w-0 flex-1">
        <h3 class="font-bold leading-tight flex items-center gap-1"><span class="truncate">${esc(w.name) || 'Your name'}</span>${w.verified ? icon('badge-check', 18, 'text-sky-500 shrink-0') : ''}</h3>
        <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">${icon(catIcon(w.category), 14)} ${esc(w.category)} · ${esc(w.type)}</p>
        <div class="mt-1">${rating(w)}</div>
      </div>
    </div>
    <p class="text-sm text-slate-500 flex items-center gap-1">${icon('map-pin', 15)} ${esc(w.area) || 'Your service area'}</p>
    ${waButton(w)}
  </article>`;

/* ---------- Screens ---------- */
const header = () => `
  <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
      <button data-action="home" class="flex items-center gap-2 font-extrabold text-lg text-brand">
        <span class="grid place-items-center w-8 h-8 rounded-lg bg-brand text-white">${icon('message-circle', 18)}</span> ProConnect</button>
      <div class="inline-flex p-1 bg-slate-100 rounded-xl text-sm font-semibold">
        <button data-action="role" data-role="customer" class="px-3 sm:px-4 py-2 rounded-lg inline-flex items-center gap-1.5 ${state.role === 'customer' ? 'bg-white shadow text-brand' : 'text-slate-500'}">${icon('users', 16)}<span class="hidden sm:inline">Find a Professional</span><span class="sm:hidden">Find a Pro</span></button>
        <button data-action="role" data-role="worker" class="px-3 sm:px-4 py-2 rounded-lg inline-flex items-center gap-1.5 ${state.role === 'worker' ? 'bg-white shadow text-brand' : 'text-slate-500'}">${icon('briefcase', 16)}I'm a Worker</button>
      </div>
    </div>
  </header>`;

const landing = () => `
  <section class="max-w-5xl mx-auto px-5 pt-14 pb-20 text-center pop">
    ${badge('Every pro is reachable on WhatsApp in one tap', 'shield-check', 'green')}
    <h1 class="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">Find trusted local experts<br class="hidden sm:block"> or get hired instantly.</h1>
    <p class="mt-5 text-lg text-slate-600 max-w-xl mx-auto">Plumbers, electricians, carpenters and painters near you. No forms, no waiting. Just chat and agree on the job.</p>
    <form data-form="landing" class="mt-9 mx-auto max-w-3xl bg-white rounded-2xl shadow-lg border border-slate-200 p-2 flex flex-col sm:flex-row gap-2 text-left">
      <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50">${icon('search', 20, 'text-brand')}
        <input data-field="landing.svc" value="${esc(state.landing.svc)}" placeholder="What do you need? e.g. plumber" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
      <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 sm:border-l border-slate-200">${icon('map-pin', 20, 'text-brand')}
        <input data-field="landing.loc" value="${esc(state.landing.loc)}" placeholder="Location e.g. Kumasi" class="w-full bg-transparent outline-none placeholder:text-slate-400"></label>
      <button class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold px-7 py-3 transition-colors">Search</button>
    </form>
    <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
      <button data-action="skip" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-wa hover:bg-wa-dark text-white font-bold px-8 py-4 text-lg shadow-lg shadow-emerald-200 transition-colors">${icon('sparkles', 20)} Skip Login &amp; Explore</button>
      <button data-action="auth" class="w-full sm:w-auto rounded-xl border-2 border-brand text-brand font-bold px-8 py-3.5 hover:bg-brand-soft transition-colors">Log in</button>
      <button data-action="auth" class="w-full sm:w-auto rounded-xl bg-brand text-white font-bold px-8 py-3.5 hover:bg-brand-dark transition-colors">Sign up</button>
    </div>
    <p class="mt-4 text-sm text-slate-500">Browsing as a guest takes zero details. You can sign up whenever you like.</p>
    <div class="mt-14 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
      ${[['1,200+', 'Verified pros'], ['4.8', 'Average rating'], ['< 5 min', 'To first reply']].map(([n, l]) => `<div class="bg-white rounded-2xl border border-slate-200 py-4"><div class="text-2xl font-extrabold text-brand">${esc(n)}</div><div class="text-xs sm:text-sm text-slate-500">${l}</div></div>`).join('')}
    </div>
  </section>`;

const filtered = () => state.workers.filter((w) =>
  (!state.category || w.category === state.category) &&
  (!state.query || (w.name + w.category + w.bio).toLowerCase().includes(state.query.toLowerCase())) &&
  (!state.location || w.area.toLowerCase().includes(state.location.toLowerCase())));

const tilesHTML = () => {
  const extra = [...new Set(state.workers.map((w) => w.category))].filter((c) => c && !CATEGORIES.some((k) => k.name === c));
  return [...CATEGORIES, ...extra.map((name) => ({ name, icon: 'briefcase' }))].map(({ name, icon: ic }) => {
    const on = state.category === name;
    return `<button data-action="category" data-name="${esc(name)}" class="rounded-2xl border p-4 flex flex-col items-center gap-2 font-semibold transition ${on ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 hover:border-brand/40'}"><span class="grid place-items-center w-11 h-11 rounded-xl ${on ? 'bg-white/15' : 'bg-brand-soft text-brand'}">${icon(ic, 22)}</span>${esc(name)}</button>`;
  }).join('');
};

const resultsHTML = () => {
  const list = filtered();
  return `<div class="mt-8 flex items-baseline justify-between"><h3 class="text-lg font-bold">${state.category || 'Top-rated'} professionals</h3><span class="text-sm text-slate-500">${list.length} found</span></div>` +
    (list.length === 0
      ? `<div class="mt-4 bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No professionals match yet. Clear a filter or try a nearby area.</div>`
      : `<div class="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${list.map((w) => workerCard(w)).join('')}</div>`);
};
const updateMarket = () => { $('#tiles').innerHTML = tilesHTML(); $('#results').innerHTML = resultsHTML(); };

const marketplace = () => `
  <section class="max-w-6xl mx-auto px-5 py-8 pop">
    <h2 class="text-2xl sm:text-3xl font-extrabold">Who do you need today?</h2>
    <div class="mt-4 bg-white rounded-2xl border border-slate-200 p-2 flex flex-col sm:flex-row gap-2">
      <label class="flex-1 flex items-center gap-2 px-3 py-2">${icon('search', 18, 'text-brand')}<input data-field="query" value="${esc(state.query)}" placeholder="Search name or service" class="w-full outline-none"></label>
      <label class="flex-1 flex items-center gap-2 px-3 py-2 sm:border-l border-slate-200">${icon('map-pin', 18, 'text-brand')}<input data-field="location" value="${esc(state.location)}" placeholder="Area or city" class="w-full outline-none"></label>
    </div>
    <div id="tiles" class="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">${tilesHTML()}</div>
    <div id="results">${resultsHTML()}</div>
  </section>`;

const profileDetail = () => {
  const w = state.selected; const [a, b] = TINTS[w.tint % TINTS.length]; const ic = catIcon(w.category);
  const tiles = (PORTFOLIO[w.category] || ['Project 1', 'Project 2', 'Project 3', 'Project 4', 'Project 5', 'Project 6']).map((t, i) => {
    const [c1, c2] = TINTS[(w.tint + i) % TINTS.length];
    return `<figure class="relative aspect-[4/3] rounded-2xl overflow-hidden text-white" style="background:linear-gradient(135deg,${c1},${c2})">${icon(ic, 54, 'absolute -right-2 -bottom-2 opacity-20')}<figcaption class="absolute left-3 bottom-3 right-3 text-sm font-semibold drop-shadow">${t}</figcaption></figure>`;
  }).join('');
  return `
  <section class="max-w-3xl mx-auto px-5 py-6 pb-32 pop">
    <button data-action="back" class="inline-flex items-center gap-1 text-slate-600 font-semibold hover:text-brand">${icon('arrow-left', 18)} Back to results</button>
    <div class="mt-4 bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div class="h-28" style="background:linear-gradient(120deg,${a},${b})"></div>
      <div class="px-5 pb-6 -mt-10">
        <div class="ring-4 ring-white rounded-full w-fit">${avatar(w, 80)}</div>
        <h2 class="mt-3 text-2xl font-extrabold flex items-center gap-2">${esc(w.name)}${w.verified ? icon('badge-check', 24, 'text-sky-500') : ''}</h2>
        <p class="text-slate-500 flex items-center gap-1 mt-1">${icon('map-pin', 16)} ${esc(w.area)}</p>
        <div class="mt-3 flex flex-wrap gap-2">${badge(w.category, ic)}${w.verified ? badge('ID verified', 'shield-check', 'green') : ''}${badge(w.type, w.type === 'Business' ? 'briefcase' : 'user')}</div>
        <div class="mt-5 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('star', 16, 'fill-amber-rate text-amber-rate')}${w.rating}</div><div class="text-xs text-slate-500">${w.reviews} reviews</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg">${w.years} yrs</div><div class="text-xs text-slate-500">Experience</div></div>
          <div class="rounded-2xl bg-slate-50 py-3"><div class="font-extrabold text-lg flex justify-center items-center gap-1">${icon('clock', 16)}&lt;5m</div><div class="text-xs text-slate-500">Reply time</div></div>
        </div>
        <h3 class="mt-6 font-bold">About</h3><p class="mt-1 text-slate-600 leading-relaxed">${esc(w.bio)}</p>
        <h3 class="mt-6 font-bold">Portfolio</h3><div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">${tiles}</div>
        <p class="mt-2 text-xs text-slate-400">Prototype tiles. Real photos will appear here once workers upload them.</p>
      </div>
    </div>
    <div class="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3">
      <div class="max-w-3xl mx-auto flex gap-3"><div class="flex-1">${waButton(w, true)}</div>
        <a href="tel:+${toWa(w.phone)}" class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand text-brand font-bold px-5 hover:bg-brand-soft">${icon('phone', 20)}<span class="hidden sm:inline">Call</span></a></div>
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
          <button data-action="draft-other" class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold border ${isOther(d) ? 'bg-brand text-white border-brand' : 'border-slate-300 hover:border-brand/50'}">${icon('briefcase', 15)}Other</button>
        </div>
        ${isOther(d) ? `<input data-field="draft.category" value="${esc(d.category)}" maxlength="40" list="cat-ideas" placeholder="Type your category, e.g. Graphic Designer" class="${input} mt-3"><datalist id="cat-ideas">${CAT_IDEAS.map((c) => `<option value="${c}">`).join('')}</datalist>` : ''}</div>>
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="grid gap-1 text-sm font-semibold">Service area<input class="${input}" data-field="draft.area" value="${esc(d.area)}" placeholder="e.g. Kumasi – Ahodwo"></label>
          <label class="grid gap-1 text-sm font-semibold">WhatsApp number<input class="${input}" inputmode="tel" data-field="draft.phone" value="${esc(d.phone)}" placeholder="024 000 0000"></label>
        </div>
        <label class="grid gap-1 text-sm font-semibold">Years of experience<input type="number" min="0" class="${input}" data-field="draft.years" value="${esc(d.years)}"></label>
        <label class="grid gap-1 text-sm font-semibold">Short bio<textarea rows="3" class="${input}" data-field="draft.bio" placeholder="What you do best and how you work.">${esc(d.bio)}</textarea></label>
        <button id="publish" data-action="publish" class="rounded-xl bg-brand hover:bg-brand-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 transition-colors" ${draftReady() ? '' : 'disabled'}>${icon('check', 18)} Publish profile</button>
        <p id="hint" class="text-xs text-slate-500 -mt-2 ${draftReady() ? 'hidden' : ''}">Add your name, service area and a WhatsApp number to publish.</p>
      </div>
    </div>
    <aside class="lg:col-span-2"><div class="lg:sticky lg:top-20">
      <div class="flex items-center gap-2 font-bold mb-3">${icon('eye', 18)} How customers see you</div>
      <div id="preview">${workerCard(draftWorker(), true)}</div>
      <p class="mt-3 text-sm text-slate-500">The green button opens WhatsApp with a ready-made message to your number.</p>
    </div></aside>
  </section>`;
};

/* ---------- Render ---------- */
function render() {
  const s = state.screen;
  $('#app').innerHTML =
    (s !== 'landing' ? header() : '') +
    (s === 'landing' ? landing() : s === 'market' ? marketplace() : s === 'profile' ? profileDetail() : dashboard());
}
function go(screen) { state.screen = screen; render(); window.scrollTo(0, 0); }
function setRole(r) { state.role = r; go(r === 'worker' ? 'dashboard' : 'market'); }

/* ---------- Events (one listener per type, using data-attributes) ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;                     // let WhatsApp / call links work normally
  const el = e.target.closest('[data-action]'); if (!el) return;
  const d = el.dataset;
  switch (d.action) {
    case 'skip': setRole('customer'); break;
    case 'auth': setRole('customer'); toast('Demo only: sign-in is not connected yet. You are browsing as a guest.'); break;
    case 'home': go('landing'); break;
    case 'role': setRole(d.role); break;
    case 'category': state.category = state.category === d.name ? '' : d.name; updateMarket(); break;
    case 'open': state.selected = state.workers.find((w) => w.id === +d.id); go('profile'); break;
    case 'back': go('market'); break;
    case 'draft-type': state.draft.type = d.type; render(); break;
    case 'draft-cat': state.draft.category = d.name; render(); break;
    case 'draft-other': state.draft.category = ''; render(); setTimeout(() => { const i = document.querySelector('[data-field="draft.category"]'); if (i) i.focus(); }); break;
    case 'publish':
      if (!draftReady()) return;
      state.workers.unshift({ ...draftWorker(), id: Date.now(), tint: Math.floor(Math.random() * 6), bio: state.draft.bio || 'New on ProConnect.', years: +state.draft.years || 0 });
      state.draft = freshDraft(); state.query = ''; state.location = ''; state.category = '';
      setRole('customer'); toast('Published. Your profile is now in the marketplace.'); break;
  }
});
document.addEventListener('keydown', (e) => {
  const el = e.target.closest && e.target.closest('[data-action="open"]');
  if (el && e.key === 'Enter') el.click();
});
document.addEventListener('input', (e) => {
  const f = e.target.dataset && e.target.dataset.field; if (!f) return;
  const v = e.target.value;
  if (f === 'query' || f === 'location') { state[f] = v; updateMarket(); }
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
  if (e.target.dataset.form !== 'landing') return;
  e.preventDefault();
  state.query = state.landing.svc; state.location = state.landing.loc; setRole('customer');
});

render();
