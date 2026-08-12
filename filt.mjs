import { chromium } from 'playwright';
const OUT = process.env.SCRATCH;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] });
const page = await (await b.newContext({ viewport: { width: 1500, height: 1250 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));

await page.goto('http://localhost:4173/login'); await page.waitForTimeout(1500);
const lang = page.getByRole('button', { name: /Products in English language/i }).first();
if (await lang.count()) { await lang.click(); await page.waitForTimeout(700); }
await page.getByRole('button', { name: /Phone\/Email & Password/i }).first().click(); await page.waitForTimeout(400);
await page.getByPlaceholder(/name@example\.com/i).first().fill('admin@galo.test');
await page.locator('input[type="password"]').first().fill('password');
await page.getByRole('button', { name: /Sign In/i }).first().click(); await page.waitForTimeout(3000);
await page.goto('http://localhost:4173/admin'); await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Website Orders/i }).first().click(); await page.waitForTimeout(2500);

const footer = async () => (await page.locator('text=/Page \\d+ of \\d+/').first().innerText().catch(() => '?'));
console.log('unfiltered      :', await footer());

// A search that only matches one order, buried thousands deep.
await page.getByPlaceholder(/Search by ID/i).first().fill('Customer 2035');
await page.waitForTimeout(2500);
console.log('search one order:', await footer());
const rows = await page.locator('tbody tr td:nth-child(3)').allInnerTexts();
console.log('  first row     :', rows[0]?.split('\n')[0]);

// Status filter across the whole table.
await page.getByPlaceholder(/Search by ID/i).first().fill('');
await page.waitForTimeout(1200);
await page.locator('select').first().selectOption('returned');
await page.waitForTimeout(2500);
console.log('status=returned :', await footer());
await page.screenshot({ path: `${OUT}/scale-filtered.png`, fullPage: true });

await b.close();
console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors');
