import { expect, test } from "@playwright/test";

test("scale detail renders notes, fingering, keyboard, and persists last opened exercise", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  await expect(page.getByRole("heading", { name: "C major scale" })).toBeVisible();
  await expect(page.getByText("C - D - E - F - G - A - B - C")).toBeVisible();
  await expect(page.getByText("1 - 2 - 3 - 1 - 2 - 3 - 4 - 5")).toBeVisible();
  await expect(page.locator(".detail-chips")).not.toContainText(/one octave/i);
  await expect(page.getByRole("group", { name: "Practice keyboard" })).toBeVisible();
  await expect(page.getByTestId("key-C4")).toContainText("C");
  await expect(page.getByTestId("key-C4")).toContainText("1");
  await expect(page.getByTestId("key-C4")).toHaveAttribute("aria-label", "C4 highlighted");
  await expect(page.getByTestId("key-C6")).not.toHaveAttribute("aria-label", "C6 highlighted");
  await expect(page.getByTestId("key-C#4")).toBeVisible();
  await expect(page.getByTestId("key-C#4").locator(".key-label")).toHaveCount(0);
  await expect(page.getByTestId("key-C#4")).not.toContainText("C#");
  await expect(page.getByTestId("key-C#4")).toHaveAttribute("aria-label", /C#4/);

  const whiteBox = await page.getByTestId("key-C4").boundingBox();
  const blackBox = await page.getByTestId("key-C#4").boundingBox();
  expect(blackBox?.y).toBeLessThanOrEqual((whiteBox?.y ?? 0) + 2);
  expect(blackBox?.width ?? 999).toBeLessThan(whiteBox?.width ?? 0);
  expect(blackBox?.height ?? 999).toBeLessThan(whiteBox?.height ?? 0);

  await page.getByRole("button", { name: "Increase range" }).click();
  await expect(page.getByText("2 octaves", { exact: true })).toBeVisible();
  await expect(page.getByText("C - D - E - F - G - A - B - C - D - E - F - G - A - B - C")).toBeVisible();
  await expect(page.getByText("1 - 2 - 3 - 1 - 2 - 3 - 4 - 1 - 2 - 3 - 1 - 2 - 3 - 4 - 5")).toBeVisible();
  await expect(page.getByTestId("key-C6")).toHaveAttribute("aria-label", "C6 highlighted");
  await expect(page.locator(".metronome-card.compact")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("piano:last-exercise-id"))).toBe("c-major-scale");
});

test("highlighted black keys hide note labels and show fingering", async ({ page }) => {
  await page.goto("/exercises/g-major-scale");

  const fSharpKey = page.getByTestId("key-F#5");
  await expect(fSharpKey).toHaveAttribute("aria-label", "F#5 highlighted");
  await expect(fSharpKey.locator(".key-label")).toHaveCount(0);
  await expect(fSharpKey).not.toContainText("F#");
  await expect(fSharpKey.locator("strong")).toHaveText("4");
});

test("hand selection updates visible fingering and persists", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  const introBox = await page.locator(".exercise-header").boundingBox();
  expect(introBox?.height ?? 999).toBeLessThan(180);

  const leftHandRadio = page.getByRole("radio", { name: "Left hand" });
  const leftHandLabel = page.locator(".segmented-options label", { has: leftHandRadio });
  await leftHandRadio.focus();
  await expect.poll(async () => leftHandLabel.evaluate((label) => {
    const styles = window.getComputedStyle(label);
    return styles.outlineStyle !== "none" || styles.boxShadow !== "none";
  })).toBe(true);

  await leftHandRadio.check();
  await expect(page.getByText("5 - 4 - 3 - 2 - 1 - 3 - 2 - 1")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Left hand" })).toBeChecked();
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
