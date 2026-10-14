export type Kind = "trigger" | "action" | "condition" | "loop" | "form" | "approval" | "ai" | "data";
export type Status = "connected" | "missing" | "unknown";
export type Step = { id: string; label: string; kind: Kind; integration?: string; detail?: string; after?: string[]; edgeLabel?: string };
export type Frame = {
  title?: string;
  goal?: string;
  steps?: Partial<Step>[];
  integrations?: { name: string; status: Status; note?: string }[];
  reuse?: { name: string; note: string }[];
  questions?: { id: string; text: string; options: string[] }[];
};

const KINDS = ["trigger", "action", "condition", "loop", "form", "approval", "ai", "data"];
const STATUSES = ["connected", "missing", "unknown"];

export function complete(s: Partial<Step>): s is Step {
  return !!s?.id && !!s.label && !!s.kind && KINDS.includes(s.kind);
}

// Claude streams the tool input while the AI is still writing it, so any list can end
// in a half-written item (an integration with no status yet, a question with no
// options). Only keep the pieces that are whole.
export function clean(raw: Frame): Frame {
  const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  return {
    title: typeof raw.title === "string" ? raw.title : undefined,
    goal: typeof raw.goal === "string" ? raw.goal : undefined,
    steps: arr<Partial<Step>>(raw.steps)
      .filter(complete)
      .map((st) => ({ ...st, after: arr<string>(st.after).filter((a) => typeof a === "string") })),
    integrations: arr<NonNullable<Frame["integrations"]>[number]>(raw.integrations).filter(
      (i) => typeof i?.name === "string" && STATUSES.includes(i.status),
    ),
    reuse: arr<NonNullable<Frame["reuse"]>[number]>(raw.reuse).filter((r) => typeof r?.name === "string"),
    questions: arr<NonNullable<Frame["questions"]>[number]>(raw.questions)
      .filter((q) => typeof q?.id === "string" && typeof q.text === "string" && Array.isArray(q.options))
      .map((q) => ({ ...q, options: q.options.filter((o) => typeof o === "string" && o.length > 0) })),
  };
}

