<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "@/lib/utils";
  import { formatGapMinutes } from "@/lib/cadence";

  const TOTAL_MINUTES = 24 * 60;
  const GRID_HOURS = [3, 6, 9, 12, 15, 18, 21];
  const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const SNAP_MINUTES = 15;
  const MIN_WINDOW_MINUTES = 30;
  const CLICK_MOVEMENT_THRESHOLD = 4;

  type DragState = { kind: "start" } | { kind: "end" } | { kind: "occ"; index: number };

  type Props = {
    wStart: number;
    wEnd: number;
    occs: Array<number>;
    showGapMarks: boolean;
    occMarkerWidth: number;
    graceMinutes?: number;
    summary: Snippet;
    warning: string | null | undefined;
    onWindowStartChange: ((minutes: number) => void) | undefined;
    onWindowEndChange: ((minutes: number) => void) | undefined;
    onOccurrenceChange: ((index: number, minutes: number) => void) | undefined;
    onAddOccurrence: ((minutes: number) => void) | undefined;
    onRemoveOccurrence: ((index: number) => void) | undefined;
    canRemove: boolean;
  };

  let {
    wStart,
    wEnd,
    occs,
    showGapMarks,
    occMarkerWidth,
    graceMinutes = 0,
    summary,
    warning,
    onWindowStartChange,
    onWindowEndChange,
    onOccurrenceChange,
    onAddOccurrence,
    onRemoveOccurrence,
    canRemove,
  }: Props = $props();

  let stripEl: HTMLDivElement | null = $state(null);
  let clickStart: { x: number; y: number } | null = null;
  let drag: DragState | null = $state(null);

  function pointerToMinutes(clientX: number) {
    const rect = stripEl?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    const minutes = Math.max(0, Math.min(TOTAL_MINUTES, ratio * TOTAL_MINUTES));
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  }

  $effect(() => {
    if (!drag) return;
    const current = drag;

    function handleMove(event: PointerEvent) {
      const minutes = pointerToMinutes(event.clientX);
      if (current.kind === "start" && onWindowStartChange) {
        onWindowStartChange(Math.min(minutes, wEnd - MIN_WINDOW_MINUTES));
      } else if (current.kind === "end" && onWindowEndChange) {
        onWindowEndChange(Math.max(minutes, wStart + MIN_WINDOW_MINUTES));
      } else if (current.kind === "occ" && onOccurrenceChange) {
        onOccurrenceChange(current.index, minutes);
      }
    }

    function handleUp() {
      drag = null;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  });

  function startDrag(event: PointerEvent, next: DragState) {
    event.preventDefault();
    event.stopPropagation();
    drag = next;
  }

  function handleStripPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget) return;
    if (!onAddOccurrence) return;
    clickStart = { x: event.clientX, y: event.clientY };
  }

  function handleStripPointerUp(event: PointerEvent) {
    const start = clickStart;
    clickStart = null;
    if (!start || !onAddOccurrence) return;
    if (event.target !== event.currentTarget) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx > CLICK_MOVEMENT_THRESHOLD || dy > CLICK_MOVEMENT_THRESHOLD) return;
    onAddOccurrence(pointerToMinutes(event.clientX));
  }

  function occLeft(minutes: number) {
    return (Math.max(0, minutes - occMarkerWidth / 2) / TOTAL_MINUTES) * 100;
  }

  function occWidth() {
    return (occMarkerWidth / TOTAL_MINUTES) * 100;
  }
</script>

<div class="my-6 rounded-xl border border-rule bg-[oklch(12%_0.02_220/0.5)] p-5 sm:p-6">
  <div class="mb-4 flex items-baseline justify-between gap-3">
    <h3 class="font-display text-xl font-normal italic text-moon-2">
      The day, as you've shaped it.
    </h3>
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] text-foam/70">
      {@render summary()}
    </p>
  </div>
  <div class="relative pt-3 pb-7">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={stripEl}
      onpointerdown={handleStripPointerDown}
      onpointerup={handleStripPointerUp}
      role="application"
      aria-label="Cadence timeline. Use the inline controls above for keyboard input."
      class={cn(
        "relative h-14 overflow-visible rounded-sm border border-rule select-none",
        drag && "cursor-grabbing",
        !drag && onAddOccurrence && "cursor-copy",
      )}
      style="background: linear-gradient(to right, oklch(20% 0.04 240 / 0.4) 0%, oklch(28% 0.06 220 / 0.5) 25%, oklch(35% 0.08 80 / 0.45) 50%, oklch(32% 0.1 50 / 0.55) 75%, oklch(20% 0.06 280 / 0.5) 100%);"
    >
      {#if wStart > 0}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 bg-[oklch(8%_0.01_220/0.6)]"
          style={`width: ${(wStart / TOTAL_MINUTES) * 100}%;`}
        ></div>
      {/if}
      {#if wEnd < TOTAL_MINUTES}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 right-0 bg-[oklch(8%_0.01_220/0.6)]"
          style={`width: ${((TOTAL_MINUTES - wEnd) / TOTAL_MINUTES) * 100}%;`}
        ></div>
      {/if}
      {#each GRID_HOURS as h (h)}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 w-px bg-foam/10"
          style={`left: ${((h * 60) / TOTAL_MINUTES) * 100}%;`}
        ></div>
      {/each}

      {#if graceMinutes > 0}
        {#each occs as minutes, idx (`grace-${idx}-${minutes}`)}
          {@const left = (minutes / TOTAL_MINUTES) * 100}
          {@const widthPct = (graceMinutes / TOTAL_MINUTES) * 100}
          <div
            aria-hidden="true"
            title={`${graceMinutes} min grace`}
            class="pointer-events-none absolute top-3 bottom-3 z-[5] rounded-r-sm"
            style={`left: ${left}%; width: ${widthPct}%; background: linear-gradient(to right, oklch(70% 0.15 40 / 0.42), oklch(70% 0.15 40 / 0));`}
          ></div>
        {/each}
      {/if}

      {#each occs as minutes, index (`occ-${index}`)}
        {@const draggable = Boolean(onOccurrenceChange)}
        {@const dragging = drag?.kind === "occ" && drag.index === index}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          onpointerdown={onOccurrenceChange
            ? (event) => {
                if (event.button !== 0) return;
                startDrag(event, { kind: "occ", index });
              }
            : undefined}
          role="presentation"
          class={cn(
            "group/occ absolute top-2 bottom-2 z-10 flex items-center justify-center rounded-sm",
            draggable && "touch-none",
            draggable && (dragging ? "cursor-grabbing" : "cursor-grab"),
          )}
          style={`left: ${occLeft(minutes)}%; width: ${occWidth()}%; background: linear-gradient(to bottom, oklch(85% 0.1 60 / 0.55), oklch(70% 0.15 40 / 0.55)); border-left: 2px solid var(--coral); border-right: 2px solid var(--coral); box-shadow: 0 0 16px oklch(70% 0.15 40 / 0.4);`}
        >
          <div
            class="size-2 rounded-full bg-moon-2"
            style="box-shadow: 0 0 10px var(--moon-2);"
          ></div>
          {#if canRemove && onRemoveOccurrence}
            <button
              type="button"
              aria-label="Remove time"
              onpointerdown={(event) => event.stopPropagation()}
              onclick={(event) => {
                event.stopPropagation();
                onRemoveOccurrence(index);
              }}
              class="absolute -top-7 left-1/2 z-30 inline-flex size-4 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-deep/80 text-[11px] leading-none text-foam opacity-0 transition-opacity hover:bg-rose hover:text-moon-2 group-hover/occ:opacity-100 focus-visible:opacity-100"
            >
              ×
            </button>
          {/if}
        </div>
      {/each}

      {#if onWindowStartChange}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          aria-hidden="true"
          onpointerdown={(event) => {
            if (event.button !== 0) return;
            startDrag(event, { kind: "start" });
          }}
          class={cn(
            "group/edge absolute inset-y-0 z-20 w-3 -translate-x-1/2 touch-none",
            drag?.kind === "start" ? "cursor-grabbing" : "cursor-ew-resize",
          )}
          style={`left: ${(wStart / TOTAL_MINUTES) * 100}%;`}
        >
          <div
            aria-hidden="true"
            class={cn(
              "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
              drag?.kind === "start" ? "bg-moon-2" : "bg-foam/65 group-hover/edge:bg-coral",
            )}
          ></div>
          <div
            aria-hidden="true"
            class={cn(
              "absolute -top-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
              drag?.kind === "start"
                ? "border-moon-2 bg-moon-2"
                : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
            )}
          ></div>
          <div
            aria-hidden="true"
            class={cn(
              "absolute -bottom-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
              drag?.kind === "start"
                ? "border-moon-2 bg-moon-2"
                : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
            )}
          ></div>
        </div>
      {/if}
      {#if onWindowEndChange}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          aria-hidden="true"
          onpointerdown={(event) => {
            if (event.button !== 0) return;
            startDrag(event, { kind: "end" });
          }}
          class={cn(
            "group/edge absolute inset-y-0 z-20 w-3 -translate-x-1/2 touch-none",
            drag?.kind === "end" ? "cursor-grabbing" : "cursor-ew-resize",
          )}
          style={`left: ${(wEnd / TOTAL_MINUTES) * 100}%;`}
        >
          <div
            aria-hidden="true"
            class={cn(
              "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
              drag?.kind === "end" ? "bg-moon-2" : "bg-foam/65 group-hover/edge:bg-coral",
            )}
          ></div>
          <div
            aria-hidden="true"
            class={cn(
              "absolute -top-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
              drag?.kind === "end"
                ? "border-moon-2 bg-moon-2"
                : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
            )}
          ></div>
          <div
            aria-hidden="true"
            class={cn(
              "absolute -bottom-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
              drag?.kind === "end"
                ? "border-moon-2 bg-moon-2"
                : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
            )}
          ></div>
        </div>
      {/if}

      {#if showGapMarks && occs.length <= 8}
        {#each occs.slice(1) as next, index (`gap-${index}-${occs[index]}-${next}`)}
          {@const prev = occs[index] ?? 0}
          {@const startPct = (prev / TOTAL_MINUTES) * 100}
          {@const widthPct = ((next - prev) / TOTAL_MINUTES) * 100}
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -bottom-0.5 h-3.5 border-t border-r border-l border-dashed border-foam/50"
            style={`left: ${startPct}%; width: ${widthPct}%;`}
          >
            <span
              class="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.1em] whitespace-nowrap text-foam/70 uppercase"
            >
              {formatGapMinutes(next - prev)}
            </span>
          </div>
        {/each}
      {/if}
    </div>
    <div class="relative mt-1 h-4 font-mono text-[9px] tracking-[0.1em] text-foam/55">
      {#each AXIS_HOURS as h (h)}
        <span class="absolute top-0 -translate-x-1/2" style={`left: ${(h / 24) * 100}%;`}>
          {h === 24 ? "24" : String(h).padStart(2, "0")}
        </span>
      {/each}
    </div>
  </div>
  {#if warning}
    <p role="alert" class="mt-2 font-display text-sm italic text-rose">{warning}</p>
  {/if}
  {#if onAddOccurrence}
    <p class="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foam/45">
      Drag points or edges · click empty bar to add · × to remove
    </p>
  {/if}
</div>
