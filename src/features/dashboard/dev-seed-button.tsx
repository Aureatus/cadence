import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { EyeIcon, SparklesIcon } from "lucide-react";
import { cyclesCollection, todosCollection, type Cycle, type Todo } from "@/db";
import { cn } from "@/lib/utils";
import { runDevSeed } from "@/lib/dev-seed";
import { createDefaultCycle } from "@/time";

const FLAG_KEY = "cadence.preview.active";
const TODOS_BACKUP = "cadence.todos.backup";
const CYCLES_BACKUP = "cadence.cycles.backup";

type WrappedCollection<T> = Record<string, { versionKey: string; data: T }>;

export function DevSeedButton() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);
  const [isPreview, setIsPreview] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(FLAG_KEY) === "1",
  );

  function enterPreview() {
    if (!window.confirm("Hide your real data and show seeded preview fixtures?")) return;

    const todosRaw = window.localStorage.getItem("cadence.todos");
    const cyclesRaw = window.localStorage.getItem("cadence.cycles");
    if (todosRaw !== null) window.localStorage.setItem(TODOS_BACKUP, todosRaw);
    if (cyclesRaw !== null) window.localStorage.setItem(CYCLES_BACKUP, cyclesRaw);

    for (const todo of todos) todosCollection.delete(todo.id);
    for (const cycle of cycles) cyclesCollection.delete(cycle.id);

    const active = createDefaultCycle();
    cyclesCollection.insert(active);
    runDevSeed(active);

    window.localStorage.setItem(FLAG_KEY, "1");
    setIsPreview(true);
  }

  function exitPreview() {
    if (!window.confirm("Discard preview and restore your real data?")) return;

    for (const todo of todos) todosCollection.delete(todo.id);
    for (const cycle of cycles) cyclesCollection.delete(cycle.id);

    const cyclesBackup = window.localStorage.getItem(CYCLES_BACKUP);
    if (cyclesBackup) {
      const parsed = JSON.parse(cyclesBackup) as WrappedCollection<Cycle>;
      for (const wrapped of Object.values(parsed)) cyclesCollection.insert(wrapped.data);
    }
    const todosBackup = window.localStorage.getItem(TODOS_BACKUP);
    if (todosBackup) {
      const parsed = JSON.parse(todosBackup) as WrappedCollection<Todo>;
      for (const wrapped of Object.values(parsed)) todosCollection.insert(wrapped.data);
    }

    window.localStorage.removeItem(TODOS_BACKUP);
    window.localStorage.removeItem(CYCLES_BACKUP);
    window.localStorage.removeItem(FLAG_KEY);
    setIsPreview(false);
  }

  return (
    <button
      type="button"
      onClick={isPreview ? exitPreview : enterPreview}
      title={isPreview ? "Restore your real data" : "Hide your data and show seeded preview"}
      className={cn(
        "fixed right-4 bottom-4 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase shadow-md backdrop-blur-md transition-colors",
        isPreview
          ? "border-coral/70 bg-coral/15 text-moon-2"
          : "border-rule-2 bg-[oklch(15%_0.02_220/0.85)] text-foam/70 hover:border-coral/60 hover:text-moon-2",
      )}
    >
      {isPreview ? <EyeIcon className="size-3.5" /> : <SparklesIcon className="size-3.5" />}
      Preview · {isPreview ? "on" : "off"}
    </button>
  );
}
