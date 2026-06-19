import { expect, test } from "@playwright/test";

test("root shows the app shell and route links", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Piano Practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exercises", exact: true })).toHaveAttribute("href", "/exercises");
  await expect(page.getByRole("link", { name: "Metronome" })).toHaveAttribute("href", "/metronome");
  await expect(page.getByRole("link", { name: "Browse exercises" })).toHaveAttribute("href", "/exercises");
});

test("exercise and metronome routes render their headings", async ({ page }) => {
  await page.goto("/exercises");
  await expect(page.getByRole("heading", { name: "Exercises" })).toBeVisible();

  await page.goto("/metronome");
  await expect(page.getByRole("heading", { name: "Metronome" })).toBeVisible();
});

test("unknown routes render useful navigation", async ({ page }) => {
  await page.goto("/not-a-real-route");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to exercises" })).toHaveAttribute("href", "/exercises");
  await expect(page.getByRole("link", { name: "Go to metronome" })).toHaveAttribute("href", "/metronome");
});
