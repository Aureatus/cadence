import { useLiveQuery } from "@tanstack/react-db";
import { SparklesIcon } from "lucide-react";
import { cyclesCollection, todosCollection } from "@/db";
import { getActiveCycle } from "@/lib/cadence";
import { runDevSeed } from "@/lib/dev-seed";
import { createDefaultCycle } from "@/time";

export function DevSeedButton() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);

  function handleClick() {
    const message =
      todos.length > 0 || cycles.length > 0
        ? "Wipe local cadence data and seed dev fixtures?"
        : "Seed dev fixtures (3 past cycles + a rich active one)?";
    if (!window.confirm(message)) return;

    for (const todo of todos) todosCollection.delete(todo.id);
    for (const cycle of cycles) cyclesCollection.delete(cycle.id);

    const activeCycle = createDefaultCycle();
    cyclesCollection.insert(activeCycle);

    const next = getActiveCycle([activeCycle]);
    if (next) runDevSeed(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Wipe local data and reseed dev fixtures"
      className="fixed right-4 bottom-4 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule-2 bg-[oklch(15%_0.02_220/0.85)] px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-foam/70 uppercase shadow-md backdrop-blur-md transition-colors hover:border-coral/60 hover:text-moon-2"
    >
      <SparklesIcon className="size-3.5" />
      Reseed
    </button>
  );
}
