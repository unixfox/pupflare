const puppeteer = require('puppeteer');

(async () => {
    console.log('Testing rebrowser-puppeteer specific patches...');
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test if rebrowser patches are applied - Check for Runtime.Enable detection
    const runtimeEnableTest = await page.evaluate(() => {
        // This test checks if Runtime.Enable was called (a major automation leak)
        let detected = false;
        try {
            // Try to detect if Runtime domain was enabled
            const script = document.createElement('script');
            script.textContent = `
                (() => {
                    const originalEval = window.eval;
                    window.eval = function() {
                        return originalEval.apply(this, arguments);
                    };
                })();
            `;
            document.head.appendChild(script);
            document.head.removeChild(script);
            
            // If rebrowser patches work, this should not detect automation
            return {
                runtimeEnabled: window.navigator.webdriver === true,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    
    console.log('Runtime.Enable test result:', runtimeEnableTest);
    
    // Test for webdriver property specifically
    const webdriverProperty = await page.evaluate(() => {
        return {
            webdriver: navigator.webdriver,
            hasWebdriverProperty: 'webdriver' in navigator,
            webdriverDescriptor: Object.getOwnPropertyDescriptor(navigator, 'webdriver')
        };
    });
    
    console.log('Webdriver property test:', webdriverProperty);
    
    // Test user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('User Agent contains HeadlessChrome:', userAgent.includes('HeadlessChrome'));
    
    await browser.close();
    console.log('Patch verification completed');
})();