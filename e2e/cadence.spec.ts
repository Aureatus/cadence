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

const baseNow = "2026-05-05T09:00:00.000Z";

test("creates a cyclic todo, completes an occurrence, and persists collection data", async ({
  page,
}) => {
  await openApp(page, "/", baseNow);

  await expect(page.getByRole("link", { name: /Cadence/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add cadence" })).toBeVisible();

  await page.getByRole("button", { name: "Add cadence" }).click();
  const dialog = page.locator("[data-slot='dialog-content']");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Task").fill("Hydration pulse");
  await dialog.getByLabel("Note").fill("Drink water before the next deep work block.");
  await dialog.getByLabel("Times per day").fill("3");
  await dialog.getByLabel("Window start").fill("00:00");
  await dialog.getByLabel("Window end").fill("23:59");
  await dialog.getByLabel("Grace minutes").fill("45");
  await dialog.getByRole("button", { name: "Add cadence" }).click();
  await expect(dialog).not.toBeVisible();

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

  // Row-level management lives on the Cadences page now.
  await page.goto("/cadences");

  const card = page.getByRole("article", { name: "Todo: Hydration pulse" });
  await expect(card).toBeVisible();
  await expect(card.getByText("3×/day")).toBeVisible();
  await expect(card.getByText(/^Next /)).toBeVisible();

  await card.getByRole("button", { name: "Mark complete" }).click();

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

function firstItem<T>(items: Array<T>) {
  const item = items[0];
  if (!item) throw new Error("Expected at least one item");

  return item;
}
