import { Fragment, type ReactNode } from "react";
import { PencilIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Todo } from "@/db";
import {
  archiveTodo,
  getTodoPresentation,
  markTodoComplete,
  type DueState,
  type TodoPresentation,
} from "@/lib/cadence";
import { formatWhen, getDueState } from "@/time";

export function TodoCard({
  todo,
  onEdit,
}: {
  todo: Todo;
  onEdit: ((todo: Todo) => void) | undefined;
}) {
  const due = getDueState(todo);
  const presentation = getTodoPresentation(due, todo);
  const isDue = presentation.rowTone === "due";
  const isDone = presentation.rowTone === "done";

  return (
    <article
      aria-label={`Todo: ${todo.title}`}
      className={cn(
        "group/todo relative grid border-b border-rule transition-colors",
        "grid-cols-[40px_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-start gap-x-3.5 gap-y-1.5 py-4",
        "md:grid-cols-[48px_minmax(0,1fr)_minmax(0,130px)_minmax(0,130px)] md:grid-rows-1 md:items-center md:gap-5 md:py-5",
        "xl:grid-cols-[48px_minmax(180px,1.3fr)_minmax(0,120px)_minmax(0,1fr)_minmax(0,120px)]",
        isDue &&
          "-mx-3 bg-gradient-to-r from-[oklch(60%_0.14_35/0.1)] to-transparent to-70% px-3 md:mx-0 md:px-4",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "row-span-2 flex size-9 items-center justify-center self-start rounded-full border border-rule-2 bg-[oklch(20%_0.03_220/0.3)] font-display text-base italic text-foam md:row-span-1 md:size-11 md:self-center md:text-[20px]",
          isDue && "border-coral bg-coral text-moon-2",
          isDone && "border-foam bg-foam text-deep",
        )}
      >
        {presentation.icon}
      </div>
      <div className="col-start-2 min-w-0">
        <div className="font-display text-[clamp(20px,2.6vw,38px)] font-normal leading-tight tracking-[-0.012em] text-moon-2">
          {renderTideName(todo.title)}
          {todo.notes && (
            <span className="mt-1 block font-display text-[clamp(11px,1.05vw,15px)] italic leading-[1.4] tracking-[0.04em] text-foam opacity-75">
              {todo.notes}
            </span>
          )}
        </div>
      </div>
      <PulseColumn todo={todo} due={due} presentation={presentation} />
      <WaveBars todo={todo} due={due} />
      <Button
        type="button"
        aria-label="Mark complete"
        variant={isDue ? "tide-due" : presentation.buttonTone === "ghost" ? "tide-ghost" : "tide"}
        size="pill"
        onClick={() => markTodoComplete(todo)}
        className="col-start-2 row-start-3 justify-self-start md:col-start-4 md:row-start-1 md:justify-self-stretch md:[&]:max-w-full xl:col-start-5"
      >
        {presentation.action}
      </Button>
      <div className="absolute top-1.5 right-1 flex gap-1">
        {onEdit && (
          <button
            type="button"
            aria-label={`Edit ${todo.title}`}
            title="Edit cadence"
            onClick={() => onEdit(todo)}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.6)] text-foam/75 transition-colors hover:border-coral/70 hover:bg-coral/15 hover:text-moon-2"
          >
            <PencilIcon className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Archive ${todo.title}`}
          title="Archive cadence"
          onClick={() => archiveTodo(todo)}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.6)] text-foam/75 transition-colors hover:border-rose/70 hover:bg-rose/15 hover:text-moon-2"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

function PulseColumn({
  todo,
  due,
  presentation,
}: {
  todo: Todo;
  due: DueState;
  presentation: TodoPresentation;
}) {
  return (
    <div className="col-start-2 row-start-2 flex flex-row flex-wrap items-baseline gap-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-moon/65 md:col-start-3 md:row-start-1 md:block md:text-[11px]">
      <span>{todo.frequencyPerDay}x/day cadence</span>
      <span className="block font-display text-[12px] not-italic font-normal tabular-nums text-sand md:mt-1 md:text-[22px] md:leading-tight">
        <em className="italic">{formatWhen(due.dueAt)}</em>
      </span>
      <span className={cn(due.isLate && "text-rose")}>{presentation.impact}</span>
      <span className="hidden md:inline">{due.adherenceScore}% if done now</span>
      <span className="hidden md:inline">Next after complete {formatWhen(due.nextDueAt)}</span>
    </div>
  );
}

function WaveBars({ todo, due }: { todo: Todo; due: DueState }) {
  const total = Math.max(1, Math.min(8, todo.frequencyPerDay));
  const completed = Math.min(todo.completionLog.length, total);
  const currentClass = due.isLate ? "miss" : "now";
  const bars = Array.from({ length: total }, (_, index) => ({
    key: `${todo.id}-${index}`,
    state: index < completed ? "done" : currentClass,
    height: 12 + ((index * 5) % 6) * 2,
  }));

  return (
    <div aria-hidden className="hidden items-center gap-1.5 xl:flex">
      {bars.map((bar) => (
        <i
          key={bar.key}
          className={cn(
            "block w-[7px] rounded-[4px]",
            bar.state === "done" && "bg-moon-2",
            bar.state === "miss" && "bg-rose opacity-90",
            bar.state === "now" && "bg-coral animate-tide-bob",
          )}
          style={{ height: bar.height }}
        />
      ))}
    </div>
  );
}

function renderTideName(title: string): ReactNode {
  const words = title.trim().split(/\s+/);
  const last = words.at(-1);
  if (!last || words.length === 1) return title;

  return (
    <Fragment>
      {words.slice(0, -1).join(" ")} <em className="italic">{last}</em>
    </Fragment>
  );
}
