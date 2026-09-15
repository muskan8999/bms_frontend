"use client";

import * as React from "react";
import { useAppStore } from "@/store/app-store";

/** Applies the saved theme to <html>, following the OS when set to "system". */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAppStore();
  const theme = state.settings.theme;

  React.useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  return <>{children}</>;
}
