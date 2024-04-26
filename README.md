# Sponsor

<img src="https://github.com/unixfox/pupflare/assets/4016501/d1b66c77-16b8-455b-aefd-e07ecbed98d4" width="400" />

[Capsolver.com](https://www.capsolver.com/?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare) is an AI-powered service that specializes in solving various types of captchas automatically. It supports captchas such as [reCAPTCHA V2](https://docs.capsolver.com/guide/captcha/ReCaptchaV2.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [reCAPTCHA V3](https://docs.capsolver.com/guide/captcha/ReCaptchaV3.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [hCaptcha](https://docs.capsolver.com/guide/captcha/HCaptcha.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [FunCaptcha](https://docs.capsolver.com/guide/captcha/FunCaptcha.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [DataDome](https://docs.capsolver.com/guide/captcha/DataDome.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [AWS Captcha](https://docs.capsolver.com/guide/captcha/awsWaf.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [Geetest](https://docs.capsolver.com/guide/captcha/Geetest.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), and Cloudflare [Captcha](https://docs.capsolver.com/guide/antibots/cloudflare_turnstile.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare) / [Challenge 5s](https://docs.capsolver.com/guide/antibots/cloudflare_challenge.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), [Imperva / Incapsula](https://docs.capsolver.com/guide/antibots/imperva.html?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), among others.
For developers, Capsolver offers API integration options detailed in their [documentation](https://docs.capsolver.com/?utm_source=github&utm_medium=banner_github&utm_campaign=pupflare), facilitating the integration of captcha solving into applications. They also provide browser extensions for [Chrome](https://chromewebstore.google.com/detail/captcha-solver-auto-captc/pgojnojmmhpofjgdmaebadhbocahppod) and [Firefox](https://addons.mozilla.org/es/firefox/addon/capsolver-captcha-solver), making it easy to use their service directly within a browser. Different pricing packages are available to accommodate varying needs, ensuring flexibility for users. 

# How to launch
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
