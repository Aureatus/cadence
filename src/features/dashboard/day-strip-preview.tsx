import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { formatGapMinutes } from "@/lib/cadence";

const TOTAL_MINUTES = 24 * 60;
const GRID_HOURS = [3, 6, 9, 12, 15, 18, 21];
const AXIS_HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const SNAP_MINUTES = 15;
const MIN_WINDOW_MINUTES = 30;
const CLICK_MOVEMENT_THRESHOLD = 4;

type DragState = { kind: "start" } | { kind: "end" } | { kind: "occ"; index: number };

export function DayStripPreview({
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
}: {
  wStart: number;
  wEnd: number;
  occs: Array<number>;
  showGapMarks: boolean;
  occMarkerWidth: number;
  graceMinutes?: number;
  summary: React.ReactNode;
  warning: string | null | undefined;
  onWindowStartChange: ((minutes: number) => void) | undefined;
  onWindowEndChange: ((minutes: number) => void) | undefined;
  onOccurrenceChange: ((index: number, minutes: number) => void) | undefined;
  onAddOccurrence: ((minutes: number) => void) | undefined;
  onRemoveOccurrence: ((index: number) => void) | undefined;
  canRemove: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const clickStartRef = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function pointerToMinutes(clientX: number) {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    const minutes = Math.max(0, Math.min(TOTAL_MINUTES, ratio * TOTAL_MINUTES));
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  }

  useEffect(() => {
    if (!drag) return;

    function handleMove(event: PointerEvent) {
      if (!drag) return;
      const minutes = pointerToMinutes(event.clientX);
      if (drag.kind === "start" && onWindowStartChange) {
        onWindowStartChange(Math.min(minutes, wEnd - MIN_WINDOW_MINUTES));
      } else if (drag.kind === "end" && onWindowEndChange) {
        onWindowEndChange(Math.max(minutes, wStart + MIN_WINDOW_MINUTES));
      } else if (drag.kind === "occ" && onOccurrenceChange) {
        onOccurrenceChange(drag.index, minutes);
      }
    }

    function handleUp() {
      setDrag(null);
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

  function startDrag(event: ReactPointerEvent, next: DragState) {
    event.preventDefault();
    event.stopPropagation();
    setDrag(next);
  }

  function handleStripPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget) return;
    if (!onAddOccurrence) return;
    clickStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleStripPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = clickStartRef.current;
    clickStartRef.current = null;
    if (!start || !onAddOccurrence) return;
    if (event.target !== event.currentTarget) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx > CLICK_MOVEMENT_THRESHOLD || dy > CLICK_MOVEMENT_THRESHOLD) return;
    onAddOccurrence(pointerToMinutes(event.clientX));
  }

  return (
    <div className="my-6 rounded-xl border border-rule bg-[oklch(12%_0.02_220/0.5)] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl font-normal italic text-moon-2">
          The day, as you've shaped it.
        </h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-foam/70">{summary}</p>
      </div>
      <div className="relative pt-3 pb-7">
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          ref={stripRef}
          onPointerDown={handleStripPointerDown}
          onPointerUp={handleStripPointerUp}
          role="application"
          aria-label="Cadence timeline. Use the inline controls above for keyboard input."
          className={cn(
            "relative h-14 overflow-visible rounded-sm border border-rule select-none",
            drag && "cursor-grabbing",
            !drag && onAddOccurrence && "cursor-copy",
          )}
          style={{
            background:
              "linear-gradient(to right, oklch(20% 0.04 240 / 0.4) 0%, oklch(28% 0.06 220 / 0.5) 25%, oklch(35% 0.08 80 / 0.45) 50%, oklch(32% 0.1 50 / 0.55) 75%, oklch(20% 0.06 280 / 0.5) 100%)",
          }}
        >
          {wStart > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 bg-[oklch(8%_0.01_220/0.6)]"
              style={{ width: `${(wStart / TOTAL_MINUTES) * 100}%` }}
            />
          )}
          {wEnd < TOTAL_MINUTES && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 bg-[oklch(8%_0.01_220/0.6)]"
              style={{ width: `${((TOTAL_MINUTES - wEnd) / TOTAL_MINUTES) * 100}%` }}
            />
          )}
          {GRID_HOURS.map((h) => (
            <div
              key={h}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-foam/10"
              style={{ left: `${((h * 60) / TOTAL_MINUTES) * 100}%` }}
            />
          ))}

          {graceMinutes > 0 &&
            occs.map((minutes, index) => (
              <GraceTail key={`grace-${index}`} minutes={minutes} graceMinutes={graceMinutes} />
            ))}

          {occs.map((minutes, index) => (
            <Occurrence
              key={`occ-${index}`}
              minutes={minutes}
              markerWidth={occMarkerWidth}
              draggable={Boolean(onOccurrenceChange)}
              dragging={drag?.kind === "occ" && drag.index === index}
              onPointerDown={
                onOccurrenceChange
                  ? (event) => {
                      if (event.button !== 0) return;
                      startDrag(event, { kind: "occ", index });
                    }
                  : undefined
              }
              onRemove={
                canRemove && onRemoveOccurrence ? () => onRemoveOccurrence(index) : undefined
              }
            />
          ))}

          {onWindowStartChange && (
            <EdgeHandle
              position={wStart}
              dragging={drag?.kind === "start"}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                startDrag(event, { kind: "start" });
              }}
            />
          )}
          {onWindowEndChange && (
            <EdgeHandle
              position={wEnd}
              dragging={drag?.kind === "end"}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                startDrag(event, { kind: "end" });
              }}
            />
          )}

          {showGapMarks &&
            occs.length <= 8 &&
            occs
              .slice(1)
              .map((next, index) => (
                <GapMark
                  key={`gap-${index}-${occs[index]}-${next}`}
                  prev={occs[index] ?? 0}
                  next={next}
                />
              ))}
        </div>
        <div className="relative mt-1 h-4 font-mono text-[9px] tracking-[0.1em] text-foam/55">
          {AXIS_HOURS.map((h) => (
            <span
              key={h}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {h === 24 ? "24" : String(h).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>
      {warning && (
        <p role="alert" className="mt-2 font-display text-sm italic text-rose">
          {warning}
        </p>
      )}
      {onAddOccurrence && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foam/45">
          Drag points or edges · click empty bar to add · × to remove
        </p>
      )}
    </div>
  );
}

function Occurrence({
  minutes,
  markerWidth,
  draggable,
  dragging,
  onPointerDown,
  onRemove,
}: {
  minutes: number;
  markerWidth: number;
  draggable: boolean;
  dragging: boolean;
  onPointerDown: ((event: ReactPointerEvent) => void) | undefined;
  onRemove: (() => void) | undefined;
}) {
  const left = (Math.max(0, minutes - markerWidth / 2) / TOTAL_MINUTES) * 100;
  const width = (markerWidth / TOTAL_MINUTES) * 100;

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onPointerDown={onPointerDown}
      role="presentation"
      className={cn(
        "group/occ absolute top-2 bottom-2 z-10 flex items-center justify-center rounded-sm",
        draggable && "touch-none",
        draggable && (dragging ? "cursor-grabbing" : "cursor-grab"),
      )}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background:
          "linear-gradient(to bottom, oklch(85% 0.1 60 / 0.55), oklch(70% 0.15 40 / 0.55))",
        borderLeft: "2px solid var(--coral)",
        borderRight: "2px solid var(--coral)",
        boxShadow: "0 0 16px oklch(70% 0.15 40 / 0.4)",
      }}
    >
      <div
        className="size-2 rounded-full bg-moon-2"
        style={{ boxShadow: "0 0 10px var(--moon-2)" }}
      />
      {onRemove && (
        <button
          type="button"
          aria-label="Remove time"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-7 left-1/2 z-30 inline-flex size-4 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-deep/80 text-[11px] leading-none text-foam opacity-0 transition-opacity hover:bg-rose hover:text-moon-2 group-hover/occ:opacity-100 focus-visible:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

function EdgeHandle({
  position,
  dragging,
  onPointerDown,
}: {
  position: number;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
}) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      aria-hidden
      onPointerDown={onPointerDown}
      className={cn(
        "group/edge absolute inset-y-0 z-20 w-3 -translate-x-1/2 touch-none",
        dragging ? "cursor-grabbing" : "cursor-ew-resize",
      )}
      style={{ left: `${(position / TOTAL_MINUTES) * 100}%` }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
          dragging ? "bg-moon-2" : "bg-foam/65 group-hover/edge:bg-coral",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute -top-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
          dragging
            ? "border-moon-2 bg-moon-2"
            : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-2 left-1/2 size-2 -translate-x-1/2 rounded-full border transition-colors",
          dragging
            ? "border-moon-2 bg-moon-2"
            : "border-foam/65 bg-deep group-hover/edge:border-coral group-hover/edge:bg-coral",
        )}
      />
    </div>
  );
}

function GraceTail({ minutes, graceMinutes }: { minutes: number; graceMinutes: number }) {
  const left = (minutes / TOTAL_MINUTES) * 100;
  const widthPct = (graceMinutes / TOTAL_MINUTES) * 100;
  const titleLabel = `${graceMinutes} min grace`;

  return (
    <div
      aria-hidden
      title={titleLabel}
      className="pointer-events-none absolute top-3 bottom-3 z-[5] rounded-r-sm"
      style={{
        left: `${left}%`,
        width: `${widthPct}%`,
        background: "linear-gradient(to right, oklch(70% 0.15 40 / 0.42), oklch(70% 0.15 40 / 0))",
      }}
    />
  );
}

function GapMark({ prev, next }: { prev: number; next: number }) {
  const startPct = (prev / TOTAL_MINUTES) * 100;
  const widthPct = ((next - prev) / TOTAL_MINUTES) * 100;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-0.5 h-3.5 border-t border-r border-l border-dashed border-foam/50"
      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
    >
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.1em] whitespace-nowrap text-foam/70 uppercase">
        {formatGapMinutes(next - prev)}
      </span>
    </div>
  );
}
