import { expect, test } from "@playwright/test"

declare global {
  interface Window {
    soundsStarted: number
  }
}

test("scales play offline with the piano sound", async ({ page, context }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("piano:bpm", "240")

    window.soundsStarted = 0
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.soundsStarted += 1
      return start.apply(this, args)
    }
  })
  await page.goto("/")
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)

  await page.goto("/exercises/a-minor-scale")
  await page.getByRole("radio", { name: "Left hand" }).check()
  await page.getByRole("button", { name: "Play" }).click()
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible({
    timeout: 10_000,
  })

  await expect(
    page.getByText("The piano sound couldn't be loaded."),
  ).toHaveCount(0)
  expect(await page.evaluate(() => window.soundsStarted)).toBe(15)
})
