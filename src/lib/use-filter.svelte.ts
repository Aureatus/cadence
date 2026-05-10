import * as v from "valibot";
import { DEFAULT_FILTER, dashboardSearchSchema, type FilterKey } from "./filter";

function readFilter(): FilterKey {
  if (typeof window === "undefined") return DEFAULT_FILTER;
  const raw = new URL(window.location.href).searchParams.get("filter");
  return v.parse(dashboardSearchSchema, { filter: raw ?? undefined }).filter ?? DEFAULT_FILTER;
}

export function useFilter() {
  let filter = $state<FilterKey>(readFilter());

  $effect(() => {
    function syncFromUrl() {
      filter = readFilter();
    }
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  });

  function setFilter(next: FilterKey) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === DEFAULT_FILTER) {
      url.searchParams.delete("filter");
    } else {
      url.searchParams.set("filter", next);
    }
    window.history.replaceState({}, "", url.toString());
    filter = next;
  }

  return {
    get filter() {
      return filter;
    },
    setFilter,
  };
}
