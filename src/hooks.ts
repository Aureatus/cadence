import { useEffect } from "react";
import { settingsCollection, type Settings } from "@/db";

let isCreatingSettings = false;

export function useEnsureSettings(settings: Array<Settings>) {
  useEffect(() => {
    if (settings.some((entry) => entry.id === "settings") || isCreatingSettings) return;

    isCreatingSettings = true;
    settingsCollection.insert({ id: "settings", theme: "system" });
  }, [settings]);
}

export function useApplyTheme(settings: Array<Settings>) {
  useEffect(() => {
    const theme = settings.find((entry) => entry.id === "settings")?.theme ?? "system";
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && query.matches),
      );
    };

    applyTheme();
    query.addEventListener("change", applyTheme);

    return () => {
      query.removeEventListener("change", applyTheme);
    };
  }, [settings]);
}
