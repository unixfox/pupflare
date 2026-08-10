import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { launchBrowser } from "../src/browser.js";
import { createRequestHandler } from "../src/handler.js";

// This suite launches the real Camoufox (Firefox) browser and exercises the
// full proxy path against a local origin server. It is opt-in because it needs
// the Camoufox binary (`npx camoufox-js fetch`) and is slower than the unit
// tests. Run it with: RUN_INTEGRATION=1 npm run test:integration
const enabled = Boolean(process.env.RUN_INTEGRATION);
const opts = enabled ? {} : { skip: "set RUN_INTEGRATION=1 to run the browser integration tests" };

let originServer;
let originUrl;
let proxyServer;
let proxyUrl;
let instance;

function startOrigin() {
    const server = http.createServer((req, res) => {
        if (req.url === "/echo") {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", () => {
                res.setHeader("content-type", "application/json");
                res.end(
                    JSON.stringify({
                        method: req.method,
                        body,
                        userAgent: req.headers["user-agent"] || "",
                        xClient: req.headers["x-client"] || "",
                    }),
                );
            });
            return;
        }
        if (req.url === "/download") {
            res.setHeader("content-type", "application/octet-stream");
            res.setHeader("content-disposition", 'attachment; filename="file.txt"');
            res.end("FILE-CONTENTS");
            return;
        }
        res.setHeader("content-type", "text/html");
        res.setHeader("x-test", "origin");
        res.setHeader("set-cookie", "origincookie=yes; Path=/");
        res.end("<html><body>hello-origin</body></html>");
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            resolve({ server, url: `http://127.0.0.1:${port}` });
        });
    });
}

function listen(app) {
    return new Promise((resolve) => {
        const server = app.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            resolve({ server, url: `http://127.0.0.1:${port}` });
        });
    });
}

before(async () => {
    if (!enabled) return;
    ({ server: originServer, url: originUrl } = await startOrigin());

    ({ instance } = await launchBrowser({ ...process.env, CAMOUFOX_HEADFUL: undefined }));

    const app = new Koa();
    app.use(bodyParser());
    app.use(createRequestHandler({ instance, persistent: false, env: {} }));
    ({ server: proxyServer, url: proxyUrl } = await listen(app));
}, { timeout: 120000 });

after(async () => {
    await instance?.close().catch(() => {});
    await new Promise((r) => (proxyServer ? proxyServer.close(r) : r()));
    await new Promise((r) => (originServer ? originServer.close(r) : r()));
});

const proxied = (target) => `${proxyUrl}/?url=${encodeURIComponent(target)}`;

test("proxies a GET request and forwards origin headers", opts, async () => {
    const res = await fetch(proxied(`${originUrl}/`));
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.match(text, /hello-origin/);
    assert.equal(res.headers.get("x-test"), "origin");
    // The origin's Content-Length is stripped; Koa regenerates a correct one
    // for the buffer we send, so it must match the actual body length.
    assert.equal(Number(res.headers.get("content-length")), Buffer.byteLength(text));
});

test("forwards cookies set by the origin back to the client", opts, async () => {
    const res = await fetch(proxied(`${originUrl}/`));
    await res.text();
    const setCookie = res.headers.get("set-cookie") || "";
    assert.match(setCookie, /origincookie=yes/);
});

test("forwards POST body and custom client headers; uses the browser UA", opts, async () => {
    const res = await fetch(proxied(`${originUrl}/echo`), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "x-client": "abc" },
        body: "field=value",
    });
    const data = JSON.parse(await res.text());
    assert.equal(data.method, "POST");
    assert.equal(data.body, "field=value");
    assert.equal(data.xClient, "abc");
    assert.match(data.userAgent, /Firefox/, "origin should see the Camoufox/Firefox UA, not the fetch UA");
});

test("captures file downloads as the response body", opts, async () => {
    const res = await fetch(proxied(`${originUrl}/download`));
    const text = await res.text();
    assert.equal(text, "FILE-CONTENTS");
});
