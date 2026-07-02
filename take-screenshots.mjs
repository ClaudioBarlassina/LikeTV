import { chromium } from 'playwright';
import fs from 'fs';

const outDir = 'screenshots';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const DEVICE_ID = 'screenshot-device-web';
const API_BASE = 'https://dashtv.onrender.com';

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: false });
  console.log(`  ✓ ${name}`);
}

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Intercept subscription API calls so the app thinks it's activated
  await page.route('**/api/subscriptions/verify**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true, expiresAt: '2026-07-29T00:00:00.000Z', channels: [] }),
    });
  });

  await page.addInitScript((deviceId) => {
    localStorage.setItem('dash_device_id', deviceId);
  }, DEVICE_ID);

  const baseUrl = 'https://like-tv.vercel.app';

  try {
    // ========================
    // 1) Main page (home)
    // ========================
    console.log('\n[1/8] Home page...');
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(4000);
    await shot(page, '01-main.png');

    // ========================
    // 2) Fixtures
    // ========================
    console.log('[2/8] Fixtures page...');
    await page.goto(`${baseUrl}/fixtures`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, '02-fixtures.png');

    // ========================
    // 3) Knockout
    // ========================
    console.log('[3/8] Knockout page...');
    await page.goto(`${baseUrl}/knockout`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, '03-knockout.png');

    // ========================
    // 4) Standings
    // ========================
    console.log('[4/8] Standings page...');
    await page.goto(`${baseUrl}/standings`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, '04-standings.png');

    // ========================
    // 5) Admin panel
    // ========================
    console.log('[5/8] Admin panel...');
    await page.goto(`${API_BASE}/admin`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, '05-admin.png');

    // ========================
    // 6) Activate screen
    // ========================
    console.log('[6/8] Activate page...');
    // Clear so we land on activate
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => {
      localStorage.removeItem('dash_subscription');
      localStorage.removeItem('dash_device_id');
    });
    await page.goto(`${baseUrl}/activate`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    // Try filling the input via JS since RN Web rendering can be tricky
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      if (inputs.length > 0) inputs[0].value = 'WC26-1956-A734';
    });
    await page.waitForTimeout(500);
    await shot(page, '06-activate.png');

    // ========================
    // 7) Match detail
    // ========================
    console.log('[7/8] Match detail page...');
    await page.evaluate((id) => {
      localStorage.setItem('dash_device_id', id);
    }, DEVICE_ID);
    await page.goto(`${baseUrl}/match/6`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, '07-match-detail.png');

    // ========================
    // 8) Home SPLIT layout
    // ========================
    console.log('[8/8] Home page SPLIT layout...');
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    // Try clicking SPLIT button
    const btn = await page.locator('text=SPLIT').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    await shot(page, '08-main-split.png');

    console.log('\n✓ Todas las capturas guardadas en screenshots/');

  } catch (err) {
    console.error('\nError:', err.message);
    await page.screenshot({ path: `${outDir}/error.png`, fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
}

takeScreenshots();
