import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequestHandler, mapCookieOptions } from "../src/handler.js";

// ---------------------------------------------------------------------------
// mapCookieOptions (pure)
// ---------------------------------------------------------------------------

test("mapCookieOptions drops domain/secure and converts expires", () => {
    const opts = mapCookieOptions({
        name: "cf_clearance",
        value: "abc",
        domain: "example.com",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
        expires: 1700000000,
    });
    assert.ok(!("domain" in opts));
    assert.ok(!("secure" in opts));
    assert.equal(opts.path, "/");
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.ok(opts.expires instanceof Date);
    assert.equal(opts.expires.getTime(), 1700000000 * 1000);
});

test("mapCookieOptions ignores session (expires === -1) cookies", () => {
    const opts = mapCookieOptions({ name: "s", value: "1", path: "/", httpOnly: false, expires: -1 });
    assert.ok(!("expires" in opts));
});

// ---------------------------------------------------------------------------
// Mock Playwright page/context and a fake Koa ctx
// ---------------------------------------------------------------------------

function makeMockPage(config = {}) {
    const listeners = {};
    const mainFrame = { id: "main" };
    const documentResponse = {
        status: () => config.status ?? 200,
        headers: () => ({ ...(config.responseHeaders ?? { "content-type": "text/html" }) }),
        body: async () => Buffer.from(config.body ?? "<html>ok</html>"),
        request: () => ({ frame: () => mainFrame, resourceType: () => "document" }),
    };

    // page.content() returns the challenge marker for the first `challengeRounds`
    // calls, then clean HTML, so we can exercise the wait-out loop.
    let contentCalls = 0;
    const challengeRounds = config.challengeRounds ?? 0;

    const page = {
        _routeHandler: null,
        _closed: false,
        capturedContinue: [],
        navigations: 0,
        context() {
            return {
                cookies: async () => config.cookies ?? [],
            };
        },
        mainFrame: () => mainFrame,
        on(event, cb) {
            (listeners[event] ??= []).push(cb);
        },
        async route(_pattern, cb) {
            this._routeHandler = cb;
        },
        async goto() {
            // simulate the document response arriving
            (listeners.response ?? []).forEach((cb) => cb(documentResponse));
            if (config.throwOnGoto) throw new Error(config.throwOnGoto);
            return documentResponse;
        },
        async content() {
            const marker = contentCalls < challengeRounds ? "challenge-platform" : "";
            contentCalls++;
            return `<html>${marker} content</html>`;
        },
        async waitForNavigation() {
            this.navigations++;
            (listeners.response ?? []).forEach((cb) => cb(documentResponse));
            return documentResponse;
        },
        async waitForEvent() {
            return null;
        },
        async close() {
            this._closed = true;
        },
        // test helper: drive the registered route handler
        async runRoute(route) {
            await this._routeHandler(route);
        },
    };
    return page;
}

function makeMockInstance(page) {
    return { newPage: async () => page };
}

function makeCtx(overrides = {}) {
    return {
        query: overrides.query ?? { url: "x" },
        url: overrides.url ?? "/?url=https://example.com",
        method: overrides.method ?? "GET",
        headers: overrides.headers ?? { host: "proxy", accept: "text/html" },
        request: { rawBody: overrides.rawBody ?? "" },
        status: undefined,
        body: undefined,
        _resHeaders: {},
        _cookies: [],
        set(name, value) {
            this._resHeaders[name] = value;
        },
        cookies: {
            set(name, value, options) {
                this.__parent._cookies.push({ name, value, options });
            },
        },
    };
}

function bindCtx(ctx) {
    ctx.cookies.__parent = ctx;
    return ctx;
}

// ---------------------------------------------------------------------------
// Handler behaviour
// ---------------------------------------------------------------------------

test("responds with a hint when no url is provided", async () => {
    const page = makeMockPage();
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx({ query: {} }));
    await handler(ctx);
    assert.match(ctx.body, /specify the URL/);
    assert.equal(page._closed, false); // never opened a page
});

test("proxies a basic GET: body, status, stripped headers, cookies", async () => {
    const page = makeMockPage({
        status: 201,
        body: "hello world",
        responseHeaders: { "content-type": "text/plain", "content-length": "11", "set-cookie": "a=b" },
        cookies: [{ name: "cf", value: "1", path: "/", httpOnly: true, domain: "example.com", secure: true }],
    });
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx());
    await handler(ctx);

    assert.equal(ctx.status, 201);
    assert.equal(ctx.body.toString(), "hello world");
    assert.equal(ctx._resHeaders["content-type"], "text/plain");
    assert.ok(!("content-length" in ctx._resHeaders), "content-length stripped");
    assert.ok(!("set-cookie" in ctx._resHeaders), "set-cookie stripped");
    assert.equal(ctx._cookies.length, 1);
    assert.equal(ctx._cookies[0].name, "cf");
    assert.ok(!("domain" in ctx._cookies[0].options));
    assert.equal(page._closed, true);
});

test("merges headers with client precedence on continue", async () => {
    const page = makeMockPage();
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx({ headers: { host: "proxy", accept: "text/html", cookie: "x=1" } }));
    await handler(ctx);

    let continued;
    await page.runRoute({
        request: () => ({
            headers: () => ({ "user-agent": "Firefox", accept: "*/*" }),
            isNavigationRequest: () => true,
        }),
        continue: async (opts) => {
            continued = opts;
        },
    });
    assert.equal(continued.headers["user-agent"], "Firefox");
    assert.equal(continued.headers.accept, "text/html"); // client wins
    assert.equal(continued.headers.cookie, "x=1");
    assert.ok(!("host" in continued.headers), "host stripped before merge");
    assert.ok(!("method" in continued), "GET does not force a method override");
});

test("forwards POST body only on the navigation request", async () => {
    const page = makeMockPage();
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx({ method: "POST", rawBody: "field=value" }));
    await handler(ctx);

    // navigation request -> POST + body
    let nav;
    await page.runRoute({
        request: () => ({ headers: () => ({}), isNavigationRequest: () => true }),
        continue: async (opts) => {
            nav = opts;
        },
    });
    assert.equal(nav.method, "POST");
    assert.equal(nav.postData, "field=value");

    // subsequent (already forwarded) request -> plain continue
    let sub;
    await page.runRoute({
        request: () => ({ headers: () => ({}), isNavigationRequest: () => true }),
        continue: async (opts) => {
            sub = opts;
        },
    });
    assert.ok(!("method" in sub), "POST body forwarded only once");
});

test("waits out an anti-bot challenge until the marker clears", async () => {
    const page = makeMockPage({ challengeRounds: 2 });
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx());
    await handler(ctx);
    assert.equal(page.navigations, 2, "navigated once per challenge round");
    assert.equal(ctx.status, 200);
});

test("returns 500 when navigation fails and there is no download", async () => {
    const page = makeMockPage({ throwOnGoto: "net::ERR_CONNECTION_REFUSED" });
    const handler = createRequestHandler({ instance: makeMockInstance(page), persistent: false, env: {} });
    const ctx = bindCtx(makeCtx());
    await handler(ctx);
    assert.equal(ctx.status, 500);
    assert.match(String(ctx.body), /ERR_CONNECTION_REFUSED/);
    assert.equal(page._closed, true);
});
