import type { Completion, Todo } from "./db";

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;
const latenessScores = [
  { maxMinutes: 0, score: 100 },
  { maxMinutes: 15, score: 92 },
  { maxMinutes: 60, score: 78 },
  { maxMinutes: 180, score: 55 },
  { maxMinutes: 720, score: 30 },
  { maxMinutes: Number.POSITIVE_INFINITY, score: 10 },
];

type DueState = {
  dueAt: Date;
  nextDueAt: Date;
  windowClosesAt: Date;
  minutesUntilDue: number;
  minutesLate: number;
  isDue: boolean;
  isLate: boolean;
  adherenceScore: number;
};

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createDefaultCycle() {
  const now = nowIso();

  return {
    id: newId("cycle"),
    title: `Cycle ${new Date().toLocaleDateString([], { month: "short", day: "numeric" })}`,
    startsAt: now,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTodo(input: {
  cycleId: string;
  title: string;
  notes?: string;
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  daysOfWeek?: Array<number>;
}) {
  const now = nowIso();
  const normalizedDays =
    input.daysOfWeek && input.daysOfWeek.length > 0 && input.daysOfWeek.length < 7
      ? [...input.daysOfWeek].sort((a, b) => a - b)
      : undefined;

  return {
    id: newId("todo"),
    cycleId: input.cycleId,
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    frequencyPerDay: input.frequencyPerDay,
    minSpacingHours: input.minSpacingHours,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    graceMinutes: input.graceMinutes,
    daysOfWeek: normalizedDays,
    completionLog: [],
  };
}

export function getDueState(todo: Todo, at = new Date()): DueState {
  const dueAt = getCurrentDueAt(todo);
  const nextDueAt = getNextDueAfter(todo, dueAt);
  const windowClosesAt = new Date(dueAt.getTime() + todo.graceMinutes * minuteMs);
  const minutesUntilDue = Math.ceil((dueAt.getTime() - at.getTime()) / minuteMs);
  const minutesLate = Math.max(0, Math.floor((at.getTime() - windowClosesAt.getTime()) / minuteMs));
  const isDue = at >= dueAt;
  const isLate = minutesLate > 0;

  return {
    dueAt,
    nextDueAt,
    windowClosesAt,
    minutesUntilDue,
    minutesLate,
    isDue,
    isLate,
    adherenceScore: scoreForLateness(minutesLate),
  };
}

export function completeTodo(todo: Todo, at = new Date()) {
  const due = getDueState(todo, at);
  const latenessMinutes = Math.max(
    0,
    Math.floor((at.getTime() - due.windowClosesAt.getTime()) / minuteMs),
  );
  const completion: Completion = {
    completedAt: at.toISOString(),
    dueAt: due.dueAt.toISOString(),
    latenessMinutes,
    score: scoreForLateness(latenessMinutes),
  };

  return completion;
}

export function averageScore(todos: Array<Todo>) {
  const completions = todos.flatMap((todo) => todo.completionLog);

  if (completions.length === 0) return 0;

  return Math.round(
    completions.reduce((sum, completion) => sum + completion.score, 0) / completions.length,
  );
}

export function consistencyStreakDays(todos: Array<Todo>) {
  const completedDays = new Set(
    todos
      .flatMap((todo) => todo.completionLog)
      .filter((completion) => completion.score >= 70)
      .map((completion) => completion.completedAt.slice(0, 10)),
  );
  let streak = 0;
  const cursor = startOfDay(new Date());

  while (completedDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function formatImpact(minutes: number) {
  if (minutes <= 0) return "inside the window";

  return `${formatDuration(minutes)} late`;
}

export function formatWhen(date: Date) {
  return date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scoreForLateness(minutesLate: number) {
  return latenessScores.find((band) => minutesLate <= band.maxMinutes)?.score ?? 10;
}

function formatDuration(minutes: number) {
  const units = [
    { label: "d", value: Math.floor(minutes / (24 * 60)) },
    { label: "h", value: Math.floor((minutes % (24 * 60)) / 60) },
    { label: "m", value: minutes % 60 },
  ];
  const parts = units.filter((unit) => unit.value > 0).slice(0, 2);

  return parts.map((unit) => `${unit.value}${unit.label}`).join(" ");
}

function getCurrentDueAt(todo: Todo) {
  const lastCompletedAt = todo.completionLog.at(-1)?.completedAt;
  const interval = cadenceInterval(todo);

  if (lastCompletedAt) {
    const candidate = new Date(new Date(lastCompletedAt).getTime() + interval);

    if (
      isInsideWindow(candidate, todo.windowStart, todo.windowEnd) &&
      isDayActive(todo, candidate)
    ) {
      return candidate;
    }
    return nextActiveWindowStart(candidate, todo);
  }

  return getFirstDueAt(todo, interval);
}

function getFirstDueAt(todo: Todo, interval: number) {
  const createdAt = new Date(todo.createdAt);
  let candidate = dateAtTime(createdAt, todo.windowStart);

  if (isAfterMidnightInOvernightWindow(createdAt, todo.windowStart, todo.windowEnd)) {
    candidate.setDate(candidate.getDate() - 1);
  }

  if (!isDayActive(todo, candidate)) {
    candidate = nextActiveWindowStart(candidate, todo);
  }

  while (candidate.getTime() + todo.graceMinutes * minuteMs < createdAt.getTime()) {
    candidate = getNextDueAfter(todo, candidate, interval);
  }

  return candidate;
}

function getNextDueAfter(todo: Todo, date: Date, interval = cadenceInterval(todo)) {
  let candidate = new Date(date.getTime() + interval);

  if (
    !isInsideWindow(candidate, todo.windowStart, todo.windowEnd) ||
    !isDayActive(todo, candidate)
  ) {
    candidate = nextActiveWindowStart(candidate, todo);
  }

  return candidate;
}

function isDayActive(todo: Todo, date: Date) {
  const days = todo.daysOfWeek;
  if (!days || days.length === 0) return true;
  return days.includes(date.getDay());
}

function nextActiveWindowStart(date: Date, todo: Todo) {
  let cursor = nextWindowStart(date, todo.windowStart, todo.windowEnd);
  for (let i = 0; i < 8; i++) {
    if (isDayActive(todo, cursor)) return cursor;
    const tomorrow = new Date(cursor);
    tomorrow.setDate(tomorrow.getDate() + 1);
    cursor = dateAtTime(tomorrow, todo.windowStart);
  }
  return cursor;
}

function cadenceInterval(todo: Todo) {
  return Math.max(dayMs / todo.frequencyPerDay, todo.minSpacingHours * hourMs);
}

function dateAtTime(date: Date, time: string) {
  const { hours, minutes } = parseTime(time);
  const result = startOfDay(date);
  result.setHours(hours, minutes, 0, 0);

  return result;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  return result;
}

export function isInsideWindow(date: Date, start: string, end: string) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function isAfterMidnightInOvernightWindow(date: Date, start: string, end: string) {
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return startMinutes > endMinutes && currentMinutes <= endMinutes;
}

function nextWindowStart(date: Date, start: string, end: string) {
  if (isInsideWindow(date, start, end)) return date;

  const todayStart = dateAtTime(date, start);

  if (date < todayStart) return todayStart;

  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow;
}

function minutesFromTime(time: string) {
  const { hours, minutes } = parseTime(time);

  return hours * 60 + minutes;
}

function parseTime(time: string) {
  const [hoursPart, minutesPart] = time.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid time value: ${time}`);
  }

  return { hours, minutes };
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
