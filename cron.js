// Wrapper that starts Next.js standalone server + auto-sync cron
const { fork } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET || '';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TOURNAMENT_START = new Date('2026-06-11T12:00:00Z');
const TOURNAMENT_END   = new Date('2026-07-20T00:00:00Z');

// Start the Next.js standalone server as a child process
const server = fork(path.join(__dirname, 'server.js'), [], {
  stdio: 'inherit',
  env: process.env,
});
server.on('exit', code => process.exit(code ?? 1));

// Wait for server to be ready, then start cron
setTimeout(startCron, 20000);

function startCron() {
  console.log('[cron] Auto-sync activado — cada 5 minutos');
  runSync();
  setInterval(runSync, INTERVAL_MS);
}

async function runSync() {
  const now = new Date();
  if (now < TOURNAMENT_START || now > TOURNAMENT_END) return;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (CRON_SECRET) headers['Authorization'] = `Bearer ${CRON_SECRET}`;

    const res = await fetch(`http://localhost:${PORT}/api/cron/sync`, { headers });
    const data = await res.json();
    if (data.skipped) return;
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[cron ${ts}] ${data.matchesUpdated ?? 0} partidos actualizados`);
  } catch (err) {
    console.error('[cron] Error:', err.message);
  }
}
