// Headers that must not be forwarded from the incoming client request to the
// target site. These are hop-by-hop / infrastructure headers that would leak
// information about the proxy or break the request if replayed verbatim.
export const requestHeadersToRemove = [
    "host", "user-agent", "accept-encoding", "content-length",
    "forwarded", "x-forwarded-proto", "x-forwarded-for", "x-cloud-trace-context"
];

// Headers that must not be copied from the target response back to the client.
// These are either controlled by the HTTP server (Koa) or would corrupt the
// body once it has been decoded/re-encoded by the browser.
export const responseHeadersToRemove = [
    "Accept-Ranges", "Content-Length", "Keep-Alive", "Connection",
    "content-encoding", "set-cookie"
];

/**
 * Return a shallow copy of the incoming request headers with the hop-by-hop /
 * infrastructure headers stripped. The original object is not mutated.
 *
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function filterRequestHeaders(headers = {}) {
    const filtered = { ...headers };
    for (const header of requestHeadersToRemove) {
        delete filtered[header];
    }
    return filtered;
}

/**
 * Return a shallow copy of the target response headers with the headers that
 * would confuse the client / Koa stripped out. The original object is not
 * mutated. Matching is case-insensitive so it works with both Puppeteer's
 * lower-cased headers and Playwright's original-case headers.
 *
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function stripResponseHeaders(headers = {}) {
    const toRemove = new Set(responseHeadersToRemove.map((h) => h.toLowerCase()));
    const cleaned = {};
    for (const [key, value] of Object.entries(headers)) {
        if (!toRemove.has(key.toLowerCase())) {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

/**
 * Merge the browser-generated request headers with the forwarded client
 * headers. Client headers take precedence, mirroring the original
 * `Object.assign({}, browserHeaders, clientHeaders)` behaviour.
 *
 * @param {Record<string, string>} browserHeaders
 * @param {Record<string, string>} clientHeaders
 * @returns {Record<string, string>}
 */
export function mergeRequestHeaders(browserHeaders = {}, clientHeaders = {}) {
    return { ...browserHeaders, ...clientHeaders };
}
