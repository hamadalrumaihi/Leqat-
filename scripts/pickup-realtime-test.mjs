// Two-browser realtime pickup test (deferred from Phase 2).
// Proves the full loop through the real app UI:
//   parent taps "أنا عند البوابة"  →  supervisor queue gains a row live
//   supervisor taps "تم التسليم"   →  parent view flips to released live
// Requires: local stack + seeded session dated today on gsup's group.
import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:3000';

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('كلمة المرور'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', 'Leqat@2025');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  if (!page.url().includes('/dashboard')) throw new Error(`login failed for ${email}`);
}

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

const supCtx = await browser.createBrowserContext();
const parCtx = await browser.createBrowserContext();
const sup = await supCtx.newPage();
const par = await parCtx.newPage();
await sup.setViewport({ width: 768, height: 1024 });
await par.setViewport({ width: 375, height: 812 });

const supCdp = await sup.createCDPSession();
await supCdp.send('Network.enable');
const supFrames = [];
supCdp.on('Network.webSocketFrameReceived', ({ response }) => supFrames.push(['RECV', response.payloadData]));
supCdp.on('Network.webSocketFrameSent', ({ response }) => supFrames.push(['SENT', response.payloadData]));
sup.on('console', (m) => { if (m.type() === 'error') console.log('SUP CONSOLE:', m.text().slice(0, 200)); });
await login(sup, 'gsup@leqat.qa');
await login(par, 'parent@leqat.qa');

// Supervisor opens the queue FIRST so the subscription is live before
// the parent taps.
await sup.goto(`${BASE}/dashboard/pickup`, { waitUntil: 'networkidle0' });
let subOk = false;
for (let i = 0; i < 40 && !subOk; i++) {
  await new Promise((r) => setTimeout(r, 250));
  subOk = supFrames.some(([, d]) => String(d).includes('Subscribed to PostgreSQL'));
}
console.log('0. supervisor postgres_changes subscribed:', subOk ? 'OK' : 'NOT CONFIRMED');
const emptyQueue = await sup.evaluate(() => document.body.innerText.includes('لا أحد في الانتظار'));
console.log('1. supervisor queue starts empty:', emptyQueue ? 'OK' : 'FAIL');

await par.goto(`${BASE}/dashboard/pickup`, { waitUntil: 'networkidle0' });
const hasButton = await par.evaluate(() => document.body.innerText.includes('أنا عند البوابة'));
console.log('2. parent sees gate button:', hasButton ? 'OK' : 'FAIL — ' + (await par.evaluate(() => document.body.innerText.slice(0, 200))));
if (!hasButton) process.exit(1);

// Parent taps the gate button.
const t0 = Date.now();
await par.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent.includes('أنا عند البوابة'));
  btn.click();
});

// Supervisor queue must gain a row WITHOUT any reload.
let arrived = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 250));
  arrived = await sup.evaluate(() => document.body.innerText.includes('تم التسليم'));
  if (arrived) break;
}
console.log(`3. supervisor queue updated live: ${arrived ? `OK (${Date.now() - t0}ms)` : 'FAIL'}`);
if (!arrived) for (const [dir, d] of supFrames.slice(-8)) console.log('  SUPFRAME', dir, String(d).slice(0, 220));
await sup.screenshot({ path: '/tmp/ui-audit/realtime-supervisor-queue.png' });

// Parent should now be in the waiting state.
const waiting = await par.evaluate(() => document.body.innerText.includes('في الانتظار'));
console.log('4. parent in waiting state:', waiting ? 'OK' : 'FAIL');
await par.screenshot({ path: '/tmp/ui-audit/realtime-parent-waiting.png' });

// Supervisor releases → parent must flip to released live (filtered
// UPDATE event — the REPLICA IDENTITY FULL path from 0012).
if (arrived) {
  const t1 = Date.now();
  await sup.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.trim() === 'تم التسليم');
    btn.click();
  });
  let released = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    released = await par.evaluate(() => document.body.innerText.includes('تم تسليم الطفل'));
    if (released) break;
  }
  console.log(`5. parent released live: ${released ? `OK (${Date.now() - t1}ms)` : 'FAIL'}`);
  await par.screenshot({ path: '/tmp/ui-audit/realtime-parent-released.png' });
}

await browser.close();
