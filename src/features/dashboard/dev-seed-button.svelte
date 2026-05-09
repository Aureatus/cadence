<script lang="ts">
  import { useLiveQuery } from "@tanstack/svelte-db";
  import EyeIcon from "lucide-svelte/icons/eye";
  import SparklesIcon from "lucide-svelte/icons/sparkles";
  import { cyclesCollection, todosCollection, type Cycle, type Todo } from "@/db";
  import { cn } from "@/lib/utils";
  import { runDevSeed } from "@/lib/dev-seed";
  import { createDefaultCycle } from "@/time";

  const FLAG_KEY = "cadence.preview.active";
  const TODOS_BACKUP = "cadence.todos.backup";
  const CYCLES_BACKUP = "cadence.cycles.backup";

  type WrappedCollection<T> = Record<string, { versionKey: string; data: T }>;

  const todosQuery = useLiveQuery(todosCollection);
  const cyclesQuery = useLiveQuery(cyclesCollection);

  let isPreview = $state(
    typeof window !== "undefined" && window.localStorage.getItem(FLAG_KEY) === "1",
  );

  function enterPreview() {
    const todosRaw = window.localStorage.getItem("cadence.todos");
    const cyclesRaw = window.localStorage.getItem("cadence.cycles");
    if (todosRaw !== null) window.localStorage.setItem(TODOS_BACKUP, todosRaw);
    if (cyclesRaw !== null) window.localStorage.setItem(CYCLES_BACKUP, cyclesRaw);

    for (const todo of todosQuery.data) todosCollection.delete(todo.id);
    for (const cycle of cyclesQuery.data) cyclesCollection.delete(cycle.id);

    const active = createDefaultCycle();
    cyclesCollection.insert(active);
    runDevSeed(active);

    window.localStorage.setItem(FLAG_KEY, "1");
    isPreview = true;
  }

  function exitPreview() {
    for (const todo of todosQuery.data) todosCollection.delete(todo.id);
    for (const cycle of cyclesQuery.data) cyclesCollection.delete(cycle.id);

    const cyclesBackup = window.localStorage.getItem(CYCLES_BACKUP);
    if (cyclesBackup) {
      const parsed = JSON.parse(cyclesBackup) as WrappedCollection<Cycle>;
      for (const wrapped of Object.values(parsed)) cyclesCollection.insert(wrapped.data);
    }
    const todosBackup = window.localStorage.getItem(TODOS_BACKUP);
    if (todosBackup) {
      const parsed = JSON.parse(todosBackup) as WrappedCollection<Todo>;
      for (const wrapped of Object.values(parsed)) todosCollection.insert(wrapped.data);
    }

    window.localStorage.removeItem(TODOS_BACKUP);
    window.localStorage.removeItem(CYCLES_BACKUP);
    window.localStorage.removeItem(FLAG_KEY);
    isPreview = false;
  }
</script>

<button
  type="button"
  onclick={isPreview ? exitPreview : enterPreview}
  title={isPreview ? "Restore your real data" : "Hide your data and show seeded preview"}
  class={cn(
    "fixed right-4 bottom-4 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase shadow-md backdrop-blur-md transition-colors",
    isPreview
      ? "border-coral/70 bg-coral/15 text-moon-2"
      : "border-rule-2 bg-[oklch(15%_0.02_220/0.85)] text-foam/70 hover:border-coral/60 hover:text-moon-2",
  )}
>
  {#if isPreview}
    <EyeIcon class="size-3.5" />
  {:else}
    <SparklesIcon class="size-3.5" />
  {/if}
  Preview · {isPreview ? "on" : "off"}
</button>
