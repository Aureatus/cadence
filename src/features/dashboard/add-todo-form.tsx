import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todosCollection, type Cycle } from "@/db";
import { formatMinutesAsClock, parseTimeToMinutes, updateFiniteNumber } from "@/lib/cadence";
import { createTodo } from "@/time";
import { DayStripPreview } from "./day-strip-preview";
import { MiniDayDial } from "./mini-day-dial";

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

export function AddTodoForm({ cycle, onClose }: { cycle: Cycle; onClose?: () => void }) {
  const [title, setTitle] = useState("Brush teeth");
  const [notes, setNotes] = useState("Morning and evening, not back-to-back.");
  const [graceMinutes, setGraceMinutes] = useState(30);

  const [occurrences, setOccurrences] = useState<Array<number>>(defaultPreset.occurrences);
  const [windowStart, setWindowStart] = useState(defaultPreset.windowStart);
  const [windowEnd, setWindowEnd] = useState(defaultPreset.windowEnd);
  const [daysOfWeek, setDaysOfWeek] = useState<Array<number>>(defaultPreset.daysOfWeek);

  const sortedOccs = useMemo(() => [...occurrences].sort((a, b) => a - b), [occurrences]);
  const sortedDays = useMemo(() => [...daysOfWeek].sort((a, b) => a - b), [daysOfWeek]);

  const activePresetId = useMemo(
    () =>
      presets.find(
        (preset) =>
          preset.windowStart === windowStart &&
          preset.windowEnd === windowEnd &&
          preset.occurrences.length === sortedOccs.length &&
          preset.occurrences.every((value, index) => value === sortedOccs[index]) &&
          preset.daysOfWeek.length === sortedDays.length &&
          preset.daysOfWeek.every((value, index) => value === sortedDays[index]),
      )?.id,
    [windowStart, windowEnd, sortedOccs, sortedDays],
  );
  const activePreset = presets.find((p) => p.id === activePresetId);

  const summary = buildSummary({
    count: sortedOccs.length,
    windowStart,
    windowEnd,
    occs: sortedOccs,
  });

  const warning = buildWarning({
    count: sortedOccs.length,
    occs: sortedOccs,
    windowStart,
    windowEnd,
  });

  const titleValid = title.trim().length > 0;
  const canSubmit =
    titleValid &&
    sortedOccs.length > 0 &&
    sortedDays.length > 0 &&
    !warning &&
    Number.isFinite(graceMinutes);

  function applyPreset(preset: Preset) {
    setOccurrences(preset.occurrences);
    setWindowStart(preset.windowStart);
    setWindowEnd(preset.windowEnd);
    setDaysOfWeek(preset.daysOfWeek);
  }

  function handleAddOccurrence(minutes: number) {
    setOccurrences((prev) =>
      [...prev, Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES].sort((a, b) => a - b),
    );
  }

  function handleRemoveOccurrence(displayIndex: number) {
    setOccurrences((prev) => {
      if (prev.length <= 1) return prev;
      const sorted = [...prev].sort((a, b) => a - b);
      const target = sorted[displayIndex];
      if (target === undefined) return prev;
      const indexInState = prev.indexOf(target);
      if (indexInState === -1) return prev;
      return prev.filter((_, i) => i !== indexInState);
    });
  }

  function handleOccurrenceChange(displayIndex: number, minutes: number) {
    setOccurrences((prev) => {
      const sorted = [...prev].sort((a, b) => a - b);
      const target = sorted[displayIndex];
      if (target === undefined) return prev;
      const indexInState = prev.indexOf(target);
      if (indexInState === -1) return prev;
      const next = [...prev];
      next[indexInState] = minutes;
      return next;
    });
  }

  function handleCountChange(nextCount: number) {
    if (!Number.isFinite(nextCount) || nextCount < 1 || nextCount > 24) return;
    const span = windowEnd - windowStart;
    if (nextCount === 1) {
      setOccurrences([windowStart + span / 2]);
      return;
    }
    const step = span / (nextCount - 1);
    const next = Array.from(
      { length: nextCount },
      (_, i) => Math.round((windowStart + step * i) / SNAP_MINUTES) * SNAP_MINUTES,
    );
    setOccurrences(next);
  }

  function handleSubmit() {
    if (!canSubmit) return;

    const insertFields = buildTodoFields({
      occs: sortedOccs,
      windowStart,
      windowEnd,
    });

    todosCollection.insert(
      createTodo({
        cycleId: cycle.id,
        title,
        notes,
        graceMinutes,
        daysOfWeek: sortedDays,
        ...insertFields,
      }),
    );
    setTitle("");
    setNotes("");
    onClose?.();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <TaskNoteFields title={title} setTitle={setTitle} notes={notes} setNotes={setNotes} />

      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-foam/55">the rhythm</p>

      <PresetGrid activeId={activePresetId} onApply={applyPreset} />

      <SelectionSummary
        activePreset={activePreset}
        sortedOccs={sortedOccs}
        windowStart={windowStart}
        windowEnd={windowEnd}
        daysOfWeek={sortedDays}
        onCountChange={handleCountChange}
        onWindowStartChange={(m) => {
          if (m < windowEnd - 30) setWindowStart(m);
        }}
        onWindowEndChange={(m) => {
          if (m > windowStart + 30) setWindowEnd(m);
        }}
        onDaysChange={setDaysOfWeek}
      />

      <DayStripPreview
        wStart={windowStart}
        wEnd={windowEnd}
        occs={sortedOccs}
        showGapMarks
        occMarkerWidth={28}
        summary={summary}
        warning={warning}
        onWindowStartChange={(m) => setWindowStart(Math.min(m, windowEnd - 30))}
        onWindowEndChange={(m) => setWindowEnd(Math.max(m, windowStart + 30))}
        onOccurrenceChange={handleOccurrenceChange}
        onAddOccurrence={handleAddOccurrence}
        onRemoveOccurrence={handleRemoveOccurrence}
        canRemove={sortedOccs.length > 1}
      />

      <GraceField graceMinutes={graceMinutes} setGraceMinutes={setGraceMinutes} />

      <FormFooter onCancel={onClose} canSubmit={canSubmit} />
    </form>
  );
}

function PresetGrid({
  activeId,
  onApply,
}: {
  activeId: string | undefined;
  onApply: (preset: Preset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {presets.map((preset) => {
        const active = preset.id === activeId;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset)}
            aria-pressed={active}
            className={cn(
              "group/card flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-transparent p-3 text-center transition-colors sm:p-4",
              active
                ? "border-coral bg-coral/10"
                : "border-rule-2 hover:border-coral/60 hover:bg-coral/5",
            )}
          >
            <MiniDayDial
              windowStart={preset.windowStart}
              windowEnd={preset.windowEnd}
              occurrences={preset.occurrences}
              active={active}
            />
            <h3
              className={cn(
                "font-display text-base leading-tight italic transition-colors sm:text-lg",
                active ? "text-moon-2" : "text-moon group-hover/card:text-moon-2",
              )}
            >
              {preset.label}
            </h3>
            <p
              className={cn(
                "font-mono text-[9px] uppercase tracking-[0.16em] transition-colors sm:text-[10px]",
                active ? "text-coral-2" : "text-foam/60",
              )}
            >
              {preset.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function SelectionSummary({
  activePreset,
  sortedOccs,
  windowStart,
  windowEnd,
  daysOfWeek,
  onCountChange,
  onWindowStartChange,
  onWindowEndChange,
  onDaysChange,
}: {
  activePreset: Preset | undefined;
  sortedOccs: Array<number>;
  windowStart: number;
  windowEnd: number;
  daysOfWeek: Array<number>;
  onCountChange: (n: number) => void;
  onWindowStartChange: (m: number) => void;
  onWindowEndChange: (m: number) => void;
  onDaysChange: (days: Array<number>) => void;
}) {
  return (
    <div className="grid gap-3 border-y border-rule py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55">
        {activePreset ? `selected · ${activePreset.label}` : "custom shape"}
      </p>
      <p className="font-display text-[clamp(18px,2.2vw,24px)] leading-[1.55] tracking-[-0.005em] text-pretty text-moon-2">
        Return to it
        <NumToken
          value={sortedOccs.length}
          onChange={onCountChange}
          min={1}
          max={24}
          ariaLabel="Times per day"
        />
        × per day, between
        <TimeToken
          value={formatMinutesAsClock(windowStart)}
          onChange={(value) => {
            const minutes = parseTimeToMinutes(value);
            if (minutes !== null) onWindowStartChange(minutes);
          }}
          ariaLabel="Window start"
        />
        and
        <TimeToken
          value={formatMinutesAsClock(windowEnd)}
          onChange={(value) => {
            const minutes = parseTimeToMinutes(value);
            if (minutes !== null) onWindowEndChange(minutes);
          }}
          ariaLabel="Window end"
        />
        .
      </p>
      <DaySelector days={daysOfWeek} onChange={onDaysChange} />
    </div>
  );
}

function DaySelector({
  days,
  onChange,
}: {
  days: Array<number>;
  onChange: (days: Array<number>) => void;
}) {
  const isAll = days.length === 7;
  const isWeekdays = days.length === 5 && WEEKDAYS.every((d) => days.includes(d));
  const isWeekends = days.length === 2 && WEEKENDS.every((d) => days.includes(d));

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    if (next.length === 0) return;
    onChange(next.sort((a, b) => a - b));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55">on</span>
      <div className="flex gap-1.5">
        {DAY_DISPLAY.map(({ dayIndex, label }) => {
          const active = days.includes(dayIndex);
          return (
            <button
              key={dayIndex}
              type="button"
              onClick={() => toggleDay(dayIndex)}
              aria-pressed={active}
              aria-label={label}
              className={cn(
                "inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-full border font-display text-sm italic transition-colors",
                active
                  ? "border-coral bg-coral/15 text-coral-2"
                  : "border-rule-2 bg-transparent text-foam/55 hover:border-coral/60 hover:text-moon-2",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <DayQuickChip active={isAll} onClick={() => onChange(ALL_DAYS)}>
          Every day
        </DayQuickChip>
        <DayQuickChip active={isWeekdays} onClick={() => onChange(WEEKDAYS)}>
          Weekdays
        </DayQuickChip>
        <DayQuickChip active={isWeekends} onClick={() => onChange(WEEKENDS)}>
          Weekends
        </DayQuickChip>
      </div>
    </div>
  );
}

function DayQuickChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors",
        active
          ? "border-coral/70 bg-coral/10 text-coral-2"
          : "border-rule bg-transparent text-foam/55 hover:border-coral/40 hover:text-moon-2",
      )}
    >
      {children}
    </button>
  );
}

const tokenInputClass =
  "appearance-none border-0 bg-transparent font-[inherit] text-inherit italic outline-none focus:text-moon-2";

function NumToken({
  value,
  onChange,
  min,
  max,
  step,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
}) {
  return (
    <span className="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px italic text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2">
      <input
        type="number"
        value={value}
        onChange={(event) => updateFiniteNumber(event.currentTarget.valueAsNumber, onChange)}
        onFocus={(event) => event.currentTarget.select()}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        className={cn(
          tokenInputClass,
          "w-[2.6ch] p-0 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
    </span>
  );
}

function TimeToken({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <span className="mx-0.5 inline-flex items-baseline border-b-[1.5px] border-dotted border-coral/50 px-1 pb-px italic text-coral transition-colors hover:border-coral-2 hover:text-coral-2 focus-within:border-solid focus-within:border-moon-2 focus-within:text-moon-2">
      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={cn(
          tokenInputClass,
          "w-[5.4ch] p-0 text-center tabular-nums [&::-webkit-calendar-picker-indicator]:hidden",
        )}
      />
    </span>
  );
}

function TaskNoteFields({
  title,
  setTitle,
  notes,
  setNotes,
}: {
  title: string;
  setTitle: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
}) {
  const titleId = useId();
  const notesId = useId();

  return (
    <div className="grid gap-3 border-y border-rule py-5">
      <div className="grid gap-1">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label
          htmlFor={titleId}
          className="font-mono text-[10px] uppercase tracking-[0.28em] text-foam/55"
        >
          the task
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What are you returning to?"
          className="w-full appearance-none border-0 bg-transparent px-0 py-0.5 font-display text-[clamp(28px,3.4vw,40px)] font-normal leading-[1.05] tracking-[-0.012em] text-moon-2 outline-none placeholder:italic placeholder:text-moon/30"
        />
      </div>
      <div className="grid gap-1">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label
          htmlFor={notesId}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-foam/55"
        >
          a note{" "}
          <span className="text-[0.9em] tracking-normal normal-case opacity-70 italic">
            (optional)
          </span>
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Something to remember about it."
          className="min-h-9 w-full resize-y appearance-none border-0 bg-transparent px-0 py-0.5 font-sans text-sm leading-relaxed text-foam-2 outline-none placeholder:italic placeholder:text-moon/30"
        />
      </div>
    </div>
  );
}

function GraceField({
  graceMinutes,
  setGraceMinutes,
}: {
  graceMinutes: number;
  setGraceMinutes: (n: number) => void;
}) {
  const graceId = useId();
  return (
    <div className="grid grid-cols-1 items-baseline gap-1 border-t border-rule py-4 sm:grid-cols-[120px_1fr] sm:gap-6">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label
        htmlFor={graceId}
        className="pt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foam/70"
      >
        Grace window
      </label>
      <span className="inline-flex items-baseline gap-2 font-display text-lg text-moon-2">
        <input
          id={graceId}
          type="number"
          value={graceMinutes}
          onChange={(event) =>
            updateFiniteNumber(event.currentTarget.valueAsNumber, setGraceMinutes)
          }
          min={0}
          max={240}
          className="w-16 appearance-none border-0 border-b border-rule-2 bg-transparent px-0.5 py-1 font-display text-lg tabular-nums text-moon-2 outline-none focus:border-b-coral [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="font-display text-sm italic text-foam/85">minutes after due</span>
      </span>
    </div>
  );
}

function FormFooter({
  onCancel,
  canSubmit,
}: {
  onCancel: (() => void) | undefined;
  canSubmit: boolean;
}) {
  return (
    <footer className="mt-2 flex flex-col gap-3 border-t border-rule pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-base italic text-foam/85">
        Press
        <Kbd>⌘</Kbd>
        <Kbd>↵</Kbd>
        to save.
      </p>
      <div className="flex justify-end gap-2.5">
        <Button type="button" variant="tide-ghost" size="pill" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="tide" size="pill" disabled={!canSubmit}>
          Add cadence
        </Button>
      </div>
    </footer>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-1 rounded border border-rule-2 px-1.5 py-0.5 font-mono text-[11px] text-moon">
      {children}
    </kbd>
  );
}

function buildSummary({
  count,
  windowStart,
  windowEnd,
  occs,
}: {
  count: number;
  windowStart: number;
  windowEnd: number;
  occs: Array<number>;
}): React.ReactNode {
  const noun = count === 1 ? "return" : "returns";
  if (count <= 1) {
    return (
      <>
        {count} {noun}
      </>
    );
  }
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
    return (
      <>
        {count} {noun} · every <b className="font-medium text-coral">~{label}</b>
      </>
    );
  }
  return (
    <>
      {count} {noun} · custom timing
    </>
  );
}

function buildWarning({
  count,
  occs,
  windowStart,
  windowEnd,
}: {
  count: number;
  occs: Array<number>;
  windowStart: number;
  windowEnd: number;
}): string | null {
  if (count === 0) return "Click the bar (or pick a preset) to place at least one return.";
  if (windowEnd - windowStart < 30) return "Window is too narrow.";
  const outside = occs.filter((m) => m < windowStart - 0.5 || m > windowEnd + 0.5).length;
  if (outside > 0) {
    return `${outside} return${outside === 1 ? "" : "s"} fall outside the window — drag inward or widen the window.`;
  }
  return null;
}

function buildTodoFields({
  occs,
  windowStart,
  windowEnd,
}: {
  occs: Array<number>;
  windowStart: number;
  windowEnd: number;
}) {
  const count = Math.max(1, occs.length);
  const first = occs[0] ?? windowStart;
  const last = occs[occs.length - 1] ?? windowEnd;
  const minSpacing = count > 1 ? Math.max(0, (last - first) / (count - 1) / 60) : 0;
  return {
    frequencyPerDay: count,
    minSpacingHours: minSpacing,
    windowStart: formatMinutesAsClock(Math.max(0, Math.min(TOTAL_MINUTES - 1, windowStart))),
    windowEnd: formatMinutesAsClock(Math.max(0, Math.min(TOTAL_MINUTES - 1, windowEnd))),
  };
}
