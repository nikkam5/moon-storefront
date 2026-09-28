"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    let selected: "light" | "dark" | null = null;
    try { const saved = localStorage.getItem("moonstore-theme"); if (saved === "light" || saved === "dark") selected = saved; } catch { /* System preference is the fallback. */ }
    function apply(value: "light" | "dark") { document.documentElement.dataset.theme = value; setTheme(value); }
    apply(selected ?? (media.matches ? "dark" : "light"));
    const onSystemChange = () => { if (!document.documentElement.dataset.themeOverride) apply(media.matches ? "dark" : "light"); };
    if (selected) document.documentElement.dataset.themeOverride = "true";
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.themeOverride = "true";
    setTheme(next);
    try { localStorage.setItem("moonstore-theme", next); } catch { /* The setting still works for this session. */ }
  }
  return <button className="icon-button theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><Sun className="theme-sun" size={19} /><Moon className="theme-moon" size={19} /></button>;
}
