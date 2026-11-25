const express = require('express');
const { getPlanConfig, computeSubscriptionStatus } = require('../rules');
const { generateToken, verifyPaystackSignature } = require('../security');
const { requireUser } = require('../middleware');
const {
  isPaystackConfigured,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  processVerifiedPayment,
} = require('../paystack');

function createBillingRouter(db) {
  const meBillingRouter = express.Router();

  meBillingRouter.get('/', requireUser, (req, res) => {
    const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) return res.json(null);

    const sub = db.prepare('SELECT * FROM subscriptions WHERE worker_id = ?').get(worker.id);
    const statusObj = computeSubscriptionStatus(sub, new Date());
    const payments = db.prepare(`
      SELECT id, amount_pesewas, currency, paystack_reference, channel, status, paid_at, period_start, period_end
      FROM payments
      WHERE worker_id = ?
      ORDER BY paid_at DESC
      LIMIT 12
    `).all(worker.id);

    res.json({
      ...statusObj,
      payments,
    });
  });

  meBillingRouter.post('/checkout', requireUser, async (req, res) => {
    if (!isPaystackConfigured()) {
      return res.status(503).json({
        error: 'Paystack payments are not configured yet. Please add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY.',
      });
    }

    const worker = db.prepare('SELECT id, name FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Create your worker profile first before paying for a subscription.' });
    }

    const { pricePesewas } = getPlanConfig();
    const reference = 'pc_' + generateToken(14);
    const siteUrl = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    try {
      const data = await initializePaystackTransaction({
        email: req.user.email,
        amountPesewas: pricePesewas,
        reference,
        metadata: {
          worker_id: worker.id,
          user_id: req.user.id,
          purpose: 'month',
        },
        callbackUrl: `${siteUrl}/`,
      });

      res.json({
        access_code: data.access_code,
        reference: data.reference || reference,
        authorization_url: data.authorization_url,
        public_key: process.env.PAYSTACK_PUBLIC_KEY,
        email: req.user.email,
        amount: pricePesewas,
      });
    } catch (err) {
      res.status(502).json({ error: err.message || 'Unable to start Paystack checkout.' });
    }
  });

  meBillingRouter.get('/verify/:reference', requireUser, async (req, res) => {
    if (!isPaystackConfigured()) {
      return res.status(503).json({ error: 'Paystack is not configured.' });
    }

    const worker = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(req.user.id);
    if (!worker) {
      return res.status(400).json({ error: 'Worker profile not found.' });
    }

    const reference = String(req.params.reference || '').trim();
    if (!reference) return res.status(400).json({ error: 'Missing payment reference.' });

    try {
      const tx = await verifyPaystackTransaction(reference);
      if (tx.status !== 'success') {
        return res.json({ confirmed: false, txStatus: tx.status });
      }
      if (tx.metadata?.worker_id !== worker.id) {
        return res.status(403).json({ error: 'This payment does not belong to your account.' });
      }

      const result = processVerifiedPayment(db, {
        reference: tx.reference,
        amountPesewas: tx.amount,
        currency: tx.currency,
        channel: tx.channel,
        paidAt: tx.paid_at || new Date().toISOString(),
        workerId: worker.id,
        rawEvent: tx,
      });

      res.json({ confirmed: true, subscription: result.subscription });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Could not confirm payment yet.' });
    }
  });

  async function paystackWebhookHandler(req, res) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return res.status(503).json({ error: 'Paystack secret key not configured.' });
    }

    const sig = req.headers['x-paystack-signature'];
    if (!verifyPaystackSignature(req.body, sig, secretKey)) {
      return res.status(401).json({ error: 'Invalid Paystack signature.' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    if (event.event !== 'charge.success' || !event.data?.reference) {
      return res.json({ received: true });
    }

    try {
      const tx = await verifyPaystackTransaction(event.data.reference);
      const workerId = tx.metadata?.worker_id;
      if (tx.status === 'success' && workerId) {
        processVerifiedPayment(db, {
          reference: tx.reference,
          amountPesewas: tx.amount,
          currency: tx.currency,
          channel: tx.channel,
          paidAt: tx.paid_at || new Date().toISOString(),
          workerId,
          rawEvent: event,
        });
      }
      res.json({ received: true });
    } catch (err) {
      res.status(400).json({ error: err.message || 'Webhook verification failed.' });
    }
  }

  return { meBillingRouter, paystackWebhookHandler };
}

module.exports = { createBillingRouter };
