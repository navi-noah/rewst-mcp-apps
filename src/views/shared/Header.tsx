import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import logoLight from "../../../assets/rewst-logo.png";
import logoDark from "../../../assets/rewst-logo-ondark.png";

type Props = { title: string; sub: string; badge?: string; theme: "light" | "dark"; onToggle: () => void; extra?: React.ReactNode };

export function Header({ title, sub, badge, theme, onToggle, extra }: Props) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <img src={theme === "dark" ? logoDark : logoLight} alt="Rewst" className="h-7 w-auto" />
      <div className="min-w-0 border-l pl-3">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {badge && <Badge variant="secondary">{badge}</Badge>}
        {extra}
        <Button variant="ghost" size="icon" className="size-8" onClick={onToggle} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}
