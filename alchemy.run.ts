import alchemy from "alchemy";
import { Assets, Worker } from "alchemy/cloudflare";

const app = await alchemy("cadence");

const assets = await Assets({ path: "./dist" });

export const site = await Worker("cadence-site", {
  name: "cadence",
  url: true,
  bindings: { ASSETS: assets },
  assets: { path: "./dist", run_worker_first: false },
});

console.log(`deployed → ${site.url}`);

await app.finalize();
