import { expect, test } from "@playwright/test"

declare global {
  interface Window {
    soundsStarted: number
  }
}

async function startGame(page: import("@playwright/test").Page) {
  await page.goto("/sight-reading")
  await page.getByRole("button", { name: "Start" }).click()
  await page.waitForSelector(".staff svg .abcjs-top-line", {
    state: "attached",
  })
}

test("staff and ledger lines all render at the same thickness", async ({
  page,
}) => {
  await startGame(page)

  const heights = await page.evaluate(() => {
    const container = document.querySelector(".staff") as HTMLElement
    const topLine = container.querySelector(".abcjs-top-line") as Element
    const group = topLine.parentElement as HTMLElement
    const lines = [
      ...group.querySelectorAll<SVGPathElement>("path"),
      ...container.querySelectorAll<SVGPathElement>('path[data-name="ledger"]'),
    ]
    return lines.map((line) => Math.round(line.getBoundingClientRect().height))
  })

  expect(heights.length).toBeGreaterThanOrEqual(5)
  expect(new Set(heights).size).toBe(1)
})

test("staff content stays inside its box for notes across the range", async ({
  page,
}) => {
  await startGame(page)

  // Cycle through several random notes (including ledger-line ones) and check the
  // rendered music never spills outside the clipping container.
  for (let i = 0; i < 12; i++) {
    const gap = await page.evaluate(() => {
      const container = document.querySelector(".staff") as HTMLElement
      const content = container.querySelector("svg g") as SVGGraphicsElement
      const box = container.getBoundingClientRect()
      const music = content.getBoundingClientRect()
      return { top: music.top - box.top, bottom: box.bottom - music.bottom }
    })
    expect(gap.top).toBeGreaterThan(-1)
    expect(gap.bottom).toBeGreaterThan(-1)

    await page.locator(".answer-grid button").first().click()
    await page.waitForTimeout(500) // let the feedback flash clear before the next note
  }
})

test("answering a note shows correct/incorrect feedback", async ({ page }) => {
  await startGame(page)

  const panel = page.locator(".panel").filter({ has: page.locator(".staff") })
  await page.locator(".answer-grid button").first().click()

  await expect(page.locator(".feedback-mark")).toBeVisible()
  await expect(panel).toHaveClass(/flash-(correct|wrong)/)
})

test.describe("sound", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.soundsStarted = 0
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.soundsStarted += 1
        return start.apply(this, args)
      }
      // Always draws the lowest treble note, an E, so the answer is known.
      Math.random = () => 0
    })
    await page.goto("/sight-reading")
    await page.getByRole("button", { name: "Treble" }).click()
  })

  test("a correctly named note sounds on the piano", async ({ page }) => {
    await page.getByRole("button", { name: "Start" }).click()

    await page.getByRole("button", { name: "Answer E", exact: true }).click()
    await page.waitForFunction(() => window.soundsStarted === 1)
  })

  test("a wrongly named note doesn't sound", async ({ page }) => {
    await page.getByRole("button", { name: "Start" }).click()

    await page.getByRole("button", { name: "Answer F", exact: true }).click()
    await expect(page.locator(".feedback-mark")).toHaveCount(0)
    // Had the wrong answer played too, it would sound alongside this one.
    await page.getByRole("button", { name: "Answer E", exact: true }).click()
    await page.waitForFunction(() => window.soundsStarted === 1)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.soundsStarted)).toBe(1)
  })

  test("sound can be turned off, and stays off", async ({ page }) => {
    await page.getByRole("button", { name: "Off" }).click()
    await page.getByRole("button", { name: "Start" }).click()

    await page.getByRole("button", { name: "Answer E", exact: true }).click()
    await expect(page.locator(".feedback-mark")).toBeVisible()
    await expect(page.locator(".feedback-mark")).toHaveCount(0)
    expect(await page.evaluate(() => window.soundsStarted)).toBe(0)

    await page.goto("/sight-reading")
    await expect(page.getByRole("button", { name: "Off" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })
})
