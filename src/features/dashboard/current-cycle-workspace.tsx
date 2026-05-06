import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Cycle, Todo } from "@/db";
import { AddCadenceDialog } from "./add-cadence-dialog";
import { TodoCard } from "./todo-card";

export function CurrentTodosList({ cycle, todos }: { cycle: Cycle; todos: Array<Todo> }) {
  return (
    <div>
      <div className="flex flex-col gap-3.5 border-b border-rule pt-10 pb-3.5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(32px,4.5vw,52px)] font-normal italic leading-[0.92] tracking-[-0.012em] text-moon-2">
            The <em className="text-sand-2">currents</em>.
          </h2>
          <AddCadenceDialog cycle={cycle} />
        </div>
        <div
          aria-hidden
          className="-mx-1 flex w-[calc(100%+0.5rem)] gap-3 overflow-x-auto px-1 [scrollbar-width:none] md:justify-between [&::-webkit-scrollbar]:hidden"
        >
          <FilterButton active>All</FilterButton>
          <FilterButton>Due</FilterButton>
          <FilterButton>Open windows</FilterButton>
          <FilterButton>Logged</FilterButton>
        </div>
      </div>
      <div className="flex flex-col">
        {todos.length === 0 ? (
          <EmptyState />
        ) : (
          todos.map((todo) => <TodoCard key={todo.id} todo={todo} />)
        )}
      </div>
    </div>
  );
}

function FilterButton({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 border-0 border-b-[1.5px] border-transparent bg-transparent pb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap text-moon/50 transition-colors",
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
