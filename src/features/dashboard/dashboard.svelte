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

  function focusTodoRow(todoId: string) {
    const row = document.querySelector<HTMLElement>(`[data-todo-id="${todoId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.removeAttribute("data-dial-highlight");
    void row.offsetWidth;
    row.setAttribute("data-dial-highlight", "");
    window.setTimeout(() => row.removeAttribute("data-dial-highlight"), 2700);
  }
</script>

{#if !activeCycle}
  <Card
    class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md"
  >
    Preparing your first cycle...
  </Card>
{:else}
  <TideStage {stats} onSelectTodo={focusTodoRow} />
  <CurrentCycleWorkspace
    cycle={activeCycle}
    todos={stats.orderedTodos}
    settledTodos={stats.cycleTodos.filter((todo) => todo.status === "skipped")}
  />
{/if}
