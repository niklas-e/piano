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

test("in-app links navigate without reloading the page", async ({ page }) => {
  // A full page load would wipe this marker from the window.
  const markDocument = () =>
    page.evaluate(() => Object.assign(window, { notReloaded: true }))
  const expectSameDocument = async () =>
    expect(await page.evaluate(() => "notReloaded" in window)).toBe(true)

  await page.goto("/")
  await markDocument()

  await page
    .getByRole("navigation", { name: "Practice tools" })
    .getByRole("link", { name: /Exercises/ })
    .click()
  await expect(page).toHaveURL("/exercises")
  await expectSameDocument()

  await page.mouse.wheel(0, 600)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  await page
    .getByRole("link", { name: /A major scale/ })
    .first()
    .click()
  await expect(
    page.getByRole("heading", { name: "A major scale" }),
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expectSameDocument()

  await page.goBack()
  await expect(page).toHaveURL("/exercises")
  await expectSameDocument()

  await page.goto("/exercises/not-a-real-exercise")
  await markDocument()
  await page.getByRole("link", { name: "Back to exercises" }).click()
  await expect(page).toHaveURL("/exercises")
  await expectSameDocument()
})

test("modified clicks are left to the browser", async ({ page, context }) => {
  await page.goto("/")

  const newPagePromise = context.waitForEvent("page")
  await page
    .getByRole("navigation", { name: "Practice tools" })
    .getByRole("link", { name: /Metronome/ })
    .click({ modifiers: ["ControlOrMeta"] })
  const newPage = await newPagePromise

  await expect(newPage).toHaveURL("/metronome")
  await expect(page).toHaveURL("/")
})
