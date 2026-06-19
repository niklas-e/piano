import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_BPM,
  MIN_BPM,
  readBpmPreference,
  readExerciseTypeFilterPreference,
  readHandPreference,
  readLastExerciseIdPreference,
  writeBpmPreference,
  writeExerciseTypeFilterPreference,
  writeHandPreference,
  writeLastExerciseIdPreference,
  type StorageLike
} from "../../src/preferences.ts";

test("BPM preference validates bounds", () => {
  const storage = memoryStorage();

  assert.equal(readBpmPreference(storage), 80);

  writeBpmPreference(120, storage);
  assert.equal(readBpmPreference(storage), 120);

  writeBpmPreference(MIN_BPM - 1, storage);
  assert.equal(readBpmPreference(storage), 80);

  writeBpmPreference(MAX_BPM + 1, storage);
  assert.equal(readBpmPreference(storage), 80);
});

test("exercise filter and hand preferences reject invalid stored values", () => {
  const storage = memoryStorage();

  writeExerciseTypeFilterPreference("arpeggio", storage);
  writeHandPreference("left", storage);

  assert.equal(readExerciseTypeFilterPreference(storage), "arpeggio");
  assert.equal(readHandPreference(storage), "left");

  storage.setItem("piano:exercise-type-filter", "grade-1");
  storage.setItem("piano:hand", "both");

  assert.equal(readExerciseTypeFilterPreference(storage), "all");
  assert.equal(readHandPreference(storage), "right");
});

test("last exercise id preference keeps only url-safe ids", () => {
  const storage = memoryStorage();

  assert.equal(readLastExerciseIdPreference(storage), undefined);

  writeLastExerciseIdPreference("c-major-scale", storage);
  assert.equal(readLastExerciseIdPreference(storage), "c-major-scale");

  storage.setItem("piano:last-exercise-id", "Bad Id");
  assert.equal(readLastExerciseIdPreference(storage), undefined);
});

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}
