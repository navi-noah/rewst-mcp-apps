// What the about card shows. Every line here should be checkable against the code in
// this repo; if a tool is added or changes what it touches, update this too.

export const about = {
  sees: [
    "Only what the AI sends in a tool call, like its proposed mappings or a workflow plan.",
    "Nothing else from your chat. The AI decides what to send, and most chat apps let you expand each tool call to see exactly what went out.",
    "If Rewst's own MCP server is connected too, the plan tool may get names from your real tenant, like integration and workflow names. Its instructions tell the AI never to send IDs, client or people names, emails or credentials.",
  ],
  cannot: [
    "your Rewst tenant (it has no Rewst access at all)",
    "Microsoft 365, your PSA, your RMM or any other system",
    "your other connectors, your files or your chat history",
    "anything outside this server: it makes no outbound network calls",
  ],
  keeps:
    "Nothing. There's no database and no logging of what you send. Cloudflare, which hosts it, keeps basic request counts like any website.",
  trustTitle: "Don't trust strangers on the internet",
  trust:
    "This card is a server you just met, telling you it's trustworthy. That's exactly what a sketchy server would say too. So don't take its word for it: the part that handles your data is about 350 lines, shorter than most ticket notes from your senior tech.",
  source: "https://github.com/navi-noah/rewst-mcp-apps",
  data: "Every client, person and record is made up. The companies are Microsoft's own sample companies (Contoso, Fabrikam and so on).",
  cards: [
    "Cards run in a locked-down frame inside your chat app and can't read the rest of the page.",
    "A card can call this server's tools, put a message in the chat for you, tell the AI what you did in it, or ask your chat app to open a link (like the source code). Nothing else.",
    "Cards load nothing from the internet. Fonts and logos are built in.",
  ],
  tools: [
    { name: "list_unmapped_records", who: "AI", does: "Returns the fake unmapped companies or tenants and the fake Rewst orgs.", changes: false },
    { name: "review_org_mappings", who: "AI", does: "Opens the mapping review card with the AI's proposals.", changes: false },
    {
      name: "commit_org_mappings",
      who: "Card only",
      does: "Called when you press Commit. Returns a summary; nothing is saved anywhere. The AI can't see or call this one.",
      changes: false,
    },
    { name: "plan_rewst_workflow", who: "AI", does: "Draws a workflow plan the AI wrote. Builds nothing.", changes: false },
    { name: "about_this_server", who: "AI", does: "Shows this card.", changes: false },
  ],
};

export type About = typeof about;
