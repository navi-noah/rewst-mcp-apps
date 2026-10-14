import type { App } from "@modelcontextprotocol/ext-apps";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function stored(): Theme | null {
  try {
    return (localStorage.getItem("rewst-theme") as Theme | null) ?? null;
  } catch {
    return null; // sandboxed frames often don't get storage
  }
}

// Follows the chat's theme until you click the toggle. Clicking back to whatever the
// chat is using goes back to following it.
export function useTheme(app: App | null) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const [system, setSystem] = useState<Theme>(media.matches ? "dark" : "light");
  const [picked, setPicked] = useState<Theme | null>(stored);

  useEffect(() => {
    const onMedia = (e: MediaQueryListEvent) => setSystem(e.matches ? "dark" : "light");
    media.addEventListener("change", onMedia);
    return () => media.removeEventListener("change", onMedia);
  }, []);

  useEffect(() => {
    if (!app) return;
    const t = app.getHostContext()?.theme;
    if (t) setSystem(t);
    const onCtx = (ctx: { theme?: Theme }) => ctx.theme && setSystem(ctx.theme);
    app.addEventListener("hostcontextchanged", onCtx);
    return () => app.removeEventListener("hostcontextchanged", onCtx);
  }, [app]);

  const theme = picked ?? system;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const keep = next === system ? null : next;
    setPicked(keep);
    try {
      keep ? localStorage.setItem("rewst-theme", keep) : localStorage.removeItem("rewst-theme");
    } catch {}
  };

  return { theme, toggle };
}
