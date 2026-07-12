// Phase 3 UI audit — screenshots of every major surface in AR + EN at
// mobile (375×812), tablet (768×1024), desktop (1440×1000), plus
// automated RTL/i18n probes (dir attribute, horizontal overflow,
// raw-key leakage, small touch targets).
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const OUT = '/tmp/ui-audit';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  ['mobile', 375, 812],
  ['tablet', 768, 1024],
  ['desktop', 1440, 1000],
];

// role → dashboard routes worth auditing for that role
const PLANS = [
  { email: null, role: 'public', routes: ['/', '/login', '/register'] },
  {
    email: 'gsup@leqat.qa',
    role: 'group_supervisor',
    routes: [
      '/dashboard', '/dashboard/attendance', '/dashboard/schedule',
      '/dashboard/group', '/dashboard/chat', '/dashboard/pickup',
      '/dashboard/recognition', '/dashboard/reports', '/dashboard/dm',
    ],
  },
  {
    email: 'exec@leqat.qa',
    role: 'executive',
    routes: [
      '/dashboard', '/dashboard/programs', '/dashboard/groups',
      '/dashboard/analytics', '/dashboard/payments', '/dashboard/inventory',
    ],
  },
  {
    email: 'parent@leqat.qa',
    role: 'parent',
    routes: [
      '/dashboard', '/dashboard/progress', '/dashboard/pickup',
      '/dashboard/slips', '/dashboard/consent', '/dashboard/books',
      '/dashboard/gallery', '/dashboard/payments',
    ],
  },
  {
    email: 'student@leqat.qa',
    role: 'student',
    routes: ['/dashboard', '/dashboard/books', '/dashboard/stories'],
  },
];

const LOCALES = ['ar', 'en'];
const localePath = (locale, route) => (locale === 'ar' ? route : `/en${route}`) || '/';

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const findings = [];

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
  await new Promise((r) => setTimeout(r, 500));
  return page.url().includes('/dashboard');
}

async function probe(page, tag) {
  return page.evaluate((tag) => {
    const out = [];
    const html = document.documentElement;
    // 1. dir/lang correctness
    out.push({ kind: 'dir', tag, dir: html.dir, lang: html.lang });
    // 2. horizontal overflow (page must never scroll sideways)
    const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (overflowX > 1) {
      // find widest offender
      let worst = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > html.clientWidth + 1 && (!worst || r.width > worst.w)) {
          worst = { w: Math.round(r.width), sel: el.tagName + '.' + [...el.classList].slice(0, 3).join('.') };
        }
      }
      out.push({ kind: 'overflow-x', tag, px: overflowX, worst });
    }
    // 3. raw i18n keys leaking (dotted lowercase tokens rendered as text)
    const leak = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && /^[a-z]+(\.[a-zA-Z]+){2,}$/.test(el.textContent.trim()))
      .map((el) => el.textContent.trim());
    if (leak.length) out.push({ kind: 'raw-key', tag, keys: [...new Set(leak)].slice(0, 5) });
    // 4. touch targets < 40px on interactive elements (mobile only matters, filter later)
    const small = [...document.querySelectorAll('a,button,[role="button"],input[type="checkbox"],input[type="radio"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36) && el.offsetParent !== null;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}[${(el.textContent || el.ariaLabel || '').trim().slice(0, 20)}] ${Math.round(r.width)}×${Math.round(r.height)}`;
      });
    if (small.length) out.push({ kind: 'small-target', tag, targets: [...new Set(small)].slice(0, 8) });
    return out;
  }, tag);
}

for (const plan of PLANS) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  await page.setViewport({ width: 1440, height: 1000 });

  if (plan.email) {
    const ok = await login(page, plan.email);
    if (!ok) { findings.push({ kind: 'login-failed', tag: plan.role }); await ctx.close(); continue; }
  }

  for (const locale of LOCALES) {
    for (const route of plan.routes) {
      const url = BASE + localePath(locale, route);
      for (const [vpName, w, h] of VIEWPORTS) {
        // desktop-only for EN to keep the matrix sane, except public + dashboard home
        if (locale === 'en' && vpName !== 'mobile' && !['/', '/login', '/dashboard'].includes(route)) continue;
        await page.setViewport({ width: w, height: h });
        try {
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        } catch { findings.push({ kind: 'nav-timeout', tag: `${plan.role} ${locale} ${route} ${vpName}` }); continue; }
        await new Promise((r) => setTimeout(r, 400));
        const tag = `${plan.role}_${locale}_${route.replace(/\//g, '-') || 'home'}_${vpName}`;
        const res = await probe(page, tag);
        findings.push(...res);
        await page.screenshot({ path: `${OUT}/${tag}.png` });
      }
    }
  }
  if (consoleErrors.length) findings.push({ kind: 'console', tag: plan.role, errors: [...new Set(consoleErrors)].slice(0, 10) });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));

// summarize
const issues = findings.filter((f) => f.kind !== 'dir');
const dirBad = findings.filter((f) => f.kind === 'dir' && ((f.tag.includes('_ar_') && f.dir !== 'rtl') || (f.tag.includes('_en_') && f.dir !== 'ltr')));
console.log(`screens: ${findings.filter((f) => f.kind === 'dir').length}`);
console.log(`dir mismatches: ${dirBad.length}`);
for (const f of dirBad) console.log(' DIR', f.tag, f.dir, f.lang);
for (const kind of ['overflow-x', 'raw-key', 'small-target', 'console', 'nav-timeout', 'login-failed']) {
  const list = issues.filter((f) => f.kind === kind);
  console.log(`\n== ${kind} (${list.length}) ==`);
  for (const f of list.slice(0, 25)) console.log(' ', JSON.stringify(f).slice(0, 300));
}
