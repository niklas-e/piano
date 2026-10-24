import assert from "node:assert/strict"
import test from "node:test"
import { type Beat, createBeatClock } from "../../src/common/beatClock.ts"

/** Runs `body` with no Web Audio, so the clock follows `performance.now()`. */
function withoutAudio(body: (advance: (ms: number) => void) => void): void {
  const originalPerformance = globalThis.performance
  const originalWindow = globalThis.window
  let intervalCallback: (() => void) | undefined
  let now = 1_000

  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: { now: () => now },
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      clearInterval() {
        intervalCallback = undefined
      },
      setInterval(callback: () => void) {
        intervalCallback = callback
        return 1
      },
    },
  })

  try {
    body((ms) => {
      now += ms
      intervalCallback?.()
    })
  } finally {
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: originalPerformance,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    })
  }
}

const times = (beats: Beat[]) => beats.map((beat) => beat.time.toFixed(2))

test("a second listener joins on the running clock's next beat", () => {
  withoutAudio((advance) => {
    const clock = createBeatClock()
    clock.setBpm(120)
    const metronome: Beat[] = []
    const piano: Beat[] = []

    clock.join((beat) => metronome.push(beat))
    advance(300)
    const leavePiano = clock.join((beat) => piano.push(beat))
    advance(400)
    advance(500)
    leavePiano()
    advance(500)

    assert.deepEqual(times(metronome), ["0.05", "0.55", "1.05", "1.55"])
    assert.deepEqual(times(piano), ["0.55", "1.05"])
  })
})

test("a tempo change applies from the next beat for every listener", () => {
  withoutAudio((advance) => {
    const clock = createBeatClock()
    clock.setBpm(120)
    const beats: Beat[] = []

    clock.join((beat) => beats.push(beat))
    clock.setBpm(60)
    advance(500)
    advance(1000)

    assert.deepEqual(times(beats), ["0.05", "0.55", "1.55"])
    assert.deepEqual(
      beats.map((beat) => beat.seconds),
      [0.5, 1, 1],
    )
  })
})

test("the clock starts afresh once every listener has left", () => {
  withoutAudio((advance) => {
    const clock = createBeatClock()
    clock.setBpm(120)
    const beats: Beat[] = []

    const leave = clock.join((beat) => beats.push(beat))
    leave()
    advance(1200)
    clock.join((beat) => beats.push(beat))

    // No beats while nobody listened. Without audio the clock's time starts
    // from zero again too.
    assert.deepEqual(times(beats), ["0.05", "0.05"])
  })
})
