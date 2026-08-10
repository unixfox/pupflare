# pupflare

> 🆕 **NEW:** pupflare no longer uses Puppeteer — it now runs on [**Camoufox**](https://github.com/apify/camoufox-js), an anti-detection Firefox, for far better resistance to bot detection.

A small proxy server that transparently solves Cloudflare (and similar) anti-bot
challenges and returns the real page.

As of **v2.0** pupflare no longer uses Puppeteer + `puppeteer-extra-plugin-stealth`
(which is now reliably fingerprinted and blocked). It uses
[**Camoufox**](https://github.com/apify/camoufox-js) instead — an anti-detection
Firefox build driven through Playwright. All the previous behaviour is preserved:
request/response header forwarding, POST body forwarding, cookie forwarding, the
challenge wait loop, and file-download capture.

# How to launch pupflare
1. Install NodeJS (>= 18)
2. `npm install` — this also downloads the Camoufox browser via the `postinstall`
   hook. If that step is skipped (e.g. `--ignore-scripts`), run `npx camoufox-js fetch`
   manually.
3. `npm start`

# How to use
Send your request to the server on port 3000 and add your URL to the `url` query
string like this:
`http://localhost:3000/?url=https://example.org`

`GET` and `POST` are both supported; the request body and (most) request headers are
forwarded to the target. Any cookies the target sets are forwarded back to your client.

This script is configured to wait for the Cloudflare challenge to pass. You can
configure the "match" for anything else using the environment variable
`CHALLENGE_MATCH`. If the website you are targeting has a protection page with
"please wait" in the HTML, then launch the script like this:
```
CHALLENGE_MATCH="please wait" npm start
```

## Environment variables

| Variable | Description |
| --- | --- |
| `PORT` / `ADDRESS` | Listen port (default `3000`) and address (default `::`). |
| `CAMOUFOX_HEADFUL` | Show the browser window. Set to `virtual` to use a virtual display (Xvfb) on Linux. |
| `CAMOUFOX_PROXY` | Upstream proxy, e.g. `localhost:8080` or `socks5://host:1080` (a missing scheme defaults to `http://`). |
| `CAMOUFOX_USER_DATA_DIR` | Persist the browser profile in this directory (uses a persistent context). |
| `CAMOUFOX_EXECUTABLE_PATH` | Use a specific Camoufox binary instead of the auto-downloaded one. |
| `CAMOUFOX_GEOIP` | Match locale/timezone/geolocation to the (proxy) IP — strongly recommended when using a proxy. |
| `CAMOUFOX_BLOCK_IMAGES` | Skip loading images (faster). |
| `CAMOUFOX_OS` | Fingerprint OS: `windows`, `macos`, `linux`, or a comma-separated list to randomise. |
| `CHALLENGE_MATCH` | HTML substring that marks a challenge page (default `challenge-platform`). |
| `DEBUG` / `DEBUG_BODY` | Log request/response headers, and the response body respectively. |

# Tests

```
npm test                 # fast unit tests (no browser needed)
npm run test:integration # end-to-end tests against a local server (launches Camoufox)
```

`npm run test:integration` requires the Camoufox browser (`npx camoufox-js fetch`).

To eyeball anti-detection against a fingerprinting page:
```
node stealth-check.js                        # opens CreepJS
node stealth-check.js https://bot.sannysoft.com
```

# Docker
Build locally:
```
docker build -t pupflare .
docker run -d -p 3000:3000 pupflare
```

The upstream image at https://quay.io/repository/unixfox/pupflare may still be
Puppeteer-based until it is rebuilt from this branch.
