const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Scroll to the final CTA section
  await page.evaluate(() => {
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent.includes('Start trading')) {
        h.scrollIntoView({ block: 'center' });
        break;
      }
    }
  });
  // Wait for the video to start loading
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshot-cta.png' });

  await browser.close();
  console.log('CTA screenshot saved!');
})();
