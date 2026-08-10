import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { launchBrowser } from "./src/browser.js";
import { createRequestHandler } from "./src/handler.js";

const app = new Koa();
app.use(bodyParser());

const { instance, persistent } = await launchBrowser(process.env);

app.use(createRequestHandler({ instance, persistent, env: process.env }));

const port = process.env.PORT || 3000;
const address = process.env.ADDRESS || "::";
app.listen(port, address, () => {
    console.log(`pupflare listening on ${address}:${port} (camoufox, persistent=${persistent})`);
});

const shutdown = async () => {
    try {
        await instance.close();
    } finally {
        process.exit(0);
    }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
