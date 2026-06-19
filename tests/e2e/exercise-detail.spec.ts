import { expect, test } from "@playwright/test";

test("scale detail renders notes, fingering, keyboard, and persists last opened exercise", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  await expect(page.getByRole("heading", { name: "C major scale" })).toBeVisible();
  await expect(page.getByText("C - D - E - F - G - A - B - C")).toBeVisible();
  await expect(page.getByText("1 - 2 - 3 - 1 - 2 - 3 - 4 - 5")).toBeVisible();
  await expect(page.getByRole("group", { name: "Practice keyboard" })).toBeVisible();
  await expect(page.getByTestId("key-C4")).toContainText("C");
  await expect(page.getByTestId("key-C4")).toContainText("1");
  await expect(page.getByRole("heading", { name: "Compact metronome" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("piano:last-exercise-id"))).toBe("c-major-scale");
});

test("hand selection updates visible fingering and persists", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  await page.getByLabel("Hand").selectOption("left");
  await expect(page.getByText("5 - 4 - 3 - 2 - 1 - 3 - 2 - 1")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Hand")).toHaveValue("left");
});

test("arpeggio detail renders chord-tone pattern", async ({ page }) => {
  await page.goto("/exercises/a-minor-arpeggio");

  await expect(page.getByRole("heading", { name: "A minor arpeggio" })).toBeVisible();
  await expect(page.getByText("A - C - E - A")).toBeVisible();
  await expect(page.getByText("1 - 2 - 3 - 5")).toBeVisible();
});

test("unknown exercise id renders fallback", async ({ page }) => {
  await page.goto("/exercises/not-real");

  await expect(page.getByRole("heading", { name: "Exercise not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to exercises" })).toHaveAttribute("href", "/exercises");
});
