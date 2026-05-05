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

const field =
  "tide-field min-h-10 w-full rounded-none border-0 border-b bg-transparent px-0 py-2 text-sm shadow-none outline-none transition-colors placeholder:text-[color:rgba(216,229,225,0.38)] focus-visible:ring-0";
const label = "grid gap-2 text-sm font-medium text-[color:var(--foam)]";
const statText = "font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--foam)]/60";
let isCreatingSettings = false;
let isCreatingInitialCycle = false;
let isSeedingDevCadences = false;

type DashboardStats = {
  orderedTodos: Array<Todo>;
  cycleTodos: Array<Todo>;
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

type DueState = ReturnType<typeof getDueState>;

export function RootLayout() {
  const { data: settings } = useLiveQuery(settingsCollection);

  useEnsureSettings(settings);
  useApplyTheme(settings);

  return (
    <main className="page">
      <header className="mast">
        <BrandLink />
        <PrimaryNav />
      </header>
      <Outlet />
    </main>
  );
}

function useEnsureSettings(settings: Array<Settings>) {
  useEffect(() => {
    if (settings.some((entry) => entry.id === "settings") || isCreatingSettings) return;

    isCreatingSettings = true;
    settingsCollection.insert({ id: "settings", theme: "system" });
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
    <Link to="/" className="brand no-underline" aria-label="Cadence home">
      <span className="moon-mark" aria-hidden="true" />
      <span>
        <span className="brand-name">Cadence</span>
        <span className="brand-tag">small tides, kept</span>
      </span>
    </Link>
  );
}

function PrimaryNav() {
  const links = [
    { to: "/", label: "Today", num: "i" },
    { to: "/history", label: "History", num: "ii" },
    { to: "/settings", label: "Settings", num: "iii" },
  ];

  return (
    <nav className="nav" aria-label="Primary navigation">
      {links.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="tab"
          activeProps={{ className: "tab on" }}
          activeOptions={{ exact: item.to === "/" }}
        >
          <span className="num">{item.num}</span>
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
    seedDevCadences(activeCycle, stats.cycleTodos.length > 0);
  }, [activeCycle, stats.cycleTodos.length]);

  if (!activeCycle)
    return <section className="tide-panel p-8">Preparing your first cycle...</section>;

  return (
    <>
      <DashboardHero cycle={activeCycle} />
      <TideStage cycle={activeCycle} stats={stats} />
      <CurrentCycleWorkspace cycle={activeCycle} stats={stats} />
    </>
  );
}

function DashboardHero({ cycle }: { cycle: Cycle }) {
  const today = new Date();

  return (
    <section className="hero">
      <h1 className="display">
        The day is <em>turning</em>.
      </h1>
      <div className="meta">
        {today.toLocaleDateString([], { weekday: "long" })} ·{" "}
        <b>{today.toLocaleDateString([], { day: "numeric", month: "long" })}</b>
        <br />
        Cycle <b>{cycle.title}</b>
        <br />
        Local-first · <b>offline ready</b>
      </div>
    </section>
  );
}

function TideStage({ cycle, stats }: { cycle: Cycle; stats: DashboardStats }) {
  const nextTodo = stats.orderedTodos[0];
  const kept = stats.cycleTodos.reduce((sum, todo) => sum + todo.completionLog.length, 0);
  const possible = Math.max(kept + stats.activeCount + stats.skippedCount, stats.activeCount);

  return (
    <section className="stage">
      <div className="dial-wrap" aria-label={`Average adherence score ${stats.score}`}>
        <DayDial todos={stats.orderedTodos} />
        <div className="dial-center">
          <div className="now-tag">it is</div>
          <div className="now-h">{formatClock(new Date())}</div>
          <div className="frac">
            <b>{kept}</b> of {possible} returns kept
          </div>
          <div className="next">
            <i /> next: <b>{nextTodo ? nextTodo.title : "Add a cadence"}</b>
          </div>
        </div>
      </div>
      <SideRail cycle={cycle} stats={stats} />
    </section>
  );
}

function DayDial({ todos }: { todos: Array<Todo> }) {
  const marks = buildDialMarks(todos);
  const progress = dayProgress(new Date());
  const progressPath = arcPath(285, 0, progress);
  const futurePath = arcPath(285, progress, 1);
  const nowPoint = polar(progress);

  return (
    <svg viewBox="0 0 720 720" aria-hidden="true">
      <defs>
        <linearGradient id="seaArc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8d8d3" stopOpacity="0.65" />
          <stop offset="55%" stopColor="#ecdcc1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e87b5a" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="sun" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fff8e8" />
          <stop offset="55%" stopColor="#f0a890" />
          <stop offset="100%" stopColor="#c8723a" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#f0a890" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#e87b5a" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#e87b5a" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="360" cy="360" r="200" fill="url(#halo)" opacity="0.55" />
      <circle cx="360" cy="360" r="320" fill="none" stroke="rgba(184,216,211,0.18)" />
      <circle
        cx="360"
        cy="360"
        r="250"
        fill="none"
        stroke="rgba(184,216,211,0.12)"
        strokeDasharray="2 6"
      />
      <path
        d={arcPath(285, 0.3, 0.67)}
        fill="none"
        stroke="rgba(232,123,90,0.14)"
        strokeWidth="70"
      />
      <path
        d={arcPath(285, 0.79, 0.97)}
        fill="none"
        stroke="rgba(184,216,211,0.1)"
        strokeWidth="70"
      />
      <HourTicks />
      <path d={progressPath} fill="none" stroke="url(#seaArc)" strokeWidth="70" opacity="0.32" />
      <path
        d={progressPath}
        fill="none"
        stroke="url(#seaArc)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={futurePath}
        fill="none"
        stroke="rgba(184,216,211,0.35)"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      {marks.map((mark) => (
        <DialMark key={mark.key} mark={mark} />
      ))}
      <g transform={`translate(${nowPoint.x} ${nowPoint.y})`} filter="url(#glow)">
        <circle r="36" fill="rgba(240,168,144,0.18)" />
        <circle r="24" fill="rgba(240,168,144,0.30)" />
        <circle r="14" fill="url(#sun)" />
      </g>
      <line
        x1="360"
        y1="360"
        x2={nowPoint.x}
        y2={nowPoint.y}
        stroke="rgba(232,123,90,0.32)"
        strokeDasharray="2 5"
      />
    </svg>
  );
}

function HourTicks() {
  const ticks = Array.from({ length: 9 }, (_, index) => 6 + index * 2);

  return (
    <>
      {ticks.map((hour) => {
        const progress = (hour - 6) / 16.5;
        const inner = polar(progress, 324);
        const outer = polar(progress, 338);
        const labelPoint = polar(progress, 356);

        return (
          <g key={hour}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(184,216,211,0.55)"
              strokeWidth="1.2"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              fill="rgba(244,237,224,0.78)"
              fontSize="13"
              fontFamily="DM Mono, monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {String(hour).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </>
  );
}

function DialMark({ mark }: { mark: ReturnType<typeof buildDialMarks>[number] }) {
  const point = polar(mark.progress);

  if (mark.state === "done") {
    return (
      <g>
        <circle cx={point.x} cy={point.y} r="9" fill="#f4ede0" stroke="#0a1f27" strokeWidth="2" />
        <circle cx={point.x} cy={point.y} r="4" fill="#0a1f27" />
      </g>
    );
  }

  if (mark.state === "due") {
    return (
      <g filter="url(#glow)">
        <circle cx={point.x} cy={point.y} r="16" fill="#e87b5a" />
        <circle cx={point.x} cy={point.y} r="8" fill="#ffffff" />
      </g>
    );
  }

  return <circle cx={point.x} cy={point.y} r="7" fill="#b8d8d3" opacity="0.42" />;
}

function SideRail({ cycle, stats }: { cycle: Cycle; stats: DashboardStats }) {
  const nextDue = stats.orderedTodos[0] ? getDueState(stats.orderedTodos[0]).dueAt : undefined;
  const missed = stats.skippedCount;

  return (
    <aside className="side">
      <SideBlock
        label="tonight closes at"
        value="22:30"
        detail={`${stats.activeCount} cadences in motion.`}
      />
      <SideBlock
        label="steady streak"
        value={
          <>
            <em>{stats.streakDays}</em> days
          </>
        }
        detail={`${cycle.title} keeps its tide.`}
      />
      <SideBlock
        label="next return"
        value={nextDue ? formatClock(nextDue) : "--:--"}
        detail={
          missed
            ? `${missed} skipped this cycle. Forgive it; carry on.`
            : "No misses logged this cycle."
        }
      />
    </aside>
  );
}

function SideBlock(props: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="blok">
      <div className="l">{props.label}</div>
      <div className="v">{props.value}</div>
      <div className="h">{props.detail}</div>
    </div>
  );
}

function CurrentCycleWorkspace({ cycle, stats }: { cycle: Cycle; stats: DashboardStats }) {
  return (
    <section className="tide-workspace">
      <CurrentTodosList todos={stats.orderedTodos} />
      <AddTodoForm cycle={cycle} />
    </section>
  );
}

function CurrentTodosList({ todos }: { todos: Array<Todo> }) {
  return (
    <div>
      <div className="section-h">
        <h2>
          The <em>currents</em>.
        </h2>
        <div className="filters" aria-hidden="true">
          <button className="on">All</button>
          <button>Due</button>
          <button>Open windows</button>
          <button>Logged</button>
        </div>
      </div>
      <div className="currents">
        {todos.length === 0 ? (
          <EmptyState />
        ) : (
          todos.map((todo) => <TodoCard key={todo.id} todo={todo} />)
        )}
      </div>
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
      className="tide-form"
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
      <Button type="submit" className="swim w-fit">
        Add cadence
      </Button>
    </form>
  );
}

function TodoFormHeader() {
  return (
    <div>
      <p className={statText}>new cyclic todo</p>
      <h2 className="form-title">
        Design a <em>cadence</em>.
      </h2>
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
  const presentation = getTodoPresentation(due, todo);

  return (
    <article aria-label={`Todo: ${todo.title}`} className={cn("current", presentation.rowTone)}>
      <div className="ic" aria-hidden="true">
        {presentation.icon}
      </div>
      <div>
        <div className="nm">
          {renderTideName(todo.title)}
          {todo.notes ? <span className="nt">{todo.notes}</span> : null}
        </div>
      </div>
      <div className="pulse-col">
        <span>{todo.frequencyPerDay}x/day cadence</span>
        <span className="when">{formatWhen(due.dueAt)}</span>
        <span className={due.isLate ? "miss" : undefined}>{presentation.impact}</span>
        <span>{due.adherenceScore}% if done now</span>
        <span>Next after complete {formatWhen(due.nextDueAt)}</span>
      </div>
      <WaveBars todo={todo} due={due} />
      <button
        className={cn("swim", presentation.buttonTone)}
        type="button"
        aria-label="Mark complete"
        onClick={() => markTodoComplete(todo)}
      >
        {presentation.action}
      </button>
    </article>
  );
}

function getTodoPresentation(due: DueState, todo: Todo) {
  if (due.isLate) {
    return {
      action: "Log now",
      icon: "↻",
      impact: formatImpact(due.minutesLate),
      rowTone: "due",
      buttonTone: "",
    };
  }
  if (due.isDue)
    return { action: "Log now", icon: "↻", impact: "due now", rowTone: "due", buttonTone: "" };
  if (todo.completionLog.length > 0) {
    return {
      action: "Log",
      icon: "✓",
      impact: `in ${formatUpcoming(due.minutesUntilDue)}`,
      rowTone: "done",
      buttonTone: "ghost",
    };
  }

  return {
    action: "Log",
    icon: "∽",
    impact: `in ${formatUpcoming(due.minutesUntilDue)}`,
    rowTone: "",
    buttonTone: "",
  };
}

function renderTideName(title: string) {
  const words = title.trim().split(/\s+/);
  const last = words.at(-1);
  if (!last || words.length === 1) return title;

  return (
    <>
      {words.slice(0, -1).join(" ")} <em>{last}</em>
    </>
  );
}

function WaveBars({ todo, due }: { todo: Todo; due: DueState }) {
  const total = Math.max(1, Math.min(8, todo.frequencyPerDay));
  const completed = Math.min(todo.completionLog.length, total);
  const currentClass = due.isLate ? "miss" : "now";
  const bars = Array.from({ length: total }, (_, index) => ({
    key: `${todo.id}-${index}`,
    className: index < completed ? "done" : currentClass,
    height: 12 + ((index * 5) % 6) * 2,
  }));

  return (
    <div className="wave" aria-hidden="true">
      {bars.map((bar) => (
        <i key={bar.key} className={bar.className} style={{ height: bar.height }} />
      ))}
    </div>
  );
}

export function History() {
  const { data: todos } = useLiveQuery(todosCollection);
  const { data: cycles } = useLiveQuery(cyclesCollection);
  const cycleHistory = [...cycles].sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <section className="tide-panel">
      <p className={statText}>cycle history</p>
      <h1 className="form-title">
        Consistency <em>ledger</em>.
      </h1>
      <div className="mt-8 grid gap-3">
        {cycleHistory.map((cycle) => {
          const cycleTodos = todos.filter((todo) => todo.cycleId === cycle.id);
          return (
            <article key={cycle.id} className="ledger-row">
              <div>
                <h3>{cycle.title}</h3>
                <p>
                  {new Date(cycle.startsAt).toLocaleDateString()} · {cycle.status}
                </p>
              </div>
              <strong>{averageScore(cycleTodos)}%</strong>
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
    <section className="tide-panel max-w-2xl">
      <p className={statText}>settings collection</p>
      <h1 className="form-title">
        Local <em>preferences</em>.
      </h1>
      <label className={cn(label, "mt-8")}>
        Theme
        <select
          className={field}
          value={current.theme}
          onChange={(event) => updateTheme(settings, event.target.value as Settings["theme"])}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <p className="mt-5 text-sm leading-6 text-[color:var(--foam)]/75">
        All app data is stored in localStorage under the `cadence.*` keys.
      </p>
    </section>
  );
}

function updateTheme(settings: Array<Settings>, theme: Settings["theme"]) {
  if (settings.some((entry) => entry.id === "settings")) {
    settingsCollection.update("settings", (draft) => {
      draft.theme = theme;
    });
  } else {
    settingsCollection.insert({ id: "settings", theme });
  }
}

function EmptyState() {
  return (
    <article className="empty-current">
      <h3>No active cadences yet</h3>
      <p>Add a task with a daily frequency, allowed time bounds, and a minimum spacing rule.</p>
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

function seedDevCadences(activeCycle: Cycle | undefined, hasCycleTodos: boolean) {
  const cycleId = getDevSeedCycleId(activeCycle, hasCycleTodos);
  if (!cycleId) return;

  isSeedingDevCadences = true;
  for (const todo of createTideSeedTodos(cycleId)) todosCollection.insert(todo);
}

function getDevSeedCycleId(activeCycle: Cycle | undefined, hasCycleTodos: boolean) {
  const blockers = [!import.meta.env.DEV, !activeCycle, hasCycleTodos, isSeedingDevCadences];

  return blockers.some(Boolean) ? undefined : activeCycle?.id;
}

function createTideSeedTodos(cycleId: string) {
  const now = new Date();
  const updatedAt = now.toISOString();

  return [
    tideSeedTodo({
      cycleId,
      id: "dev-stretch-break",
      title: "Stretch break",
      notes: "Ninety-minute desk reset.",
      frequencyPerDay: 8,
      minSpacingHours: 1.5,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 10,
      createdAt: todayAt(now, "08:00"),
      updatedAt,
      completionTimes: ["09:10", "10:40", "11:40"],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-hydrate",
      title: "Hydrate",
      notes: "A glass between meetings.",
      frequencyPerDay: 8,
      minSpacingHours: 1.5,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 30,
      createdAt: todayAt(now, "07:00"),
      updatedAt,
      completionTimes: ["08:18", "10:48", "12:18"],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-inbox-triage",
      title: "Inbox triage",
      notes: "Sort, don't reply. Defer is allowed.",
      frequencyPerDay: 2,
      minSpacingHours: 4,
      windowStart: "09:00",
      windowEnd: "17:30",
      graceMinutes: 30,
      createdAt: todayAt(now, "09:30"),
      updatedAt,
      completionTimes: ["11:30"],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-walk-outside",
      title: "Walk outside",
      notes: "Twenty minutes, daylight on the face.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "11:00",
      windowEnd: "17:00",
      graceMinutes: 45,
      createdAt: todayAt(now, "11:00"),
      updatedAt,
      completionTimes: [],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-read-paper",
      title: "Read paper only",
      notes: "Twenty pages, anywhere but a screen.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "19:00",
      windowEnd: "22:00",
      graceMinutes: 30,
      createdAt: todayAt(now, "19:00"),
      updatedAt,
      completionTimes: [],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-wind-down",
      title: "Wind down",
      notes: "Lights low, screens away.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "21:30",
      windowEnd: "23:00",
      graceMinutes: 20,
      createdAt: todayAt(now, "21:30"),
      updatedAt,
      completionTimes: [],
    }),
    tideSeedTodo({
      cycleId,
      id: "dev-brush-teeth",
      title: "Brush teeth",
      notes: "Morning and evening.",
      frequencyPerDay: 2,
      minSpacingHours: 8,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 30,
      createdAt: todayAt(now, "06:30"),
      updatedAt,
      completionTimes: ["13:00"],
    }),
  ];
}

function tideSeedTodo(input: {
  cycleId: string;
  id: string;
  title: string;
  notes: string;
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  createdAt: string;
  updatedAt: string;
  completionTimes: Array<string>;
}): Todo {
  const completionLog = input.completionTimes.map((time) => ({
    completedAt: todayAt(new Date(input.updatedAt), time),
    dueAt: todayAt(new Date(input.updatedAt), time),
    latenessMinutes: 0,
    score: 100,
  }));

  return {
    id: input.id,
    cycleId: input.cycleId,
    title: input.title,
    notes: input.notes,
    status: "active",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    completedAt: completionLog.at(-1)?.completedAt,
    frequencyPerDay: input.frequencyPerDay,
    minSpacingHours: input.minSpacingHours,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    graceMinutes: input.graceMinutes,
    completionLog,
  };
}

function todayAt(base: Date, time: string) {
  const [hoursPart, minutesPart] = time.split(":");
  const result = new Date(base);
  result.setHours(Number(hoursPart), Number(minutesPart), 0, 0);

  return result.toISOString();
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
    cycleTodos,
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

function updateFiniteNumber(value: number, setValue: (value: number) => void) {
  if (Number.isFinite(value)) setValue(value);
}

function hasValidCadenceNumbers(...values: Array<number>) {
  return values.every(Number.isFinite);
}

function buildDialMarks(todos: Array<Todo>) {
  const marks = todos.flatMap((todo) => {
    const due = getDueState(todo);
    const completions = todo.completionLog.slice(-3).map((completion, index) => ({
      key: `${todo.id}-done-${index}`,
      progress: dayProgress(new Date(completion.completedAt)),
      state: "done" as const,
    }));

    return [
      ...completions,
      {
        key: `${todo.id}-due`,
        progress: dayProgress(due.dueAt),
        state: due.isDue ? ("due" as const) : ("window" as const),
      },
    ];
  });

  if (marks.length > 0) return marks.slice(0, 18);

  return [0.18, 0.34, 0.52, 0.68, 0.86].map((progress, index) => ({
    key: `placeholder-${index}`,
    progress,
    state: "window" as const,
  }));
}

function dayProgress(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = 6 * 60;
  const span = 16.5 * 60;

  return Math.min(1, Math.max(0, (minutes - start) / span));
}

function arcPath(radius: number, start: number, end: number) {
  const p0 = polar(start, radius);
  const p1 = polar(end, radius);
  const large = (end - start) * Math.PI * 2 * 0.92 > Math.PI ? 1 : 0;

  return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

function polar(progress: number, radius = 285) {
  const angle = -Math.PI / 2 + Math.PI * 2 * 0.92 * progress;

  return { x: 360 + Math.cos(angle) * radius, y: 360 + Math.sin(angle) * radius };
}

function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatUpcoming(minutesUntilDue: number) {
  return formatImpact(Math.abs(minutesUntilDue)).replace(" late", "");
}
