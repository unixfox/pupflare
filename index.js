const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(AdblockerPlugin());
puppeteer.use(StealthPlugin());
const Koa = require('koa');
const app = new Koa();

const headersToRemove = [
    "host", "user-agent", "accept", "accept-encoding", "content-length",
    "forwarded", "x-forwarded-proto", "x-forwarded-for", "x-cloud-trace-context"
];

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
            const url = ctx.url.replace("/?url=", "");
            const page = await browser.newPage();
            let headers = ctx.headers;
            headersToRemove.forEach(header => {
                delete headers[header];
            });
            await page.setExtraHTTPHeaders(headers);            
            await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
            if ((await page.content()).includes("cf-browser-verification"))
                await page.waitForNavigation({ timeout: 30000, waitUntil: 'domcontentloaded' });
            ctx.body = await page.content();
            await page.close();
        }
        else {
            ctx.body = "Please specify the URL in the 'url' query string.";
        }
    });
    app.listen(3000);
})();