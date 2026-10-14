import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bot,
  Check,
  Database,
  FileText,
  GitBranch,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Repeat,
  UserCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Component, StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "./shared/Header";
import { useTheme } from "./shared/useTheme";
import "./globals.css";

import { clean, complete, type Frame, type Kind, type Status, type Step } from "./frameData";

// Same category colors Rewst's workflow editor uses for its nodes
const kinds: Record<Kind, { hsl: string; icon: LucideIcon; name: string }> = {
  trigger: { hsl: "142 76% 36%", icon: Zap, name: "Trigger" },
  action: { hsl: "189 94% 43%", icon: Play, name: "Action" },
  data: { hsl: "45 93% 58%", icon: Database, name: "Data" },
  ai: { hsl: "320 60% 58%", icon: Bot, name: "AI" },
  loop: { hsl: "271 91% 65%", icon: Repeat, name: "Loop" },
  condition: { hsl: "214 84% 56%", icon: GitBranch, name: "Condition" },
  form: { hsl: "39 100% 49%", icon: FileText, name: "Form" },
  approval: { hsl: "252 33% 55%", icon: UserCheck, name: "Approval" },
};

const statusStyle: Record<string, { label: string; className: string }> = {
  connected: { label: "set up", className: "bg-success/15 text-success-soft" },
  missing: { label: "not set up", className: "bg-destructive/15 text-destructive-soft" },
  unknown: { label: "unknown", className: "bg-secondary text-muted-foreground" },
};

type StepData = Step & { status?: Status };
const NODE_W = 260;
const NODE_H = 86;

function StepNode({ data }: NodeProps<Node<StepData>>) {
  const k = kinds[data.kind] ?? kinds.action;
  const Icon = k.icon;
  return (
    <div
      className="rounded-xl border-2 bg-card text-card-foreground"
      style={{ width: NODE_W, borderColor: `hsl(${k.hsl} / 0.4)` }}
    >
      {data.kind !== "trigger" && <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-muted-foreground" />}
      <div className="flex items-start gap-2.5 p-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `hsl(${k.hsl} / 0.24)`, color: `hsl(${k.hsl})` }}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold leading-tight">{data.label}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{data.integration ?? k.name}</span>
            {data.status && <span className={cn("rounded px-1 py-px font-medium", statusStyle[data.status].className)}>{statusStyle[data.status].label}</span>}
          </div>
          {data.detail && <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{data.detail}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0" style={{ background: `hsl(${k.hsl})` }} />
    </div>
  );
}

// HTML labels via EdgeLabelRenderer so branch names render like the rest of the card
function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style }: EdgeProps) {
  const [path, x, y] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10 });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute rounded-md border bg-card px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { step: StepNode };
const edgeTypes = { labeled: LabeledEdge };

function layout(steps: Step[], frame: Frame) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 70 });
  g.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(steps.map((s) => s.id));
  for (const s of steps) g.setNode(s.id, { width: NODE_W, height: NODE_H });
  const edges: Edge[] = [];
  for (const s of steps)
    for (const from of s.after ?? [])
      if (ids.has(from)) {
        g.setEdge(from, s.id);
        edges.push({
          id: `${from}-${s.id}`,
          source: from,
          target: s.id,
          type: "labeled",
          label: s.edgeLabel,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
          style: { stroke: "#64748b", strokeWidth: 2 },
        });
      }
  dagre.layout(g);
  const statusOf = (name?: string) => (name ? frame.integrations?.find((i) => i.name.toLowerCase() === name.toLowerCase())?.status : undefined);
  const nodes: Node<StepData>[] = steps.map((s) => {
    const p = g.node(s.id);
    return { id: s.id, type: "step", position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, data: { ...s, status: statusOf(s.integration) } };
  });
  return { nodes, edges };
}

function Canvas({ nodes, edges, dark }: { nodes: Node<StepData>[]; edges: Edge[]; dark: boolean }) {
  const flow = useReactFlow();
  const ready = useNodesInitialized();
  // fit once the nodes have real sizes, and again whenever the AI adds steps
  useEffect(() => {
    if (ready) flow.fitView({ padding: 0.12 });
  }, [ready, nodes.length, edges.length]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode={dark ? "dark" : "light"}
      fitView
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

function FrameCard() {
  const [frame, setFrame] = useState<Frame>({});
  const [streaming, setStreaming] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [full, setFull] = useState(false);
  const [sent, setSent] = useState<"" | "update" | "build">("");

  const { app } = useApp({
    appInfo: { name: "rewst-workflow-frame", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (a: App) => {
      a.ontoolinputpartial = ({ arguments: args }) => setFrame(clean((args ?? {}) as Frame));
      a.ontoolinput = ({ arguments: args }) => {
        setFrame(clean((args ?? {}) as Frame));
        setStreaming(false);
      };
      a.ontoolresult = () => setStreaming(false);
    },
  });
  const { theme, toggle } = useTheme(app);

  const steps = useMemo(() => (frame.steps ?? []).filter(complete), [frame]);
  const { nodes, edges } = useMemo(() => layout(steps, frame), [steps, frame]);
  const questions = frame.questions ?? [];

  // the AI sees the person's picks as they make them
  useEffect(() => {
    if (!app || !Object.keys(answers).length) return;
    const lines = questions.filter((q) => answers[q.id]).map((q) => `- ${q.text} ${answers[q.id]}`);
    app.updateModelContext({ content: [{ type: "text", text: `Answers so far on "${frame.title}":\n${lines.join("\n")}` }] }).catch(() => {});
  }, [answers]);

  const canFull = app?.getHostContext()?.availableDisplayModes?.includes("fullscreen") ?? true;
  async function toggleFull() {
    try {
      const res = await app!.requestDisplayMode({ mode: full ? "inline" : "fullscreen" });
      setFull(res.mode === "fullscreen");
    } catch {}
  }

  async function ask(kind: "update" | "build") {
    if (!app) return;
    const answered = questions.filter((q) => answers[q.id]).map((q) => `${q.text} ${answers[q.id]}`);
    const text =
      kind === "update"
        ? `My answers:\n${answered.map((a) => `- ${a}`).join("\n")}\nUpdate the frame.`
        : `The frame for "${frame.title}" looks right${answered.length ? ` (with these answers: ${answered.join("; ")})` : ""}. Build it in Rewst. If Rewst's MCP server is connected, use it and reuse what the frame marked. Check with me before publishing anything.`;
    try {
      const res = await app.sendMessage({ role: "user", content: [{ type: "text", text }] });
      if (!res.isError) setSent(kind);
    } catch {}
  }

  return (
    <main className="bg-card text-card-foreground">
      <Header
        title={frame.title ?? "Framing your workflow"}
        sub={frame.goal ?? "The AI is sketching it out…"}
        badge={streaming ? "Sketching" : `${steps.length} steps`}
        theme={theme}
        onToggle={toggle}
        extra={
          canFull && (
            <Button variant="ghost" size="icon" className="size-8" onClick={toggleFull} title={full ? "Exit full screen" : "Full screen"}>
              {full ? <Minimize2 /> : <Maximize2 />}
            </Button>
          )
        }
      />

      <Boundary key={JSON.stringify(frame).length}>
      <div className={cn("relative border-b bg-background", full ? "h-[70vh]" : "h-[340px]")}>
        {steps.length > 0 ? (
          <ReactFlowProvider>
            <Canvas nodes={nodes} edges={edges} dark={theme === "dark"} />
          </ReactFlowProvider>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Sketching the workflow…
          </div>
        )}
      </div>

      {!!frame.integrations?.length && (
        <section className="flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
          <span className="mr-1 text-xs font-semibold">Integrations</span>
          {frame.integrations.map((i) => (
            <Badge key={i.name} className={statusStyle[i.status].className} title={i.note}>
              {i.name}: {statusStyle[i.status].label}
            </Badge>
          ))}
        </section>
      )}

      {!!frame.reuse?.length && (
        <section className="border-b px-4 py-3">
          <div className="mb-1 text-xs font-semibold">Already in your Rewst</div>
          <ul className="space-y-0.5 text-sm">
            {frame.reuse.map((r) => (
              <li key={r.name}>
                <span className="font-semibold">{r.name}</span> <span className="text-muted-foreground">{r.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 && (
        <section className="space-y-3 border-b px-4 py-3">
          <div className="text-xs font-semibold">Before it gets built</div>
          {questions.map((q) => (
            <div key={q.id}>
              <div className="mb-1.5 text-sm">{q.text}</div>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((o) => (
                  <Button
                    key={o}
                    size="xs"
                    variant={answers[q.id] === o ? "default" : "outline"}
                    onClick={() => setAnswers({ ...answers, [q.id]: o })}
                  >
                    {answers[q.id] === o && <Check />} {o}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!streaming && (
        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {sent === "build" ? "Sent to the chat to build." : sent === "update" ? "Sent your answers, a new frame is on the way." : "Nothing gets built until you say so."}
          </span>
          <div className="flex gap-2">
            {questions.length > 0 && (
              <Button variant="outline" disabled={!Object.keys(answers).length || !!sent} onClick={() => ask("update")}>
                Update the frame
              </Button>
            )}
            <Button disabled={!!sent} onClick={() => ask("build")}>
              <Check /> Looks right, build it
            </Button>
          </div>
        </footer>
      )}
      </Boundary>
    </main>
  );
}

// If drawing ever fails, say so instead of leaving a blank box. It sits inside the card
// (keyed on the input) so the connection to the chat survives and the next input retries.
class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="p-4 text-sm text-muted-foreground">Still drawing the plan…</div>
    ) : (
      this.props.children
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FrameCard />
  </StrictMode>,
);
