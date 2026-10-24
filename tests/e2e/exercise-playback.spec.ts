import { expect, type Page, test } from "@playwright/test"

declare global {
  interface Window {
    playedKeys: string[]
    playedStaffNotes: number[]
    soundsStarted: number
    noteTimes: number[]
    clickTimes: number[]
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Fast enough to keep the tests short.
    window.localStorage.setItem("piano:bpm", "240")

    window.soundsStarted = 0
    window.noteTimes = []
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.soundsStarted += 1
      window.noteTimes.push(args[0] ?? 0)
      return start.apply(this, args)
    }
  })
})

/** Starts writing down each key and staff note as it lights up. */
async function recordCursor(page: Page) {
  await page.evaluate(() => {
    window.playedKeys = []
    window.playedStaffNotes = []
    new MutationObserver(() => {
      const key = document.querySelector(".piano-key.is-playing")
      const id = key?.getAttribute("data-testid")?.replace("key-", "")
      if (id && window.playedKeys.at(-1) !== id) {
        window.playedKeys.push(id)
      }

      const notes = [
        ...document.querySelectorAll(".exercise-staff .abcjs-note"),
      ]
      const note = notes.findIndex((n) => n.classList.contains("is-playing"))
      if (note !== -1 && window.playedStaffNotes.at(-1) !== note) {
        window.playedStaffNotes.push(note)
      }
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    })
  })
}

test("plays a scale up and back down, lighting up each key and note", async ({
  page,
}) => {
  await page.goto("/exercises/c-major-scale")
  await page.waitForSelector(".exercise-staff svg .abcjs-lyric")
  await recordCursor(page)

  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({
    timeout: 10_000,
  })

  expect(await page.evaluate(() => window.playedKeys)).toEqual([
    ...["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    ...["B4", "A4", "G4", "F4", "E4", "D4", "C4"],
  ])
  expect(await page.evaluate(() => window.playedStaffNotes)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0,
  ])
  expect(await page.evaluate(() => window.soundsStarted)).toBe(15)
  await expect(page.locator(".is-playing")).toHaveCount(0)
})

test("playing stops on request and when the hand changes", async ({ page }) => {
  await page.goto("/exercises/g-major-arpeggio")

  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.locator(".piano-key.is-playing")).toHaveCount(1)
  await page.getByRole("button", { name: "Stop" }).click()
  await expect(page.locator(".is-playing")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible()

  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.locator(".piano-key.is-playing")).toHaveCount(1)
  await page.getByRole("radio", { name: "Left hand" }).check()
  await expect(page.locator(".is-playing")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible()
})

test("the keyboard follows the notes being played on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/exercises/c-major-scale")
  await page.getByRole("button", { name: "Increase range" }).click()

  await page.getByRole("button", { name: "Play" }).click()
  // The top note only sounds for a beat, so look often.
  await expect
    .poll(
      () =>
        page.getByTestId("key-C6").evaluate((key) => {
          const box = key.getBoundingClientRect()
          const view = key.closest(".keyboard-scroll")?.getBoundingClientRect()
          return (
            key.classList.contains("is-playing") &&
            view !== undefined &&
            box.left >= view.left &&
            box.right <= view.right
          )
        }),
      { intervals: [50], timeout: 10_000 },
    )
    .toBe(true)
})

test("the piano plays on the metronome's clicks, even when the tempo changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.clickTimes = []
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (...args) {
      window.clickTimes.push(args[0] ?? 0)
      return start.apply(this, args)
    }
  })
  await page.goto("/exercises/c-major-scale")

  await page.getByRole("button", { name: "Start metronome" }).click()
  await page.waitForFunction(() => window.clickTimes.length >= 2)
  await page.getByRole("button", { name: "Play" }).click()
  await page.waitForFunction(() => window.noteTimes.length >= 4)
  await page.getByRole("button", { name: "-5 BPM" }).click()
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole("button", { name: "Stop metronome" }).click()

  const { clickTimes, noteTimes } = await page.evaluate(() => ({
    clickTimes: window.clickTimes,
    noteTimes: window.noteTimes,
  }))
  expect(noteTimes).toHaveLength(15)
  for (const time of noteTimes) {
    expect(clickTimes).toContainEqual(time)
  }
  // The last notes were a beat at the new tempo apart.
  expect(noteTimes[14] - noteTimes[13]).toBeCloseTo(60 / 235, 6)
})
