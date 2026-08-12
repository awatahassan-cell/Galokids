import { chromium } from 'playwright';
const OUT = process.env.SCRATCH;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1250 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));

await page.goto('http://localhost:4173/login'); await page.waitForTimeout(1600);
const lang = page.getByRole('button', { name: /Products in English language/i }).first();
if (await lang.count()) { await lang.click(); await page.waitForTimeout(800); }
await page.getByRole('button', { name: /Phone\/Email & Password/i }).first().click(); await page.waitForTimeout(400);
await page.getByPlaceholder(/name@example\.com/i).first().fill('admin@galo.test');
await page.locator('input[type="password"]').first().fill('password');
await page.getByRole('button', { name: /Sign In/i }).first().click(); await page.waitForTimeout(3000);

const t0 = Date.now();
await page.goto('http://localhost:4173/admin'); await page.waitForTimeout(4000);
console.log('overview loaded in', Date.now() - t0, 'ms');
await page.screenshot({ path: `${OUT}/scale-overview.png`, fullPage: true });

for (const [label, shot] of [['Website Orders','scale-orders'], ['POS Sales','scale-pos'], ['Calendar Reports','scale-calendar'], ['Profit Report','scale-profit']]) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
  if (!await btn.count()) { console.log('MISSING', label); continue; }
  const s = Date.now();
  await btn.click(); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  console.log(`${label.padEnd(18)} ${Date.now() - s} ms`);
}
await browser.close();
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
