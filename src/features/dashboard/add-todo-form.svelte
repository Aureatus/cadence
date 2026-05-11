<script lang="ts" module>
  const SNAP_MINUTES = 15;
  const TOTAL_MINUTES = 24 * 60;
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const WEEKDAYS = [1, 2, 3, 4, 5];
  const WEEKENDS = [0, 6];
  const DAY_DISPLAY: Array<{ dayIndex: number; label: string }> = [
    { dayIndex: 1, label: "Mo" },
    { dayIndex: 2, label: "Tu" },
    { dayIndex: 3, label: "We" },
    { dayIndex: 4, label: "Th" },
    { dayIndex: 5, label: "Fr" },
    { dayIndex: 6, label: "Sa" },
    { dayIndex: 0, label: "Su" },
  ];

  type Preset = {
    id: string;
    label: string;
    subtitle: string;
    occurrences: Array<number>;
    windowStart: number;
    windowEnd: number;
    daysOfWeek: Array<number>;
  };

  const presets: Array<Preset> = [
    {
      id: "once",
      label: "Once a day",
      subtitle: "midday gentle",
      occurrences: [12 * 60],
      windowStart: 8 * 60,
      windowEnd: 22 * 60,
      daysOfWeek: ALL_DAYS,
    },
    {
      id: "morning-evening",
      label: "Morning & evening",
      subtitle: "twice daily, ~12h apart",
      occurrences: [9 * 60, 21 * 60],
      windowStart: 6 * 60,
      windowEnd: 22 * 60 + 30,
      daysOfWeek: ALL_DAYS,
    },
    {
      id: "three-square",
      label: "Three-square day",
      subtitle: "morning, midday, evening",
      occurrences: [8 * 60, 14 * 60, 20 * 60],
      windowStart: 6 * 60,
      windowEnd: 22 * 60 + 30,
      daysOfWeek: ALL_DAYS,
    },
    {
      id: "every-couple",
      label: "Every couple hours",
      subtitle: "5 across the daylight",
      occurrences: [8 * 60, 11 * 60, 14 * 60, 17 * 60, 20 * 60],
      windowStart: 8 * 60,
      windowEnd: 20 * 60,
      daysOfWeek: ALL_DAYS,
    },
    {
      id: "workday",
      label: "Workday rhythm",
      subtitle: "every hour, on workdays",
      occurrences: Array.from({ length: 8 }, (_, i) => (9 + i) * 60),
      windowStart: 9 * 60,
      windowEnd: 17 * 60,
      daysOfWeek: WEEKDAYS,
    },
  ];

  const defaultPreset = presets[1]!;

  function buildSummaryParts(args: {
    count: number;
    windowStart: number;
    windowEnd: number;
    occs: Array<number>;
  }): { count: number; noun: string; tail: string | null } {
    const { count, windowStart, windowEnd, occs } = args;
    const noun = count === 1 ? "return" : "returns";
    if (count <= 1) return { count, noun, tail: null };
    const span = windowEnd - windowStart;
    const evenStep = span / (count - 1);
    const isUniform = occs.every((m, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1] ?? 0;
      return Math.abs(m - prev - evenStep) < 0.5;
    });
    if (isUniform) {
      const hours = Math.floor(evenStep / 60);
      const minutes = Math.round(evenStep % 60);
      const label = minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
      return { count, noun, tail: `every ~${label}` };
    }
    return { count, noun, tail: "custom timing" };
  }

  function buildWarning(args: {
    count: number;
    occs: Array<number>;
    windowStart: number;
    windowEnd: number;
  }): string | null {
    const { count, occs, windowStart, windowEnd } = args;
    if (count === 0) return "Click the bar (or pick a preset) to place at least one return.";
    if (windowEnd - windowStart < 30) return "Window is too narrow.";
    const outside = occs.filter((m) => m < windowStart - 0.5 || m > windowEnd + 0.5).length;
    if (outside > 0) {
      return `${outside} return${outside === 1 ? "" : "s"} fall outside the window — drag inward or widen the window.`;
    }
    return null;
  }
</script>

<script lang="ts">
  import Button from "@/components/ui/button.svelte";
  import { cn } from "@/lib/utils";
  import { todosCollection, type Cycle, type Todo } from "@/db";
  import { formatMinutesAsClock, parseTimeToMinutes, updateFiniteNumber } from "@/lib/cadence";
  import { createTodo, nowIso } from "@/time";
  import DayStripPreview from "./day-strip-preview.svelte";
  import MiniDayDial from "./mini-day-dial.svelte";

  type Props = {
    cycle: Cycle;
    editing?: Todo;
    onClose?: () => void;
  };

  let { cycle, editing, onClose }: Props = $props();

  function todoToInitialState(todo: Todo) {
    const wStart = parseTimeToMinutes(todo.windowStart) ?? 6 * 60;
    const wEnd = parseTimeToMinutes(todo.windowEnd) ?? 22 * 60;
    const span = Math.max(0, wEnd - wStart);
    const count = Math.max(1, todo.frequencyPerDay);
    const occurrences =
      count <= 1
        ? [wStart + span / 2]
        : Array.from(
            { length: count },
            (_, i) =>
              Math.round((wStart + (span / (count - 1)) * i) / SNAP_MINUTES) * SNAP_MINUTES,
          );
    return {
      title: todo.title,
      notes: todo.notes ?? "",
      graceMinutes: todo.graceMinutes,
      occurrences,
      windowStart: wStart,
      windowEnd: wEnd,
      daysOfWeek: todo.daysOfWeek ?? ALL_DAYS,
    };
  }

  // The form intentionally seeds itself from `editing` exactly once on mount.
  // Parent dialogs unmount + remount the form when the edited todo changes,
  // so we don't want to thread `editing` through reactive state.
  // svelte-ignore state_referenced_locally
  const initial = editing
    ? todoToInitialState(editing)
    : {
        title: "Brush teeth",
        notes: "Morning and evening, not back-to-back.",
        graceMinutes: 30,
        occurrences: defaultPreset.occurrences,
        windowStart: defaultPreset.windowStart,
        windowEnd: defaultPreset.windowEnd,
        daysOfWeek: defaultPreset.daysOfWeek,
      };

  let title = $state(initial.title);
  let notes = $state(initial.notes);
  let graceMinutes = $state(initial.graceMinutes);
  let occurrences = $state<Array<number>>(initial.occurrences);
  let windowStart = $state(initial.windowStart);
  let windowEnd = $state(initial.windowEnd);
  let daysOfWeek = $state<Array<number>>(initial.daysOfWeek);

  const sortedOccs = $derived([...occurrences].sort((a, b) => a - b));
  const sortedDays = $derived([...daysOfWeek].sort((a, b) => a - b));

  const activePresetId = $derived(
    presets.find(
      (preset) =>
        preset.windowStart === windowStart &&
        preset.windowEnd === windowEnd &&
        preset.occurrences.length === sortedOccs.length &&
        preset.occurrences.every((value, index) => value === sortedOccs[index]) &&
        preset.daysOfWeek.length === sortedDays.length &&
        preset.daysOfWeek.every((value, index) => value === sortedDays[index]),
    )?.id,
  );
  const activePreset = $derived(presets.find((p) => p.id === activePresetId));

  const summary = $derived(
    buildSummaryParts({
      count: sortedOccs.length,
      windowStart,
      windowEnd,
      occs: sortedOccs,
    }),
  );

  const warning = $derived(
    buildWarning({
      count: sortedOccs.length,
      occs: sortedOccs,
      windowStart,
      windowEnd,
    }),
  );

  const titleValid = $derived(title.trim().length > 0);
  const canSubmit = $derived(
    titleValid &&
      sortedOccs.length > 0 &&
      sortedDays.length > 0 &&
      !warning &&
      Number.isFinite(graceMinutes),
  );

  const isAllDays = $derived(daysOfWeek.length === 7);
  const isWeekdays = $derived(
    daysOfWeek.length === 5 && WEEKDAYS.every((d) => daysOfWeek.includes(d)),
  );
  const isWeekends = $derived(
    daysOfWeek.length === 2 && WEEKENDS.every((d) => daysOfWeek.includes(d)),
  );

  function applyPreset(preset: Preset) {
    occurrences = [...preset.occurrences];
    windowStart = preset.windowStart;
    windowEnd = preset.windowEnd;
    daysOfWeek = [...preset.daysOfWeek];
  }

  function handleAddOccurrence(minutes: number) {
    occurrences = [...occurrences, Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES].sort(
      (a, b) => a - b,
    );
  }

  function handleRemoveOccurrence(displayIndex: number) {
    if (occurrences.length <= 1) return;
    const sorted = [...occurrences].sort((a, b) => a - b);
    const target = sorted[displayIndex];
    if (target === undefined) return;
    const indexInState = occurrences.indexOf(target);
    if (indexInState === -1) return;
    occurrences = occurrences.filter((_, i) => i !== indexInState);
  }

  function handleOccurrenceChange(displayIndex: number, minutes: number) {
    const sorted = [...occurrences].sort((a, b) => a - b);
    const target = sorted[displayIndex];
    if (target === undefined) return;
    const indexInState = occurrences.indexOf(target);
    if (indexInState === -1) return;
    const next = [...occurrences];
    next[indexInState] = minutes;
    occurrences = next;
  }

  function handleCountChange(nextCount: number) {
    if (!Number.isFinite(nextCount) || nextCount < 1 || nextCount > 24) return;
    const span = windowEnd - windowStart;
    if (nextCount === 1) {
      occurrences = [windowStart + span / 2];
      return;
    }
    const step = span / (nextCount - 1);
    occurrences = Array.from(
      { length: nextCount },
      (_, i) => Math.round((windowStart + step * i) / SNAP_MINUTES) * SNAP_MINUTES,
    );
  }

  function toggleDay(day: number) {
    const next = daysOfWeek.includes(day) ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day];
    if (next.length === 0) return;
    daysOfWeek = next.sort((a, b) => a - b);
  }

  function buildTodoFields() {
    const count = Math.max(1, sortedOccs.length);
    const first = sortedOccs[0] ?? windowStart;
    const last = sortedOccs[sortedOccs.length - 1] ?? windowEnd;
    const minSpacing = count > 1 ? Math.max(0, (last - first) / (count - 1) / 60) : 0;
    return {
      frequencyPerDay: count,
      minSpacingHours: minSpacing,
      windowStart: formatMinutesAsClock(Math.max(0, Math.min(TOTAL_MINUTES - 1, windowStart))),
      windowEnd: formatMinutesAsClock(Math.max(0, Math.min(TOTAL_MINUTES - 1, windowEnd))),
    };
  }

  function handleSubmit(event?: Event) {
    event?.preventDefault();
    if (!canSubmit) return;

    const fields = buildTodoFields();
    const trimmedNotes = notes.trim() || undefined;
    const normalizedDays = sortedDays.length > 0 && sortedDays.length < 7 ? sortedDays : undefined;

    if (editing) {
      todosCollection.update(editing.id, (draft) => {
        draft.title = title.trim();
        draft.notes = trimmedNotes;
        draft.frequencyPerDay = fields.frequencyPerDay;
        draft.minSpacingHours = fields.minSpacingHours;
        draft.windowStart = fields.windowStart;
        draft.windowEnd = fields.windowEnd;
        draft.graceMinutes = graceMinutes;
        draft.daysOfWeek = normalizedDays;
        draft.updatedAt = nowIso();
      });
    } else {
      todosCollection.insert(
        createTodo({
          cycleId: cycle.id,
          title,
          notes,
          graceMinutes,
          daysOfWeek: sortedDays,
          ...fields,
        }),
      );
      title = "";
      notes = "";
    }
    onClose?.();
  }

  $effect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const tokenInputClass =
    "appearance-none border-0 bg-transparent font-[inherit] font-medium text-inherit outline-none focus:text-moon-2";
</script>

<form class="grid gap-5" onsubmit={handleSubmit}>
  <!-- task + notes -->
  <div class="grid gap-3 border-y border-rule py-5">
    <div class="grid gap-1">
      <label
        for="cad-title"
        class="font-mono text-[10px] uppercase tracking-[0.28em] text-foam/55"
      >
        Task
      </label>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        id="cad-title"
        type="text"
        bind:value={title}
        autofocus
        placeholder="What are you returning to?"
        class="w-full appearance-none border-0 bg-transparent px-0 py-0.5 font-display text-[clamp(28px,3.4vw,40px)] font-normal leading-[1.05] tracking-[-0.012em] text-moon-2 outline-none placeholder:italic placeholder:text-moon/30"
      />
    </div>
    <div class="grid gap-1">
      <label
        for="cad-notes"
        class="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55"
      >
        Note <span class="text-[0.9em] tracking-normal normal-case opacity-70">(optional)</span>
      </label>
      <textarea
        id="cad-notes"
        bind:value={notes}
        placeholder="Something to remember about it."
        class="min-h-9 w-full resize-y appearance-none border-0 bg-transparent px-0 py-0.5 font-sans text-sm leading-relaxed text-foam-2 outline-none placeholder:italic placeholder:text-moon/30"
      ></textarea>
    </div>
  </div>

  <p class="font-mono text-[10px] uppercase tracking-[0.28em] text-foam/55">Rhythm</p>

  <!-- preset grid -->
  <div class="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
    {#each presets as preset (preset.id)}
      {@const active = preset.id === activePresetId}
      <button
        type="button"
        onclick={() => applyPreset(preset)}
        aria-pressed={active}
        class={cn(
          "group/card flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-transparent p-3 text-center transition-colors sm:p-4",
          active ? "border-coral bg-coral/10" : "border-rule-2 hover:border-coral/60 hover:bg-coral/5",
        )}
      >
        <MiniDayDial
          windowStart={preset.windowStart}
          windowEnd={preset.windowEnd}
          occurrences={preset.occurrences}
          {active}
        />
        <h3
          class={cn(
            "font-display text-base font-medium leading-tight tracking-tight transition-colors sm:text-lg",
            active ? "text-moon-2" : "text-moon group-hover/card:text-moon-2",
          )}
        >
          {preset.label}
        </h3>
        <p
          class={cn(
            "font-mono text-[9px] uppercase tracking-[0.16em] transition-colors sm:text-[10px]",
            active ? "text-coral-2" : "text-foam/60",
          )}
        >
          {preset.subtitle}
        </p>
      </button>
    {/each}
  </div>

  <!-- selection summary -->
  <div class="grid gap-3 border-y border-rule py-4">
    <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55">
      {activePreset ? `Preset · ${activePreset.label}` : "Custom"}
    </p>
    <p
      class="font-display text-[clamp(18px,2.2vw,24px)] leading-[1.55] tracking-[-0.005em] text-pretty text-moon-2"
    >
      Return to it
      <span
        class="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px font-medium text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2"
      >
        <input
          type="number"
          value={sortedOccs.length}
          oninput={(event) =>
            updateFiniteNumber(event.currentTarget.valueAsNumber, handleCountChange)}
          onfocus={(event) => event.currentTarget.select()}
          min="1"
          max="24"
          aria-label="Times per day"
          class={cn(
            tokenInputClass,
            "w-[2.6ch] p-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
      </span>
      × per day, between
      <span
        class="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px font-medium text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2"
      >
        <input
          type="time"
          value={formatMinutesAsClock(windowStart)}
          oninput={(event) => {
            const minutes = parseTimeToMinutes(event.currentTarget.value);
            if (minutes !== null && minutes < windowEnd - 30) windowStart = minutes;
          }}
          aria-label="Window start"
          class={cn(
            tokenInputClass,
            "w-[5.4ch] p-0 text-center tabular-nums [&::-webkit-calendar-picker-indicator]:hidden",
          )}
        />
      </span>
      and
      <span
        class="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px font-medium text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2"
      >
        <input
          type="time"
          value={formatMinutesAsClock(windowEnd)}
          oninput={(event) => {
            const minutes = parseTimeToMinutes(event.currentTarget.value);
            if (minutes !== null && minutes > windowStart + 30) windowEnd = minutes;
          }}
          aria-label="Window end"
          class={cn(
            tokenInputClass,
            "w-[5.4ch] p-0 text-center tabular-nums [&::-webkit-calendar-picker-indicator]:hidden",
          )}
        />
      </span>
      , with
      <span
        class="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px font-medium text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2"
      >
        <input
          type="number"
          value={graceMinutes}
          oninput={(event) =>
            updateFiniteNumber(event.currentTarget.valueAsNumber, (n) => (graceMinutes = n))}
          onfocus={(event) => event.currentTarget.select()}
          min="0"
          max="240"
          step="5"
          aria-label="Grace minutes"
          class={cn(
            tokenInputClass,
            "w-[2.6ch] p-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          )}
        />
      </span>
      min grace.
    </p>
    <!-- day selector -->
    <div class="flex flex-wrap items-center gap-3">
      <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55">on</span>
      <div class="flex gap-1.5">
        {#each DAY_DISPLAY as { dayIndex, label } (dayIndex)}
          {@const active = daysOfWeek.includes(dayIndex)}
          <button
            type="button"
            onclick={() => toggleDay(dayIndex)}
            aria-pressed={active}
            aria-label={label}
            class={cn(
              "inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-full border font-display text-xs font-medium tracking-wide transition-colors",
              active
                ? "border-coral bg-coral/15 text-coral-2"
                : "border-rule-2 bg-transparent text-foam/55 hover:border-coral/60 hover:text-moon-2",
            )}
          >
            {label}
          </button>
        {/each}
      </div>
      <div class="flex gap-1.5">
        <button
          type="button"
          onclick={() => (daysOfWeek = [...ALL_DAYS])}
          class={cn(
            "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors",
            isAllDays
              ? "border-coral/70 bg-coral/10 text-coral-2"
              : "border-rule bg-transparent text-foam/55 hover:border-coral/40 hover:text-moon-2",
          )}>Every day</button
        >
        <button
          type="button"
          onclick={() => (daysOfWeek = [...WEEKDAYS])}
          class={cn(
            "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors",
            isWeekdays
              ? "border-coral/70 bg-coral/10 text-coral-2"
              : "border-rule bg-transparent text-foam/55 hover:border-coral/40 hover:text-moon-2",
          )}>Weekdays</button
        >
        <button
          type="button"
          onclick={() => (daysOfWeek = [...WEEKENDS])}
          class={cn(
            "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors",
            isWeekends
              ? "border-coral/70 bg-coral/10 text-coral-2"
              : "border-rule bg-transparent text-foam/55 hover:border-coral/40 hover:text-moon-2",
          )}>Weekends</button
        >
      </div>
    </div>
  </div>

  <DayStripPreview
    wStart={windowStart}
    wEnd={windowEnd}
    occs={sortedOccs}
    showGapMarks
    occMarkerWidth={28}
    {graceMinutes}
    summary={summarySnippet}
    {warning}
    onWindowStartChange={(m) => (windowStart = Math.min(m, windowEnd - 30))}
    onWindowEndChange={(m) => (windowEnd = Math.max(m, windowStart + 30))}
    onOccurrenceChange={handleOccurrenceChange}
    onAddOccurrence={handleAddOccurrence}
    onRemoveOccurrence={handleRemoveOccurrence}
    canRemove={sortedOccs.length > 1}
  />

  <footer
    class="mt-2 flex flex-col gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-foam/65">
      <kbd class="mx-0.5 rounded border border-rule-2 px-1.5 py-0.5 font-mono text-[10px] text-moon"
        >⌘</kbd
      >
      <kbd class="mx-0.5 rounded border border-rule-2 px-1.5 py-0.5 font-mono text-[10px] text-moon"
        >↵</kbd
      >
      to save
    </p>
    <div class="flex justify-end gap-2.5">
      <Button type="button" variant="tide-ghost" size="pill" onclick={onClose}>Cancel</Button>
      <Button type="submit" variant="tide" size="pill" disabled={!canSubmit}>Add cadence</Button>
    </div>
  </footer>
</form>

{#snippet summarySnippet()}
  {summary.count}
  {summary.noun}{#if summary.tail}
    {" · "}{#if summary.tail.startsWith("every")}
      every <b class="font-medium text-coral">~{summary.tail.replace("every ~", "")}</b>
    {:else}
      {summary.tail}
    {/if}
  {/if}
{/snippet}
