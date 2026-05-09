import { useEffect, useState } from "react";
import { Dashboard } from "@/features/dashboard/dashboard";
import { HistoryPage } from "@/features/history/history-page";

function readPath(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

export function AppRoot() {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    function update() {
      setPath(readPath());
    }
    document.addEventListener("astro:after-swap", update);
    window.addEventListener("popstate", update);
    return () => {
      document.removeEventListener("astro:after-swap", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  if (path.startsWith("/history")) return <HistoryPage />;
  return <Dashboard />;
}
