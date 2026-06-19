import { expect, test } from "@playwright/test";

test("full metronome starts, stops, adjusts BPM, and persists tempo", async ({ page }) => {
  await page.goto("/metronome");

  await expect(page.getByRole("heading", { name: "Metronome" })).toBeVisible();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("80");

  await page.getByRole("button", { name: "+5 BPM" }).click();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("85");

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByRole("button", { name: "Stop metronome" })).toBeVisible();
  await expect(page.getByText("Visual pulse")).toBeVisible();

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByRole("button", { name: "Start metronome" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("piano:bpm"))).toBe("85");

  await page.reload();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("85");
});

test("compact metronome works from exercise pages", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  await expect(page.getByRole("heading", { name: "Compact metronome" })).toBeVisible();
  await page.getByRole("button", { name: "Compact +5 BPM" }).click();
  await expect(page.getByText("85 BPM")).toBeVisible();
  await page.getByRole("button", { name: "Start compact metronome" }).click();
  await expect(page.getByRole("button", { name: "Stop compact metronome" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open full metronome" })).toHaveAttribute("href", "/metronome");
});
