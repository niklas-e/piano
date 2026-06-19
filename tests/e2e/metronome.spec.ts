import { expect, test } from "@playwright/test";

test("full metronome starts, stops, adjusts BPM, and persists tempo", async ({ page }) => {
  await page.goto("/metronome");

  await expect(page.getByRole("heading", { name: "Metronome" })).toBeVisible();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("80");

  await page.getByRole("button", { name: "+5 BPM" }).click();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("85");

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByRole("button", { name: "Stop metronome" })).toBeVisible();
  await expect(page.getByText("Visual pulse", { exact: true })).toBeVisible();

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

test("metronome shows audio-unavailable message when Web Audio resume fails asynchronously", async ({ page }) => {
  await page.addInitScript(() => {
    class RejectingAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          connect() {},
          frequency: { value: 0 },
          start() {},
          stop() {}
        };
      }
      createGain() {
        return {
          connect() {},
          gain: {
            exponentialRampToValueAtTime() {},
            setValueAtTime() {}
          }
        };
      }
      resume() {
        return Promise.reject(new Error("resume blocked"));
      }
      close() {
        return Promise.resolve();
      }
    }

    window.AudioContext = RejectingAudioContext as unknown as typeof AudioContext;
    window.webkitAudioContext = undefined;
  });

  await page.goto("/metronome");
  await page.getByRole("button", { name: "Start metronome" }).click();

  await expect(page.getByRole("button", { name: "Stop metronome" })).toBeVisible();
  await expect(page.getByText("Visual pulse", { exact: true })).toBeVisible();
  await expect(page.getByText("Audio click unavailable. Visual pulse is still active.")).toBeVisible();
  await expect
    .poll(async () => {
      const beatText = await page.locator(".pulse small").textContent();
      return Number(beatText?.replace("Beat ", ""));
    })
    .toBeGreaterThan(1);
});

test("metronome keeps visual pulse running when Web Audio graph creation fails", async ({ page }) => {
  await page.addInitScript(() => {
    class ThrowingGraphAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        throw new Error("oscillator unavailable");
      }
      createGain() {
        throw new Error("gain unavailable");
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    }

    window.AudioContext = ThrowingGraphAudioContext as unknown as typeof AudioContext;
    window.webkitAudioContext = undefined;
  });

  await page.goto("/metronome");
  await page.getByRole("button", { name: "Start metronome" }).click();

  await expect(page.getByRole("button", { name: "Stop metronome" })).toBeVisible();
  await expect(page.getByText("Visual pulse", { exact: true })).toBeVisible();
  await expect(page.getByText("Audio click unavailable. Visual pulse is still active.")).toBeVisible();
});
