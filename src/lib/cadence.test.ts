import { describe, expect, test } from "bun:test";
import { withOverrides } from "../test-fixtures/todo";
import { getDueState } from "../time";
import {
  formatGapMinutes,
  formatMinutesAsClock,
  getTodoPresentation,
  parseTimeToMinutes,
} from "./cadence";

describe("getTodoPresentation", () => {
  test("late todo shows formatted lateness as impact", () => {
    const todo = withOverrides({});
    const due = getDueState(todo, new Date("2026-05-05T19:45:00.000Z"));

    const presentation = getTodoPresentation(due, todo);

    expect(presentation.action).toBe("Log");
    expect(presentation.impact).toBe("1h 15m late");
    expect(presentation.rowTone).toBe("due");
    expect(presentation.icon).toBe("↻");
  });

  test("freshly due todo shows 'due now'", () => {
    const todo = withOverrides({});
    const due = getDueState(todo, new Date("2026-05-05T18:00:00.000Z"));

    const presentation = getTodoPresentation(due, todo);

    expect(presentation.impact).toBe("due now");
    expect(presentation.rowTone).toBe("due");
  });

  test("upcoming todo shows time until due", () => {
    const todo = withOverrides({
      windowStart: "22:00",
      windowEnd: "06:00",
      graceMinutes: 60,
      frequencyPerDay: 4,
      minSpacingHours: 4,
      createdAt: "2026-05-05T02:00:00.000Z",
      updatedAt: "2026-05-05T02:00:00.000Z",
    });
    const due = getDueState(todo, new Date("2026-05-05T02:30:00.000Z"));

    const presentation = getTodoPresentation(due, todo);

    expect(presentation.impact).toBe("in 1h 30m");
    expect(presentation.rowTone).toBe("");
  });
});

describe("parseTimeToMinutes", () => {
  test("parses hh:mm into total minutes", () => {
    expect(parseTimeToMinutes("06:00")).toBe(360);
    expect(parseTimeToMinutes("22:30")).toBe(22 * 60 + 30);
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  test("returns null for malformed strings", () => {
    expect(parseTimeToMinutes("nope")).toBeNull();
    expect(parseTimeToMinutes("9:30")).toBe(9 * 60 + 30);
    expect(parseTimeToMinutes("12:60:00")).toBeNull();
  });
});

describe("formatMinutesAsClock", () => {
  test("formats minutes as zero-padded clock", () => {
    expect(formatMinutesAsClock(0)).toBe("00:00");
    expect(formatMinutesAsClock(360)).toBe("06:00");
    expect(formatMinutesAsClock(22 * 60 + 30)).toBe("22:30");
  });

  test("wraps values past 24h back into the same day", () => {
    expect(formatMinutesAsClock(24 * 60)).toBe("00:00");
    expect(formatMinutesAsClock(25 * 60 + 30)).toBe("01:30");
    expect(formatMinutesAsClock(-30)).toBe("23:30");
  });
});

describe("formatGapMinutes", () => {
  test("renders sub-hour gaps as minutes", () => {
    expect(formatGapMinutes(45)).toBe("45m");
  });

  test("renders whole-hour gaps without minutes", () => {
    expect(formatGapMinutes(120)).toBe("2h");
  });

  test("renders mixed gaps as h + m", () => {
    expect(formatGapMinutes(75)).toBe("1h 15m");
  });
});
