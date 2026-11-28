const { ensureStore } = require('./store');
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

async function processVerifiedPayment(dbOrStore, { reference, amountPesewas, currency, channel, paidAt, workerId, rawEvent }) {
  const store = ensureStore(dbOrStore);
  const res = await store.processVerifiedPayment({
    reference,
    amountPesewas,
    currency,
    channel,
    paidAt,
    workerId,
    rawEvent,
  });

  if (!res.alreadyProcessed && res.worker && res.periodEnd) {
    const dateLabel = new Date(res.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    await sendNotification(store, {
      workerId,
      type: `receipt_${reference}`,
      channel: 'email',
      recipient: res.worker.email,
      subject: 'Nkabom payment receipt',
      message: `Hi ${res.worker.name}, we received your payment of GH₵${Math.round(amountPesewas / 100)}. Your Nkabom profile is live until ${dateLabel}.`,
    }).catch(() => {});
  }

  return {
    alreadyProcessed: res.alreadyProcessed,
    subscription: res.subscription,
  };
}

module.exports = {
  isPaystackConfigured,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  processVerifiedPayment,
};
