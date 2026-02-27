const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console messages and errors
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log('Looking for MUSCLES tab...');
    await page.waitForSelector('a[href*="muscles"], button:has-text("MUSCLES")', { timeout: 5000 });
    
    // Click MUSCLES tab
    const musclesLink = await page.$('a[href*="muscles"]');
    if (musclesLink) {
      console.log('Clicking MUSCLES tab...');
      await musclesLink.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('Looking for muscle rows...');
    const rows = await page.$$('tr[data-id], tbody tr');
    if (rows.length > 0) {
      console.log(`Found ${rows.length} rows. Clicking first data row...`);
      // Click the second row (first is usually header)
      if (rows[1]) {
        await rows[1].click();
        await page.waitForTimeout(2000);
        
        // Check for errors
        const errorElement = await page.$('.error, [class*="error"]');
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          console.log('ERROR FOUND:', errorText);
        }
        
        // Take screenshot
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        console.log('Screenshot saved to error-screenshot.png');
      }
    }
    
    await browser.close();
  } catch (error) {
    console.error('Script error:', error);
  }
})();
