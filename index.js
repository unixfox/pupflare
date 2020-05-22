const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());
const Koa = require('koa');
const app = new Koa();

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    app.use(async ctx => {
        if (ctx.query.url) {
            const page = await browser.newPage();
            await page.goto(ctx.query.url);
            if ((await page.content()).includes("cloudflare"))
                await page.waitForNavigation();
            ctx.body = await page.content();
            await page.close();
        }
        else {
            ctx.body = "Please specify the URL query string.";
        }
    });
    app.listen(3000);
})();