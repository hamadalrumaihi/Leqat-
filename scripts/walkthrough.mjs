// Phase 2 headless role walkthrough against the local Supabase stack.
// Drives the real login UI (password tab) so the full middleware
// cookie path + SSR client + role-aware sidebar are exercised.
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const OUT = '/tmp/walk';
fs.mkdirSync(OUT, { recursive: true });

const ACCOUNTS = [
  ['founder@leqat.qa', 'founder'],
  ['exec@leqat.qa', 'executive'],
  ['psup@leqat.qa', 'manager (morning)'],
  ['pmgr@leqat.qa', 'manager (afternoon)'],
  ['gsup@leqat.qa', 'group_supervisor'],
  ['asup@leqat.qa', 'assistant_supervisor'],
  ['parent@leqat.qa', 'parent'],
  ['student@leqat.qa', 'student'],
];

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];
for (const [email, role] of ACCOUNTS) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });

  // Switch to the password tab, fill, submit.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('كلمة المرور'),
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', 'Leqat@2025');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 800));

  const url = page.url();
  const onDashboard = url.includes('/dashboard');
  // Collect the sidebar nav labels the user actually sees.
  const navLabels = await page.evaluate(() => {
    const links = [...document.querySelectorAll('nav a')];
    return [...new Set(links.map((a) => a.textContent.trim()).filter(Boolean))];
  });
  const roleLabel = await page.evaluate(() => {
    const el = document.querySelector('aside p.text-\\[11px\\]');
    return el ? el.textContent.trim() : null;
  });

  await page.screenshot({ path: `${OUT}/${role}.png`, fullPage: false });
  results.push({ email, role, url, onDashboard, roleLabel, navCount: navLabels.length, navLabels, consoleErrors });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`\n=== ${r.role} (${r.email}) ===`);
  console.log(`  dashboard: ${r.onDashboard ? 'OK' : 'FAILED — ' + r.url}`);
  console.log(`  roleLabel: ${r.roleLabel}`);
  console.log(`  nav (${r.navCount}): ${r.navLabels.join(' · ')}`);
  if (r.consoleErrors.length) console.log(`  CONSOLE ERRORS: ${r.consoleErrors.slice(0, 3).join(' | ')}`);
}
