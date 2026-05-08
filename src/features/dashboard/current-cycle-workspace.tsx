import { useMemo, useState, type ReactNode } from "react";
import { ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Cycle, Todo } from "@/db";
import { archiveTodo, formatClock, isLoggedToday, isWindowOpen, restoreTodo } from "@/lib/cadence";
import { type FilterKey } from "@/lib/filter";
import { useFilter } from "@/lib/use-filter";
import { getDueState } from "@/time";
import { AddCadenceDialog } from "./add-cadence-dialog";
import { ArchiveConfirmDialog } from "./archive-confirm-dialog";
import { EditCadenceDialog } from "./edit-cadence-dialog";
import { TodoCard } from "./todo-card";

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: "due", label: "Due" },
  { key: "open", label: "Open windows" },
  { key: "logged", label: "Logged" },
  { key: "all", label: "All" },
];

function matchesFilter(filter: FilterKey, todo: Todo) {
  if (filter === "all") return true;
  if (filter === "due") return getDueState(todo).isDue;
  if (filter === "open") return isWindowOpen(todo);
  return isLoggedToday(todo);
}

export function CurrentTodosList({
  cycle,
  todos,
  settledTodos,
}: {
  cycle: Cycle;
  todos: Array<Todo>;
  settledTodos: Array<Todo>;
}) {
  const [editing, setEditing] = useState<Todo | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Todo | null>(null);
  const [filter, setFilter] = useFilter();

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<FilterKey, number>>(
        (acc, entry) => {
          acc[entry.key] = todos.filter((todo) => matchesFilter(entry.key, todo)).length;
          return acc;
        },
        { due: 0, open: 0, logged: 0, all: 0 },
      ),
    [todos],
  );

  const filteredTodos = useMemo(
    () => todos.filter((todo) => matchesFilter(filter, todo)),
    [todos, filter],
  );

  const activeLabel = FILTERS.find((entry) => entry.key === filter)?.label ?? "All";

  return (
    <div>
      <div className="flex flex-col gap-3.5 border-b border-rule pt-10 pb-3.5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(32px,4.5vw,52px)] font-normal italic leading-[0.92] tracking-[-0.012em] text-moon-2">
            The <em className="text-sand-2">currents</em>.
          </h2>
          <AddCadenceDialog cycle={cycle} />
        </div>
        <div className="-mx-1 flex w-[calc(100%+0.5rem)] gap-3 overflow-x-auto px-1 [scrollbar-width:none] md:justify-between [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((entry) => (
            <FilterButton
              key={entry.key}
              active={filter === entry.key}
              count={counts[entry.key]}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
            </FilterButton>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        {todos.length === 0 ? (
          <EmptyState />
        ) : filteredTodos.length === 0 ? (
          <FilterEmptyState filter={filter} label={activeLabel} todos={todos} />
        ) : (
          filteredTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onEdit={setEditing} onArchive={setArchiveTarget} />
          ))
        )}
      </div>
      {settledTodos.length > 0 && <SettledSection todos={settledTodos} />}
      <EditCadenceDialog
        cycle={cycle}
        todo={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <ArchiveConfirmDialog
        todo={archiveTarget}
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={() => {
          if (archiveTarget) archiveTodo(archiveTarget);
          setArchiveTarget(null);
        }}
      />
    </div>
  );
}

function SettledSection({ todos }: { todos: Array<Todo> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-rule pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex w-fit cursor-pointer items-center gap-2 border-0 bg-transparent py-1 font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase transition-colors hover:text-moon-2"
      >
        <ChevronRightIcon
          className={cn("size-3 transition-transform", open ? "rotate-90" : "rotate-0")}
        />
        Settled · {todos.length}
      </button>
      {open && (
        <ul className="mt-3 grid gap-1.5">
          {todos.map((todo) => (
            <SettledRow key={todo.id} todo={todo} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SettledRow({ todo }: { todo: Todo }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-rule/80 bg-[oklch(15%_0.02_220/0.4)] px-3 py-2 transition-colors">
      <span className="min-w-0 truncate font-display text-base italic text-foam/80">
        {todo.title}
      </span>
      <button
        type="button"
        onClick={() => restoreTodo(todo)}
        aria-label={`Restore ${todo.title}`}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foam/65 transition-colors hover:text-coral-2"
      >
        <RotateCcwIcon className="size-3" />
        Restore
      </button>
    </li>
  );
}

function FilterButton({
  children,
  active = false,
  count,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  count: number;
  onClick?: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-baseline gap-1.5 border-0 border-b-[1.5px] border-transparent bg-transparent pb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap transition-colors",
        empty ? "text-moon/30 hover:text-moon/55" : "text-moon/50 hover:text-moon-2",
        active && "border-coral text-moon-2",
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className={cn(
          "tabular-nums normal-case tracking-normal transition-colors",
          active ? "text-coral" : empty ? "text-moon/25" : "text-foam/55",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FilterEmptyState({
  filter,
  label,
  todos,
}: {
  filter: FilterKey;
  label: string;
  todos: Array<Todo>;
}) {
  if (filter === "due") {
    const next = todos
      .map((todo) => ({ todo, due: getDueState(todo) }))
      .filter(({ due }) => !due.isDue)
      .sort((a, b) => a.due.dueAt.getTime() - b.due.dueAt.getTime())[0];
    return (
      <div className="mt-8 flex flex-col items-start gap-2">
        <p className="font-display text-[clamp(22px,2.4vw,30px)] italic leading-tight text-moon-2">
          The tide&rsquo;s at <em className="text-sand-2">rest</em>.
        </p>
        {next ? (
          <p className="font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
            Next return ·{" "}
            <span className="text-coral normal-case tracking-normal">{next.todo.title}</span>{" "}
            <span className="text-foam/55 normal-case tracking-normal">
              at {formatClock(next.due.dueAt)}
            </span>
          </p>
        ) : (
          <p className="font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
            Nothing returning today.
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="mt-6 font-mono text-[11px] tracking-[0.22em] text-foam/65 uppercase">
      Nothing matches &lsquo;{label}&rsquo; right now.
    </p>
  );
}

function EmptyState() {
  return (
    <Card className="mt-6 border border-rule bg-[oklch(20%_0.03_220/0.22)] gap-2 rounded-3xl py-6 ring-0 backdrop-blur-md">
      <CardContent>
        <h3 className="font-display text-[28px] font-normal leading-none text-moon-2">
          No active cadences yet
        </h3>
        <p className="mt-2 text-sm leading-[1.6] text-foam opacity-75">
          Add a task with a daily frequency, allowed time bounds, and a minimum spacing rule.
        </p>
      </CardContent>
    </Card>
  );
}
