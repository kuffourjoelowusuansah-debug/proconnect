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
      rateNote,
    },
  };
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
  validateVerificationRequest,
  computeProfileStrength,
  validateFeedbackInput,
  formatMonthYear,
  neutralizeCsvCell,
};
