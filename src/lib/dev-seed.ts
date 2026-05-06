import { todosCollection, type Cycle, type Todo } from "@/db";

let isSeedingDevCadences = false;

export function seedDevCadences(activeCycle: Cycle | undefined, hasCycleTodos: boolean) {
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
