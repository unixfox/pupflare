const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing enhanced stealth configuration for rebrowser-puppeteer...');
    
    // Enhanced launch options that might help with stealth
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote'
        ]
    });
    
    const page = await browser.newPage();
    
    // Manual stealth patches that rebrowser-puppeteer should be doing automatically
    await page.evaluateOnNewDocument(() => {
        // Hide webdriver property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        
        // Override user agent to remove HeadlessChrome
        Object.defineProperty(navigator, 'userAgent', {
            get: () => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
        });
        
        // Add chrome runtime
        window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
        };
        
        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Cypress ? 'denied' : 'granted' }) :
                originalQuery(parameters)
        );
        
        // Add plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        
        // Add languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
    });
    
    // Test the fixes
    const ua = await page.evaluate(() => navigator.userAgent);
    const wd = await page.evaluate(() => navigator.webdriver);
    const chrome = await page.evaluate(() => !!window.chrome);
    const plugins = await page.evaluate(() => navigator.plugins.length);
    
    console.log('Enhanced configuration results:');
    console.log('- User Agent contains HeadlessChrome:', ua.includes('HeadlessChrome'));
    console.log('- User Agent:', ua);
    console.log('- navigator.webdriver:', wd);
    console.log('- window.chrome exists:', chrome);
    console.log('- Plugins count:', plugins);
    
    await browser.close();
    console.log('Enhanced stealth test completed');
})();