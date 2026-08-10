import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLaunchOptions, truthy, normalizeProxy } from "../src/browser.js";

test("truthy treats empty/0/false as false", () => {
    assert.equal(truthy(undefined), false);
    assert.equal(truthy(""), false);
    assert.equal(truthy("0"), false);
    assert.equal(truthy("false"), false);
    assert.equal(truthy("False"), false);
    assert.equal(truthy("1"), true);
    assert.equal(truthy("true"), true);
    assert.equal(truthy("yes"), true);
});

test("normalizeProxy adds a default http scheme when missing", () => {
    assert.equal(normalizeProxy("localhost:8080"), "http://localhost:8080");
    assert.equal(normalizeProxy("http://p:3128"), "http://p:3128");
    assert.equal(normalizeProxy("socks5://p:1080"), "socks5://p:1080");
    assert.equal(normalizeProxy(undefined), undefined);
    assert.equal(normalizeProxy(""), undefined);
});

test("buildLaunchOptions defaults to headless with no extra options", () => {
    const opts = buildLaunchOptions({});
    assert.equal(opts.headless, true);
    assert.ok(!("proxy" in opts));
    assert.ok(!("user_data_dir" in opts));
});

test("CAMOUFOX_HEADFUL disables headless", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_HEADFUL: "1" }).headless, false);
});

test("CAMOUFOX_HEADFUL=virtual selects a virtual display", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_HEADFUL: "virtual" }).headless, "virtual");
});

test("proxy is read from CAMOUFOX_PROXY and normalized", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_PROXY: "localhost:8080" }).proxy, "http://localhost:8080");
    assert.equal(buildLaunchOptions({ CAMOUFOX_PROXY: "http://p:3128" }).proxy, "http://p:3128");
});

test("CAMOUFOX_USER_DATA_DIR maps to a persistent user_data_dir", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_USER_DATA_DIR: "/data" }).user_data_dir, "/data");
});

test("CAMOUFOX_EXECUTABLE_PATH sets the executable path", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_EXECUTABLE_PATH: "/a" }).executable_path, "/a");
});

test("optional anti-detection flags", () => {
    const opts = buildLaunchOptions({ CAMOUFOX_GEOIP: "1", CAMOUFOX_BLOCK_IMAGES: "1" });
    assert.equal(opts.geoip, true);
    assert.equal(opts.block_images, true);
});

test("CAMOUFOX_OS accepts a single value or a comma list", () => {
    assert.equal(buildLaunchOptions({ CAMOUFOX_OS: "windows" }).os, "windows");
    assert.deepEqual(buildLaunchOptions({ CAMOUFOX_OS: "windows, macos" }).os, ["windows", "macos"]);
});
