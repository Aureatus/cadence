import { useMemo, useState, type ReactNode } from "react";
import { ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Cycle, Todo } from "@/db";
import { archiveTodo, isLoggedToday, isWindowOpen, restoreTodo } from "@/lib/cadence";
import { getDueState } from "@/time";
import { AddCadenceDialog } from "./add-cadence-dialog";
import { ArchiveConfirmDialog } from "./archive-confirm-dialog";
import { EditCadenceDialog } from "./edit-cadence-dialog";
import { TodoCard } from "./todo-card";

type FilterKey = "all" | "due" | "open" | "logged";

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "due", label: "Due" },
  { key: "open", label: "Open windows" },
  { key: "logged", label: "Logged" },
];

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
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredTodos = useMemo(() => {
    if (filter === "all") return todos;
    if (filter === "due") return todos.filter((todo) => getDueState(todo).isDue);
    if (filter === "open") return todos.filter((todo) => isWindowOpen(todo));
    return todos.filter((todo) => isLoggedToday(todo));
  }, [todos, filter]);

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
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-foam/65">
            Nothing matches &lsquo;{activeLabel}&rsquo; right now.
          </p>
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
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 cursor-pointer border-0 border-b-[1.5px] border-transparent bg-transparent pb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap text-moon/50 transition-colors hover:text-moon-2",
        active && "border-coral text-moon-2",
      )}
    >
      {children}
    </button>
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
