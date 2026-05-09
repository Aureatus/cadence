<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import Card from "@/components/ui/card.svelte";
  import { cyclesCollection, todosCollection } from "@/db";
  import { ensureActiveCycle, getActiveCycle, getDashboardStats } from "@/lib/cadence";
  import CurrentCycleWorkspace from "./current-cycle-workspace.svelte";
  import TideStage from "./tide-stage.svelte";

  const todosQuery = useLiveQuery(todosCollection);
  const cyclesQuery = useLiveQuery(cyclesCollection);

  const activeCycle = $derived(getActiveCycle(cyclesQuery.data));
  const stats = $derived(getDashboardStats(todosQuery.data, activeCycle));

  $effect(() => {
    ensureActiveCycle(activeCycle);
  });

  const today = new Date();
  const weekday = today.toLocaleDateString([], { weekday: "long" });
  const dateLabel = today.toLocaleDateString([], { day: "numeric", month: "long" });
</script>

{#if !activeCycle}
  <Card
    class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md"
  >
    Preparing your first cycle...
  </Card>
{:else}
  <section
    class="mt-4 flex justify-end border-b border-rule pb-5 md:mt-5 md:pb-6"
  >
    <div
      class="font-mono text-[10px] uppercase leading-[1.7] tracking-[0.16em] text-foam opacity-75 md:text-[11px] md:tracking-[0.22em] lg:text-right"
    >
      {weekday} · <b class="font-medium text-moon-2">{dateLabel}</b>
      <br />
      Cycle <b class="font-medium text-moon-2">{activeCycle.title}</b>
      <br />
      Local-first · <b class="font-medium text-moon-2">offline ready</b>
    </div>
  </section>
  <div
    class="2xl:grid 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] 2xl:items-start 2xl:gap-12 3xl:gap-16"
  >
    <TideStage cycle={activeCycle} {stats} />
    <CurrentCycleWorkspace
      cycle={activeCycle}
      todos={stats.orderedTodos}
      settledTodos={stats.cycleTodos.filter((todo) => todo.status === "skipped")}
    />
  </div>
{/if}
