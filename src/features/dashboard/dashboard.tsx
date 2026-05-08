import { useEffect } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Card } from "@/components/ui/card";
import { cyclesCollection, todosCollection, type Cycle } from "@/db";
import { ensureActiveCycle, getActiveCycle, getDashboardStats } from "@/lib/cadence";
import { CurrentTodosList } from "./current-cycle-workspace";
import { TideStage } from "./tide-stage";

export function Dashboard() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);
  const activeCycle = getActiveCycle(cycles);
  const stats = getDashboardStats(todos, activeCycle);

  useEffect(() => {
    ensureActiveCycle(activeCycle);
  }, [activeCycle]);

  if (!activeCycle) {
    return (
      <Card className="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] p-8 text-foam ring-0 backdrop-blur-md">
        Preparing your first cycle...
      </Card>
    );
  }

  return (
    <>
      <DashboardHero cycle={activeCycle} />
      <div className="2xl:grid 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] 2xl:items-start 2xl:gap-12 3xl:gap-16">
        <TideStage cycle={activeCycle} stats={stats} />
        <CurrentTodosList
          cycle={activeCycle}
          todos={stats.orderedTodos}
          settledTodos={stats.cycleTodos.filter((todo) => todo.status === "skipped")}
        />
      </div>
    </>
  );
}

function DashboardHero({ cycle }: { cycle: Cycle }) {
  const today = new Date();

  return (
    <section className="mt-7 grid grid-cols-1 items-start gap-4 border-b border-rule pb-5 md:mt-8 md:gap-5 md:pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <h1 className="max-w-[1100px] font-display text-[clamp(48px,9vw,144px)] font-normal leading-[0.92] tracking-[-0.012em] text-balance text-moon-2">
        The day is <em className="italic text-sand-2">turning</em>.
      </h1>
      <div className="font-mono text-[10px] uppercase leading-[1.7] tracking-[0.16em] text-foam opacity-75 md:text-[11px] md:tracking-[0.22em] lg:text-right">
        {today.toLocaleDateString([], { weekday: "long" })} ·{" "}
        <b className="font-medium text-moon-2">
          {today.toLocaleDateString([], { day: "numeric", month: "long" })}
        </b>
        <br />
        Cycle <b className="font-medium text-moon-2">{cycle.title}</b>
        <br />
        Local-first · <b className="font-medium text-moon-2">offline ready</b>
      </div>
    </section>
  );
}
