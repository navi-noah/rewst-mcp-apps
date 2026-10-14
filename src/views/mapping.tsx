import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { ArrowRight, Check, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { integrations, orgs } from "../server/mapping-data";
import { Header } from "./shared/Header";
import { useTheme } from "./shared/useTheme";
import "./globals.css";

type Action = "map" | "create" | "skip";
type Confidence = "high" | "medium" | "low";
type Proposal = { recordId: string; action: Action; orgId?: string; confidence: Confidence; reason: string };
type Choice = { action: Action; orgId?: string };
type Input = { integration?: string; proposals?: Partial<Proposal>[] };
type Saved = { map: number; create: number; skip: number; changed: number; total: number; summary: string };

const orgName = (id?: string) => orgs.find((o) => o.id === id)?.name ?? id ?? "?";
const encode = (c: Choice) => (c.action === "map" ? `map:${c.orgId}` : c.action);
const decode = (v: string): Choice => (v.startsWith("map:") ? { action: "map", orgId: v.slice(4) } : { action: v as Action });
const describe = (c: Choice) => (c.action === "map" ? orgName(c.orgId) : c.action === "create" ? "a new org" : "skip");

function complete(p: Partial<Proposal>): p is Proposal {
  return !!p.recordId && !!p.action && !!p.confidence && (p.action !== "map" || !!p.orgId);
}

function Mapping() {
  const [input, setInput] = useState<Input>({});
  const [streaming, setStreaming] = useState(true);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"look" | "confident" | "all">("look");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [cantMessage, setCantMessage] = useState(false);

  const { app } = useApp({
    appInfo: { name: "rewst-org-mapping", version: "0.2.0" },
    capabilities: {},
    onAppCreated: (a: App) => {
      a.ontoolinputpartial = ({ arguments: args }) => setInput((args ?? {}) as Input);
      a.ontoolinput = ({ arguments: args }) => {
        setInput((args ?? {}) as Input);
        setStreaming(false);
      };
      // some hosts (Copilot) skip the input events, so fall back to the result
      a.ontoolresult = (res) => {
        const sc = res.structuredContent as Input | undefined;
        if (sc) setInput((prev) => (prev.proposals?.length ? prev : { integration: sc.integration, proposals: sc.proposals }));
        setStreaming(false);
      };
    },
  });
  const { theme, toggle } = useTheme(app);

  const integration = integrations[input.integration ?? ""] ?? null;
  const proposals = useMemo(() => {
    const m = new Map<string, Proposal>();
    for (const p of input.proposals ?? []) if (complete(p)) m.set(p.recordId, p);
    return m;
  }, [input]);

  const rows = useMemo(
    () =>
      (integration?.records ?? []).map((r) => {
        const p = proposals.get(r.id);
        const proposed: Choice | undefined = p && { action: p.action, orgId: p.orgId };
        const current = choices[r.id] ?? proposed;
        const changed = !!choices[r.id] && (!proposed || encode(choices[r.id]) !== encode(proposed));
        const needsLook = !p || p.confidence !== "high";
        const settled = !needsLook || changed || reviewed.has(r.id);
        return { r, p, proposed, current, changed, needsLook, settled };
      }),
    [integration, proposals, choices, reviewed],
  );

  const toLook = rows.filter((x) => x.needsLook);
  const open = rows.filter((x) => !x.settled).length;
  const shown = tab === "look" ? toLook : tab === "confident" ? rows.filter((x) => !x.needsLook) : rows;

  // keep the AI current on what the person has changed, without a message per click
  const timer = useRef(0);
  useEffect(() => {
    if (!app || !integration || streaming) return;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const edits = rows
        .filter((x) => x.changed)
        .map((x) => `- ${x.r.name}: you proposed ${x.proposed ? describe(x.proposed) : "nothing"}, the person chose ${describe(x.current!)}`);
      const text = saved
        ? `${saved.summary}\n${edits.join("\n")}`
        : `The person is reviewing ${rows.length} ${integration.label} mappings. ${open} still need a look.${edits.length ? `\nChanges so far:\n${edits.join("\n")}` : ""}`;
      app.updateModelContext({ content: [{ type: "text", text }] }).catch(() => {});
    }, 700);
  }, [app, rows, open, saved, streaming, integration]);

  async function ask(text: string) {
    try {
      const res = await app!.sendMessage({ role: "user", content: [{ type: "text", text }] });
      if (res.isError) setCantMessage(true);
    } catch {
      setCantMessage(true);
    }
  }

  async function commit() {
    if (!app || !integration) return;
    setSaving(true);
    try {
      const decisions = rows.map((x) => ({ recordId: x.r.id, ...(x.current ?? { action: "skip" as const }), changed: x.changed }));
      const res = await app.callServerTool({ name: "commit_org_mappings", arguments: { integration: input.integration, decisions } });
      if (!res.isError) setSaved(res.structuredContent as Saved);
    } finally {
      setSaving(false);
    }
  }

  const counts = { look: toLook.length, confident: rows.length - toLook.length, all: rows.length };

  const confClass: Record<Confidence, string> = {
    high: "bg-success/15 text-success-soft",
    medium: "bg-warning/15 text-warning-soft",
    low: "bg-destructive/15 text-destructive-soft",
  };

  return (
    <main className="bg-card text-card-foreground">
      <Header
        title="Org mapping review"
        sub={integration ? `${integration.label} to Rewst orgs` : "Waiting for the AI's matches"}
        badge={saved ? "Saved" : streaming ? "Matching" : `${rows.length} records`}
        theme={theme}
        onToggle={toggle}
      />

      {streaming && (
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          The AI is matching records… {proposals.size} of {integration?.records.length ?? "?"} so far
        </div>
      )}

      {!saved && !streaming && (
        <div className="border-b px-4 py-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="look">Needs a look <span className="text-muted-foreground">{counts.look}</span></TabsTrigger>
              <TabsTrigger value="confident">Confident <span className="text-muted-foreground">{counts.confident}</span></TabsTrigger>
              <TabsTrigger value="all">All <span className="text-muted-foreground">{counts.all}</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {!saved && (
        <ol className="divide-y">
          {(streaming ? rows : shown).map(({ r, p, current, changed, needsLook, settled }) => (
            <li
              key={r.id}
              className={cn(
                "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(150px,1fr)_16px_minmax(200px,1.3fr)_auto] sm:items-start",
                !settled && "shadow-[inset_3px_0_0_hsl(var(--warning))]",
                !p && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="break-words text-xs text-muted-foreground">
                  {r.id} · {r.hint}
                </div>
              </div>
              <ArrowRight className="hidden size-4 text-muted-foreground sm:mt-2.5 sm:block" />
              <div className="min-w-0">
                <Select
                  value={current ? encode(current) : undefined}
                  disabled={!p || saving}
                  onValueChange={(v) => setChoices({ ...choices, [r.id]: decode(v) })}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="…" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={`map:${o.id}`}>
                        {o.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value="create">Create a new org</SelectItem>
                    <SelectItem value="skip">Skip this one</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p && <Badge className={cn("capitalize", confClass[p.confidence])}>{p.confidence}</Badge>}
                  {changed && <Badge className="bg-accent text-accent-foreground">Changed by you</Badge>}
                  <span className="text-xs text-muted-foreground">{p?.reason ?? "waiting…"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                {needsLook && p && !changed && (
                  <Button
                    size="xs"
                    variant={reviewed.has(r.id) ? "default" : "outline"}
                    onClick={() => {
                      const next = new Set(reviewed);
                      next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                      setReviewed(next);
                    }}
                  >
                    {reviewed.has(r.id) && <Check />} Looks right
                  </Button>
                )}
                {needsLook && p && !cantMessage && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => ask(`Look closer at "${r.name}" (${r.id}, ${r.hint}). Why ${describe(current!)}? What else could it be?`)}
                  >
                    <MessageCircleQuestion /> Ask the AI
                  </Button>
                )}
              </div>
            </li>
          ))}
          {!streaming && shown.length === 0 && <li className="px-4 py-5 text-sm text-muted-foreground">Nothing here.</li>}
        </ol>
      )}

      {!saved && !streaming && (
        <footer className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {open ? `${open} still need a look before you can commit.` : "All set. Only you can commit these; the AI can't."}
          </span>
          <Button disabled={!!open || saving} onClick={commit}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Commit {rows.length} mappings
          </Button>
        </footer>
      )}

      {saved && (
        <section className="space-y-3 px-4 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-primary">Saved</div>
            <h3 className="mt-0.5 text-lg font-semibold">
              {saved.map} mapped, {saved.create} new {saved.create === 1 ? "org" : "orgs"}, {saved.skip} skipped
            </h3>
            <p className="text-sm text-muted-foreground">
              You changed {saved.changed} of the AI's {saved.total} proposals.
              {saved.changed > 0 && " It can see what you changed, so you can ask it what it missed."}
            </p>
          </div>
          {rows.some((x) => x.changed) && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {rows
                .filter((x) => x.changed)
                .map((x) => (
                  <li key={x.r.id}>
                    <span className="font-semibold">{x.r.name}</span>: {x.proposed ? describe(x.proposed) : "no guess"} → {describe(x.current!)}
                  </li>
                ))}
            </ul>
          )}
          {!cantMessage && saved.changed > 0 && (
            <Button variant="outline" onClick={() => ask("Look at the mappings I changed. Is there a pattern you missed that you should use next time?")}>
              <Sparkles /> Ask the AI what it missed
            </Button>
          )}
        </section>
      )}

      {cantMessage && (
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">
          This chat doesn't accept messages from the card, so ask in the chat instead.
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Mapping />
  </StrictMode>,
);
