const DAY_MS = 24 * 60 * 60 * 1000;

function getPlanConfig(env = process.env) {
  const pricePesewas = Math.max(100, Number.parseInt(env.PLAN_PRICE_PESEWAS || '2000', 10) || 2000);
  const trialDays = Math.max(1, Number.parseInt(env.TRIAL_DAYS || '30', 10) || 30);
  const retentionDays = Math.max(7, Number.parseInt(env.RETENTION_DAYS || '90', 10) || 90);
  return {
    pricePesewas,
    priceGhs: Math.round(pricePesewas / 100),
    trialDays,
    retentionDays,
  };
}

function normalizePhoneDigits(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 9) {
    digits = '233' + digits.slice(1);
  }
  return digits;
}

function computeSubscriptionStatus(sub, now = new Date()) {
  if (!sub) return null;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const trialMs = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
  const paidMs = sub.paid_until ? new Date(sub.paid_until).getTime() : 0;

  let status = 'expired';
  if (nowMs < trialMs) {
    status = 'trial';
  } else if (nowMs < paidMs) {
    status = 'active';
  }

  return {
    status,
    endsAt: sub.paid_until || sub.trial_ends_at,
    trialEndsAt: sub.trial_ends_at,
    paidUntil: sub.paid_until,
  };
}

function isWorkerVisible(worker, sub, now = new Date()) {
  if (!worker || worker.status !== 'active') return false;
  const billing = computeSubscriptionStatus(sub, now);
  return Boolean(billing && billing.status !== 'expired');
}

function computeExtendedPaidUntil(currentPaidUntil, now = new Date(), days = 30) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const curMs = currentPaidUntil ? new Date(currentPaidUntil).getTime() : 0;
  const baseMs = Math.max(nowMs, Number.isFinite(curMs) ? curMs : 0);
  return new Date(baseMs + days * DAY_MS).toISOString();
}

function cleanPlainText(val, maxLen) {
  const s = String(val ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return typeof maxLen === 'number' ? s.slice(0, maxLen) : s;
}

function validateSignupInput(body) {
  const name = cleanPlainText(body?.name, 80);
  const phone = cleanPlainText(body?.phone, 25);
  const email = cleanPlainText(body?.email, 160).toLowerCase();
  const password = String(body?.password ?? '');
  const agree = body?.agree === true || body?.agree === 'true' || body?.agree === 'on' || body?.agree === 1;

  if (!agree) return { error: 'Please agree to the Terms of Service to create an account.' };
  if (name.length < 2) return { error: 'Please enter your full name (at least 2 characters).' };
  if (phone.replace(/\D/g, '').length < 9) return { error: 'Please enter a valid phone or WhatsApp number.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' };
  if (password.length < 6 || password.length > 128) return { error: 'Password must be between 6 and 128 characters.' };

  return { data: { name, phone, email, password } };
}

const VALID_AVAILABILITIES = ['available', 'busy', 'appointment'];
const VALID_DOC_TYPES = ['Ghana Card', 'Business Registration', 'Trade Certificate'];

function validateWorkerInput(body) {
  const type = body?.type === 'Business' ? 'Business' : body?.type === 'Personal' ? 'Personal' : null;
  if (!type) return { error: 'Profile type must be Personal or Business.' };

  const name = cleanPlainText(body?.name);
  if (name.length < 2 || name.length > 80) {
    return { error: 'Name must be between 2 and 80 characters.' };
  }

  const category = cleanPlainText(body?.category);
  if (category.length < 2 || category.length > 40) {
    return { error: 'Category must be between 2 and 40 characters.' };
  }

  const area = cleanPlainText(body?.area);
  if (area.length < 2 || area.length > 80) {
    return { error: 'Service area must be between 2 and 80 characters.' };
  }

  const phone = cleanPlainText(body?.phone);
  const digits = phone.replace(/\D/g, '');
  if (phone.length < 9 || phone.length > 20 || digits.length < 9) {
    return { error: 'WhatsApp number must be between 9 and 20 characters.' };
  }

  const yearsRaw = body?.years === '' || body?.years === null || body?.years === undefined ? NaN : Number(body.years);
  if (!Number.isInteger(yearsRaw) || yearsRaw < 0 || yearsRaw > 70) {
    return { error: 'Years of experience must be a whole number between 0 and 70.' };
  }

  const bio = cleanPlainText(body?.bio);
  if (bio.length > 600) {
    return { error: 'Bio cannot exceed 600 characters.' };
  }

  const rawAvail = cleanPlainText(body?.availability || 'available', 20).toLowerCase();
  const availability = VALID_AVAILABILITIES.includes(rawAvail) ? rawAvail : 'available';
  const availabilityNote = cleanPlainText(body?.availabilityNote, 40);
  const rateNote = cleanPlainText(body?.rateNote, 60);

  return {
    data: {
      type,
      name,
      category,
      area,
      phone,
      years: yearsRaw,
      bio,
      availability,
      availabilityNote,
      rateNote,
    },
  };
}

function validateAvailabilityPatch(body) {
  const rawAvail = cleanPlainText(body?.availability, 20).toLowerCase();
  if (!VALID_AVAILABILITIES.includes(rawAvail)) {
    return { error: 'Availability must be available, busy, or appointment.' };
  }
  const availabilityNote = cleanPlainText(body?.availabilityNote, 40);
  return {
    data: {
      availability: rawAvail,
      availabilityNote,
    },
  };
}

function slugifyWorkerBase(name, area = '', fallbackId = '') {
  const cleanName = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const firstCity = String(area || '')
    .split(/[,/–-]+/)[0]
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let base = cleanName;
  if (base && firstCity && !base.includes(firstCity) && base.length < 18) {
    base = `${base}-${firstCity}`;
  }
  base = base.replace(/-+/g, '-').slice(0, 56).replace(/-+$/g, '');
  if (base.length >= 2) return base;
  const fb = String(fallbackId || 'pro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return fb || 'pro';
}

function formatRelativeFreshness(isoString, now = new Date()) {
  if (!isoString) return '';
  const ts = new Date(isoString).getTime();
  if (!Number.isFinite(ts)) return '';
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const diffMs = Math.max(0, nowMs - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return 'Active just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return 'Active today';
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days}d ago`;
  if (days <= 30) return 'Active this month';
  return '';
}

function buildAnalyticsSummary(events = [], now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  const since7d = nowMs - 7 * DAY_MS;
  const since30d = nowMs - 30 * DAY_MS;

  const dayBuckets = new Map();
  const dailySeries = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(nowMs - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const entry = {
      date: key,
      label: i === 0 ? 'Today' : weekdayNames[d.getUTCDay()],
      views: 0,
      waClicks: 0,
    };
    dayBuckets.set(key, entry);
    dailySeries.push(entry);
  }

  let totalViews = 0;
  let totalWaClicks = 0;
  let views7d = 0;
  let waClicks7d = 0;
  let views30d = 0;
  let waClicks30d = 0;

  for (const e of events) {
    if (!e || !e.created_at) continue;
    const ts = new Date(e.created_at).getTime();
    if (!Number.isFinite(ts)) continue;
    const dayKey = String(e.created_at).slice(0, 10);
    const bucket = dayBuckets.get(dayKey);

    if (e.event_type === 'view') {
      totalViews += 1;
      if (ts >= since7d) views7d += 1;
      if (ts >= since30d) views30d += 1;
      if (bucket) bucket.views += 1;
    } else if (e.event_type === 'wa_click') {
      totalWaClicks += 1;
      if (ts >= since7d) waClicks7d += 1;
      if (ts >= since30d) waClicks30d += 1;
      if (bucket) bucket.waClicks += 1;
    }
  }

  const conversionRate = views30d > 0
    ? Math.min(100, Math.round((waClicks30d / views30d) * 100))
    : 0;

  return {
    totalViews,
    totalWaClicks,
    views7d,
    waClicks7d,
    views30d,
    waClicks30d,
    conversionRate,
    dailySeries,
  };
}

function isValidClientPassCode(raw) {
  return /^USER\d{4,6}$/.test(String(raw || '').trim().toUpperCase());
}

function normalizeClientPassCode(raw) {
  const up = String(raw || '').trim().toUpperCase();
  return /^USER\d{4,6}$/.test(up) ? up : '';
}

function validateClientPassPin(pin) {
  const s = String(pin ?? '').trim();
  if (!/^\d{4,8}$/.test(s)) {
    return { error: 'Sync PIN must be 4 to 8 digits.' };
  }
  return { data: s };
}

function validateVerificationRequest(body) {
  const docType = cleanPlainText(body?.docType, 40);
  if (!VALID_DOC_TYPES.includes(docType)) {
    return { error: 'Document type must be Ghana Card, Business Registration, or Trade Certificate.' };
  }
  const docRef = cleanPlainText(body?.docRef, 40);
  if (docRef && docRef.length < 3) {
    return { error: 'Reference number must be at least 3 characters if provided.' };
  }
  const notes = cleanPlainText(body?.notes, 300);
  return { data: { docType, docRef, notes } };
}

function computeProfileStrength(worker, stats = {}) {
  const bioLen = String(worker?.bio || '').trim().length;
  const portfolioCount = Number(stats.portfolioCount ?? worker?.portfolio?.length ?? 0);
  const inviteCount = Number(stats.inviteCount ?? 0);
  const hasPhoto = Boolean(worker?.photo || worker?.photo_url);
  const hasRate = Boolean(String(worker?.rateNote ?? worker?.rate_note ?? '').trim());
  const isVerifiedOrInvited = Boolean(worker?.verified) || inviteCount > 0;

  const items = [
    { key: 'photo', label: 'Add a profile photo', done: hasPhoto },
    { key: 'bio', label: 'Write a detailed bio (30+ chars)', done: bioLen >= 30 },
    { key: 'portfolio', label: 'Upload at least 3 work photos', done: portfolioCount >= 3 },
    { key: 'rate', label: 'Add a starting fee or quote note', done: hasRate },
    { key: 'trust', label: 'Request verification or send 1st review link', done: isVerifiedOrInvited },
  ];
  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const score = Math.round((completedCount / totalCount) * 100);
  return { score, completedCount, totalCount, items };
}

function validateFeedbackInput(body) {
  const blaze = Boolean(body?.blaze);
  const rawRating = body?.rating === null || body?.rating === undefined || body?.rating === '' ? 0 : Number(body.rating);
  if (!Number.isInteger(rawRating) || rawRating < 0 || rawRating > 5) {
    return { error: 'Rating must be between 1 and 5 stars.' };
  }
  const rating = rawRating === 0 ? null : rawRating;

  const testimonialRaw = cleanPlainText(body?.testimonial);
  if (testimonialRaw.length > 400) {
    return { error: 'Testimonial cannot exceed 400 characters.' };
  }
  const testimonial = testimonialRaw.length > 0 ? testimonialRaw : null;

  const clientName = cleanPlainText(body?.name, 30) || 'A client';

  if (!blaze && rating === null && testimonial === null) {
    return { error: 'Please give a Blaze, choose a star rating, or write a testimonial.' };
  }

  return {
    data: {
      blaze,
      rating,
      testimonial,
      clientName,
    },
  };
}

function formatMonthYear(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function neutralizeCsvCell(value) {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? "'" + str : str;
  return '"' + safe.replace(/"/g, '""') + '"';
}

module.exports = {
  DAY_MS,
  VALID_AVAILABILITIES,
  VALID_DOC_TYPES,
  getPlanConfig,
  normalizePhoneDigits,
  computeSubscriptionStatus,
  isWorkerVisible,
  computeExtendedPaidUntil,
  cleanPlainText,
  validateSignupInput,
  validateWorkerInput,
  validateAvailabilityPatch,
  slugifyWorkerBase,
  formatRelativeFreshness,
  buildAnalyticsSummary,
  isValidClientPassCode,
  normalizeClientPassCode,
  validateClientPassPin,
  validateVerificationRequest,
  computeProfileStrength,
  validateFeedbackInput,
  formatMonthYear,
  neutralizeCsvCell,
};
