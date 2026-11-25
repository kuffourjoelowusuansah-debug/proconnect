const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg) {
  const el = $('#admin-toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

async function api(path, opts = {}) {
  const headers = { 'X-Requested-With': 'ProConnect', ...(opts.headers || {}) };
  let body = opts.body;
  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const resp = await fetch('/api/admin' + path, {
    method: opts.method || 'GET',
    credentials: 'same-origin',
    headers,
    body,
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!resp.ok) {
    throw new Error((data && data.error) || 'Request failed');
  }
  return data;
}

const state = {
  loading: true,
  authenticated: false,
  needsBootstrap: false,
  envConfigured: false,
  authError: '',
  tab: 'workers',
  workerQuery: '',
  workerFilter: 'all',
  overview: null,
  workers: [],
  feedback: [],
  reports: [],
  payments: [],
  audit: [],
  busy: false,
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function init() {
  state.loading = true;
  render();
  try {
    const st = await api('/status');
    state.authenticated = st.authenticated;
    state.needsBootstrap = st.needsBootstrap;
    state.envConfigured = st.envConfigured;
    state.loading = false;
    if (state.authenticated) {
      await loadAllData();
    }
  } catch (err) {
    state.loading = false;
    state.authError = err.message;
  }
  render();
}

async function loadAllData() {
  const [overview, workers, feedback, reports, payments, audit] = await Promise.all([
    api('/overview'),
    api('/workers?q=' + encodeURIComponent(state.workerQuery)),
    api('/feedback'),
    api('/reports'),
    api('/payments'),
    api('/audit'),
  ]);
  state.overview = overview;
  state.workers = workers.items || [];
  state.feedback = feedback.items || [];
  state.reports = reports.items || [];
  state.payments = payments.items || [];
  state.audit = audit.items || [];
}

function authView() {
  const input = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
  if (state.needsBootstrap) {
    return `
    <section class="max-w-md mx-auto px-5 py-12 pop">
      <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <span class="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 text-xs font-bold">First-run setup</span>
        <h1 class="mt-3 text-2xl font-extrabold">Claim admin access</h1>
        <p class="mt-1 text-sm text-slate-600">Set the initial admin password for this workspace. Once claimed, this setup locks automatically.</p>
        <form data-form="bootstrap" class="mt-6 grid gap-4">
          <label class="grid gap-1 text-sm font-semibold">Admin password (min 8 chars)<input name="passcode" type="password" minlength="8" required class="${input}" autocomplete="new-password"></label>
          <label class="grid gap-1 text-sm font-semibold">Confirm password<input name="confirm" type="password" minlength="8" required class="${input}" autocomplete="new-password"></label>
          ${state.authError ? `<p class="text-sm text-red-600" role="alert">${esc(state.authError)}</p>` : ''}
          <button class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold py-3 transition-colors" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Setting up…' : 'Set admin password'}</button>
        </form>
        <p class="mt-4 text-xs text-slate-500">You can also set <code class="font-semibold">ADMIN_PASSCODE</code> in environment secrets at any time.</p>
      </div>
    </section>`;
  }
  return `
  <section class="max-w-md mx-auto px-5 py-12 pop">
    <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
      <h1 class="text-2xl font-extrabold">ProConnect Admin</h1>
      <p class="mt-1 text-sm text-slate-500">Sign in to verify professionals, review reports, and manage subscriptions.</p>
      <form data-form="login" class="mt-6 grid gap-4">
        <label class="grid gap-1 text-sm font-semibold">Admin password<input name="passcode" type="password" required class="${input}" autocomplete="current-password"></label>
        ${state.authError ? `<p class="text-sm text-red-600" role="alert">${esc(state.authError)}</p>` : ''}
        <button class="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold py-3 transition-colors" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </section>`;
}

function badge(text, tone = 'neutral') {
  const cls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-800'
      : tone === 'red'
        ? 'bg-red-50 text-red-700'
        : 'bg-brand-soft text-brand';
  return `<span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}">${esc(text)}</span>`;
}

function workersTab() {
  const rows = state.workers.filter((w) => {
    const f = state.workerFilter;
    if (f === 'all') return true;
    if (f === 'hidden' || f === 'suspended') return w.status === f;
    return w.subscription && w.subscription.status === f;
  });
  return `
  <div class="bg-white rounded-3xl border border-slate-200 p-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h2 class="text-lg font-bold">Professionals (${rows.length})</h2>
      <div class="flex flex-wrap items-center gap-2">
        <select data-field="workerFilter" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand">
          ${[['all', 'All statuses'], ['active', 'Paid active'], ['trial', 'In trial'], ['expired', 'Expired'], ['hidden', 'Hidden'], ['suspended', 'Suspended']].map(([v, l]) => `<option value="${v}" ${state.workerFilter === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input data-field="workerQuery" value="${esc(state.workerQuery)}" placeholder="Search name, category, area, phone…" class="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand w-full sm:w-72">
      </div>
    </div>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-sm text-left">
        <thead><tr class="border-b border-slate-200 text-xs text-slate-500 uppercase">
          <th class="py-2 pr-4">Professional</th>
          <th class="py-2 pr-4">Category &amp; Area</th>
          <th class="py-2 pr-4">Verified</th>
          <th class="py-2 pr-4">Visibility</th>
          <th class="py-2 pr-4">Plan</th>
          <th class="py-2">Actions</th>
        </tr></thead>
        <tbody class="divide-y">
          ${rows.map((w) => {
            const sub = w.subscription;
            const subTone = !sub || sub.status === 'expired' ? 'red' : sub.status === 'trial' ? 'amber' : 'green';
            const stTone = w.status === 'active' ? 'green' : w.status === 'hidden' ? 'amber' : 'red';
            return `<tr class="align-top">
              <td class="py-3 pr-4">
                <div class="font-bold text-ink">${esc(w.name)}</div>
                <div class="text-xs text-slate-500">${esc(w.phone)} · ${esc(w.email)}</div>
                <div class="text-xs text-slate-400">${w.reviews} ratings · ${w.blazes} blazes</div>
              </td>
              <td class="py-3 pr-4">
                <div class="font-semibold">${esc(w.category)}</div>
                <div class="text-xs text-slate-500">${esc(w.area)}</div>
              </td>
              <td class="py-3 pr-4">${w.verified ? badge('Verified', 'green') : badge('Unverified')}</td>
              <td class="py-3 pr-4">${badge(w.status, stTone)}</td>
              <td class="py-3 pr-4">
                ${sub ? badge(sub.status, subTone) : badge('none', 'red')}
                <div class="text-xs text-slate-500 mt-1">Until ${fmtDate(sub && sub.endsAt)}</div>
              </td>
              <td class="py-3">
                <div class="flex flex-wrap gap-1.5">
                  ${w.status === 'active' && sub && sub.status !== 'expired' ? `<a href="/#pro/${encodeURIComponent(w.id)}" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50">View</a>` : ''}
                  <button data-action="toggle-verify" data-id="${esc(w.id)}" data-val="${w.verified ? '0' : '1'}" class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50">${w.verified ? 'Unverify' : 'Verify'}</button>
                  <button data-action="set-status" data-id="${esc(w.id)}" data-val="${w.status === 'active' ? 'hidden' : 'active'}" class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50">${w.status === 'active' ? 'Hide' : 'Activate'}</button>
                  ${w.status !== 'suspended' ? `<button data-action="set-status" data-id="${esc(w.id)}" data-val="suspended" class="rounded-lg border border-amber-200 text-amber-800 px-2.5 py-1 text-xs font-semibold hover:bg-amber-50">Suspend</button>` : ''}
                  <button data-action="extend" data-id="${esc(w.id)}" class="rounded-lg border border-brand text-brand px-2.5 py-1 text-xs font-semibold hover:bg-brand-soft">+30 days</button>
                  <button data-action="del-worker" data-id="${esc(w.id)}" class="rounded-lg border border-red-200 text-red-700 px-2.5 py-1 text-xs font-semibold hover:bg-red-50">Delete</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${rows.length === 0 ? '<p class="py-6 text-center text-sm text-slate-500">No professionals match that search.</p>' : ''}
    </div>
  </div>`;
}

function feedbackTab() {
  return `
  <div class="bg-white rounded-3xl border border-slate-200 p-5">
    <h2 class="text-lg font-bold">Feedback moderation (${state.feedback.length})</h2>
    <div class="mt-4 grid gap-3">
      ${state.feedback.map((f) => {
        const tone = f.status === 'published' ? 'green' : f.status === 'hidden' ? 'amber' : 'red';
        return `<div class="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold">${esc(f.worker_name)}</span>
              ${badge(f.status, tone)}
              ${f.blaze ? badge('Blaze', 'amber') : ''}
              ${f.rating ? badge(`${f.rating} stars`) : ''}
            </div>
            <p class="mt-1 text-sm text-slate-700">${f.testimonial ? `“${esc(f.testimonial)}”` : '<span class="text-slate-400">No written testimonial</span>'}</p>
            <div class="mt-1 text-xs text-slate-500">By ${esc(f.client_name || 'Client')} · ${fmtDateTime(f.created_at)}</div>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            ${f.status !== 'published' ? `<button data-action="fb-status" data-id="${esc(f.id)}" data-val="published" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Publish</button>` : ''}
            ${f.status !== 'hidden' ? `<button data-action="fb-status" data-id="${esc(f.id)}" data-val="hidden" class="rounded-lg border border-amber-200 text-amber-800 px-3 py-1.5 text-xs font-semibold">Hide</button>` : ''}
            ${f.status !== 'removed' ? `<button data-action="fb-status" data-id="${esc(f.id)}" data-val="removed" class="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-semibold">Remove</button>` : ''}
          </div>
        </div>`;
      }).join('')}
      ${state.feedback.length === 0 ? '<p class="py-6 text-center text-sm text-slate-500">No feedback entries yet.</p>' : ''}
    </div>
  </div>`;
}

function reportsTab() {
  return `
  <div class="bg-white rounded-3xl border border-slate-200 p-5">
    <h2 class="text-lg font-bold">Profile reports (${state.reports.length})</h2>
    <div class="mt-4 grid gap-3">
      ${state.reports.map((r) => {
        const tone = r.status === 'open' ? 'red' : r.status === 'reviewed' ? 'green' : 'neutral';
        return `<div class="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold">${esc(r.worker_name)}</span>
              ${badge(r.status, tone)}
              <span class="text-xs text-slate-500">Worker is ${esc(r.worker_status)}</span>
            </div>
            <p class="mt-1 text-sm text-slate-700">${esc(r.reason)}</p>
            <div class="mt-1 text-xs text-slate-500">${r.reporter_contact ? 'Contact: ' + esc(r.reporter_contact) + ' · ' : ''}${fmtDateTime(r.created_at)}</div>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            ${r.status !== 'reviewed' ? `<button data-action="rep-status" data-id="${esc(r.id)}" data-val="reviewed" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Mark reviewed</button>` : ''}
            ${r.status !== 'dismissed' ? `<button data-action="rep-status" data-id="${esc(r.id)}" data-val="dismissed" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Dismiss</button>` : ''}
          </div>
        </div>`;
      }).join('')}
      ${state.reports.length === 0 ? '<p class="py-6 text-center text-sm text-slate-500">No reports submitted yet.</p>' : ''}
    </div>
  </div>`;
}

function paymentsTab() {
  return `
  <div class="bg-white rounded-3xl border border-slate-200 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-bold">Payments (${state.payments.length})</h2>
      <a href="/api/admin/payments.csv" class="rounded-xl bg-brand text-white text-sm font-bold px-4 py-2 hover:bg-brand-dark">Export CSV</a>
    </div>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-sm text-left">
        <thead><tr class="border-b border-slate-200 text-xs text-slate-500 uppercase">
          <th class="py-2 pr-4">Professional</th>
          <th class="py-2 pr-4">Amount</th>
          <th class="py-2 pr-4">Channel</th>
          <th class="py-2 pr-4">Reference</th>
          <th class="py-2">Paid at</th>
        </tr></thead>
        <tbody class="divide-y">
          ${state.payments.map((p) => `<tr>
            <td class="py-3 pr-4 font-semibold">${esc(p.worker_name || p.worker_id)}</td>
            <td class="py-3 pr-4">GH₵${(Number(p.amount_pesewas) / 100).toFixed(2)}</td>
            <td class="py-3 pr-4">${esc(p.channel)}</td>
            <td class="py-3 pr-4 text-xs text-slate-500">${esc(p.paystack_reference)}</td>
            <td class="py-3 text-xs text-slate-500">${fmtDateTime(p.paid_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${state.payments.length === 0 ? '<p class="py-6 text-center text-sm text-slate-500">No payments recorded yet.</p>' : ''}
    </div>
  </div>`;
}

function auditTab() {
  return `
  <div class="bg-white rounded-3xl border border-slate-200 p-5">
    <h2 class="text-lg font-bold">Admin audit log</h2>
    <div class="mt-4 grid gap-2">
      ${state.audit.map((a) => `<div class="rounded-xl bg-slate-50 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
        <div><span class="font-bold text-brand">${esc(a.action)}</span> · <span class="text-slate-600">${esc(a.target_type)} ${esc(a.target_id)}</span> <span class="text-xs text-slate-500">${esc(a.details)}</span></div>
        <span class="text-xs text-slate-400">${fmtDateTime(a.created_at)}</span>
      </div>`).join('')}
      ${state.audit.length === 0 ? '<p class="py-6 text-center text-sm text-slate-500">No admin actions recorded yet.</p>' : ''}
    </div>
  </div>`;
}

function dashboardView() {
  const o = state.overview || {};
  const cards = [
    ['Total pros', o.totalWorkers || 0],
    ['Active visible', o.activeWorkers || 0],
    ['In trial', o.trialWorkers || 0],
    ['Expired', o.expiredWorkers || 0],
    ['Month revenue', `GH₵${((o.paymentsThisMonthPesewas || 0) / 100).toFixed(0)}`],
    ['Open reports', o.openReports || 0],
  ];
  const tabs = [
    ['workers', 'Professionals'],
    ['feedback', 'Feedback'],
    ['reports', `Reports (${o.openReports || 0})`],
    ['payments', 'Payments'],
    ['audit', 'Audit log'],
  ];

  return `
  <main class="max-w-6xl mx-auto px-5 py-8 grid gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="text-2xl sm:text-3xl font-extrabold">Admin dashboard</h1><p class="text-sm text-slate-500">Manage verification, visibility, subscriptions, feedback, and reports.</p></div>
      <div class="flex flex-wrap gap-2">
        <button data-action="run-reminders" class="rounded-xl border border-brand text-brand font-bold px-4 py-2 text-sm hover:bg-brand-soft">Run daily reminders</button>
        <button data-action="refresh" class="rounded-xl border border-slate-300 bg-white font-semibold px-4 py-2 text-sm">Refresh</button>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      ${cards.map(([label, val]) => `<div class="bg-white rounded-2xl border border-slate-200 p-4"><div class="text-2xl font-extrabold text-brand">${esc(val)}</div><div class="text-xs text-slate-500 mt-0.5">${esc(label)}</div></div>`).join('')}
    </div>

    <div class="flex flex-wrap gap-2">
      ${tabs.map(([k, label]) => `<button data-action="tab" data-tab="${k}" class="rounded-xl px-4 py-2 text-sm font-bold border ${state.tab === k ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600'}">${esc(label)}</button>`).join('')}
    </div>

    ${state.tab === 'workers' ? workersTab()
      : state.tab === 'feedback' ? feedbackTab()
      : state.tab === 'reports' ? reportsTab()
      : state.tab === 'payments' ? paymentsTab()
      : auditTab()}
  </main>`;
}

function render() {
  const hdr = `
  <header class="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
      <a href="/" class="flex items-center gap-2 font-extrabold text-lg text-brand"><img src="logo-icon.png" alt="" class="w-9 h-9 object-contain" onerror="this.style.display='none'">ProConnect Admin</a>
      <div class="flex items-center gap-4">
        <a href="/" class="text-sm font-semibold text-slate-600 hover:text-brand">Back to site</a>
        ${state.authenticated ? '<button data-action="logout" class="text-sm font-semibold text-brand hover:underline">Sign out</button>' : ''}
      </div>
    </div>
  </header>`;

  let body = '<p class="text-center py-12 text-slate-500">Loading…</p>';
  if (!state.loading) {
    body = state.authenticated ? dashboardView() : authView();
  }
  $('#admin-app').innerHTML = hdr + body;
}

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const kind = e.target.dataset.form;
  const f = Object.fromEntries(new FormData(e.target));
  state.authError = '';
  state.busy = true;
  render();

  try {
    if (kind === 'bootstrap') {
      if (f.passcode !== f.confirm) throw new Error('Passwords do not match.');
      await api('/bootstrap', { method: 'POST', body: { passcode: f.passcode } });
      state.authenticated = true;
      state.needsBootstrap = false;
      await loadAllData();
      toast('Admin password set.');
    } else if (kind === 'login') {
      await api('/login', { method: 'POST', body: { passcode: f.passcode } });
      state.authenticated = true;
      await loadAllData();
      toast('Signed in.');
    }
  } catch (err) {
    state.authError = err.message;
  }
  state.busy = false;
  render();
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const d = el.dataset;
  try {
    if (d.action === 'tab') {
      state.tab = d.tab;
      render();
    } else if (d.action === 'refresh') {
      await loadAllData();
      toast('Refreshed.');
      render();
    } else if (d.action === 'logout') {
      await api('/logout', { method: 'POST' });
      state.authenticated = false;
      render();
    } else if (d.action === 'toggle-verify') {
      await api(`/workers/${encodeURIComponent(d.id)}`, { method: 'PATCH', body: { verified: d.val === '1' } });
      await loadAllData();
      toast('Verification updated.');
      render();
    } else if (d.action === 'set-status') {
      await api(`/workers/${encodeURIComponent(d.id)}`, { method: 'PATCH', body: { status: d.val } });
      await loadAllData();
      toast('Worker status updated.');
      render();
    } else if (d.action === 'extend') {
      await api(`/workers/${encodeURIComponent(d.id)}/extend`, { method: 'POST', body: { days: 30 } });
      await loadAllData();
      toast('Extended by 30 days.');
      render();
    } else if (d.action === 'del-worker') {
      await api(`/workers/${encodeURIComponent(d.id)}`, { method: 'DELETE' });
      await loadAllData();
      toast('Worker deleted.');
      render();
    } else if (d.action === 'fb-status') {
      await api(`/feedback/${encodeURIComponent(d.id)}`, { method: 'PATCH', body: { status: d.val } });
      await loadAllData();
      toast('Feedback updated.');
      render();
    } else if (d.action === 'rep-status') {
      await api(`/reports/${encodeURIComponent(d.id)}`, { method: 'PATCH', body: { status: d.val } });
      await loadAllData();
      toast('Report updated.');
      render();
    } else if (d.action === 'run-reminders') {
      const res = await api('/reminders/run', { method: 'POST' });
      await loadAllData();
      toast(`Checked ${res.checked} workers; sent ${res.sentCount} reminders.`);
      render();
    }
  } catch (err) {
    toast(err.message);
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.field === 'workerFilter') {
    state.workerFilter = e.target.value;
    render();
  }
});

let searchTimer;
document.addEventListener('input', (e) => {
  if (e.target.dataset && e.target.dataset.field === 'workerQuery') {
    state.workerQuery = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        const res = await api('/workers?q=' + encodeURIComponent(state.workerQuery));
        state.workers = res.items || [];
        render();
      } catch {}
    }, 180);
  }
});

init();
