const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Full page screenshot
  await page.screenshot({ path: 'screenshot-full.png', fullPage: true });

  // Above-the-fold screenshot
  await page.screenshot({ path: 'screenshot-hero.png' });

  await browser.close();
  console.log('Screenshots saved!');
})();
