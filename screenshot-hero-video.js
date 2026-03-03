const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Hero section
  await page.screenshot({ path: 'screenshot-hero-new.png' });

  // Scroll to video section
  await page.evaluate(() => {
    const el = document.getElementById('video');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-video-new.png' });

  await browser.close();
  console.log('Screenshots saved!');
})();
