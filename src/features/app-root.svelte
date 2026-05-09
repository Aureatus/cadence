<script lang="ts">
  import Dashboard from "@/features/dashboard/dashboard.svelte";
  import HistoryPage from "@/features/history/history-page.svelte";

  function readPath(): string {
    if (typeof window === "undefined") return "/";
    return window.location.pathname;
  }

  let path = $state(readPath());

  $effect(() => {
    function update() {
      path = readPath();
    }
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  });
</script>

{#if path.startsWith("/history")}
  <HistoryPage />
{:else}
  <Dashboard />
{/if}
