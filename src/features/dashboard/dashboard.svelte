<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import type { Component } from "svelte";
  import Card from "@/components/ui/card.svelte";
  import { cyclesCollection, todosCollection } from "@/db";
  import type { Todo } from "@/db";
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

  let selectedTodoId = $state<string | null>(null);
  const selectedTodo = $derived<Todo | null>(
    selectedTodoId ? (todosQuery.data.find((todo) => todo.id === selectedTodoId) ?? null) : null,
  );

  let DetailSheet = $state<Component<{
    todo: Todo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> | null>(null);

  async function loadDetailSheet() {
    DetailSheet ??= (await import("./cadence-detail-sheet.svelte")).default;
  }

  async function openCadenceDetail(todoId: string) {
    await loadDetailSheet();
    selectedTodoId = todoId;
  }

  function closeDetail(next: boolean) {
    if (!next) selectedTodoId = null;
  }
</script>

{#if !activeCycle}
  <Card
    class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md"
  >
    Preparing your first cycle...
  </Card>
{:else}
  <TideStage
    {stats}
    onSelectTodo={openCadenceDetail}
    paused={selectedTodoId !== null}
  />
  <CurrentCycleWorkspace
    cycle={activeCycle}
    todos={stats.orderedTodos}
    settledTodos={stats.cycleTodos.filter((todo) => todo.status === "skipped")}
  />
  {#if DetailSheet}
    {@const Sheet = DetailSheet}
    <Sheet todo={selectedTodo} open={selectedTodoId !== null} onOpenChange={closeDetail} />
  {/if}
{/if}
