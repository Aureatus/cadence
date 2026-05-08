import { expect, test, type Page } from "@playwright/test";

type StoredCollection<T> = Record<string, { versionKey: string; data: T }>;

type TodoRecord = {
  id: string;
  cycleId: string;
  title: string;
  notes?: string;
  status: "active" | "completed" | "skipped";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
  frequencyPerDay: number;
  minSpacingHours: number;
  windowStart: string;
  windowEnd: string;
  graceMinutes: number;
  completionLog: Array<{
    completedAt: string;
    dueAt: string;
    latenessMinutes: number;
    score: number;
  }>;
};

type CycleRecord = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  status: "active" | "closed";
  createdAt: string;
  updatedAt: string;
};

const baseNow = "2026-05-05T09:00:00.000Z";

test("creates a cyclic todo, completes an occurrence, and persists collection data", async ({
  page,
}) => {
  await openApp(page, "/", baseNow);

  await expect(page.getByRole("heading", { name: "The day is turning." })).toBeVisible();
  await expect(page.getByText("No active cadences yet")).toBeVisible();

  await page.getByRole("button", { name: "Add cadence" }).click();
  const dialog = page.locator("[data-slot='dialog-content']");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("The task").fill("Hydration pulse");
  await dialog.getByLabel("A note").fill("Drink water before the next deep work block.");
  await dialog.getByLabel("Times per day").fill("3");
  await dialog.getByLabel("Window start").fill("00:00");
  await dialog.getByLabel("Window end").fill("23:59");
  await dialog.getByLabel("Grace minutes").fill("45");
  await dialog.getByRole("button", { name: "Add cadence" }).click();
  await expect(dialog).not.toBeVisible();

  const card = page.getByRole("article", { name: "Todo: Hydration pulse" });
  await expect(card).toBeVisible();
  await expect(card.getByText("3x/day cadence")).toBeVisible();
  await expect(card.getByText("Next after complete")).toBeVisible();

  const createdTodos = await readCollection<TodoRecord>(page, "cadence.todos");
  expect(createdTodos).toHaveLength(1);
  const createdTodo = firstItem(createdTodos);
  expect(createdTodo).toMatchObject({
    title: "Hydration pulse",
    frequencyPerDay: 3,
    windowStart: "00:00",
    windowEnd: "23:59",
    graceMinutes: 45,
    completionLog: [],
  });

  await card.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByLabel("Average adherence score 100")).toBeVisible();

  const completedTodos = await readCollection<TodoRecord>(page, "cadence.todos");
  const completedTodo = firstItem(completedTodos);
  expect(completedTodo.status).toBe("active");
  expect(completedTodo.completedAt).toBe(baseNow);
  expect(completedTodo.completionLog).toHaveLength(1);
  expect(firstItem(completedTodo.completionLog)).toMatchObject({
    completedAt: baseNow,
    latenessMinutes: 0,
    score: 100,
  });
});

test("keeps an uncompleted occurrence overdue and shows lateness impact", async ({ page }) => {
  const seedNow = "2026-05-05T19:45:00.000Z";
  await openApp(page, "/", seedNow, {
    "cadence.cycles": collectionStorage<CycleRecord>([
      {
        id: "cycle-e2e",
        title: "E2E Cycle",
        startsAt: "2026-05-05T00:00:00.000Z",
        status: "active",
        createdAt: "2026-05-05T00:00:00.000Z",
        updatedAt: "2026-05-05T00:00:00.000Z",
      },
    ]),
    "cadence.todos": collectionStorage<TodoRecord>([
      {
        id: "todo-overdue",
        cycleId: "cycle-e2e",
        title: "Brush teeth",
        notes: "Morning and evening spacing matters.",
        status: "active",
        createdAt: "2026-05-05T09:00:00.000Z",
        updatedAt: "2026-05-05T09:00:00.000Z",
        frequencyPerDay: 2,
        minSpacingHours: 8,
        windowStart: "06:00",
        windowEnd: "22:30",
        graceMinutes: 30,
        completionLog: [],
      },
    ]),
  });

  const card = page.getByRole("article", { name: "Todo: Brush teeth" });
  await expect(card.getByText("1h 15m late")).toBeVisible();
  await expect(card.getByText("55% if done now")).toBeVisible();

  await card.getByRole("button", { name: "Mark complete" }).click();
  const todos = await readCollection<TodoRecord>(page, "cadence.todos");
  expect(firstItem(firstItem(todos).completionLog)).toMatchObject({
    completedAt: seedNow,
    latenessMinutes: 75,
    score: 55,
  });
});

test("keeps after-midnight due times inside overnight windows", async ({ page }) => {
  await openApp(page, "/", "2026-05-05T02:30:00.000Z", {
    "cadence.cycles": collectionStorage<CycleRecord>([
      {
        id: "cycle-overnight",
        title: "Overnight Cycle",
        startsAt: "2026-05-04T00:00:00.000Z",
        status: "active",
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ]),
    "cadence.todos": collectionStorage<TodoRecord>([
      {
        id: "todo-overnight",
        cycleId: "cycle-overnight",
        title: "Night medication",
        notes: "Allowed through the overnight window.",
        status: "active",
        createdAt: "2026-05-04T18:00:00.000Z",
        updatedAt: "2026-05-04T20:00:00.000Z",
        completedAt: "2026-05-04T20:00:00.000Z",
        frequencyPerDay: 4,
        minSpacingHours: 4,
        windowStart: "22:00",
        windowEnd: "06:00",
        graceMinutes: 60,
        completionLog: [
          {
            completedAt: "2026-05-04T20:00:00.000Z",
            dueAt: "2026-05-04T20:00:00.000Z",
            latenessMinutes: 0,
            score: 100,
          },
        ],
      },
    ]),
  });

  const card = page.getByRole("article", { name: "Todo: Night medication" });
  await expect(card.getByText("due now")).toBeVisible();
  await expect(card.getByText("100% if done now")).toBeVisible();
  await expect(card.getByText("Tue 2:00 AM")).toBeVisible();
});

test("uses the active overnight window for first due calculation after midnight", async ({
  page,
}) => {
  await openApp(page, "/", "2026-05-05T02:30:00.000Z", {
    "cadence.cycles": collectionStorage<CycleRecord>([
      {
        id: "cycle-first-overnight",
        title: "First Overnight Cycle",
        startsAt: "2026-05-04T00:00:00.000Z",
        status: "active",
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z",
      },
    ]),
    "cadence.todos": collectionStorage<TodoRecord>([
      {
        id: "todo-first-overnight",
        cycleId: "cycle-first-overnight",
        title: "Night hydration",
        notes: "Created after midnight during the active window.",
        status: "active",
        createdAt: "2026-05-05T02:00:00.000Z",
        updatedAt: "2026-05-05T02:00:00.000Z",
        frequencyPerDay: 4,
        minSpacingHours: 4,
        windowStart: "22:00",
        windowEnd: "06:00",
        graceMinutes: 60,
        completionLog: [],
      },
    ]),
  });

  await page.getByRole("button", { name: "All" }).click();
  const card = page.getByRole("article", { name: "Todo: Night hydration" });
  await expect(card.getByText("in 1h 30m")).toBeVisible();
  await expect(card.getByText("Tue 4:00 AM")).toBeVisible();
});

async function openApp(
  page: Page,
  path: string,
  now: string,
  seedStorage: Record<string, string> = {},
) {
  await page.clock.setFixedTime(new Date(now));
  await page.addInitScript((storage) => {
    if (window.sessionStorage.getItem("cadence.e2e.seeded") === "true") return;

    window.localStorage.clear();
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
    window.sessionStorage.setItem("cadence.e2e.seeded", "true");
  }, seedStorage);
  await page.goto(path);
}

async function readCollection<T>(page: Page, key: string) {
  const raw = await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
  if (!raw) return [];

  const parsed = JSON.parse(raw) as StoredCollection<T>;

  return Object.values(parsed).map((entry) => entry.data);
}

function collectionStorage<T extends { id: string }>(items: Array<T>) {
  const collection = Object.fromEntries(
    items.map((item) => [`s:${item.id}`, { versionKey: `e2e-${item.id}`, data: item }]),
  ) as StoredCollection<T>;

  return JSON.stringify(collection);
}

function firstItem<T>(items: Array<T>) {
  const item = items[0];
  if (!item) throw new Error("Expected at least one item");

  return item;
}
