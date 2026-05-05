import { useEffect, useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cyclesCollection,
  settingsCollection,
  todosCollection,
  type Cycle,
  type Settings,
  type Todo,
} from "./db";
import {
  averageScore,
  completeTodo,
  consistencyStreakDays,
  createDefaultCycle,
  createTodo,
  formatImpact,
  formatWhen,
  getDueState,
  nowIso,
} from "./time";

const pageShell = "mx-auto min-h-svh w-full max-w-6xl px-4 py-4 sm:px-6 lg:py-6";
const panel = "border bg-card text-card-foreground shadow-sm";
const eyebrow = "font-mono text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground";
const field =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";
const label = "grid gap-2 text-sm font-medium text-muted-foreground";
let isCreatingInitialCycle = false;

type DashboardStats = {
  orderedTodos: Array<Todo>;
  activeCount: number;
  completedCount: number;
  skippedCount: number;
  streakDays: number;
  score: number;
};

type TodoRuleFieldsProps = {
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  setFrequencyPerDay: (value: number) => void;
  setMinSpacingHours: (value: number) => void;
  setWindowStart: (value: string) => void;
  setWindowEnd: (value: string) => void;
  setGraceMinutes: (value: number) => void;
};

export function RootLayout() {
  const { data: settings } = useLiveQuery(settingsCollection);

  useEnsureSettings(settings);
  useApplyTheme(settings);

  return (
    <main className={pageShell}>
      <header className="sticky top-4 z-10 mb-5 flex flex-col gap-3 rounded-full border bg-background/85 p-2 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <BrandLink />
        <PrimaryNav />
      </header>
      <Outlet />
    </main>
  );
}

function useEnsureSettings(settings: Array<Settings>) {
  useEffect(() => {
    if (!settings.some((entry) => entry.id === "settings")) {
      settingsCollection.insert({ id: "settings", theme: "system" });
    }
  }, [settings]);
}

function useApplyTheme(settings: Array<Settings>) {
  useEffect(() => {
    const theme = settings.find((entry) => entry.id === "settings")?.theme ?? "system";
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && query.matches),
      );
    };

    applyTheme();
    query.addEventListener("change", applyTheme);

    return () => query.removeEventListener("change", applyTheme);
  }, [settings]);
}

function BrandLink() {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-full px-2 text-foreground no-underline"
      aria-label="Cadence home"
    >
      <span className="grid size-12 place-items-center rounded-full bg-primary text-sm font-black tracking-tighter text-primary-foreground">
        ca
      </span>
      <span className="leading-tight">
        <strong className="block font-heading text-sm tracking-tight">Cadence</strong>
        <small className="hidden text-xs text-muted-foreground sm:block">
          Local-first cadence tracker
        </small>
      </span>
    </Link>
  );
}

function PrimaryNav() {
  const links = [
    { to: "/", label: "Today" },
    { to: "/history", label: "History" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <nav className="grid grid-cols-3 gap-1" aria-label="Primary navigation">
      {links.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          activeProps={{
            className:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

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
      <section className={cn(panel, "rounded-3xl p-8")}>Preparing your first cycle...</section>
    );
  }

  return (
    <>
      <DashboardHero cycle={activeCycle} score={stats.score} />
      <CycleMetrics stats={stats} />
      <CurrentCycleWorkspace cycle={activeCycle} todos={stats.orderedTodos} />
    </>
  );
}

function DashboardHero({ cycle, score }: { cycle: Cycle; score: number }) {
  return (
    <section
      className={cn(
        panel,
        "grid gap-8 rounded-3xl p-6 md:grid-cols-[1fr_auto] md:items-end lg:p-12",
      )}
    >
      <div>
        <p className={eyebrow}>Active cycle</p>
        <h1 className="mt-3 max-w-xl font-heading text-5xl font-semibold tracking-tight text-balance md:text-7xl lg:text-8xl">
          {cycle.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Recurring tasks stay active. Completing one occurrence schedules the next one and records
          how close you were to the ideal cadence.
        </p>
      </div>
      <ScoreOrb score={score} />
    </section>
  );
}

function ScoreOrb({ score }: { score: number }) {
  return (
    <div
      className="grid aspect-square w-40 place-items-center rounded-full border bg-muted/40 text-center md:w-56"
      aria-label={`Average adherence score ${score}`}
    >
      <div>
        <span className="block font-heading text-6xl font-semibold tracking-tight md:text-8xl">
          {score}
        </span>
        <small className="text-sm text-muted-foreground">adherence</small>
      </div>
    </div>
  );
}

function CycleMetrics({ stats }: { stats: DashboardStats }) {
  return (
    <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Cycle summary">
      <Metric label="Active" value={stats.activeCount.toString()} detail="cadences in motion" />
      <Metric
        label="Completed"
        value={stats.completedCount.toString()}
        detail="with logged effort"
      />
      <Metric label="Skipped" value={stats.skippedCount.toString()} detail="explicit misses" />
      <Metric label="Streak" value={`${stats.streakDays}d`} detail="70+ score days" />
    </section>
  );
}

function CurrentCycleWorkspace({ cycle, todos }: { cycle: Cycle; todos: Array<Todo> }) {
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.6fr)] lg:items-start">
      <AddTodoForm cycle={cycle} />
      <CurrentTodosList todos={todos} />
    </section>
  );
}

function CurrentTodosList({ todos }: { todos: Array<Todo> }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className={eyebrow}>Current cadences</p>
        <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-5xl">
          What needs attention next
        </h2>
      </div>
      {todos.length === 0 ? (
        <EmptyState />
      ) : (
        todos.map((todo) => <TodoCard key={todo.id} todo={todo} />)
      )}
    </div>
  );
}

function AddTodoForm({ cycle }: { cycle: Cycle }) {
  const [title, setTitle] = useState("Brush teeth");
  const [frequencyPerDay, setFrequencyPerDay] = useState(2);
  const [minSpacingHours, setMinSpacingHours] = useState(8);
  const [windowStart, setWindowStart] = useState("06:00");
  const [windowEnd, setWindowEnd] = useState("22:30");
  const [graceMinutes, setGraceMinutes] = useState(30);
  const [notes, setNotes] = useState("Morning and evening, not back-to-back.");

  return (
    <form
      className={cn(panel, "grid gap-4 rounded-2xl p-4")}
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !title.trim() ||
          !hasValidCadenceNumbers(frequencyPerDay, minSpacingHours, graceMinutes)
        )
          return;

        todosCollection.insert(
          createTodo({
            cycleId: cycle.id,
            title,
            notes,
            frequencyPerDay,
            minSpacingHours,
            windowStart,
            windowEnd,
            graceMinutes,
          }),
        );
        setTitle("");
        setNotes("");
      }}
    >
      <TodoFormHeader />
      <TodoTextFields title={title} notes={notes} setTitle={setTitle} setNotes={setNotes} />
      <TodoRuleFields
        frequencyPerDay={frequencyPerDay}
        minSpacingHours={minSpacingHours}
        windowStart={windowStart}
        windowEnd={windowEnd}
        graceMinutes={graceMinutes}
        setFrequencyPerDay={setFrequencyPerDay}
        setMinSpacingHours={setMinSpacingHours}
        setWindowStart={setWindowStart}
        setWindowEnd={setWindowEnd}
        setGraceMinutes={setGraceMinutes}
      />
      <Button type="submit">Add cadence</Button>
    </form>
  );
}

function TodoFormHeader() {
  return (
    <div>
      <p className={eyebrow}>New cyclic todo</p>
      <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Design a cadence</h2>
    </div>
  );
}

function TodoTextFields(props: {
  title: string;
  notes: string;
  setTitle: (value: string) => void;
  setNotes: (value: string) => void;
}) {
  return (
    <>
      <label className={label}>
        Task
        <input
          className={field}
          value={props.title}
          onChange={(event) => props.setTitle(event.target.value)}
          placeholder="Brush teeth"
        />
      </label>
      <label className={label}>
        Notes
        <textarea
          className={cn(field, "min-h-24 resize-y")}
          value={props.notes}
          onChange={(event) => props.setNotes(event.target.value)}
          placeholder="Constraints, ritual notes, motivation..."
        />
      </label>
    </>
  );
}

function TodoRuleFields(props: TodoRuleFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <NumberField
        labelText="Per day"
        min="1"
        max="8"
        value={props.frequencyPerDay}
        onChange={props.setFrequencyPerDay}
      />
      <NumberField
        labelText="Min gap"
        min="0"
        max="24"
        step="0.5"
        value={props.minSpacingHours}
        onChange={props.setMinSpacingHours}
      />
      <TimeField labelText="Starts" value={props.windowStart} onChange={props.setWindowStart} />
      <TimeField labelText="Ends" value={props.windowEnd} onChange={props.setWindowEnd} />
      <NumberField
        labelText="Grace min"
        min="0"
        max="240"
        value={props.graceMinutes}
        onChange={props.setGraceMinutes}
      />
    </div>
  );
}

function NumberField(props: {
  labelText: string;
  min: string;
  max: string;
  step?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={label}>
      {props.labelText}
      <input
        className={field}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => updateFiniteNumber(event.currentTarget.valueAsNumber, props.onChange)}
      />
    </label>
  );
}

function TimeField(props: { labelText: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={label}>
      {props.labelText}
      <input
        className={field}
        type="time"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function TodoCard({ todo }: { todo: Todo }) {
  const due = getDueState(todo);
  const { impact, statusTone } = getTodoPresentation(due);

  return (
    <article
      aria-label={`Todo: ${todo.title}`}
      className={cn(panel, statusTone, "grid gap-4 rounded-2xl p-4")}
    >
      <TodoCardHeader todo={todo} due={due} impact={impact} />
      <CadenceProgress score={due.adherenceScore} />
      <TodoFacts due={due} />
      <TodoActions todo={todo} />
    </article>
  );
}

function getTodoPresentation(due: ReturnType<typeof getDueState>) {
  if (due.isLate)
    return {
      impact: formatImpact(due.minutesLate),
      statusTone: "border-destructive/50 bg-destructive/5",
    };
  if (due.isDue) return { impact: "due now", statusTone: "border-chart-2/40 bg-muted/50" };

  return {
    impact: `in ${formatImpact(Math.abs(due.minutesUntilDue)).replace(" late", "")}`,
    statusTone: "border-border bg-card",
  };
}

function TodoCardHeader(props: {
  todo: Todo;
  due: ReturnType<typeof getDueState>;
  impact: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <p className={eyebrow}>{props.todo.frequencyPerDay}x/day cadence</p>
        <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          {props.todo.title}
        </h3>
        {props.todo.notes ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {props.todo.notes}
          </p>
        ) : null}
      </div>
      <ImpactBadge impact={props.impact} score={props.due.adherenceScore} />
    </div>
  );
}

function ImpactBadge({ impact, score }: { impact: string; score: number }) {
  return (
    <div className="rounded-xl border bg-background px-4 py-3 text-right shadow-xs">
      <strong className="block text-sm font-semibold">{impact}</strong>
      <small className="text-xs text-muted-foreground">{score}% if done now</small>
    </div>
  );
}

function CadenceProgress({ score }: { score: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span
        className="block h-full rounded-full bg-primary"
        style={{ width: `${Math.max(8, score)}%` }}
      />
    </div>
  );
}

function TodoFacts({ due }: { due: ReturnType<typeof getDueState> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <Fact label="Due" value={formatWhen(due.dueAt)} />
      <Fact label="Window closes" value={formatWhen(due.windowClosesAt)} />
      <Fact label="Next after complete" value={formatWhen(due.nextDueAt)} />
    </dl>
  );
}

function TodoActions({ todo }: { todo: Todo }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => markTodoComplete(todo)}>
        Mark complete
      </Button>
      <Button type="button" variant="outline" onClick={() => skipTodo(todo.id)}>
        Skip
      </Button>
      <Button type="button" variant="ghost" onClick={() => todosCollection.delete(todo.id)}>
        Delete
      </Button>
    </div>
  );
}

export function History() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);
  const cycleHistory = [...cycles].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <section className={cn(panel, "rounded-3xl p-6 lg:p-10")}>
      <div>
        <p className={eyebrow}>Cycle history</p>
        <h1 className="mt-2 font-heading text-5xl font-semibold tracking-tight md:text-7xl">
          Consistency ledger
        </h1>
      </div>
      <div className="mt-8 grid gap-3">
        {cycleHistory.map((cycle) => {
          const cycleTodos = todos.filter((todo) => todo.cycleId === cycle.id);
          return (
            <article
              key={cycle.id}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-background p-4"
            >
              <div>
                <h3 className="font-heading text-2xl font-semibold tracking-tight">
                  {cycle.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(cycle.startsAt).toLocaleDateString()} · {cycle.status}
                </p>
              </div>
              <strong className="font-heading text-3xl font-semibold tracking-tight">
                {averageScore(cycleTodos)}%
              </strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { data: settings } = useLiveQuery(settingsCollection);
  const current = settings.find((entry) => entry.id === "settings") ?? {
    id: "settings",
    theme: "system" as const,
  };

  return (
    <section className={cn(panel, "grid max-w-2xl gap-5 rounded-3xl p-6 lg:p-10")}>
      <div>
        <p className={eyebrow}>Settings collection</p>
        <h1 className="mt-2 font-heading text-5xl font-semibold tracking-tight">
          Local preferences
        </h1>
      </div>
      <label className={label}>
        Theme
        <select
          className={field}
          value={current.theme}
          onChange={(event) => {
            const theme = event.target.value as Settings["theme"];
            if (settings.some((entry) => entry.id === "settings")) {
              settingsCollection.update("settings", (draft) => {
                draft.theme = theme;
              });
            } else {
              settingsCollection.insert({ id: "settings", theme });
            }
          }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        All app data is stored in localStorage under the `cadence.*` keys.
      </p>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className={cn(panel, "grid gap-1 rounded-2xl p-4")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="font-heading text-4xl font-semibold tracking-tight">{value}</strong>
      <small className="text-xs text-muted-foreground">{detail}</small>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <article className={cn(panel, "rounded-2xl p-8")}>
      <h3 className="font-heading text-2xl font-semibold tracking-tight">No active cadences yet</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Add a task with a daily frequency, allowed time bounds, and a minimum spacing rule.
      </p>
    </article>
  );
}

function getActiveCycle(cycles: Array<Cycle>) {
  return cycles.find((cycle) => cycle.status === "active");
}

function ensureActiveCycle(activeCycle: Cycle | undefined) {
  if (activeCycle || isCreatingInitialCycle) return;

  isCreatingInitialCycle = true;
  cyclesCollection.insert(createDefaultCycle());
}

function getDashboardStats(todos: Array<Todo>, activeCycle: Cycle | undefined): DashboardStats {
  const cycleTodos = activeCycle
    ? todos.filter((todo) => todo.cycleId === activeCycle.id && !todo.deletedAt)
    : [];
  const activeTodos = cycleTodos.filter((todo) => todo.status === "active");
  const orderedTodos = [...activeTodos].sort(
    (a, b) => getDueState(a).dueAt.getTime() - getDueState(b).dueAt.getTime(),
  );

  return {
    orderedTodos,
    activeCount: activeTodos.length,
    completedCount: cycleTodos.filter((todo) => todo.completionLog.length > 0).length,
    skippedCount: cycleTodos.filter((todo) => todo.status === "skipped").length,
    streakDays: consistencyStreakDays(cycleTodos),
    score: averageScore(cycleTodos),
  };
}

function markTodoComplete(todo: Todo) {
  const completion = completeTodo(todo);
  todosCollection.update(todo.id, (draft) => {
    draft.status = "active";
    draft.completedAt = completion.completedAt;
    draft.updatedAt = nowIso();
    draft.completionLog.push(completion);
  });
}

function skipTodo(todoId: string) {
  todosCollection.update(todoId, (draft) => {
    draft.status = "skipped";
    draft.updatedAt = nowIso();
  });
}

function updateFiniteNumber(value: number, setValue: (value: number) => void) {
  if (Number.isFinite(value)) setValue(value);
}

function hasValidCadenceNumbers(...values: Array<number>) {
  return values.every(Number.isFinite);
}
