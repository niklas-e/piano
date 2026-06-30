import { expect, test } from "@playwright/test"

test("root shows homepage launcher links", async ({ page }) => {
  await page.goto("/")

  const cards = page.locator('[aria-label="Practice tools"] > a[href]')

  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toHaveAttribute("href", /^\/.+/)
  await expect(cards.nth(1)).toHaveAttribute("href", /^\/.+/)
  await expect(cards.nth(2)).toHaveAttribute("href", /^\/.+/)
})

test("exercise and metronome routes render their headings", async ({
  page,
}) => {
  await page.goto("/exercises")
  await expect(page.locator(".site-title")).toHaveText("Exercises")
  await expect(page.getByRole("heading", { name: "Exercises" })).toHaveCount(0)

  await page.goto("/metronome")
  await expect(page.locator(".site-title")).toHaveText("Metronome")
  await expect(page.getByRole("heading", { name: "Metronome" })).toHaveCount(0)

  await page.goto("/exercises/c-major-scale")
  await expect(page.locator(".site-title")).toHaveText("Exercises")
  await expect(
    page.getByRole("heading", { name: "C major scale" }),
  ).toBeVisible()
})

test("unknown routes render useful navigation", async ({ page }) => {
  await page.goto("/not-a-real-route")

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Go to exercises" }),
  ).toHaveAttribute("href", "/exercises")
  await expect(
    page.getByRole("link", { name: "Go to metronome" }),
  ).toHaveAttribute("href", "/metronome")
})
