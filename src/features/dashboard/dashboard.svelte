<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import type { Component } from "svelte";
  import PlusIcon from "lucide-svelte/icons/plus";
  import { buttonVariants } from "@/components/ui/button.svelte";
  import Card from "@/components/ui/card.svelte";
  import { cyclesCollection, todosCollection } from "@/db";
  import type { Cycle, Todo } from "@/db";
  import { cn } from "@/lib/utils";
  import { ensureActiveCycle, getActiveCycle, getDashboardStats } from "@/lib/cadence";
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

  let AddCadenceDialog = $state<Component<{
    cycle: Cycle;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> | null>(null);
  let addOpen = $state(false);

  async function loadDetailSheet() {
    DetailSheet ??= (await import("./cadence-detail-sheet.svelte")).default;
  }

  async function loadAddDialog() {
    AddCadenceDialog ??= (await import("./add-cadence-dialog.svelte")).default;
  }

  async function openCadenceDetail(todoId: string) {
    await loadDetailSheet();
    selectedTodoId = todoId;
  }

  function closeDetail(next: boolean) {
    if (!next) selectedTodoId = null;
  }

  async function openAdd() {
    await loadAddDialog();
    addOpen = true;
  }
</script>

{#if !activeCycle}
  <Card
    class="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md"
  >
    Preparing your first cycle...
  </Card>
{:else}
  <TideStage {stats} onSelectTodo={openCadenceDetail} paused={selectedTodoId !== null} />
  <div class="mt-10 flex justify-center">
    <button
      type="button"
      onclick={openAdd}
      onmouseenter={() => void loadAddDialog()}
      class={cn(buttonVariants({ variant: "tide-ghost", size: "pill" }))}
    >
      <PlusIcon class="size-3.5" />
      <span>Add cadence</span>
    </button>
  </div>
  {#if DetailSheet}
    {@const Sheet = DetailSheet}
    <Sheet todo={selectedTodo} open={selectedTodoId !== null} onOpenChange={closeDetail} />
  {/if}
  {#if AddCadenceDialog}
    {@const Add = AddCadenceDialog}
    <Add cycle={activeCycle} open={addOpen} onOpenChange={(next) => (addOpen = next)} />
  {/if}
{/if}
