import assert from "node:assert/strict";
import test from "node:test";
import { clampBpm, createMetronomeEngine, msPerBeat } from "../../src/metronome.ts";

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
