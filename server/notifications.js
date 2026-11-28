const { DAY_MS, getPlanConfig } = require('./rules');
const { ensureStore } = require('./store');

async function sendEmailViaResend({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Nkabom <no-reply@nkabom.local>';
  if (!apiKey || !to) return false;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  return resp.ok;
}

async function sendSmsViaArkesel({ to, message }) {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.SMS_SENDER_ID || 'Nkabom';
  if (!apiKey || !to) return false;

  const resp = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sender, message, recipients: [to] }),
  });
  return resp.ok;
}

async function sendNotification(dbOrStore, { workerId, type, channel, recipient, subject, message }) {
  const store = ensureStore(dbOrStore);
  const already = await store.hasNotificationLog({ workerId, type, channel });
  if (already) return false;

  if (channel === 'email') {
    await sendEmailViaResend({ to: recipient, subject: subject || 'Nkabom update', text: message }).catch(() => false);
  } else if (channel === 'sms') {
    await sendSmsViaArkesel({ to: recipient, message }).catch(() => false);
  }

  await store.insertNotificationLog({
    workerId,
    type,
    channel,
    recipient,
    message,
    sentAt: new Date().toISOString(),
  });

  return true;
}

async function runRetentionCleanup(dbOrStore, now = new Date()) {
  const store = ensureStore(dbOrStore);
  const { retentionDays } = getPlanConfig();
  const nowIso = now.toISOString();
  const resetCutoff = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const inviteCutoff = new Date(now.getTime() - retentionDays * DAY_MS).toISOString();
  const notifCutoff = new Date(now.getTime() - 180 * DAY_MS).toISOString();

  return store.purgeRetentionData({ nowIso, resetCutoff, inviteCutoff, notifCutoff });
}

async function runDailyRemindersJob(dbOrStore, now = new Date()) {
  const store = ensureStore(dbOrStore);
  const { priceGhs } = getPlanConfig();
  const nowMs = now.getTime();
  const rows = await store.listActiveWorkersForReminders();

  let sentCount = 0;
  for (const row of rows) {
    const endMs = new Date(row.paid_until).getTime();
    if (!Number.isFinite(endMs)) continue;
    const diffDays = Math.ceil((endMs - nowMs) / DAY_MS);
    const periodTag = row.paid_until.slice(0, 10);
    const dateLabel = new Date(endMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

    let milestone = null;
    let message = null;

    if (diffDays === 5) {
      milestone = `reminder_5d_${periodTag}`;
      message = `Hi ${row.name}, your Nkabom profile stays live until ${dateLabel}. Pay GH₵${priceGhs} in your account to add another month.`;
    } else if (diffDays === 2) {
      milestone = `reminder_2d_${periodTag}`;
      message = `Hi ${row.name}, 2 days left on your Nkabom profile (ends ${dateLabel}). Pay GH₵${priceGhs} in your account to keep showing in search.`;
    } else if (diffDays === 0) {
      milestone = `reminder_0d_${periodTag}`;
      message = `Hi ${row.name}, your Nkabom period ends today (${dateLabel}). Pay GH₵${priceGhs} in your account to stay visible.`;
    } else if (diffDays === -1) {
      milestone = `expired_1d_${periodTag}`;
      message = `Hi ${row.name}, your Nkabom profile is now hidden from search. Pay GH₵${priceGhs} in your account anytime to show it again.`;
    }

    if (!milestone) continue;

    if (row.email) {
      const sent = await sendNotification(store, {
        workerId: row.worker_id,
        type: milestone,
        channel: 'email',
        recipient: row.email,
        subject: 'Nkabom profile reminder',
        message,
      });
      if (sent) sentCount += 1;
    }
    if (row.phone) {
      const sent = await sendNotification(store, {
        workerId: row.worker_id,
        type: milestone,
        channel: 'sms',
        recipient: row.phone,
        message,
      });
      if (sent) sentCount += 1;
    }
  }

  const cleanup = await runRetentionCleanup(store, now);
  return { checked: rows.length, sentCount, cleanup };
}

module.exports = {
  sendNotification,
  runRetentionCleanup,
  runDailyRemindersJob,
};
