import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { Check, Code, Eye, EyeOff, HardDrive, ShieldCheck, SquareMousePointer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Badge } from "@/components/ui/badge";
import { about } from "../server/about";
import { Header } from "./shared/Header";
import { useTheme } from "./shared/useTheme";
import "./globals.css";

function Section({ icon: Icon, title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-3">
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function List({ items, icon: Icon, tone }: { items: string[]; icon: typeof Check; tone: string }) {
  return (
    <ul className="space-y-1">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm">
          <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function About() {
  const { app } = useApp({ appInfo: { name: "rewst-about", version: "0.1.0" }, capabilities: {} });
  const { theme, toggle } = useTheme(app);

  return (
    <main className="bg-card text-card-foreground">
      <Header title="What this server can see" sub="Plain answers about this connector" theme={theme} onToggle={toggle} />

      <div className="flex items-center gap-2 border-b bg-success/10 px-4 py-3 text-sm">
        <ShieldCheck className="size-5 shrink-0 text-success-soft" />
        <span>
          It's a demo with made-up data. It can't reach your tenant, your systems or your other connectors, and it keeps nothing.
        </span>
      </div>

      <Section icon={Eye} title="What it can see">
        <List items={about.sees} icon={Check} tone="text-success-soft" />
      </Section>

      <Section icon={EyeOff} title="What it can't see">
        <List items={about.cannot.map((c) => c[0].toUpperCase() + c.slice(1))} icon={X} tone="text-destructive-soft" />
      </Section>

      <Section icon={HardDrive} title="What it keeps">
        <p className="text-sm">{about.keeps}</p>
        <p className="mt-1 text-sm text-muted-foreground">{about.data}</p>
      </Section>

      <Section icon={ShieldCheck} title={about.trustTitle}>
        <p className="text-sm">{about.trust}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5"
          onClick={() => app?.openLink({ url: about.source }).catch(() => window.open(about.source, "_blank"))}
        >
          <Code /> Read the source
        </Button>
      </Section>

      <Section icon={SquareMousePointer} title="What the cards can do">
        <List items={about.cards} icon={Check} tone="text-muted-foreground" />
      </Section>

      <section className="px-4 py-3">
        <h3 className="mb-2 text-sm font-semibold">Every tool it has</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Tool</th>
                <th className="px-3 py-2 font-medium">Who can call it</th>
                <th className="px-3 py-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {about.tools.map((t) => (
                <tr key={t.name} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs">{t.name}</td>
                  <td className="px-3 py-2">
                    <Badge variant={t.who === "AI" ? "secondary" : "outline"}>{t.who}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.does}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <About />
  </StrictMode>,
);
