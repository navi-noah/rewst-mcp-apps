import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";
import { z } from "zod";
import mappingHtml from "../../dist/views/mapping.html";
import frameHtml from "../../dist/views/frame.html";
import aboutHtml from "../../dist/views/about.html";
import { about } from "./about";
import { integrations, orgs } from "./mapping-data";

// Hosts cache views by URI, so the URI carries a hash of the HTML. A change to the
// view gets a new URI instead of whatever Claude cached last week.
function stamp(html: string) {
  let h = 2166136261;
  for (let i = 0; i < html.length; i++) h = Math.imul(h ^ html.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const MAPPING_UI = `ui://rewst/mapping-${stamp(mappingHtml)}.html`;
const FRAME_UI = `ui://rewst/frame-${stamp(frameHtml)}.html`;
const ABOUT_UI = `ui://rewst/about-${stamp(aboutHtml)}.html`;

const instructions = `Demo of what MCP Apps could add on top of Rewst's own MCP server. Nothing here touches a real tenant; the MSP and its clients are Microsoft's sample companies.
- Org mapping: call list_unmapped_records for an integration, do the matching yourself, then call review_org_mappings with a proposal for every record. The person reviews and commits in the card. You can't commit mappings; only they can.
- "Build me a ..." in Rewst: before asking any questions and before building anything, call plan_rewst_workflow to sketch it so the person can agree on the shape. Put your questions in the plan, not in chat. If Rewst's own MCP server is connected in this chat, check it first for which integrations are set up and whether an existing workflow or crate already covers part of it, and mark that in the frame. If it isn't connected, use status "unknown". Put anything you'd otherwise ask about in questions.
`;

const integrationIds = Object.keys(integrations) as [string, ...string[]];

const proposal = z.object({
  recordId: z.string(),
  action: z.enum(["map", "create", "skip"]).describe("map to an existing org, create a new org, or skip (junk, inactive, catch-all)"),
  orgId: z.string().optional().describe("Required when action is map"),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().describe("A few words, e.g. 'same domain' or 'branch of Contoso, same domain'"),
});

const decision = z.object({
  recordId: z.string(),
  action: z.enum(["map", "create", "skip"]),
  orgId: z.string().optional(),
  changed: z.boolean().describe("True if the person changed the proposal"),
});

function text(s: string) {
  return [{ type: "text" as const, text: s }];
}

function createServer() {
  const server = new McpServer(
    { name: "rewst-mcp-apps", version: "0.2.0" },
    { instructions, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  registerAppResource(server, "Rewst org mapping review", MAPPING_UI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{ uri: MAPPING_UI, mimeType: RESOURCE_MIME_TYPE, text: mappingHtml, _meta: { ui: { prefersBorder: false } } }],
  }));

  registerAppResource(server, "Rewst workflow frame", FRAME_UI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{ uri: FRAME_UI, mimeType: RESOURCE_MIME_TYPE, text: frameHtml, _meta: { ui: { prefersBorder: false } } }],
  }));

  const step = z.object({
    id: z.string(),
    label: z.string().describe("Short, e.g. 'Disable sign-in'"),
    kind: z.enum(["trigger", "action", "condition", "loop", "form", "approval", "ai", "data"]),
    integration: z.string().optional().describe("e.g. 'Microsoft Graph', 'ConnectWise PSA'"),
    detail: z.string().optional().describe("One line on what it does"),
    after: z.array(z.string()).optional().describe("ids of the steps that lead here; omit for the trigger"),
    edgeLabel: z.string().optional().describe("Branch label on the incoming line, e.g. 'has mailbox'"),
  });

  registerAppTool(
    server,
    "plan_rewst_workflow",
    {
      title: "Plan a Rewst workflow (sketch it before building)",
      description:
        "Call this FIRST whenever someone asks you to build, create, make or automate a workflow in Rewst: before asking clarifying questions and before calling any tool that builds. " +
        "It draws the plan as a diagram (trigger, steps, branches, which integrations each step needs and whether they're set up, existing workflows to reuse) and asks your open questions inside the card, so don't ask them in chat; put them in `questions` with a short list of options each. " +
        "If you already asked clarifying questions, still call this with the answers before building anything. " +
        "Send only what the diagram needs: never tenant or org IDs, client or people names, emails or credentials. Integration and workflow names are fine; say 'the client' instead of a company name. " +
        "If you later build it and change anything from the approved plan, tell the person what changed and why. " +
        "If Rewst's own MCP server is connected, check it for integrations and existing workflows before calling this. The person confirms in the card before anything is built.",
      inputSchema: z.object({
        title: z.string(),
        goal: z.string().describe("One sentence: what this does for whom"),
        steps: z.array(step),
        integrations: z
          .array(z.object({ name: z.string(), status: z.enum(["connected", "missing", "unknown"]), note: z.string().optional() }))
          .optional(),
        reuse: z.array(z.object({ name: z.string(), note: z.string() })).optional().describe("Existing workflows or crates that already cover part of this"),
        questions: z.array(z.object({ id: z.string(), text: z.string(), options: z.array(z.string()) })).optional(),
      }),
      _meta: { ui: { resourceUri: FRAME_UI } },
    },
    async (args) => {
      const missing = (args.integrations ?? []).filter((i) => i.status === "missing").map((i) => i.name);
      const out = [
        `Framed "${args.title}": ${args.steps.length} steps.`,
        missing.length ? `Not set up yet: ${missing.join(", ")}.` : "",
        args.questions?.length ? `${args.questions.length} open questions are in the card; wait for the person's answers.` : "Waiting on the person to confirm the shape in the card.",
      ];
      return { content: text(out.filter(Boolean).join(" ")) };
    },
  );

  registerAppResource(server, "About this server", ABOUT_UI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({
    contents: [{ uri: ABOUT_UI, mimeType: RESOURCE_MIME_TYPE, text: aboutHtml, _meta: { ui: { prefersBorder: false } } }],
  }));

  registerAppTool(
    server,
    "about_this_server",
    {
      title: "What this server can see and do",
      description:
        "Shows exactly what this MCP server can and can't see, what it keeps, and what each of its tools does. Use it when someone asks whether this connector is safe, what it can access, what data it sees or stores, or who can see their data.",
      inputSchema: z.object({}),
      _meta: { ui: { resourceUri: ABOUT_UI } },
    },
    async () => ({
      content: text(
        [
          "What this server can see: only what the AI sends it in a tool call. Nothing else from the chat, no files, no other connectors.",
          `It can't see: ${about.cannot.join("; ")}.`,
          `It keeps: ${about.keeps}`,
          `${about.trustTitle}. ${about.trust} Source: ${about.source}`,
          "Tools:",
          ...about.tools.map((t) => `- ${t.name} (${t.who}): ${t.does}`),
        ].join("\n"),
      ),
      structuredContent: about,
    }),
  );

  server.registerTool(
    "list_unmapped_records",
    {
      title: "List unmapped records",
      description:
        "Lists an integration's companies or tenants that aren't mapped to a Rewst org yet, plus every Rewst org. Use it before review_org_mappings. " +
        `Integrations: ${integrationIds.join(", ")}.`,
      inputSchema: z.object({ integration: z.enum(integrationIds) }),
    },
    async ({ integration }) => {
      const i = integrations[integration];
      const out = [
        `${i.label}: ${i.records.length} unmapped (${i.idLabel}, name, hint)`,
        ...i.records.map((r) => `- ${r.id} | ${r.name} | ${r.hint}`),
        "",
        `Rewst orgs (id, name, domain):`,
        ...orgs.map((o) => `- ${o.id} | ${o.name} | ${o.domain ?? ""}`),
        "",
        "Now call review_org_mappings with one proposal per record. Be honest about confidence: branches, look-alikes and trial tenants are medium or low.",
      ];
      return { content: text(out.join("\n")) };
    },
  );

  registerAppTool(
    server,
    "review_org_mappings",
    {
      title: "Review org mappings",
      description:
        "Opens a review grid for your proposed mappings between an integration's records and Rewst orgs. Include every record from list_unmapped_records. " +
        "The person checks it, fixes what you got wrong and commits. Don't ask them to confirm in chat; the card is where they decide.",
      inputSchema: z.object({ integration: z.enum(integrationIds), proposals: z.array(proposal) }),
      _meta: { ui: { resourceUri: MAPPING_UI } },
    },
    async ({ integration, proposals }) => {
      const i = integrations[integration];
      const known = new Set(i.records.map((r) => r.id));
      const missing = i.records.filter((r) => !proposals.some((p) => p.recordId === r.id)).map((r) => r.id);
      const unknown = proposals.filter((p) => !known.has(p.recordId)).map((p) => p.recordId);
      const counts = { high: 0, medium: 0, low: 0 };
      for (const p of proposals) counts[p.confidence]++;
      const notes = [
        `Review card opened for ${proposals.length} ${i.label} records: ${counts.high} high, ${counts.medium} medium, ${counts.low} low confidence.`,
        missing.length ? `No proposal for: ${missing.join(", ")} (shown as unreviewed).` : "",
        unknown.length ? `Ignored unknown record ids: ${unknown.join(", ")}.` : "",
        "Waiting on the person to review and commit in the card.",
      ];
      return {
        content: text(notes.filter(Boolean).join(" ")),
        structuredContent: { integration, label: i.label, idLabel: i.idLabel, records: i.records, orgs, proposals },
      };
    },
  );

  registerAppTool(
    server,
    "commit_org_mappings",
    {
      title: "Commit org mappings",
      description: "Saves the mappings the person approved in the review card.",
      inputSchema: z.object({ integration: z.enum(integrationIds), decisions: z.array(decision) }),
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ integration, decisions }) => {
      const tally = { map: 0, create: 0, skip: 0 };
      for (const d of decisions) tally[d.action]++;
      const changed = decisions.filter((d) => d.changed).length;
      const summary = `Saved ${decisions.length} ${integrations[integration].label} decisions: ${tally.map} mapped, ${tally.create} new orgs, ${tally.skip} skipped. The person changed ${changed} of the AI's proposals.`;
      return { content: text(summary), structuredContent: { ...tally, changed, total: decisions.length, summary } };
    },
  );

  return server;
}

const mcp = createMcpHandler(() => createServer());

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
};

export default {
  async fetch(req: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/mcp") {
      const res = await mcp.fetch(req);
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      return new Response(res.body, { status: res.status, headers });
    }

    return env.ASSETS.fetch(req);
  },
};
