<script lang="ts">
  import { formatClock, type DashboardStats } from "@/lib/cadence";
  import DayDial from "./day-dial.svelte";

  type Props = {
    stats: DashboardStats;
    onSelectTodo?: (todoId: string) => void;
    paused?: boolean;
  };

  let { stats, onSelectTodo, paused = false }: Props = $props();

  const nextTodo = $derived(stats.orderedTodos[0]);
  const kept = $derived(
    stats.cycleTodos.reduce((sum, todo) => sum + todo.completionLog.length, 0),
  );
  const possible = $derived(
    Math.max(kept + stats.activeCount + stats.skippedCount, stats.activeCount),
  );

  let now = $state(new Date());
  $effect(() => {
    const interval = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(interval);
  });
</script>

<section
  class="mt-8 grid items-center gap-8 md:mt-10 md:gap-10 xl:mt-12 xl:grid-cols-[minmax(0,1fr)_minmax(180px,220px)] xl:gap-12"
>
  <div
    aria-label={`Average adherence score ${stats.score}`}
    class="relative mx-auto aspect-square w-full max-w-[353px] [&_svg]:size-full [&_svg]:overflow-visible md:max-w-[640px] xl:max-w-[640px] 2xl:max-w-[720px]"
  >
    <DayDial todos={stats.orderedTodos} onSelect={onSelectTodo} {paused} />
    <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
      <span class="font-mono text-[10px] uppercase tracking-[0.18em] text-foam opacity-65">
        it is
      </span>
      <span
        class="font-display text-[clamp(56px,12vw,116px)] font-medium leading-[0.88] tracking-[-0.025em] text-moon-2 tabular-nums"
      >
        {formatClock(now)}
      </span>
      <span class="mt-1 font-display text-[clamp(13px,1.4vw,18px)] text-foam">
        <b class="font-medium text-sand">{kept}</b> of {possible} kept
      </span>
      <span
        class="mt-2 inline-flex max-w-[82%] items-center gap-2.5 truncate rounded-full border border-rule-2 bg-[oklch(20%_0.03_220/0.32)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foam backdrop-blur-md md:px-4 md:py-2 md:text-[11px]"
      >
        <span aria-hidden="true" class="relative block size-1.5 shrink-0 rounded-full bg-coral">
          <span class="absolute inset-0 rounded-full bg-coral animate-tide-pulse"></span>
        </span>
        next:
        <b class="font-medium normal-case text-sand">
          {nextTodo ? nextTodo.title : "Add a cadence"}
        </b>
      </span>
    </div>
  </div>
  <aside
    class="flex flex-col items-center gap-1 xl:items-start xl:border-l xl:border-rule xl:pl-10"
  >
    <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-foam opacity-65">
      Streak
    </span>
    <span
      class="font-display text-[clamp(64px,8vw,112px)] font-medium leading-[0.85] tracking-[-0.025em] text-coral-2 tabular-nums"
    >
      {stats.streakDays}
    </span>
    <span class="font-mono text-[11px] uppercase tracking-[0.2em] text-foam/65">days</span>
  </aside>
</section>
