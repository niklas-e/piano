import assert from "node:assert/strict";
import test from "node:test";
import { clampBpm, msPerBeat } from "../../src/metronome.ts";

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
