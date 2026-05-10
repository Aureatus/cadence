import { describe, expect, test } from "bun:test";
import { baseTodo, withOverrides } from "./test-fixtures/todo";
import {
  averageScore,
  completeTodo,
  consistencyStreakDays,
  formatImpact,
  formatWhen,
  getDueState,
  isInsideWindow,
  toDateKey,
} from "./time";

describe("getDueState", () => {
  test("computes lateness and adherence for an overdue todo", () => {
    const todo = withOverrides({});
    const at = new Date("2026-05-05T19:45:00.000Z");

    const due = getDueState(todo, at);

    expect(due.dueAt.toISOString()).toBe("2026-05-05T18:00:00.000Z");
    expect(due.windowClosesAt.toISOString()).toBe("2026-05-05T18:30:00.000Z");
    expect(due.minutesLate).toBe(75);
    expect(due.adherenceScore).toBe(55);
    expect(due.isDue).toBe(true);
    expect(due.isLate).toBe(true);
  });

  test("places due time inside an overnight window after a recent completion", () => {
    const todo = withOverrides({
      windowStart: "22:00",
      windowEnd: "06:00",
      graceMinutes: 60,
      frequencyPerDay: 4,
      minSpacingHours: 4,
      createdAt: "2026-05-04T18:00:00.000Z",
      updatedAt: "2026-05-04T20:00:00.000Z",
      completedAt: "2026-05-04T20:00:00.000Z",
      completionLog: [
        {
          completedAt: "2026-05-04T20:00:00.000Z",
          dueAt: "2026-05-04T20:00:00.000Z",
          latenessMinutes: 0,
          score: 100,
        },
      ],
    });
    const at = new Date("2026-05-05T02:30:00.000Z");

    const due = getDueState(todo, at);

    expect(due.dueAt.toISOString()).toBe("2026-05-05T02:00:00.000Z");
    expect(due.isDue).toBe(true);
    expect(due.minutesLate).toBe(0);
    expect(due.adherenceScore).toBe(100);
  });

  test("schedules first due inside the active overnight window when created after midnight", () => {
    const todo = withOverrides({
      windowStart: "22:00",
      windowEnd: "06:00",
      graceMinutes: 60,
      frequencyPerDay: 4,
      minSpacingHours: 4,
      createdAt: "2026-05-05T02:00:00.000Z",
      updatedAt: "2026-05-05T02:00:00.000Z",
    });
    const at = new Date("2026-05-05T02:30:00.000Z");

    const due = getDueState(todo, at);

    expect(due.dueAt.toISOString()).toBe("2026-05-05T04:00:00.000Z");
    expect(due.minutesUntilDue).toBe(90);
    expect(due.isDue).toBe(false);
    expect(due.isLate).toBe(false);
  });

  test("scores a freshly-due todo at 100", () => {
    const todo = withOverrides({});
    const at = new Date("2026-05-05T18:00:00.000Z");

    const due = getDueState(todo, at);

    expect(due.adherenceScore).toBe(100);
    expect(due.minutesLate).toBe(0);
  });
});

describe("completeTodo", () => {
  test("captures lateness and score on completion", () => {
    const todo = withOverrides({});
    const at = new Date("2026-05-05T19:45:00.000Z");

    const completion = completeTodo(todo, at);

    expect(completion.completedAt).toBe("2026-05-05T19:45:00.000Z");
    expect(completion.dueAt).toBe("2026-05-05T18:00:00.000Z");
    expect(completion.latenessMinutes).toBe(75);
    expect(completion.score).toBe(55);
  });
});

describe("formatImpact", () => {
  test("renders zero lateness as inside the window", () => {
    expect(formatImpact(0)).toBe("inside the window");
  });

  test("renders 75 minutes as 1h 15m late", () => {
    expect(formatImpact(75)).toBe("1h 15m late");
  });

  test("renders sub-hour lateness as minutes only", () => {
    expect(formatImpact(20)).toBe("20m late");
  });

  test("trims to two units for multi-day lateness", () => {
    expect(formatImpact(60 * 24 * 2 + 60 * 5 + 30)).toBe("2d 5h late");
  });
});

describe("formatWhen", () => {
  test("renders weekday + clock time", () => {
    const formatted = formatWhen(new Date("2026-05-05T02:00:00.000Z"));

    expect(formatted).toMatch(/^(Tue|Tuesday)/);
    expect(formatted).toContain("2:00");
  });
});

describe("isInsideWindow", () => {
  test("recognises a same-day window", () => {
    const inside = new Date("2026-05-05T12:00:00.000Z");
    const before = new Date("2026-05-05T05:30:00.000Z");

    expect(isInsideWindow(inside, "06:00", "22:30")).toBe(true);
    expect(isInsideWindow(before, "06:00", "22:30")).toBe(false);
  });

  test("recognises an overnight window from both sides of midnight", () => {
    const lateNight = new Date("2026-05-05T23:30:00.000Z");
    const earlyMorning = new Date("2026-05-06T03:00:00.000Z");
    const noon = new Date("2026-05-06T12:00:00.000Z");

    expect(isInsideWindow(lateNight, "22:00", "06:00")).toBe(true);
    expect(isInsideWindow(earlyMorning, "22:00", "06:00")).toBe(true);
    expect(isInsideWindow(noon, "22:00", "06:00")).toBe(false);
  });
});

describe("averageScore", () => {
  test("returns zero with no completions", () => {
    expect(averageScore([baseTodo])).toBe(0);
  });

  test("rounds the mean of all completion scores", () => {
    const a = withOverrides({
      id: "a",
      completionLog: [
        {
          completedAt: "2026-05-05T18:00:00.000Z",
          dueAt: "2026-05-05T18:00:00.000Z",
          latenessMinutes: 0,
          score: 100,
        },
      ],
    });
    const b = withOverrides({
      id: "b",
      completionLog: [
        {
          completedAt: "2026-05-05T19:00:00.000Z",
          dueAt: "2026-05-05T18:00:00.000Z",
          latenessMinutes: 30,
          score: 78,
        },
      ],
    });

    expect(averageScore([a, b])).toBe(89);
  });
});

describe("consistencyStreakDays", () => {
  test("counts back-to-back high-score days from today", () => {
    const todayIso = `${toDateKey(new Date())}T08:00:00.000Z`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = `${toDateKey(yesterday)}T08:00:00.000Z`;
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeIso = `${toDateKey(dayBefore)}T08:00:00.000Z`;

    const todo = withOverrides({
      completionLog: [
        {
          completedAt: dayBeforeIso,
          dueAt: dayBeforeIso,
          latenessMinutes: 0,
          score: 100,
        },
        {
          completedAt: yesterdayIso,
          dueAt: yesterdayIso,
          latenessMinutes: 0,
          score: 92,
        },
        {
          completedAt: todayIso,
          dueAt: todayIso,
          latenessMinutes: 0,
          score: 78,
        },
      ],
    });

    expect(consistencyStreakDays([todo])).toBe(3);
  });

  test("low-score days break the streak", () => {
    const todayIso = `${toDateKey(new Date())}T08:00:00.000Z`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = `${toDateKey(yesterday)}T08:00:00.000Z`;

    const todo = withOverrides({
      completionLog: [
        {
          completedAt: yesterdayIso,
          dueAt: yesterdayIso,
          latenessMinutes: 240,
          score: 30,
        },
        {
          completedAt: todayIso,
          dueAt: todayIso,
          latenessMinutes: 0,
          score: 100,
        },
      ],
    });

    expect(consistencyStreakDays([todo])).toBe(1);
  });
});
