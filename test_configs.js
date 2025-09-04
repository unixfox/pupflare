const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing different launch configurations for rebrowser-puppeteer...');
    
    // Test 1: Minimal launch options (like in app)
    console.log('\n=== Test 1: App-like configuration ===');
    const browser1 = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page1 = await browser1.newPage();
    const ua1 = await page1.evaluate(() => navigator.userAgent);
    const wd1 = await page1.evaluate(() => navigator.webdriver);
    console.log('User Agent (app config):', ua1.includes('HeadlessChrome') ? 'CONTAINS HeadlessChrome' : 'OK');
    console.log('Webdriver (app config):', wd1);
    await browser1.close();
    
    // Test 2: Default configuration
    console.log('\n=== Test 2: Default configuration ===');
    const browser2 = await puppeteer.launch();
    const page2 = await browser2.newPage();
    const ua2 = await page2.evaluate(() => navigator.userAgent);
    const wd2 = await page2.evaluate(() => navigator.webdriver);
    console.log('User Agent (default):', ua2.includes('HeadlessChrome') ? 'CONTAINS HeadlessChrome' : 'OK');
    console.log('Webdriver (default):', wd2);
    await browser2.close();
    
    // Test 3: With additional stealth-like args
    console.log('\n=== Test 3: Additional stealth args ===');
    const browser3 = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    
    const page3 = await browser3.newPage();
    // Set additional page properties that stealth plugins typically set
    await page3.evaluateOnNewDocument(() => {
        // Try to override webdriver manually to see if it helps
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });
    
    const ua3 = await page3.evaluate(() => navigator.userAgent);
    const wd3 = await page3.evaluate(() => navigator.webdriver);
    console.log('User Agent (stealth args):', ua3.includes('HeadlessChrome') ? 'CONTAINS HeadlessChrome' : 'OK');
    console.log('Webdriver (stealth args):', wd3);
    await browser3.close();
    
    console.log('\n=== Test completed ===');
})();