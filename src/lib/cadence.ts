import { cyclesCollection, todosCollection, type Cycle, type Todo } from "@/db";
import {
  averageScore,
  completeTodo,
  consistencyStreakDays,
  createDefaultCycle,
  formatImpact,
  getDueState,
  isInsideWindow,
  nowIso,
  toDateKey,
} from "@/time";

export type DashboardStats = {
  orderedTodos: Array<Todo>;
  cycleTodos: Array<Todo>;
  activeCount: number;
  completedCount: number;
  skippedCount: number;
  streakDays: number;
  score: number;
};

export type DueState = ReturnType<typeof getDueState>;

let isCreatingInitialCycle = false;

export function getActiveCycle(cycles: Array<Cycle>) {
  return cycles.find((cycle) => cycle.status === "active");
}

export function ensureActiveCycle(activeCycle: Cycle | undefined) {
  if (activeCycle || isCreatingInitialCycle) return;

  isCreatingInitialCycle = true;
  cyclesCollection.insert(createDefaultCycle());
}

export function getDashboardStats(
  todos: Array<Todo>,
  activeCycle: Cycle | undefined,
): DashboardStats {
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

export function markTodoComplete(todo: Todo) {
  const completion = completeTodo(todo);
  todosCollection.update(todo.id, (draft) => {
    draft.status = "active";
    draft.completedAt = completion.completedAt;
    draft.updatedAt = nowIso();
    draft.completionLog.push(completion);
  });
}

export function archiveTodo(todo: Todo) {
  todosCollection.update(todo.id, (draft) => {
    draft.status = "skipped";
    draft.updatedAt = nowIso();
  });
}

export function restoreTodo(todo: Todo) {
  todosCollection.update(todo.id, (draft) => {
    draft.status = "active";
    draft.updatedAt = nowIso();
  });
}

export function isWindowOpen(todo: Todo, at: Date = new Date()) {
  return isInsideWindow(at, todo.windowStart, todo.windowEnd);
}

export function isLoggedToday(todo: Todo, at: Date = new Date()) {
  const todayKey = toDateKey(at);
  return todo.completionLog.some(
    (completion) => toDateKey(new Date(completion.completedAt)) === todayKey,
  );
}

export type TodoPresentation = {
  action: string;
  icon: string;
  impact: string;
  rowTone: "" | "due" | "done";
  buttonTone: "" | "ghost";
};

export function getTodoPresentation(due: DueState, todo: Todo): TodoPresentation {
  if (due.isLate) {
    return {
      action: "Log",
      icon: "↻",
      impact: formatImpact(due.minutesLate),
      rowTone: "due",
      buttonTone: "",
    };
  }
  if (due.isDue)
    return { action: "Log", icon: "↻", impact: "due now", rowTone: "due", buttonTone: "" };
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

export function dayProgress(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = 6 * 60;
  const span = 16.5 * 60;

  return Math.min(1, Math.max(0, (minutes - start) / span));
}

export function arcPath(radius: number, start: number, end: number) {
  const p0 = polar(start, radius);
  const p1 = polar(end, radius);
  const large = (end - start) * Math.PI * 2 * 0.92 > Math.PI ? 1 : 0;

  return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

export function polar(progress: number, radius = 285) {
  const angle = -Math.PI / 2 + Math.PI * 2 * 0.92 * progress;

  return { x: 360 + Math.cos(angle) * radius, y: 360 + Math.sin(angle) * radius };
}

export function formatClock(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatUpcoming(minutesUntilDue: number) {
  return formatImpact(Math.abs(minutesUntilDue)).replace(" late", "");
}

export function updateFiniteNumber(value: number, setValue: (value: number) => void) {
  if (Number.isFinite(value)) setValue(value);
}

export function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

export function formatMinutesAsClock(totalMinutes: number) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(wrapped / 60);
  const minutes = Math.round(wrapped % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatGapMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export type DialMark = {
  key: string;
  progress: number;
  state: "done" | "due" | "window";
};

export function buildDialMarks(todos: Array<Todo>): Array<DialMark> {
  const marks = todos.flatMap<DialMark>((todo) => {
    const due = getDueState(todo);
    const completions: Array<DialMark> = todo.completionLog.slice(-3).map((completion, index) => ({
      key: `${todo.id}-done-${index}`,
      progress: dayProgress(new Date(completion.completedAt)),
      state: "done",
    }));

    return [
      ...completions,
      {
        key: `${todo.id}-due`,
        progress: dayProgress(due.dueAt),
        state: due.isDue ? "due" : "window",
      },
    ];
  });

  if (marks.length > 0) return marks.slice(0, 18);

  return [0.18, 0.34, 0.52, 0.68, 0.86].map((progress, index) => ({
    key: `placeholder-${index}`,
    progress,
    state: "window",
  }));
}
