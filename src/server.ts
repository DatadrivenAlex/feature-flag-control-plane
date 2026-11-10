import { createApp } from "./app.js";
import { Store } from "./store.js";
const token = process.env.ADMIN_TOKEN;
if (!token || token.length < 16)
  throw new Error(
    "Set ADMIN_TOKEN to at least 16 characters; never use a real production credential",
  );
const port = Number(process.env.PORT ?? 3000);
createApp(new Store(process.env.STATE_FILE ?? "data/state.json"), token).listen(
  port,
  "0.0.0.0",
  () => console.log(`Demo at http://localhost:${port}`),
);
