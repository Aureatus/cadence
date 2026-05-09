import alchemy from "alchemy";
import { Astro } from "alchemy/cloudflare";

const app = await alchemy("cadence");

export const site = await Astro("cadence-site", {
  name: "cadence",
});

console.log(`deployed → ${site.url}`);

await app.finalize();
