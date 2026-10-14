// Builds the Microsoft 365 Copilot agent package (a Teams app zip) pointing at a server.
//   bun run package:copilot                       -> uses the demo server
//   SITE_URL=https://your-worker.dev bun run package:copilot
// Output lands in public/ so the landing page can offer it for download.
import { $ } from "bun";
import { mkdtemp, readFile, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const site = (process.env.SITE_URL ?? "https://rewst-mcp-apps.catkin-puck.workers.dev").replace(/\/+$/, "");
if (!/^https:\/\/[^/\s]+$/.test(site)) throw new Error(`SITE_URL should be like https://host, got ${site}`);

const src = resolve(import.meta.dir, "../copilot");
const out = resolve(import.meta.dir, "../public/rewst-mcp-apps-copilot.zip");
const work = await mkdtemp(join(tmpdir(), "copilot-pkg-"));

for (const f of ["manifest.json", "declarativeAgent.json", "ai-plugin.json"]) {
  const text = (await readFile(join(src, f), "utf8")).replaceAll("{{SITE_URL}}", site);
  JSON.parse(text); // fail loudly on a broken template
  await writeFile(join(work, f), text);
}
for (const f of ["color.png", "outline.png"]) await copyFile(join(src, f), join(work, f));

await $`rm -f ${out}`;
await $`zip -q -j ${out} ${work}/manifest.json ${work}/declarativeAgent.json ${work}/ai-plugin.json ${work}/color.png ${work}/outline.png`;
console.log(`wrote ${out} for ${site}`);
