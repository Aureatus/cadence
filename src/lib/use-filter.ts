import { useEffect, useState } from "react";
import { DEFAULT_FILTER, dashboardSearchSchema, type FilterKey } from "./filter";

function readFilter(): FilterKey {
  if (typeof window === "undefined") return DEFAULT_FILTER;
  const raw = new URL(window.location.href).searchParams.get("filter");
  return dashboardSearchSchema.parse({ filter: raw ?? undefined }).filter ?? DEFAULT_FILTER;
}

export function useFilter() {
  const [filter, setFilterState] = useState<FilterKey>(() => readFilter());

  useEffect(() => {
    function syncFromUrl() {
      setFilterState(readFilter());
    }
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function setFilter(next: FilterKey) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === DEFAULT_FILTER) {
      url.searchParams.delete("filter");
    } else {
      url.searchParams.set("filter", next);
    }
    window.history.replaceState({}, "", url.toString());
    setFilterState(next);
  }

  return [filter, setFilter] as const;
}
