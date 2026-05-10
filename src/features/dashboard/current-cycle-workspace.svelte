<script lang="ts" module>
  import type { FilterKey } from "@/lib/filter";

  const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
    { key: "due", label: "Due" },
    { key: "open", label: "Open windows" },
    { key: "logged", label: "Logged" },
    { key: "all", label: "All" },
  ];
</script>

<script lang="ts">
  import type { Component } from "svelte";
  import ChevronRightIcon from "lucide-svelte/icons/chevron-right";
  import PlusIcon from "lucide-svelte/icons/plus";
  import RotateCcwIcon from "lucide-svelte/icons/rotate-ccw";
  import { buttonVariants } from "@/components/ui/button.svelte";
  import Card from "@/components/ui/card.svelte";
  import CardContent from "@/components/ui/card-content.svelte";
  import { cn } from "@/lib/utils";
  import type { Cycle, Todo } from "@/db";
  import { archiveTodo, formatClock, isLoggedToday, isWindowOpen, restoreTodo } from "@/lib/cadence";
  import { useFilter } from "@/lib/use-filter.svelte";
  import { getDueState } from "@/time";
  import TodoCard from "./todo-card.svelte";

  // Lazy-loaded dialog components — see preloadDialogs() below
  let AddCadenceDialog = $state<Component<{
    cycle: Cycle;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> | null>(null);
  let EditCadenceDialog = $state<Component<{
    cycle: Cycle;
    todo: Todo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> | null>(null);
  let ArchiveConfirmDialog = $state<Component<{
    todo: Todo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }> | null>(null);

  async function loadAddDialog() {
    AddCadenceDialog ??= (await import("./add-cadence-dialog.svelte")).default;
  }
  async function loadEditDialog() {
    EditCadenceDialog ??= (await import("./edit-cadence-dialog.svelte")).default;
  }
  async function loadArchiveDialog() {
    ArchiveConfirmDialog ??= (await import("./archive-confirm-dialog.svelte")).default;
  }

  type Props = {
    cycle: Cycle;
    todos: Array<Todo>;
    settledTodos: Array<Todo>;
  };

  let { cycle, todos, settledTodos }: Props = $props();

  let editing = $state<Todo | null>(null);
  let archiveTarget = $state<Todo | null>(null);
  let addOpen = $state(false);
  let settledOpen = $state(false);
  const filterStore = useFilter();

  // Dialog chunks are downloaded on hover/click. No eager preload — that was
  // competing with critical render-path resources on slow mobile.

  async function openAdd() {
    await loadAddDialog();
    addOpen = true;
  }
  async function startEdit(todo: Todo) {
    await loadEditDialog();
    editing = todo;
  }
  async function startArchive(todo: Todo) {
    await loadArchiveDialog();
    archiveTarget = todo;
  }

  function matchesFilter(filter: FilterKey, todo: Todo) {
    if (filter === "all") return true;
    if (filter === "due") return getDueState(todo).isDue;
    if (filter === "open") return isWindowOpen(todo);
    return isLoggedToday(todo);
  }

  const counts = $derived(
    FILTERS.reduce<Record<FilterKey, number>>(
      (acc, entry) => {
        acc[entry.key] = todos.filter((todo) => matchesFilter(entry.key, todo)).length;
        return acc;
      },
      { due: 0, open: 0, logged: 0, all: 0 },
    ),
  );

  const filteredTodos = $derived(todos.filter((todo) => matchesFilter(filterStore.filter, todo)));

  const activeLabel = $derived(
    FILTERS.find((entry) => entry.key === filterStore.filter)?.label ?? "All",
  );

  const filterEmptyNext = $derived.by(() => {
    if (filterStore.filter !== "due") return undefined;
    return todos
      .map((todo) => ({ todo, due: getDueState(todo) }))
      .filter(({ due }) => !due.isDue)
      .sort((a, b) => a.due.dueAt.getTime() - b.due.dueAt.getTime())[0];
  });
</script>

<div>
  <div class="flex flex-col gap-3.5 border-b border-rule pt-10 pb-3.5">
    <div class="flex items-end justify-between gap-4">
      <h2
        class="font-display text-[clamp(24px,3.2vw,36px)] font-medium leading-[0.92] tracking-[-0.012em] text-moon-2"
      >
        Active
      </h2>
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
    <div
      class="-mx-1 flex w-[calc(100%+0.5rem)] gap-3 overflow-x-auto px-1 [scrollbar-width:none] md:justify-between [&::-webkit-scrollbar]:hidden"
    >
      {#each FILTERS as entry (entry.key)}
        {@const active = filterStore.filter === entry.key}
        {@const count = counts[entry.key]}
        {@const empty = count === 0}
        <button
          type="button"
          onclick={() => filterStore.setFilter(entry.key)}
          aria-pressed={active}
          class={cn(
            "inline-flex shrink-0 cursor-pointer items-baseline gap-1.5 border-0 border-b-[1.5px] border-transparent bg-transparent pb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap transition-colors",
            empty ? "text-moon/30 hover:text-moon/55" : "text-moon/50 hover:text-moon-2",
            active && "border-coral text-moon-2",
          )}
        >
          <span>{entry.label}</span>
          <span
            aria-hidden="true"
            class={cn(
              "tabular-nums normal-case tracking-normal transition-colors",
              active ? "text-coral" : empty ? "text-moon/25" : "text-foam/55",
            )}
          >
            {count}
          </span>
        </button>
      {/each}
    </div>
  </div>
  <div class="flex flex-col">
    {#if todos.length === 0}
      <Card
        class="mt-6 border border-rule bg-[oklch(20%_0.03_220/0.22)] gap-2 rounded-3xl py-6 ring-0 backdrop-blur-md"
      >
        <CardContent>
          <h3 class="font-display text-[28px] font-normal leading-none text-moon-2">
            No active cadences yet
          </h3>
          <p class="mt-2 text-sm leading-[1.6] text-foam opacity-75">
            Add a task with a daily frequency, allowed time bounds, and a minimum spacing rule.
          </p>
        </CardContent>
      </Card>
    {:else if filteredTodos.length === 0}
      {#if filterStore.filter === "due"}
        <div class="mt-8 flex flex-col items-start gap-2">
          <p class="font-display text-[clamp(20px,2vw,24px)] font-medium leading-tight text-moon-2">
            Nothing due now
          </p>
          {#if filterEmptyNext}
            <p class="font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
              Next ·{" "}
              <span class="text-coral normal-case tracking-normal">{filterEmptyNext.todo.title}</span>
              {" "}
              <span class="text-foam/55 normal-case tracking-normal">
                at {formatClock(filterEmptyNext.due.dueAt)}
              </span>
            </p>
          {:else}
            <p class="font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
              Nothing today
            </p>
          {/if}
        </div>
      {:else}
        <p class="mt-6 font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
          No matches for &lsquo;{activeLabel}&rsquo;
        </p>
      {/if}
    {:else}
      {#each filteredTodos as todo (todo.id)}
        <TodoCard {todo} onEdit={startEdit} onArchive={startArchive} />
      {/each}
    {/if}
  </div>
  {#if settledTodos.length > 0}
    <div class="mt-6 border-t border-rule pt-4">
      <button
        type="button"
        onclick={() => (settledOpen = !settledOpen)}
        aria-expanded={settledOpen}
        class="inline-flex w-fit cursor-pointer items-center gap-2 border-0 bg-transparent py-1 font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase transition-colors hover:text-moon-2"
      >
        <ChevronRightIcon
          class={cn("size-3 transition-transform", settledOpen ? "rotate-90" : "rotate-0")}
        />
        Settled · {settledTodos.length}
      </button>
      {#if settledOpen}
        <ul class="mt-3 grid gap-1.5">
          {#each settledTodos as todo (todo.id)}
            <li
              class="flex items-center justify-between gap-3 rounded-md border border-rule/80 bg-[oklch(15%_0.02_220/0.4)] px-3 py-2 transition-colors"
            >
              <span class="min-w-0 truncate font-display text-base text-foam/80">
                {todo.title}
              </span>
              <button
                type="button"
                onclick={() => restoreTodo(todo)}
                aria-label={`Restore ${todo.title}`}
                class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foam/65 transition-colors hover:text-coral-2"
              >
                <RotateCcwIcon class="size-3" />
                Restore
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
  {#if AddCadenceDialog}
    {@const Add = AddCadenceDialog}
    <Add
      {cycle}
      open={addOpen}
      onOpenChange={(next) => (addOpen = next)}
    />
  {/if}
  {#if EditCadenceDialog}
    {@const Edit = EditCadenceDialog}
    <Edit
      {cycle}
      todo={editing}
      open={editing !== null}
      onOpenChange={(next) => {
        if (!next) editing = null;
      }}
    />
  {/if}
  {#if ArchiveConfirmDialog}
    {@const Archive = ArchiveConfirmDialog}
    <Archive
      todo={archiveTarget}
      open={archiveTarget !== null}
      onOpenChange={(next) => {
        if (!next) archiveTarget = null;
      }}
      onConfirm={() => {
        if (archiveTarget) archiveTodo(archiveTarget);
        archiveTarget = null;
      }}
    />
  {/if}
</div>
