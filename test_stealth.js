const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing rebrowser-puppeteer stealth capabilities...');
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test for webdriver detection
    const webdriverResult = await page.evaluate(() => {
        return window.navigator.webdriver;
    });
    console.log('navigator.webdriver:', webdriverResult);
    
    // Test for Chrome runtime detection
    const chromeResult = await page.evaluate(() => {
        return window.chrome && window.chrome.runtime;
    });
    console.log('chrome.runtime exists:', !!chromeResult);
    
    // Test user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('User Agent:', userAgent);
    
    // Test for headless detection
    const headlessTest = await page.evaluate(() => {
        // Common headless detection methods
        const tests = {
            userAgent: /HeadlessChrome/.test(navigator.userAgent),
            webdriver: navigator.webdriver === true,
            permissions: !navigator.permissions,
            plugins: navigator.plugins.length === 0,
            languages: navigator.languages.length === 0
        };
        return tests;
    });
    console.log('Headless detection tests:', headlessTest);
    
    await browser.close();
    console.log('Stealth test completed');
})();