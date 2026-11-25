const { openDatabase, UPLOADS_DIR } = require('./server/db');
const { createApp } = require('./server/app');
const { runDailyRemindersJob } = require('./server/notifications');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const db = openDatabase();
const app = createApp({
  db,
  uploadsDir: UPLOADS_DIR,
  staticDir: __dirname,
});

// Run daily subscription reminders & expiry job once on boot and every 24h
runDailyRemindersJob(db).catch((err) => {
  console.warn('Initial reminder job skipped:', err && err.message ? err.message : err);
});
setInterval(() => {
  runDailyRemindersJob(db).catch(() => {});
}, 24 * 60 * 60 * 1000).unref();

app.listen(PORT, HOST, () => {
  console.log(`ProConnect server listening on http://${HOST}:${PORT}`);
});
