import { useLiveQuery } from "@tanstack/react-db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cyclesCollection, todosCollection } from "@/db";
import { averageScore } from "@/time";

export function HistoryPage() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);
  const cycleHistory = [...cycles].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <Card className="mt-7 border border-rule bg-[oklch(20%_0.03_220/0.22)] gap-5 rounded-3xl px-5 py-6 ring-0 backdrop-blur-md md:px-7 md:py-7">
      <CardHeader className="px-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-foam opacity-65">
          cycle history
        </p>
        <h1 className="mt-2 font-display text-[clamp(32px,4.5vw,52px)] font-normal italic leading-[0.92] text-moon-2 normal-case tracking-[-0.012em]">
          Consistency <em className="text-sand-2">ledger</em>.
        </h1>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-col gap-3">
          {cycleHistory.map((cycle) => {
            const cycleTodos = todos.filter((todo) => todo.cycleId === cycle.id);
            return (
              <article
                key={cycle.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <h3 className="font-display text-[clamp(20px,2.4vw,28px)] font-normal leading-none text-moon-2">
                    {cycle.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foam opacity-75">
                    {new Date(cycle.startsAt).toLocaleDateString()} · {cycle.status}
                  </p>
                </div>
                <strong className="font-display text-[clamp(28px,4vw,40px)] font-normal text-sand">
                  {averageScore(cycleTodos)}%
                </strong>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
