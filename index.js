const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(AdblockerPlugin());
puppeteer.use(StealthPlugin());
const Koa = require('koa');
const app = new Koa();

(async () => {
    let options = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD)
        options.executablePath = '/usr/bin/chromium-browser';
    const browser = await puppeteer.launch(options);
    app.use(async ctx => {
        if (ctx.query.url) {
            const page = await browser.newPage();
            await page.goto(ctx.query.url, {timeout: 30000, waitUntil: 'domcontentloaded'});
            if ((await page.content()).includes("cf-browser-verification"))
                await page.waitForNavigation({timeout: 30000, waitUntil: 'domcontentloaded'});
            ctx.body = await page.content();
            await page.close();
        }
        else {
            ctx.body = "Please specify the URL query string.";
        }
    });
    app.listen(3000);
})();