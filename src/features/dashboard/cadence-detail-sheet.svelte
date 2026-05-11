<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import XIcon from "lucide-svelte/icons/x";
  import Button from "@/components/ui/button.svelte";
  import { cn } from "@/lib/utils";
  import type { Todo } from "@/db";
  import {
    formatClock,
    formatGapMinutes,
    getTodoPresentation,
    markTodoComplete,
  } from "@/lib/cadence";
  import { formatWhen, getDueState } from "@/time";

  type Props = {
    todo: Todo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

  let { todo, open, onOpenChange }: Props = $props();

  // Hold the last todo briefly during close-out so the content doesn't blank
  // during the slide-out animation.
  let displayed = $state<Todo | null>(todo);
  $effect(() => {
    if (todo) displayed = todo;
  });

  const due = $derived(displayed ? getDueState(displayed) : null);
  const presentation = $derived(due && displayed ? getTodoPresentation(due, displayed) : null);
  const isDue = $derived(presentation?.rowTone === "due");
  const isDone = $derived(presentation?.rowTone === "done");
  const buttonVariant = $derived<"tide-due" | "tide-ghost" | "tide">(
    isDue ? "tide-due" : presentation?.buttonTone === "ghost" ? "tide-ghost" : "tide",
  );

  const recent = $derived(displayed ? displayed.completionLog.slice(-6).toReversed() : []);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysLabel = $derived.by(() => {
    if (!displayed?.daysOfWeek || displayed.daysOfWeek.length === 0) return "Every day";
    return [...displayed.daysOfWeek]
      .sort((a, b) => a - b)
      .map((day) => DAY_NAMES[day] ?? "?")
      .join(" · ");
  });

  function logNow() {
    if (displayed) markTodoComplete(displayed);
  }

  // Seeded RNG so the starfield is consistent across sessions.
  function makeRng(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function buildShadow(count: number, rng: () => number) {
    const parts: Array<string> = [];
    for (let i = 0; i < count; i++) {
      parts.push(`${Math.floor(rng() * 2000)}px ${Math.floor(rng() * 2000)}px #FFF`);
    }
    return parts.join(",");
  }
  const rng = makeRng(420);
  const shadowSmall = buildShadow(1100, rng);
  const shadowMedium = buildShadow(350, rng);
  const shadowBig = buildShadow(160, rng);
  const starStyle = `--cadence-stars-small: ${shadowSmall}; --cadence-stars-medium: ${shadowMedium}; --cadence-stars-big: ${shadowBig};`;
</script>

<DialogPrimitive.Root {open} {onOpenChange}>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      class="fixed inset-0 z-40 bg-[oklch(7%_0.02_220/0.4)] duration-150 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
    />
    <DialogPrimitive.Content
      class={cn(
        "cadence-sheet-night fixed z-50 flex flex-col overflow-hidden border border-rule-2 text-foam shadow-2xl ring-0 backdrop-blur-2xl outline-none",
        "bottom-0 left-0 right-0 max-h-[88svh] rounded-t-3xl border-b-0",
        "md:bottom-0 md:top-0 md:right-0 md:left-auto md:h-svh md:max-h-none md:w-full md:max-w-[460px] md:rounded-none md:border-r-0",
        "duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      )}
    >
      <div aria-hidden="true" class="cadence-stars" style={starStyle}>
        <div class="cadence-stars-layer cadence-stars-layer-small"></div>
        <div class="cadence-stars-layer cadence-stars-layer-medium"></div>
        <div class="cadence-stars-layer cadence-stars-layer-big"></div>
      </div>
      {#if displayed && due && presentation}
        <DialogPrimitive.Title class="sr-only">{displayed.title}</DialogPrimitive.Title>
        <DialogPrimitive.Description class="sr-only">
          Detail for {displayed.title}
        </DialogPrimitive.Description>

        <div class="flex items-start justify-between gap-3 border-b border-rule px-6 pt-6 pb-4">
          <div class="flex flex-col gap-2">
            <span
              class={cn(
                "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
                isDue
                  ? "border-coral/60 bg-coral/15 text-moon-2"
                  : isDone
                    ? "border-rule-2 bg-[oklch(18%_0.03_220/0.6)] text-foam/75"
                    : "border-rule-2 bg-[oklch(18%_0.03_220/0.6)] text-foam/75",
              )}
            >
              {#if isDue}
                <span class="relative block size-1.5 rounded-full bg-coral">
                  <span class="absolute inset-0 rounded-full bg-coral animate-tide-pulse"></span>
                </span>
              {/if}
              {presentation.impact}
            </span>
            <span class="font-mono text-[10px] tracking-[0.22em] text-foam/70 uppercase">
              {displayed.frequencyPerDay}× per day · next {formatWhen(due.dueAt)}
            </span>
          </div>
          <DialogPrimitive.Close
            class="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.6)] text-foam/75 transition-colors hover:border-coral/60 hover:text-moon-2"
            aria-label="Close detail"
          >
            <XIcon class="size-4" />
          </DialogPrimitive.Close>
        </div>

        <div class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <div class="flex flex-col gap-2">
            <h2
              class="font-display text-[clamp(28px,4vw,40px)] font-medium leading-[1.05] tracking-[-0.012em] text-moon-2"
            >
              {displayed.title}
            </h2>
            {#if displayed.notes}
              <p class="font-display text-[15px] leading-[1.5] tracking-[0.005em] text-foam/80">
                {displayed.notes}
              </p>
            {/if}
          </div>

          <div class="flex justify-center">
            <Button
              type="button"
              variant={buttonVariant}
              size="pill"
              onclick={logNow}
              class="w-full justify-center py-3 text-sm tracking-[0.18em] text-deep md:w-auto md:min-w-[220px]"
            >
              {presentation.action} now
            </Button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-rule-2 bg-[oklch(15%_0.02_220/0.75)] px-4 py-3 shadow-[inset_0_1px_0_oklch(100%_0_0/0.04)]">
              <div class="font-mono text-[10px] tracking-[0.22em] text-foam/70 uppercase">
                Adherence
              </div>
              <div
                class="font-display text-[28px] font-medium tabular-nums leading-none text-moon-2"
              >
                {due.adherenceScore}%
              </div>
              <div class="mt-1 font-mono text-[10px] tracking-[0.16em] text-foam/70 uppercase">
                if logged now
              </div>
            </div>
            <div class="rounded-2xl border border-rule-2 bg-[oklch(15%_0.02_220/0.75)] px-4 py-3 shadow-[inset_0_1px_0_oklch(100%_0_0/0.04)]">
              <div class="font-mono text-[10px] tracking-[0.22em] text-foam/70 uppercase">
                Logged
              </div>
              <div
                class="font-display text-[28px] font-medium tabular-nums leading-none text-moon-2"
              >
                {displayed.completionLog.length}
              </div>
              <div class="mt-1 font-mono text-[10px] tracking-[0.16em] text-foam/70 uppercase">
                all-time
              </div>
            </div>
          </div>

          <section class="flex flex-col gap-2">
            <h3 class="font-mono text-[10px] tracking-[0.24em] text-foam/70 uppercase">Schedule</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt class="font-mono text-[10px] tracking-[0.18em] text-foam/70 uppercase">Window</dt>
              <dd class="font-display tracking-[0.005em] tabular-nums text-moon-2">
                {displayed.windowStart} – {displayed.windowEnd}
              </dd>
              <dt class="font-mono text-[10px] tracking-[0.18em] text-foam/70 uppercase">Grace</dt>
              <dd class="font-display tracking-[0.005em] tabular-nums text-moon-2">
                {displayed.graceMinutes} min
              </dd>
              <dt class="font-mono text-[10px] tracking-[0.18em] text-foam/70 uppercase">
                Min gap
              </dt>
              <dd class="font-display tracking-[0.005em] tabular-nums text-moon-2">
                {formatGapMinutes(displayed.minSpacingHours * 60)}
              </dd>
              <dt class="font-mono text-[10px] tracking-[0.18em] text-foam/70 uppercase">Days</dt>
              <dd class="font-display tracking-[0.005em] text-moon-2">{daysLabel}</dd>
            </dl>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="font-mono text-[10px] tracking-[0.24em] text-foam/70 uppercase">Recent</h3>
            {#if recent.length === 0}
              <p class="font-display text-[13px] text-foam/70">No logs yet.</p>
            {:else}
              <ul class="flex flex-col">
                {#each recent as completion (completion.completedAt)}
                  <li
                    class="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 border-b border-rule/70 py-2 last:border-b-0"
                  >
                    <span
                      class="font-display tabular-nums text-[15px] font-medium text-moon-2"
                    >
                      {formatClock(new Date(completion.completedAt))}
                    </span>
                    <span
                      class={cn(
                        "font-mono text-[10px] tracking-[0.18em] uppercase",
                        completion.latenessMinutes > 0 ? "text-rose/85" : "text-foam/70",
                      )}
                    >
                      {completion.latenessMinutes > 0
                        ? `${formatGapMinutes(completion.latenessMinutes)} late`
                        : "on time"}
                    </span>
                    <span
                      class="font-display tabular-nums text-[13px] font-medium text-coral-2"
                    >
                      {completion.score}
                    </span>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        </div>
      {/if}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
