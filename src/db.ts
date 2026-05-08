import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { z } from "zod";

const isoDate = z.iso.datetime();

const completionSchema = z.object({
  completedAt: isoDate,
  dueAt: isoDate,
  latenessMinutes: z.number().int(),
  score: z.number().min(0).max(100),
});

const todoSchema = z.object({
  id: z.string(),
  cycleId: z.string(),
  title: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(["active", "completed", "skipped"]),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: isoDate.optional(),
  deletedAt: isoDate.optional(),
  frequencyPerDay: z.number().int().min(1).max(8),
  minSpacingHours: z.number().min(0).max(24),
  windowStart: z.string().regex(/^\d{2}:\d{2}$/),
  windowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  graceMinutes: z.number().int().min(0).max(240),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  completionLog: z.array(completionSchema),
});

const cycleSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  startsAt: isoDate,
  endsAt: isoDate.optional(),
  status: z.enum(["active", "closed"]),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Todo = z.infer<typeof todoSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type Cycle = z.infer<typeof cycleSchema>;

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
