# rewst-mcp-apps

Rewst already has an MCP server, and it's good: an AI can build and run things in Rewst for you. What plain MCP can't do is put *you* in the loop. Everything goes person to AI to Rewst as text, and you only see what the AI decides to tell you.

[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) fix that. A tool can return a real UI that shows up right in the chat, so you can see and work with the actual data while the AI watches and helps. This is a small public server on Cloudflare that shows what that could look like for Rewst.

## The demo: org mapping review

Mapping PSA companies, RMM sites and Microsoft tenants to Rewst orgs is a chore every MSP on Rewst knows. It's also a perfect example of where text falls apart. Nobody wants to read 300 lines of "Contoso Ltd looks like Contoso, high confidence" in a chat.

So the AI does what it's good at, the fuzzy matching, and the card does what chat is bad at:

- You see every match in a grid, with the AI's confidence and its reason. The ones it isn't sure about are flagged.
- You fix what it got wrong with a dropdown. The data has traps on purpose: a pharma company that looks like Contoso, a field-services outfit that may or may not be Fabrikam, a dead Northwind record, and a catch-all that isn't a client at all.
- You can't commit until every shaky row has had a human look, and the AI can't commit at all. The commit tool is only visible to the card, so the model has no way to call it.
- When you're done, the AI is told exactly what you changed, so "why did you get that one wrong?" gets a real answer. "Ask the AI" on any row sends it to take a closer look.

## The second demo: frame it before you build it

Rewst's MCP server lets an AI build workflows for you. A common complaint is that it builds or rebuilds things nobody agreed to. So before anything gets built, `plan_rewst_workflow` sketches it as a diagram right in the chat: trigger, steps, branches, which integration each step needs, and whether that integration is actually set up.

The interesting part is that this server never talks to Rewst. If Rewst's own MCP server is connected in the same chat, the AI reads from it (what integrations you have, what workflows or crates already cover part of this) and draws the frame with this one. Two servers, one conversation, and the AI connecting them.

The questions the AI would otherwise ask show up as quick picks in the card. Your answers go back to it, and "Looks right, build it" hands the plan to the chat to build, through Rewst's MCP if it's there. The diagram uses React Flow, the same library Rewst's own workflow editor uses, with Rewst's node colors.

One thing it doesn't do: hold the AI to the plan. While building, the agent can still drift from what you approved, sometimes for a good reason. The tool tells the AI to say what it changed and why, but nothing checks. The natural next step is a second card that compares the built workflow (read back from Rewst's server) against the approved plan and has you sign off on the differences.

## Is it safe?

Ask "what can this connector see?" and `about_this_server` shows it: only what the AI sends in a tool call, nothing from your tenant or other connectors, no outbound network calls, nothing stored. Every line on that card is checkable against `src/server/about.ts` and the rest of this repo.

Ask your AI the same question and it'll rightly point out that the card is the server describing itself, which nobody can verify from inside a chat. That's true of every remote MCP server, and it's a big part of why it'd matter if Rewst hosted servers like this: you already trust Rewst with your tenant.

## Try it

No auth. The landing page at the server's root has step-by-step instructions for each app; the short version:

- Claude: Settings, Connectors, Add custom connector, name it "Rewst MCP Apps Demo", paste the URL. If it says it couldn't check the server, choose Continue anyway.
- ChatGPT (paid plans): turn on developer mode (Settings, Plugins, Advanced), add a custom MCP app named "Rewst MCP Apps Demo" with the URL and no authentication.
- Microsoft 365 Copilot: download the ready-made agent from the landing page (`/rewst-mcp-apps-copilot.zip`), upload it in Teams (Apps, Manage your apps, Upload an app, Upload a custom app), then pick "Rewst MCP Apps Demo" in Microsoft 365 Copilot. Needs a Copilot license and custom app upload in the tenant. Copilot Studio can connect to the URL too, but cards inside Copilot Studio agents are still rolling out per Microsoft.
- VS Code: add it to `mcp.json` as an HTTP server.

Then ask:

```
Using Rewst MCP Apps Demo, map my ConnectWise PSA companies to Rewst orgs.
```

There's a second integration too (`microsoft-365`), with its own traps, like two tenants both named Contoso.

For the frame, ask something like:

```
Using Rewst MCP Apps Demo, sketch a Rewst workflow for offboarding a user before building anything.
```

It works best with Rewst's own MCP server connected in the same chat, so the frame can show what you actually have. That's also why the prompts name "Rewst MCP Apps Demo": with both connected, "Rewst" alone is ambiguous, and naming the demo tells the AI which one you mean.

Everything is fake. The MSP (Relecloud) and its clients are Microsoft's sample companies. Nothing calls Rewst, Microsoft or anyone else.

## Tools

| Tool | Who sees it | What it does |
| --- | --- | --- |
| `list_unmapped_records` | model | Unmapped records for an integration, plus every Rewst org |
| `review_org_mappings` | model | Opens the review card with the AI's proposals |
| `commit_org_mappings` | card only | Takes what you approved (it's a demo, so nothing is actually saved) |
| `plan_rewst_workflow` | model | Sketches a workflow as a diagram before it gets built |
| `about_this_server` | model | Shows what this server can see, what it keeps and what every tool does |

## What's in here

| Folder | What it is |
| --- | --- |
| `src/server` | The MCP server (a Cloudflare Worker): tools, fake data, the about-card text |
| `src/views` | The cards, one React app each, built into single HTML files |
| `copilot` | The Microsoft 365 Copilot agent package: manifest, agent, plugin and icons |
| `scripts` | `package-copilot.ts`, which turns `copilot/` into the downloadable zip |
| `public` | The landing page, privacy and terms pages, and the built agent zip |

## Deploy your own

```
bun install
bunx wrangler login
SITE_URL=https://rewst-mcp-apps.<your-subdomain>.workers.dev bun run deploy
```

`SITE_URL` is where the Copilot agent package will point, so set it to your own worker's address (the first deploy prints it; run it once, then again with `SITE_URL` set). Leave it off and the package points at the public demo. The agent uses dynamic tool discovery, so Copilot picks up tool changes on its own; you only rebuild the zip if the address changes.

## How it's built

- Cloudflare Worker, stateless, using `createMcpHandler` from the MCP TypeScript SDK v2.
- The views use the same front-end stack as app.rewst.ai: React, Tailwind, shadcn/ui (Radix) and lucide icons, with the theme variables copied from Rewst's own stylesheet, so the cards look like part of Rewst. The `@modelcontextprotocol/ext-apps` React hooks handle the host connection. Each view builds into a single HTML file with Vite, fonts and logos included, so the host's CSP doesn't matter.
- View URIs include a hash of the HTML. Hosts cache views by URI, so this is what makes changes actually show up.
- Light and dark follow the chat, with a toggle.

## Running it

```
bun install
bun run dev
```

That builds the views and starts `wrangler dev` on port 8787, with the MCP endpoint at `http://localhost:8787/mcp`. To see the UI locally, the [basic-host](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) example from the MCP Apps repo works well:

```
SERVERS='["http://localhost:8787/mcp"]' bun serve.ts
```

`bun run package:copilot` rebuilds just the Copilot zip.
