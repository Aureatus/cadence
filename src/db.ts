import { createCollection, localStorageCollectionOptions } from "@tanstack/svelte-db";
import * as v from "valibot";

const isoDate = v.pipe(v.string(), v.isoTimestamp());

const completionSchema = v.object({
  completedAt: isoDate,
  dueAt: isoDate,
  latenessMinutes: v.pipe(v.number(), v.integer()),
  score: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
});

const todoSchema = v.object({
  id: v.string(),
  cycleId: v.string(),
  title: v.pipe(v.string(), v.minLength(1)),
  notes: v.optional(v.string()),
  status: v.picklist(["active", "completed", "skipped"]),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: v.optional(isoDate),
  deletedAt: v.optional(isoDate),
  frequencyPerDay: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  minSpacingHours: v.pipe(v.number(), v.minValue(0), v.maxValue(24)),
  windowStart: v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/)),
  windowEnd: v.pipe(v.string(), v.regex(/^\d{2}:\d{2}$/)),
  graceMinutes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(240)),
  daysOfWeek: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)))),
  completionLog: v.array(completionSchema),
});

const cycleSchema = v.object({
  id: v.string(),
  title: v.pipe(v.string(), v.minLength(1)),
  startsAt: isoDate,
  endsAt: v.optional(isoDate),
  status: v.picklist(["active", "closed"]),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Todo = v.InferOutput<typeof todoSchema>;
export type Completion = v.InferOutput<typeof completionSchema>;
export type Cycle = v.InferOutput<typeof cycleSchema>;

export const todosCollection = createCollection(
  localStorageCollectionOptions({
    id: "todos",
    storageKey: "cadence.todos",
    getKey: (todo) => todo.id,
    schema: todoSchema,
  }),
);

export const cyclesCollection = createCollection(
  localStorageCollectionOptions({
    id: "cycles",
    storageKey: "cadence.cycles",
    getKey: (cycle) => cycle.id,
    schema: cycleSchema,
  }),
);
