const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Scroll to the payouts section and screenshot it
  const payoutsSection = await page.locator('text=Our traders are getting paid').first();
  await payoutsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Take a screenshot of the viewport showing the payouts area
  await page.screenshot({ path: 'screenshot-payouts.png' });

  // Also scroll down a bit more to see the full carousel/images
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-payouts-2.png' });

  await browser.close();
  console.log('Payout screenshots saved!');
})();
