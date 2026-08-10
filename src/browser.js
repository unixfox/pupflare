import { Camoufox } from "camoufox-js";

/**
 * Interpret an environment variable as a boolean flag. Empty string, "0" and
 * "false" (any case) count as false; any other non-undefined value is true.
 *
 * @param {string|undefined} value
 * @returns {boolean}
 */
export function truthy(value) {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized !== "" && normalized !== "0" && normalized !== "false";
}

/**
 * Camoufox/Playwright require the proxy to carry a scheme so it can be parsed
 * as a URL. The legacy pupflare docs accepted a bare `host:port`, so default a
 * missing scheme to http:// to stay backwards compatible.
 *
 * @param {string|undefined} raw
 * @returns {string|undefined}
 */
export function normalizeProxy(raw) {
    if (!raw) return undefined;
    return /:\/\//.test(raw) ? raw : `http://${raw}`;
}

/**
 * Build the Camoufox launch options from environment variables. Kept pure (no
 * side effects, no browser launch) so it can be unit tested.
 *
 * Supported variables:
 *   - CAMOUFOX_HEADFUL         -> headless=false (or "virtual" for a virtual display)
 *   - CAMOUFOX_VIRTUAL_DISPLAY -> use a virtual display (Xvfb)
 *   - CAMOUFOX_PROXY           -> upstream proxy
 *   - CAMOUFOX_USER_DATA_DIR   -> persistent context
 *   - CAMOUFOX_EXECUTABLE_PATH -> custom Camoufox binary
 *   - CAMOUFOX_GEOIP           -> match locale/timezone to the (proxy) IP
 *   - CAMOUFOX_BLOCK_IMAGES    -> skip image loading (faster)
 *   - CAMOUFOX_OS              -> fingerprint OS ("windows", "macos", "linux" or a comma list)
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {import('camoufox-js').LaunchOptions}
 */
export function buildLaunchOptions(env = process.env) {
    const options = {};

    const headful = env.CAMOUFOX_HEADFUL;
    if (String(headful).trim().toLowerCase() === "virtual" || truthy(env.CAMOUFOX_VIRTUAL_DISPLAY)) {
        options.headless = "virtual";
    } else {
        options.headless = !truthy(headful);
    }

    const proxy = normalizeProxy(env.CAMOUFOX_PROXY);
    if (proxy) options.proxy = proxy;

    if (env.CAMOUFOX_EXECUTABLE_PATH) options.executable_path = env.CAMOUFOX_EXECUTABLE_PATH;

    if (env.CAMOUFOX_USER_DATA_DIR) options.user_data_dir = env.CAMOUFOX_USER_DATA_DIR;

    if (truthy(env.CAMOUFOX_GEOIP)) options.geoip = true;
    if (truthy(env.CAMOUFOX_BLOCK_IMAGES)) options.block_images = true;

    if (env.CAMOUFOX_OS) {
        options.os = env.CAMOUFOX_OS.includes(",")
            ? env.CAMOUFOX_OS.split(",").map((s) => s.trim()).filter(Boolean)
            : env.CAMOUFOX_OS.trim();
    }

    return options;
}

/**
 * Launch a Camoufox (anti-detection Firefox) instance from the environment.
 *
 * When CAMOUFOX_USER_DATA_DIR is set, Camoufox returns a persistent
 * BrowserContext instead of a Browser; the returned `persistent` flag lets the
 * request handler treat both cases uniformly.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Promise<{ instance: import('playwright-core').Browser | import('playwright-core').BrowserContext, persistent: boolean }>}
 */
export async function launchBrowser(env = process.env) {
    const options = buildLaunchOptions(env);
    const persistent = Boolean(options.user_data_dir);
    // Persistent contexts are created via launchPersistentContext, where
    // acceptDownloads is a valid option. For the non-persistent path we set it
    // per-page in the handler instead.
    if (persistent) options.acceptDownloads = true;
    const instance = await Camoufox(options);
    return { instance, persistent };
}
