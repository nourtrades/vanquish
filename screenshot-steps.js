const { chromium } = require('/opt/node22/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Scroll to the "3 simple steps" section
  await page.evaluate(() => {
    const el = document.getElementById('how-it-works') ||
               document.querySelector('h2');
    // Find the section with "3 simple steps"
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent.includes('simple steps') || h.textContent.includes('funded')) {
        h.scrollIntoView({ block: 'start' });
        break;
      }
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-steps.png' });

  await browser.close();
  console.log('Steps screenshot saved!');
})();
