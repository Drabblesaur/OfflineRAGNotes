import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "jot:theme";

function resolveIsDark(theme: Theme): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

export type UseThemeResult = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Single source of truth for the .dark class on <html> — call once in
// App.tsx and pass the result down, rather than calling this in multiple
// components, so there's only one media-query subscription.
export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolveIsDark(theme));

    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      document.documentElement.classList.toggle("dark", mql.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  function setTheme(next: Theme) {
    localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }

  return { theme, setTheme };
}
