import { test } from "node:test";
import assert from "node:assert/strict";
import {
    filterRequestHeaders,
    stripResponseHeaders,
    mergeRequestHeaders,
    requestHeadersToRemove,
    responseHeadersToRemove,
} from "../src/headers.js";

test("filterRequestHeaders removes hop-by-hop / infra headers", () => {
    const input = {
        host: "example.com",
        "user-agent": "curl/8",
        "accept-encoding": "gzip",
        "content-length": "10",
        "x-forwarded-for": "1.2.3.4",
        accept: "text/html",
        cookie: "a=b",
    };
    const out = filterRequestHeaders(input);
    for (const h of requestHeadersToRemove) {
        assert.ok(!(h in out), `${h} should be stripped`);
    }
    assert.equal(out.accept, "text/html");
    assert.equal(out.cookie, "a=b");
});

test("filterRequestHeaders does not mutate its input", () => {
    const input = { host: "example.com", accept: "text/html" };
    filterRequestHeaders(input);
    assert.equal(input.host, "example.com");
});

test("filterRequestHeaders tolerates undefined input", () => {
    assert.deepEqual(filterRequestHeaders(), {});
});

test("stripResponseHeaders removes forbidden headers case-insensitively", () => {
    const input = {
        "Content-Length": "123",
        "content-encoding": "gzip",
        "Set-Cookie": "a=b",
        Connection: "keep-alive",
        "Content-Type": "text/html",
        "X-Custom": "keep-me",
    };
    const out = stripResponseHeaders(input);
    for (const h of responseHeadersToRemove) {
        const present = Object.keys(out).some((k) => k.toLowerCase() === h.toLowerCase());
        assert.ok(!present, `${h} should be stripped`);
    }
    assert.equal(out["Content-Type"], "text/html");
    assert.equal(out["X-Custom"], "keep-me");
});

test("stripResponseHeaders does not mutate its input", () => {
    const input = { "Content-Length": "1", "Content-Type": "text/html" };
    stripResponseHeaders(input);
    assert.equal(input["Content-Length"], "1");
});

test("mergeRequestHeaders lets client headers win over browser headers", () => {
    const browser = { "user-agent": "Firefox", accept: "*/*" };
    const client = { accept: "text/html", cookie: "x=1" };
    const merged = mergeRequestHeaders(browser, client);
    assert.equal(merged["user-agent"], "Firefox"); // browser-only header kept
    assert.equal(merged.accept, "text/html"); // client overrides
    assert.equal(merged.cookie, "x=1"); // client-only header added
});
