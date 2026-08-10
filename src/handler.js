import { readFile } from "node:fs/promises";
import jsesc from "jsesc";
import {
    filterRequestHeaders,
    mergeRequestHeaders,
    stripResponseHeaders,
} from "./headers.js";

const NAV_TIMEOUT = 30000;
const MAX_CHALLENGE_TRIES = 10;

/**
 * Map a Playwright cookie to the option bag accepted by Koa's `ctx.cookies.set`.
 *
 * `domain` and `secure` are intentionally dropped: forwarding them tends to make
 * Koa throw ("Cannot send secure cookie over an unencrypted connection") or
 * silently reject cross-domain cookies. This mirrors the original pupflare
 * behaviour which stripped the same fields.
 *
 * @param {import('playwright-core').Cookie} cookie
 * @returns {Record<string, unknown>}
 */
export function mapCookieOptions(cookie) {
    const options = {
        path: cookie.path,
        httpOnly: cookie.httpOnly,
    };
    if (cookie.sameSite) {
        options.sameSite = String(cookie.sameSite).toLowerCase();
    }
    if (typeof cookie.expires === "number" && cookie.expires > 0) {
        options.expires = new Date(cookie.expires * 1000);
    }
    return options;
}

/**
 * Create the Koa middleware that proxies a `?url=` request through the browser.
 *
 * @param {object} deps
 * @param {import('playwright-core').Browser | import('playwright-core').BrowserContext} deps.instance
 * @param {boolean} deps.persistent  true when `instance` is a persistent BrowserContext
 * @param {NodeJS.ProcessEnv} [deps.env]
 * @returns {(ctx: import('koa').Context) => Promise<void>}
 */
export function createRequestHandler({ instance, persistent, env = process.env }) {
    const challengeMatch = env.CHALLENGE_MATCH || "challenge-platform";
    const debug = Boolean(env.DEBUG);
    const debugBody = Boolean(env.DEBUG_BODY);

    return async function handler(ctx) {
        if (!ctx.query.url) {
            ctx.body = "Please specify the URL in the 'url' query string.";
            return;
        }

        const url = decodeURIComponent(ctx.url.replace("/?url=", ""));
        if (debug) console.log(`[DEBUG] URL: ${url}`);

        const clientHeaders = filterRequestHeaders(ctx.headers);
        const isPost = ctx.method === "POST";
        const rawBody = ctx.request.rawBody;

        // A persistent context (CAMOUFOX_USER_DATA_DIR) is itself the object we
        // create pages from; otherwise create an isolated page (its own context)
        // from the shared browser so cookies don't leak between requests.
        const page = persistent
            ? await instance.newPage()
            : await instance.newPage({ acceptDownloads: true });
        const cookieContext = page.context();

        /** @type {import('playwright-core').Response | null} */
        let lastResponse = null;
        /** @type {import('playwright-core').Download | null} */
        let download = null;
        let postForwarded = false;

        page.on("download", (d) => {
            download = d;
        });

        page.on("response", (response) => {
            const request = response.request();
            if (request.frame() === page.mainFrame() && request.resourceType() === "document") {
                lastResponse = response;
            }
        });

        await page.route("**/*", async (route) => {
            const request = route.request();
            const headers = mergeRequestHeaders(request.headers(), clientHeaders);
            if (debug) console.log(`[DEBUG] requested headers: \n${JSON.stringify(headers)}`);
            try {
                if (isPost && !postForwarded && request.isNavigationRequest()) {
                    postForwarded = true;
                    await route.continue({ headers, method: "POST", postData: rawBody });
                } else {
                    await route.continue({ headers });
                }
            } catch {
                // The route may already be resolved if the page navigated away
                // mid-flight; fall back to a plain continue and ignore failures.
                try {
                    await route.continue();
                } catch {
                    /* request no longer routable */
                }
            }
        });

        let errored = false;
        try {
            await page.goto(url, { timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });

            // Wait out anti-bot interstitials (e.g. Cloudflare). The challenge
            // reloads the page once solved, so wait for each navigation until the
            // marker is gone or we run out of retries.
            let tryCount = 0;
            while (tryCount <= MAX_CHALLENGE_TRIES) {
                const html = await page.content().catch(() => "");
                if (!html.includes(challengeMatch)) break;
                try {
                    await page.waitForNavigation({ timeout: NAV_TIMEOUT, waitUntil: "domcontentloaded" });
                } catch {
                    break;
                }
                tryCount++;
            }
        } catch (error) {
            // A navigation that turns into a file download rejects goto(); give
            // the download event a moment to surface before treating it as a
            // genuine failure.
            if (!download) {
                download = await page
                    .waitForEvent("download", { timeout: 1000 })
                    .catch(() => null);
            }
            if (!download) {
                errored = true;
                ctx.status = 500;
                ctx.body = String(error);
            }
        }

        /** @type {Buffer | undefined} */
        let responseData;
        /** @type {Record<string, string> | undefined} */
        let responseHeaders;

        if (!errored) {
            try {
                if (download) {
                    const filePath = await download.path();
                    if (filePath) responseData = await readFile(filePath);
                } else if (lastResponse) {
                    responseData = await lastResponse.body();
                }
                // Fall back to the rendered DOM if the raw body is unavailable
                // (redirects, cached responses, client-side-only navigations).
                if (!responseData) {
                    responseData = Buffer.from(await page.content());
                }

                if (lastResponse) {
                    ctx.status = lastResponse.status();
                    responseHeaders = lastResponse.headers();
                }

                const cookies = await cookieContext.cookies();
                for (const cookie of cookies) {
                    try {
                        ctx.cookies.set(cookie.name, cookie.value, mapCookieOptions(cookie));
                    } catch {
                        /* skip cookies Koa refuses (e.g. invalid domain) */
                    }
                }
            } catch (error) {
                errored = true;
                ctx.status = 500;
                ctx.body = String(error);
            }
        }

        await page.close().catch(() => {});

        if (errored) return;

        if (responseHeaders) {
            responseHeaders = stripResponseHeaders(responseHeaders);
            for (const [name, value] of Object.entries(responseHeaders)) {
                ctx.set(name, jsesc(value));
            }
        }
        if (debug) console.log(`[DEBUG] response headers: \n${JSON.stringify(responseHeaders)}`);
        if (debugBody) console.log(`[DEBUG] body: \n${responseData}`);

        ctx.body = responseData;
    };
}
