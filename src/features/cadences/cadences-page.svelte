<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import Card from "@/components/ui/card.svelte";
  import { cyclesCollection, todosCollection } from "@/db";
  import { ensureActiveCycle, getActiveCycle, getDashboardStats } from "@/lib/cadence";
  import CurrentCycleWorkspace from "@/features/dashboard/current-cycle-workspace.svelte";

  const todosQuery = useLiveQuery(todosCollection);
  const cyclesQuery = useLiveQuery(cyclesCollection);

  const activeCycle = $derived(getActiveCycle(cyclesQuery.data));
  const stats = $derived(getDashboardStats(todosQuery.data, activeCycle));

  $effect(() => {
    ensureActiveCycle(activeCycle);
  });
</script>

{#if !activeCycle}
  <Card
    class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md"
  >
    Preparing your first cycle...
  </Card>
{:else}
  <CurrentCycleWorkspace
    cycle={activeCycle}
    todos={stats.orderedTodos}
    settledTodos={stats.cycleTodos.filter((todo) => todo.status === "skipped")}
  />
{/if}
