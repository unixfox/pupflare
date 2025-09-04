const {addExtra} = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const rebrowserPuppeteer = require('rebrowser-puppeteer');

const puppeteer = addExtra(rebrowserPuppeteer);
puppeteer.use(StealthPlugin());
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
app.use(bodyParser());
const jsesc = require('jsesc');

const requestHeadersToRemove = [
    "host", "user-agent", "accept-encoding", "content-length",
    "forwarded", "x-forwarded-proto", "x-forwarded-for", "x-cloud-trace-context"
];
const responseHeadersToRemove = ["Accept-Ranges", "Content-Length", "Keep-Alive", "Connection", "content-encoding", "set-cookie"];

(async () => {
    let options = {
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: [
            '--enable-automation',
            '--disable-popup-blocking'
        ]
    };
    if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD)
        options.executablePath = '/usr/bin/chromium-browser';
    if (process.env.PUPPETEER_HEADFUL)
        options.headless = false;
    if (process.env.PUPPETEER_USERDATADIR)
        options.userDataDir = process.env.PUPPETEER_USERDATADIR;
    if (process.env.PUPPETEER_PROXY)
        options.args.push(`--proxy-server=${process.env.PUPPETEER_PROXY}`);
    const browser = await puppeteer.launch(options);
    app.use(async ctx => {
        if (ctx.query.url) {
            const url = decodeURIComponent(ctx.url.replace("/?url=", ""));
            if (process.env.DEBUG) {
                console.log(`[DEBUG] URL: ${url}`);
            }
            let responseBody;
            let responseData;
            let responseHeaders;
            const page = await browser.newPage();

            await page.removeAllListeners('request');
            await page.setRequestInterception(true);
            let requestHeaders = ctx.headers;
            requestHeadersToRemove.forEach(header => {
                delete requestHeaders[header];
            });
            page.on('request', (request) => {
                requestHeaders = Object.assign({}, request.headers(), requestHeaders);
                if (process.env.DEBUG) {
                    console.log(`[DEBUG] requested headers: \n${JSON.stringify(requestHeaders)}`);
                }
                if (ctx.method == "POST") {
                    request.continue({
                        headers: requestHeaders,
                        'method': 'POST',
                        'postData': ctx.request.rawBody
                    });
                } else {
                    request.continue({ headers: requestHeaders });
                }
            });

            const client = await page.target().createCDPSession();
            await client.send('Network.setRequestInterception', {
                patterns: [{
                    urlPattern: '*',
                    resourceType: 'Document',
                    interceptionStage: 'HeadersReceived'
                }],
            });

            await client.on('Network.requestIntercepted', async e => {
                let obj = { interceptionId: e.interceptionId };
                if (e.isDownload) {
                    await client.send('Network.getResponseBodyForInterception', {
                        interceptionId: e.interceptionId
                    }).then((result) => {
                        if (result.base64Encoded) {
                            responseData = Buffer.from(result.body, 'base64');
                        }
                    });
                    obj['errorReason'] = 'BlockedByClient';
                    responseHeaders = e.responseHeaders;
                }
                await client.send('Network.continueInterceptedRequest', obj);
                if (e.isDownload)
                    await page.close();
            });
            try {
                let response;
                let tryCount = 0;
                response = await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
                ctx.status = response.status();
                responseBody = await response.text();
                responseData = await response.buffer();
                while (responseBody.includes(process.env.CHALLENGE_MATCH || "challenge-platform") && tryCount <= 10) {
                    newResponse = await page.waitForNavigation({ timeout: 30000, waitUntil: 'domcontentloaded' });
                    if (newResponse) response = newResponse;
                    responseBody = await response.text();
                    responseData = await response.buffer();
                    tryCount++;
                }
                responseHeaders = await response.headers();
                const cookies = await page.cookies();
                if (cookies)
                    cookies.forEach(cookie => {
                        const { name, value, secure, expires, domain, ...options } = cookie;
                        ctx.cookies.set(cookie.name, cookie.value, options);
                    });
            } catch (error) {
                if (!error.toString().includes("ERR_BLOCKED_BY_CLIENT")) {
                    ctx.status = 500;
                    ctx.body = error;
                }
            }

            await page.close();
            if (responseHeaders) {
                responseHeadersToRemove.forEach(header => delete responseHeaders[header]);
                Object.keys(responseHeaders).forEach(header => ctx.set(header, jsesc(responseHeaders[header])));
            }
            if (process.env.DEBUG) {
                console.log(`[DEBUG] response headers: \n${JSON.stringify(responseHeaders)}`);
            }
            if (process.env.DEBUG_BODY) {
                console.log(`[DEBUG] body: \n${responseData}`);
            }
            ctx.body = responseData;
        }
        else {
            ctx.body = "Please specify the URL in the 'url' query string.";
        }
    });
    app.listen(process.env.PORT || 3000, process.env.ADDRESS || "::");
})();
