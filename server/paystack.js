const crypto = require('crypto');
const {
  getPlanConfig,
  computeExtendedPaidUntil,
  computeSubscriptionStatus,
} = require('./rules');
const { sendNotification } = require('./notifications');

function isPaystackConfigured(env = process.env) {
  return Boolean(env.PAYSTACK_SECRET_KEY && env.PAYSTACK_PUBLIC_KEY);
}

async function initializePaystackTransaction({ email, amountPesewas, reference, metadata, callbackUrl }) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Paystack is not configured yet.');
  }

  const resp = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountPesewas,
      currency: 'GHS',
      reference,
      metadata,
      callback_url: callbackUrl,
      channels: ['mobile_money', 'card'],
    }),
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || 'Unable to start Paystack payment.');
  }
  return payload.data;
}

async function verifyPaystackTransaction(reference) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Paystack is not configured yet.');
  }

  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || 'Could not verify Paystack transaction.');
  }
  return payload.data;
}

function processVerifiedPayment(db, { reference, amountPesewas, currency, channel, paidAt, workerId, rawEvent }) {
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

    const payId = 'pay_' + crypto.randomBytes(8).toString('hex');
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

    const dateLabel = new Date(periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    sendNotification(db, {
      workerId,
      type: `receipt_${reference}`,
      channel: 'email',
      recipient: worker.email,
      subject: 'ProConnect payment receipt',
      message: `Hi ${worker.name}, we received your payment of GH₵${Math.round(amountPesewas / 100)}. Your ProConnect profile is live until ${dateLabel}.`,
    }).catch(() => {});

    return {
      alreadyProcessed: false,
      subscription: computeSubscriptionStatus(updatedSub, now),
    };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

module.exports = {
  isPaystackConfigured,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  processVerifiedPayment,
};
