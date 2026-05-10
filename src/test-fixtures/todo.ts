import type { Todo } from "../db";

export const baseTodo: Todo = {
  id: "todo-1",
  cycleId: "cycle-1",
  title: "Brush teeth",
  status: "active",
  createdAt: "2026-05-05T09:00:00.000Z",
  updatedAt: "2026-05-05T09:00:00.000Z",
  frequencyPerDay: 2,
  minSpacingHours: 8,
  windowStart: "06:00",
  windowEnd: "22:30",
  graceMinutes: 30,
  completionLog: [],
};

export function withOverrides(overrides: Partial<Todo>): Todo {
  return { ...baseTodo, ...overrides };
}
