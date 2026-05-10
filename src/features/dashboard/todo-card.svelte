<script lang="ts">
  import PencilIcon from "lucide-svelte/icons/pencil";
  import XIcon from "lucide-svelte/icons/x";
  import Button from "@/components/ui/button.svelte";
  import { cn } from "@/lib/utils";
  import type { Todo } from "@/db";
  import { getTodoPresentation, markTodoComplete } from "@/lib/cadence";
  import { formatWhen, getDueState } from "@/time";

  type Props = {
    todo: Todo;
    onEdit: ((todo: Todo) => void) | undefined;
    onArchive: ((todo: Todo) => void) | undefined;
  };

  let { todo, onEdit, onArchive }: Props = $props();

  const due = $derived(getDueState(todo));
  const presentation = $derived(getTodoPresentation(due, todo));
  const isDue = $derived(presentation.rowTone === "due");
  const isDone = $derived(presentation.rowTone === "done");

  const total = $derived(Math.max(1, Math.min(8, todo.frequencyPerDay)));
  const completed = $derived(Math.min(todo.completionLog.length, total));
  const currentClass = $derived(due.isLate ? "miss" : "now");
  const bars = $derived(
    Array.from({ length: total }, (_, index) => ({
      key: `${todo.id}-${index}`,
      state: index < completed ? "done" : currentClass,
      height: 12 + ((index * 5) % 6) * 2,
    })),
  );

  const buttonVariant = $derived(
    isDue ? "tide-due" : presentation.buttonTone === "ghost" ? "tide-ghost" : "tide",
  );
</script>

<article
  aria-label={`Todo: ${todo.title}`}
  class={cn(
    "group/todo relative grid border-b border-rule transition-colors",
    "grid-cols-[40px_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-start gap-x-3.5 gap-y-1.5 py-4",
    "md:grid-cols-[48px_minmax(0,1fr)_minmax(0,130px)_minmax(0,130px)] md:grid-rows-1 md:items-center md:gap-5 md:py-5",
    "xl:grid-cols-[48px_minmax(180px,1.3fr)_minmax(0,120px)_minmax(0,1fr)_minmax(0,120px)]",
    isDue &&
      "-mx-3 bg-gradient-to-r from-[oklch(60%_0.14_35/0.1)] to-transparent to-70% px-3 md:mx-0 md:px-4",
  )}
>
  <div
    aria-hidden="true"
    class={cn(
      "row-span-2 flex size-9 items-center justify-center self-start rounded-full border border-rule-2 bg-[oklch(20%_0.03_220/0.3)] font-display text-base font-medium text-foam md:row-span-1 md:size-11 md:self-center md:text-[20px]",
      isDue && "border-coral bg-coral text-moon-2",
      isDone && "border-foam bg-foam text-deep",
    )}
  >
    {presentation.icon}
  </div>
  <div class="col-start-2 min-w-0">
    <div
      class="font-display text-[clamp(18px,2vw,28px)] font-medium leading-tight tracking-[-0.012em] text-moon-2"
    >
      {todo.title}
      {#if todo.notes}
        <span
          class="mt-1 block font-display text-[clamp(11px,1.05vw,14px)] font-normal leading-[1.4] tracking-[0.01em] text-foam opacity-70"
        >
          {todo.notes}
        </span>
      {/if}
    </div>
  </div>
  <div
    class="col-start-2 row-start-2 flex flex-row flex-wrap items-baseline gap-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-moon/65 md:col-start-3 md:row-start-1 md:block md:text-[11px]"
  >
    <span>{todo.frequencyPerDay}×/day</span>
    <span
      class="block font-display text-[12px] font-medium tabular-nums text-sand md:mt-1 md:text-[20px] md:leading-tight"
    >
      {formatWhen(due.dueAt)}
    </span>
    <span class={cn(due.isLate && "text-rose")}>{presentation.impact}</span>
    <span class="hidden md:inline">{due.adherenceScore}% if done</span>
    <span class="hidden md:inline">Next {formatWhen(due.nextDueAt)}</span>
  </div>
  <div aria-hidden="true" class="hidden items-center gap-1.5 xl:flex">
    {#each bars as bar (bar.key)}
      <i
        class={cn(
          "block w-[7px] rounded-[4px]",
          bar.state === "done" && "bg-moon-2",
          bar.state === "miss" && "bg-rose opacity-90",
          bar.state === "now" && "bg-coral animate-tide-bob",
        )}
        style={`height: ${bar.height}px;`}
      ></i>
    {/each}
  </div>
  <Button
    type="button"
    aria-label="Mark complete"
    variant={buttonVariant}
    size="pill"
    onclick={() => markTodoComplete(todo)}
    class="col-start-2 row-start-3 justify-self-start md:col-start-4 md:row-start-1 md:justify-self-stretch md:[&]:max-w-full xl:col-start-5"
  >
    {presentation.action}
  </Button>
  <div class="absolute top-1.5 right-1 flex gap-1">
    {#if onEdit}
      <button
        type="button"
        aria-label={`Edit ${todo.title}`}
        title="Edit cadence"
        onclick={() => onEdit?.(todo)}
        class="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.6)] text-foam/75 transition-colors hover:border-coral/70 hover:bg-coral/15 hover:text-moon-2"
      >
        <PencilIcon class="size-3.5" />
      </button>
    {/if}
    {#if onArchive}
      <button
        type="button"
        aria-label={`Archive ${todo.title}`}
        title="Archive cadence"
        onclick={() => onArchive?.(todo)}
        class="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.6)] text-foam/75 transition-colors hover:border-rose/70 hover:bg-rose/15 hover:text-moon-2"
      >
        <XIcon class="size-3.5" />
      </button>
    {/if}
  </div>
</article>
