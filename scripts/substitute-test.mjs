// Substitute magic-link flow, end to end:
//   supervisor creates a time-boxed link on /dashboard/substitute →
//   an UNAUTHENTICATED browser opens it → session plan + roster render
//   (token-gated read-only view) → a tampered token is rejected.
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
const staffCtx = await browser.createBrowserContext();
const staff = await staffCtx.newPage();
await login(staff, 'gsup@leqat.qa');

await staff.goto(`${BASE}/dashboard/substitute`, { waitUntil: 'networkidle0' });
const pageText = await staff.evaluate(() => document.body.innerText.slice(0, 400));
// click the generate button
const clicked = await staff.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /رابط|إنشاء/.test(b.textContent));
  if (btn) { btn.click(); return btn.textContent.trim(); }
  return null;
});
console.log('1. generate button:', clicked ?? 'NOT FOUND — page says: ' + pageText);
let url = null;
for (let i = 0; i < 30 && !url; i++) {
  await new Promise((r) => setTimeout(r, 300));
  url = await staff.evaluate(() => {
    const m = document.body.innerText.match(/https?:\/\/\S+\/substitute\/\S+/);
    if (m) return m[0];
    const inp = [...document.querySelectorAll('input')].find((i) => /\/substitute\//.test(i.value));
    return inp ? inp.value : null;
  });
}
console.log('2. link generated:', url ? 'OK' : 'FAIL');
if (!url) process.exit(1);
url = url.replace(/^https?:\/\/[^/]+/, BASE); // normalize host for the sandbox

// open in a completely fresh, unauthenticated context
const anonCtx = await browser.createBrowserContext();
const anon = await anonCtx.newPage();
await anon.setViewport({ width: 375, height: 812 });
await anon.goto(url, { waitUntil: 'networkidle0' });
const body = await anon.evaluate(() => document.body.innerText);
const hasPlan = body.includes('خطة الجلسة');
const hasRoster = body.includes('الكشف');
const banner = body.includes('وصول مؤقّت');
console.log('3. plan renders:', hasPlan ? 'OK' : 'FAIL');
console.log('4. roster renders:', hasRoster ? 'OK' : 'FAIL');
console.log('5. read-only banner:', banner ? 'OK' : 'FAIL');
await anon.screenshot({ path: '/tmp/ui-audit/substitute-view.png' });

// tampered token must be rejected
const bad = url.slice(0, -4) + 'AAAA';
await anon.goto(bad, { waitUntil: 'networkidle0' });
const rejected = await anon.evaluate(() => document.body.innerText.includes('غير صالح'));
console.log('6. tampered token rejected:', rejected ? 'OK' : 'FAIL');

await browser.close();
