<script lang="ts">
  import type { Cycle } from "@/db";
  import { formatClock, type DashboardStats } from "@/lib/cadence";
  import { getDueState } from "@/time";
  import DayDial from "./day-dial.svelte";

  type Props = { cycle: Cycle; stats: DashboardStats };

  let { cycle, stats }: Props = $props();

  const nextTodo = $derived(stats.orderedTodos[0]);
  const kept = $derived(
    stats.cycleTodos.reduce((sum, todo) => sum + todo.completionLog.length, 0),
  );
  const possible = $derived(
    Math.max(kept + stats.activeCount + stats.skippedCount, stats.activeCount),
  );
  const nextDue = $derived(
    stats.orderedTodos[0] ? getDueState(stats.orderedTodos[0]).dueAt : undefined,
  );
  const missed = $derived(stats.skippedCount);

  let now = $state(new Date());
  $effect(() => {
    const interval = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(interval);
  });
</script>

<section
  class="mt-6 grid items-center gap-7 md:mt-8 md:gap-8 xl:mt-9 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-11"
>
  <div
    aria-label={`Average adherence score ${stats.score}`}
    class="relative mx-auto aspect-square w-full max-w-[353px] [&_svg]:size-full [&_svg]:overflow-visible md:max-w-[640px] xl:max-w-[580px]"
  >
    <DayDial todos={stats.orderedTodos} />
    <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
      <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-foam opacity-65">
        it is
      </span>
      <span
        class="font-display text-[clamp(56px,12vw,116px)] font-normal italic leading-[0.88] tracking-[-0.025em] text-moon-2 tabular-nums"
      >
        {formatClock(now)}
      </span>
      <span class="mt-1 font-display text-[clamp(13px,1.4vw,18px)] italic text-foam">
        <b class="font-medium not-italic text-sand">{kept}</b> of {possible} returns kept
      </span>
      <span
        class="mt-2 inline-flex max-w-[82%] items-center gap-2.5 truncate rounded-full border border-rule-2 bg-[oklch(20%_0.03_220/0.32)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foam backdrop-blur-md md:px-4 md:py-2 md:text-[11px]"
      >
        <span
          aria-hidden="true"
          class="block size-1.5 shrink-0 rounded-full bg-coral animate-tide-pulse"
        ></span>
        next:
        <b class="font-medium normal-case text-sand">
          {nextTodo ? nextTodo.title : "Add a cadence"}
        </b>
      </span>
    </div>
  </div>
  <aside
    class="grid grid-cols-3 gap-0 border-t border-rule pt-5 md:pt-7 xl:flex xl:flex-col xl:gap-5 xl:border-t-0 xl:pt-0"
  >
    <div
      class="min-w-0 overflow-hidden border-l border-rule px-2.5 first:border-l-0 first:pl-0 last:pr-0 md:px-6 xl:border-l-0 xl:border-t xl:border-rule xl:px-0 xl:py-5 xl:first:border-t-0 xl:first:pt-0"
    >
      <div class="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-foam opacity-60">
        tonight closes at
      </div>
      <div
        class="font-display text-[clamp(26px,4vw,56px)] font-normal leading-[0.88] tracking-[-0.018em] text-moon-2"
      >
        22:30
      </div>
      <div
        class="mt-1.5 line-clamp-2 font-display text-[clamp(11px,1.2vw,17px)] italic leading-[1.3] text-foam opacity-80"
      >
        {stats.activeCount} cadences in motion.
      </div>
    </div>
    <div
      class="min-w-0 overflow-hidden border-l border-rule px-2.5 first:border-l-0 first:pl-0 last:pr-0 md:px-6 xl:border-l-0 xl:border-t xl:border-rule xl:px-0 xl:py-5 xl:first:border-t-0 xl:first:pt-0"
    >
      <div class="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-foam opacity-60">
        steady streak
      </div>
      <div
        class="font-display text-[clamp(26px,4vw,56px)] font-normal leading-[0.88] tracking-[-0.018em] text-moon-2"
      >
        <em class="not-italic text-coral-2">{stats.streakDays}</em> days
      </div>
      <div
        class="mt-1.5 line-clamp-2 font-display text-[clamp(11px,1.2vw,17px)] italic leading-[1.3] text-foam opacity-80"
      >
        {cycle.title} keeps its tide.
      </div>
    </div>
    <div
      class="min-w-0 overflow-hidden border-l border-rule px-2.5 first:border-l-0 first:pl-0 last:pr-0 md:px-6 xl:border-l-0 xl:border-t xl:border-rule xl:px-0 xl:py-5 xl:first:border-t-0 xl:first:pt-0"
    >
      <div class="mb-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-foam opacity-60">
        next return
      </div>
      <div
        class="font-display text-[clamp(26px,4vw,56px)] font-normal leading-[0.88] tracking-[-0.018em] text-moon-2"
      >
        {nextDue ? formatClock(nextDue) : "--:--"}
      </div>
      <div
        class="mt-1.5 line-clamp-2 font-display text-[clamp(11px,1.2vw,17px)] italic leading-[1.3] text-foam opacity-80"
      >
        {missed
          ? `${missed} skipped this cycle. Forgive it; carry on.`
          : "No misses logged this cycle."}
      </div>
    </div>
  </aside>
</section>
