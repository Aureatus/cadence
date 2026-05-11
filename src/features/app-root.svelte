<script lang="ts">
  import type { Component } from "svelte";
  import Dashboard from "@/features/dashboard/dashboard.svelte";

  function readPath(): string {
    if (typeof window === "undefined") return "/";
    return window.location.pathname;
  }

  let path = $state(readPath());
  let HistoryPage = $state<Component | null>(null);
  let CadencesPage = $state<Component | null>(null);

  $effect(() => {
    function update() {
      path = readPath();
    }
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  });

  $effect(() => {
    if (path.startsWith("/history") && !HistoryPage) {
      void import("@/features/history/history-page.svelte").then((m) => {
        HistoryPage = m.default;
      });
    }
    if (path.startsWith("/cadences") && !CadencesPage) {
      void import("@/features/cadences/cadences-page.svelte").then((m) => {
        CadencesPage = m.default;
      });
    }
  });
</script>

{#if path.startsWith("/history")}
  {#if HistoryPage}
    {@const View = HistoryPage}
    <View />
  {/if}
{:else if path.startsWith("/cadences")}
  {#if CadencesPage}
    {@const View = CadencesPage}
    <View />
  {/if}
{:else}
  <Dashboard />
{/if}
