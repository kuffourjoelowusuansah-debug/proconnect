const express = require('express');
const path = require('path');
const { UPLOADS_DIR, VERIFICATIONS_DIR } = require('./server/db');
const { createStore } = require('./server/store');
const { createApp } = require('./server/app');
const { runDailyRemindersJob } = require('./server/notifications');

const store = createStore({
  uploadsDir: UPLOADS_DIR,
  verificationsDir: VERIFICATIONS_DIR,
});

const app = createApp({
  store,
  uploadsDir: UPLOADS_DIR,
  verificationsDir: VERIFICATIONS_DIR,
  staticDir: __dirname,
});

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  runDailyRemindersJob(store).catch((err) => {
    console.warn('Initial reminder job skipped:', err && err.message ? err.message : err);
  });
  setInterval(() => {
    runDailyRemindersJob(store).catch(() => {});
  }, 24 * 60 * 60 * 1000).unref();

  app.listen(PORT, HOST, () => {
    console.log(`Nkabom server (${store.mode} store) listening on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
