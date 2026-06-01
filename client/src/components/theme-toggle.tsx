import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/**
 * Brutalist theme toggle.
 * One button, hard click, sun ↔ moon. The system option still lives in
 * the provider but new clicks always resolve to an explicit light/dark.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setResolved(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) =>
        setResolved(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    setResolved(theme);
  }, [theme]);

  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="
        inline-flex h-10 w-10 items-center justify-center
        border-2 border-border bg-background text-foreground
        shadow-brutal-sm transition-[transform,box-shadow] duration-75
        hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
        active:translate-x-[2px] active:translate-y-[2px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
      "
    >
      {resolved === "dark" ? (
        <Sun className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );
}
