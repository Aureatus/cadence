import alchemy from "alchemy";
import { Astro } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";

const app = await alchemy("cadence", {
  stateStore: (scope) => new CloudflareStateStore(scope),
});

export const site = await Astro("cadence-site", {
  name: "cadence",
});

console.log(`deployed → ${site.url}`);

await app.finalize();
