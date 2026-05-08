import { cyclesCollection, todosCollection, type Completion, type Cycle, type Todo } from "@/db";

let isSeedingDevCadences = false;

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

type Story = "steady" | "slump" | "reset";

type SeedTodoInput = {
  cycleId: string;
  id: string;
  title: string;
  notes: string;
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  daysOfWeek?: Array<number>;
  status?: Todo["status"];
  createdAt: string;
  updatedAt: string;
  completionLog: Array<Completion>;
};

export function runDevSeed(activeCycle: Cycle) {
  if (!import.meta.env.DEV) return;
  if (isSeedingDevCadences) return;
  isSeedingDevCadences = true;

  try {
    const now = new Date();
    const pastCycles = createPastCycles(now);
    for (const { cycle, todos } of pastCycles) {
      cyclesCollection.insert(cycle);
      for (const todo of todos) todosCollection.insert(todo);
    }

    const activeWithTitle = renameActiveCycle(activeCycle, now);
    for (const todo of createCurrentCycleTodos(activeWithTitle.id, now)) {
      todosCollection.insert(todo);
    }
  } finally {
    isSeedingDevCadences = false;
  }
}

function renameActiveCycle(activeCycle: Cycle, now: Date) {
  const title = `${monthName(now)}: building rhythm`;
  cyclesCollection.update(activeCycle.id, (draft) => {
    draft.title = title;
    draft.updatedAt = now.toISOString();
  });
  return { ...activeCycle, title };
}

// ---------- Past cycles ----------

function createPastCycles(now: Date) {
  return [
    buildPastCycle({
      id: "dev-cycle-steady",
      title: "March: the steady month",
      story: "steady",
      startsAt: addDays(now, -65),
      endsAt: addDays(now, -36),
      now,
    }),
    buildPastCycle({
      id: "dev-cycle-slump",
      title: "April: the broken streak",
      story: "slump",
      startsAt: addDays(now, -35),
      endsAt: addDays(now, -8),
      now,
    }),
    buildPastCycle({
      id: "dev-cycle-reset",
      title: "Early May: short reset",
      story: "reset",
      startsAt: addDays(now, -7),
      endsAt: addDays(now, -1),
      now,
    }),
  ];
}

function buildPastCycle(input: {
  id: string;
  title: string;
  story: Story;
  startsAt: Date;
  endsAt: Date;
  now: Date;
}) {
  const createdAtIso = input.startsAt.toISOString();
  const closedAtIso = input.endsAt.toISOString();
  const cycle: Cycle = {
    id: input.id,
    title: input.title,
    startsAt: createdAtIso,
    endsAt: closedAtIso,
    status: "closed",
    createdAt: createdAtIso,
    updatedAt: closedAtIso,
  };
  const todos = pastCycleTodoTemplates(input.story).map((template, index) =>
    buildPastTodo({
      cycleId: input.id,
      story: input.story,
      template,
      index,
      cycleStart: input.startsAt,
      cycleEnd: input.endsAt,
      closedAtIso,
    }),
  );

  return { cycle, todos };
}

type PastTodoTemplate = {
  slug: string;
  title: string;
  notes: string;
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  daysOfWeek?: Array<number>;
  // Anchor times during the day where completions cluster.
  anchorTimes: Array<string>;
};

function pastCycleTodoTemplates(story: Story): Array<PastTodoTemplate> {
  if (story === "reset") {
    return [
      {
        slug: "morning-light",
        title: "Morning light",
        notes: "Step outside within an hour of waking.",
        frequencyPerDay: 1,
        minSpacingHours: 0,
        windowStart: "06:30",
        windowEnd: "09:30",
        graceMinutes: 30,
        anchorTimes: ["07:30"],
      },
      {
        slug: "lunchtime-walk",
        title: "Lunchtime walk",
        notes: "Twenty minutes, no podcasts.",
        frequencyPerDay: 1,
        minSpacingHours: 0,
        windowStart: "12:00",
        windowEnd: "14:00",
        graceMinutes: 45,
        anchorTimes: ["12:45"],
      },
      {
        slug: "wind-down",
        title: "Wind down",
        notes: "Lights low, screens away.",
        frequencyPerDay: 1,
        minSpacingHours: 0,
        windowStart: "21:30",
        windowEnd: "23:00",
        graceMinutes: 20,
        anchorTimes: ["22:00"],
      },
    ];
  }

  // Steady and slump share the same cadences, but with different completion
  // outcomes. Mirroring them keeps the History view honest.
  return [
    {
      slug: "stretch-break",
      title: "Stretch break",
      notes: "Ninety-minute desk reset.",
      frequencyPerDay: 6,
      minSpacingHours: 1.5,
      windowStart: "08:00",
      windowEnd: "20:00",
      graceMinutes: 15,
      anchorTimes: ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00"],
    },
    {
      slug: "hydrate",
      title: "Hydrate",
      notes: "A glass between meetings.",
      frequencyPerDay: 6,
      minSpacingHours: 1.5,
      windowStart: "07:00",
      windowEnd: "21:00",
      graceMinutes: 30,
      anchorTimes: ["08:30", "10:00", "12:00", "14:30", "17:00", "19:30"],
    },
    {
      slug: "inbox-triage",
      title: "Inbox triage",
      notes: "Sort, don't reply.",
      frequencyPerDay: 2,
      minSpacingHours: 4,
      windowStart: "09:00",
      windowEnd: "17:30",
      graceMinutes: 30,
      daysOfWeek: [1, 2, 3, 4, 5],
      anchorTimes: ["10:00", "15:30"],
    },
    {
      slug: "walk-outside",
      title: "Walk outside",
      notes: "Twenty minutes, daylight on the face.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "11:30",
      windowEnd: "16:30",
      graceMinutes: 60,
      anchorTimes: ["13:00"],
    },
    {
      slug: "read-paper",
      title: "Read paper only",
      notes: "Twenty pages, anywhere but a screen.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "19:00",
      windowEnd: "22:30",
      graceMinutes: 30,
      anchorTimes: ["20:30"],
    },
    {
      slug: "wind-down",
      title: "Wind down",
      notes: "Lights low, screens away.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "21:30",
      windowEnd: "23:00",
      graceMinutes: 20,
      anchorTimes: ["22:10"],
    },
    {
      slug: "brush-teeth",
      title: "Brush teeth",
      notes: "Morning and evening.",
      frequencyPerDay: 2,
      minSpacingHours: 8,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 30,
      anchorTimes: ["07:30", "22:00"],
    },
  ];
}

function buildPastTodo(input: {
  cycleId: string;
  story: Story;
  template: PastTodoTemplate;
  index: number;
  cycleStart: Date;
  cycleEnd: Date;
  closedAtIso: string;
}): Todo {
  const { template, story, cycleStart, cycleEnd } = input;
  const createdAt = setTime(cycleStart, template.windowStart);
  const completionLog = buildPastCompletionLog({
    template,
    story,
    cycleStart,
    cycleEnd,
    todoIndex: input.index,
  });
  const status = pickPastStatus(story, input.index);

  return {
    id: `${input.cycleId}-${template.slug}`,
    cycleId: input.cycleId,
    title: template.title,
    notes: template.notes,
    status,
    createdAt: createdAt.toISOString(),
    updatedAt: input.closedAtIso,
    completedAt: completionLog.at(-1)?.completedAt,
    frequencyPerDay: template.frequencyPerDay,
    minSpacingHours: template.minSpacingHours,
    windowStart: template.windowStart,
    windowEnd: template.windowEnd,
    graceMinutes: template.graceMinutes,
    daysOfWeek: template.daysOfWeek,
    completionLog,
  };
}

function pickPastStatus(story: Story, index: number): Todo["status"] {
  // Slump cycles end with a couple of cadences shelved.
  if (story === "slump" && (index === 2 || index === 5)) return "skipped";
  return "active";
}

function buildPastCompletionLog(input: {
  template: PastTodoTemplate;
  story: Story;
  cycleStart: Date;
  cycleEnd: Date;
  todoIndex: number;
}): Array<Completion> {
  const { template, story, cycleStart, cycleEnd, todoIndex } = input;
  const log: Array<Completion> = [];
  const totalDays = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / dayMs));

  for (let day = 0; day < totalDays; day++) {
    const dayDate = addDays(cycleStart, day);
    if (template.daysOfWeek && !template.daysOfWeek.includes(dayDate.getDay())) continue;

    for (let hit = 0; hit < template.anchorTimes.length; hit++) {
      const anchor = template.anchorTimes[hit];
      if (!anchor) continue;
      const dueAt = setTime(dayDate, anchor);

      const outcome = pickOutcome({ story, todoIndex, day, hit, totalDays });
      if (outcome === "missed") continue;

      const lateness = computeLateness({ outcome, story, todoIndex, day, hit });
      const completedAt = new Date(dueAt.getTime() + (lateness + 1) * minuteMs);
      log.push({
        completedAt: completedAt.toISOString(),
        dueAt: dueAt.toISOString(),
        latenessMinutes: lateness,
        score: scoreForLatenessLocal(lateness),
      });
    }
  }

  return log;
}

type Outcome = "ontime" | "slightly-late" | "very-late" | "missed";

function pickOutcome(input: {
  story: Story;
  todoIndex: number;
  day: number;
  hit: number;
  totalDays: number;
}): Outcome {
  const { story, todoIndex, day, hit, totalDays } = input;
  const seed = (todoIndex * 31 + day * 7 + hit) % 100;

  if (story === "steady") {
    if (seed < 78) return "ontime";
    if (seed < 95) return "slightly-late";
    return "missed";
  }
  if (story === "slump") {
    const slumpZone = day >= Math.floor(totalDays * 0.3) && day <= Math.floor(totalDays * 0.7);
    if (slumpZone) {
      if (seed < 12) return "ontime";
      if (seed < 30) return "slightly-late";
      if (seed < 65) return "very-late";
      return "missed";
    }
    if (seed < 45) return "ontime";
    if (seed < 60) return "slightly-late";
    if (seed < 80) return "very-late";
    return "missed";
  }
  // reset: 3 cadences. Two are mostly perfect, one is consistently dragging
  // so the cycle's average lands around 80 with the dragging cadence near 40.
  if (todoIndex === 2) {
    // Use day-driven rotation so every cycle of seeds touches each band.
    const band = day % 4;
    if (band === 0) return "very-late";
    if (band === 1) return "missed";
    if (band === 2) return "very-late";
    return "slightly-late";
  }
  return "ontime";
}

function computeLateness(input: {
  outcome: Outcome;
  story: Story;
  todoIndex: number;
  day: number;
  hit: number;
}): number {
  const { outcome, todoIndex, day, hit } = input;
  if (outcome === "ontime") return 0;
  if (outcome === "slightly-late") return jitterMinutes(20, todoIndex + day + hit, 30);
  // very-late: 90-300 minutes lateness so scores land in the 30-55 band.
  return jitterMinutes(90, todoIndex * 11 + day * 5 + hit, 210);
}

// ---------- Current cycle ----------

function createCurrentCycleTodos(cycleId: string, now: Date): Array<Todo> {
  const updatedAt = now.toISOString();
  return [
    buildCurrentTodo({
      cycleId,
      id: "dev-current-stretch-break",
      title: "Stretch break",
      notes: "Ninety-minute desk reset.",
      frequencyPerDay: 8,
      minSpacingHours: 1.25,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 15,
      createdAt: setTime(now, "06:00").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(now, ["07:30", "09:00", "10:30"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-hydrate",
      title: "Hydrate",
      notes: "A glass between meetings.",
      frequencyPerDay: 6,
      minSpacingHours: 1.5,
      windowStart: "06:30",
      windowEnd: "21:30",
      graceMinutes: 75,
      createdAt: setTime(now, "07:00").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(now, ["07:45", "10:00"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-inbox",
      title: "Inbox triage",
      notes: "Sort, don't reply. Defer is allowed.",
      frequencyPerDay: 2,
      minSpacingHours: 4,
      windowStart: "09:00",
      windowEnd: "17:30",
      graceMinutes: 30,
      daysOfWeek: [1, 2, 3, 4, 5],
      createdAt: addDays(now, -2).toISOString(),
      updatedAt,
      completionLog: [],
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-walk",
      title: "Walk outside",
      notes: "Twenty minutes, daylight on the face.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "11:30",
      windowEnd: "16:00",
      graceMinutes: 5,
      // Created at the morning window so by mid-day it is late with a tight grace.
      createdAt: setTime(now, "11:30").toISOString(),
      updatedAt,
      completionLog: [],
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-deep-work",
      title: "Deep work block",
      notes: "Two-hour focus, calendar blocked.",
      frequencyPerDay: 2,
      minSpacingHours: 3,
      windowStart: "09:30",
      windowEnd: "16:30",
      graceMinutes: 30,
      daysOfWeek: [1, 2, 3, 4, 5],
      createdAt: setTime(now, "09:30").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(now, ["10:00"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-read",
      title: "Read paper only",
      notes: "Twenty pages, anywhere but a screen.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "19:00",
      windowEnd: "22:00",
      graceMinutes: 30,
      // Future window today; will read as pending.
      createdAt: setTime(addDays(now, -1), "19:00").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(addDays(now, -1), ["19:30"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-wind-down",
      title: "Wind down",
      notes: "Lights low, screens away.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "21:30",
      windowEnd: "23:00",
      graceMinutes: 20,
      createdAt: setTime(addDays(now, -1), "21:30").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(addDays(now, -1), ["22:10"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-brush",
      title: "Brush teeth",
      notes: "Morning and evening.",
      frequencyPerDay: 2,
      minSpacingHours: 8,
      windowStart: "06:00",
      windowEnd: "22:30",
      graceMinutes: 30,
      createdAt: setTime(addDays(now, -1), "06:30").toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(now, ["07:00"]),
    }),
    // Two skipped cadences so the Settled section has content.
    buildCurrentTodo({
      cycleId,
      id: "dev-current-meditate",
      title: "Meditate",
      notes: "Ten minutes, eyes closed.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "06:30",
      windowEnd: "09:00",
      graceMinutes: 30,
      status: "skipped",
      createdAt: addDays(now, -3).toISOString(),
      updatedAt,
      completionLog: completionsAtTimes(addDays(now, -2), ["07:00"]),
    }),
    buildCurrentTodo({
      cycleId,
      id: "dev-current-journal",
      title: "Evening journal",
      notes: "Three lines, before bed.",
      frequencyPerDay: 1,
      minSpacingHours: 0,
      windowStart: "21:00",
      windowEnd: "23:30",
      graceMinutes: 45,
      status: "skipped",
      createdAt: addDays(now, -4).toISOString(),
      updatedAt,
      completionLog: [],
    }),
  ];
}

function buildCurrentTodo(input: SeedTodoInput): Todo {
  return {
    id: input.id,
    cycleId: input.cycleId,
    title: input.title,
    notes: input.notes,
    status: input.status ?? "active",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    completedAt: input.completionLog.at(-1)?.completedAt,
    frequencyPerDay: input.frequencyPerDay,
    minSpacingHours: input.minSpacingHours,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    graceMinutes: input.graceMinutes,
    daysOfWeek: input.daysOfWeek,
    completionLog: input.completionLog,
  };
}

function completionsAtTimes(base: Date, times: Array<string>): Array<Completion> {
  return times.map((time) => {
    const at = setTime(base, time).toISOString();
    return {
      completedAt: at,
      dueAt: at,
      latenessMinutes: 0,
      score: 100,
    };
  });
}

// ---------- Local helpers ----------

function setTime(base: Date, time: string) {
  const [hoursPart, minutesPart] = time.split(":");
  const result = new Date(base);
  result.setHours(Number(hoursPart), Number(minutesPart), 0, 0);
  return result;
}

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function monthName(date: Date) {
  return date.toLocaleDateString([], { month: "long" });
}

function jitterMinutes(base: number, seed: number, span = 60) {
  return base + Math.abs((seed * 13) % span);
}

// Mirrors src/time.ts scoreForLateness so the seed can fabricate completions
// without re-running getDueState against a fictitious clock.
function scoreForLatenessLocal(minutesLate: number) {
  if (minutesLate <= 0) return 100;
  if (minutesLate <= 15) return 92;
  if (minutesLate <= 60) return 78;
  if (minutesLate <= 180) return 55;
  if (minutesLate <= 720) return 30;
  return 10;
}
