# Sponsor

<a href="https://www.capsolver.com/?utm_source=github&utm_medium=repo&utm_campaign=scraping&utm_term=pupflare"><img src="https://github.com/unixfox/pupflare/assets/4016501/d1b66c77-16b8-455b-aefd-e07ecbed98d4" width="600" /></a>

# How to launch pupflare
1. Install NodeJS
2. `npm install`
3. `npm start`

# How to use
Send your request to the server with the port 3000 and add your URL to the "url" query string like this:
`http://localhost:3000/?url=https://example.org`

This script has been configured to wait for the cloudflare challenge to pass but, you can configure the "match" for anything else using the environment variable `CHALLENGE_MATCH`.  
If the website that you are targeting have a protection page with "please wait" in the HTML code then launch the script like this:
```
CHALLENGE_MATCH="please wait" npm start
```

To show the browser window, set the environment variable `PUPPETEER_HEADFUL=1`.

To use a proxy,
set the `PUPPETEER_PROXY` environment variable, for example `PUPPETEER_PROXY=localhost:8080`.

To specify user data directory, set `PUPPETEER_USERDATADIR=/path/to/dir`.

To enable debugging: `DEBUG=true` and debugging with body in the logs: `DEBUG_BODY=true`

# Docker
Available as a Docker image here: https://quay.io/repository/unixfox/pupflare (linux/amd64,linux/arm64)


```
docker run -d -p 3000:3000 quay.io/unixfox/pupflare
```
