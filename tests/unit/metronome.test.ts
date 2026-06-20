import assert from "node:assert/strict";
import test from "node:test";
import { clampBpm, createMetronomeEngine, msPerBeat } from "../../src/common/metronome.ts";

test("clampBpm keeps tempo in the supported range", () => {
  assert.equal(clampBpm(20), 30);
  assert.equal(clampBpm(80), 80);
  assert.equal(clampBpm(241), 240);
  assert.equal(clampBpm(Number.NaN), 80);
});

test("msPerBeat converts BPM to milliseconds", () => {
  assert.equal(msPerBeat(60), 1000);
  assert.equal(msPerBeat(120), 500);
  assert.equal(msPerBeat(240), 250);
});

test("metronome engine reports asynchronous audio resume failures", async () => {
  const originalWindow = globalThis.window;
  const resumeError = new Error("resume blocked");
  let audioError: string | undefined;

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
      return Promise.reject(resumeError);
    }
    close() {
      return Promise.resolve();
    }
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: RejectingAudioContext,
      clearInterval,
      setInterval
    }
  });

  try {
    const engine = createMetronomeEngine(80);
    const unsubscribe = engine.onAudioError((message) => {
      audioError = message;
    });

    engine.start();
    await Promise.resolve();

    assert.equal(audioError, "Audio click unavailable. Visual pulse is still active.");
    assert.equal(engine.getAudioError(), "Audio click unavailable. Visual pulse is still active.");

    unsubscribe();
    engine.dispose();
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});

test("metronome engine keeps visual pulses on BPM after async resume failure freezes audio time", async () => {
  const originalPerformance = globalThis.performance;
  const originalWindow = globalThis.window;
  let intervalCallback: (() => void) | undefined;
  let performanceNow = 1_000;
  const pulses: number[] = [];

  class FrozenRejectingAudioContext {
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

  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: {
      now: () => performanceNow
    }
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: FrozenRejectingAudioContext,
      clearInterval() {},
      setInterval(callback: () => void) {
        intervalCallback = callback;
        return 1;
      }
    }
  });

  try {
    const engine = createMetronomeEngine(120);
    engine.onPulse((beat) => pulses.push(beat));

    engine.start();
    await Promise.resolve();
    performanceNow += 500;
    intervalCallback?.();
    performanceNow += 500;
    intervalCallback?.();

    assert.deepEqual(pulses, [1, 2, 3]);
    assert.equal(engine.getAudioError(), "Audio click unavailable. Visual pulse is still active.");

    engine.dispose();
  } finally {
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: originalPerformance
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});

test("metronome engine keeps visual pulses running when audio graph scheduling throws", () => {
  const originalPerformance = globalThis.performance;
  const originalWindow = globalThis.window;
  let intervalCallback: (() => void) | undefined;
  let performanceNow = 1_000;
  let audioError: string | undefined;
  let audioErrorCount = 0;
  const pulses: number[] = [];

  class ThrowingAudioContext {
    destination = {};
    currentTime = 0;
    createOscillator() {
      throw new Error("oscillator unavailable");
    }
    createGain() {
      throw new Error("gain should not be created after oscillator failure");
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  }

  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: {
      now: () => performanceNow
    }
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: ThrowingAudioContext,
      clearInterval() {},
      setInterval(callback: () => void) {
        intervalCallback = callback;
        return 1;
      }
    }
  });

  try {
    const engine = createMetronomeEngine(120);
    engine.onPulse((beat) => pulses.push(beat));
    engine.onAudioError((message) => {
      audioError = message;
      audioErrorCount += 1;
    });

    assert.doesNotThrow(() => engine.start());
    performanceNow += 500;
    intervalCallback?.();

    assert.deepEqual(pulses, [1, 2]);
    assert.equal(audioError, "Audio click unavailable. Visual pulse is still active.");
    assert.equal(engine.getAudioError(), "Audio click unavailable. Visual pulse is still active.");
    assert.equal(audioErrorCount, 1);

    engine.dispose();
  } finally {
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: originalPerformance
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  }
});
