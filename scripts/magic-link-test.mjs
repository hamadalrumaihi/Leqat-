// Magic-link login, end to end through the real stack:
//   login page (magic tab) → GoTrue sends mail → mail catcher →
//   follow the action link → session cookie → /dashboard.
import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:3000';
const MAIL = 'http://127.0.0.1:54324';
const EMAIL = 'parent@leqat.qa';

// start from an empty mailbox so we read OUR message
await fetch(`${MAIL}/api/v1/messages`, { method: 'DELETE' }).catch(() => {});

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812 });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
// magic tab is the default; fill and submit
await page.type('#ml-email', EMAIL);
await page.click('button[type="submit"]');
let sent = false;
for (let i = 0; i < 30 && !sent; i++) {
  await new Promise((r) => setTimeout(r, 300));
  sent = await page.evaluate(() => document.body.innerText.includes('تحقّق من بريدك'));
}
console.log('1. UI confirms send:', sent ? 'OK' : 'FAIL — ' + (await page.evaluate(() => document.body.innerText.slice(0, 300))));

// fetch the message from the mail catcher
let link = null;
for (let i = 0; i < 30 && !link; i++) {
  await new Promise((r) => setTimeout(r, 500));
  const list = await (await fetch(`${MAIL}/api/v1/messages`)).json();
  const msg = (list.messages ?? [])[0];
  if (!msg) continue;
  const full = await (await fetch(`${MAIL}/api/v1/message/${msg.ID}`)).json();
  const body = (full.HTML || full.Text || '');
  const m = body.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]+/);
  if (m) link = m[0].replace(/&amp;/g, '&');
}
console.log('2. email received with action link:', link ? 'OK' : 'FAIL');
console.log('   LINK:', link);
if (!link) process.exit(1);

await page.goto(link, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));
const url = page.url();
console.log('3. link lands on:', url);
console.log('   cookies:', (await page.cookies()).map((c) => c.name + '@' + c.domain).join(' '));

// the session must now be real: /dashboard reachable, role sidebar present
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0' });
const onDash = page.url().includes('/dashboard') && !page.url().includes('/login');
const roleShown = await page.evaluate(() => document.body.innerText.includes('ولي أمر'));
console.log('4. authenticated dashboard:', onDash ? 'OK' : 'FAIL — ' + page.url());
console.log('5. parent role label rendered:', roleShown ? 'OK' : 'FAIL');
await page.screenshot({ path: '/tmp/ui-audit/magic-link-dashboard.png' });
await browser.close();
