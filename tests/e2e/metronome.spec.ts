import { expect, test, type Page } from "@playwright/test";

test("full metronome starts, stops, adjusts BPM, and persists tempo", async ({ page }) => {
  await page.goto("/metronome");

  await expect(page.getByRole("heading", { name: "Metronome" })).toBeVisible();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("80");

  await page.getByRole("button", { name: "+5 BPM" }).click();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("85");

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByRole("button", { name: "Stop metronome" })).toHaveText("Stop metronome");
  await expect(page.locator(".pulse .bpm-unit")).toBeVisible();

  await page.getByRole("button", { name: "Stop metronome" }).click();
  await expect(page.getByRole("button", { name: "Start metronome" })).toHaveText("Start metronome");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("piano:bpm"))).toBe("85");

  await page.reload();
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("85");
});

test("compact metronome works from exercise pages", async ({ page }) => {
  await page.goto("/exercises/c-major-scale");

  const compactCard = page.locator(".metronome-card.compact");
  await expect(compactCard).toBeVisible();
  await expect(compactCard.locator(".pulse")).toHaveCount(0);

  const compactBox = await compactCard.boundingBox();
  expect(compactBox?.height ?? 0).toBeLessThan(180);

  await page.getByRole("button", { name: "+5 BPM" }).click();
  await expect(compactCard.locator(".bpm-readout")).toContainText("85");
  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect(page.getByRole("button", { name: "Stop metronome" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open full metronome" })).toHaveAttribute("href", "/metronome");
});

test("visual pulse animation is finite and BPM-coupled", async ({ page }) => {
  await page.goto("/metronome");
  await setTempo(page, 60);

  await page.getByRole("button", { name: "Start metronome" }).click();
  await expect.poll(() => readBeatCount(page)).toBeGreaterThan(0);

  const slowPulse = await readPulseAnimation(page);
  expect(slowPulse.iterationCount).toBe("1");
  expect(slowPulse.durationMs).toBeGreaterThan(0);

  await setTempo(page, 180);
  await expect.poll(() => readBeatCount(page)).toBeGreaterThan(1);

  const fastPulse = await readPulseAnimation(page);
  expect(fastPulse.iterationCount).toBe("1");
  expect(fastPulse.durationMs).toBeLessThan(slowPulse.durationMs);
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
  await expect(page.locator(".pulse")).toBeVisible();
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
  await expect(page.locator(".pulse")).toBeVisible();
  await expect(page.getByText("Audio click unavailable. Visual pulse is still active.")).toBeVisible();
});

async function setTempo(page: Page, bpm: number) {
  await page.getByLabel("Tempo in BPM").evaluate((input, value) => {
    const tempoInput = input as HTMLInputElement;
    tempoInput.value = String(value);
    tempoInput.dispatchEvent(new Event("change", { bubbles: true }));
  }, bpm);
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue(String(bpm));
}

async function readBeatCount(page: Page) {
  return page.locator(".pulse small").evaluate((element) => Number(element.textContent?.replace("Beat ", "")));
}

async function readPulseAnimation(page: Page) {
  const animation = await page.locator(".pulse").evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      duration: style.animationDuration,
      iterationCount: style.animationIterationCount
    };
  });

  return {
    durationMs: parseCssTime(animation.duration),
    iterationCount: animation.iterationCount
  };
}

function parseCssTime(value: string): number {
  const firstValue = value.split(",")[0]?.trim() ?? "0s";

  return firstValue.endsWith("ms") ? Number.parseFloat(firstValue) : Number.parseFloat(firstValue) * 1000;
}
