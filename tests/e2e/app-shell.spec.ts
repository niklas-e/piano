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
  await expect(page.locator(".site-title")).toHaveText("Exercises");
  await expect(page.getByRole("heading", { name: "Exercises" })).toHaveCount(0);

  await page.goto("/metronome");
  await expect(page.locator(".site-title")).toHaveText("Metronome");
  await expect(page.getByRole("heading", { name: "Metronome" })).toHaveCount(0);

  await page.goto("/exercises/c-major-scale");
  await expect(page.locator(".site-title")).toHaveText("Exercises");
  await expect(page.getByRole("heading", { name: "C major scale" })).toBeVisible();
});

test("unknown routes render useful navigation", async ({ page }) => {
  await page.goto("/not-a-real-route");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to exercises" })).toHaveAttribute("href", "/exercises");
  await expect(page.getByRole("link", { name: "Go to metronome" })).toHaveAttribute("href", "/metronome");
});
