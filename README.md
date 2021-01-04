# How to launch
1. Install NodeJS
2. `npm install`
3. `npm start`

# How to use
Send your request to the server with the port 3000 and add your URL to the "url" query string like this:
`http://localhost:3000/?url=https://example.org`

To show the browser window, set the environment variable `PUPPETEER_HEADFUL=1`. To use a proxy,
set the `PUPPETEER_PROXY` environment variable, for example `PUPPETEER_PROXY=localhost:8080`.

# Docker
Available as a Docker image here: https://hub.docker.com/r/unixfox/pupflare