import assert from "node:assert/strict";
import test from "node:test";
import { exercises, getExerciseById, type Exercise } from "../../src/exercises.ts";
import { validateExercise, validateExercises } from "../../src/exerciseValidation.ts";

test("bundled exercises are valid and have unique ids", () => {
  assert.deepEqual(validateExercises(exercises), []);
  assert.equal(new Set(exercises.map((exercise) => exercise.id)).size, exercises.length);
});

test("exercise lookup returns known exercises", () => {
  assert.equal(getExerciseById("c-major-scale")?.title, "C major scale");
  assert.equal(getExerciseById("a-minor-arpeggio")?.type, "arpeggio");
  assert.equal(getExerciseById("missing-exercise"), undefined);
});

test("sharp-only bundled catalog omits flat-required misspellings", () => {
  assert.equal(getExerciseById("d-natural-minor-scale"), undefined);
  assert.deepEqual(getExerciseById("f-sharp-natural-minor-scale")?.notes, ["F#", "G#", "A", "B", "C#", "D", "E", "F#"]);
  assert.equal(exercises.some((exercise) => exercise.notes.includes("A#")), false);
});

test("validation rejects invalid ids and mismatched fingering", () => {
  const invalidExercise: Exercise = {
    id: "Bad Id",
    type: "scale",
    title: "Bad scale",
    tonic: "C",
    quality: "major",
    range: "one octave",
    notes: ["C", "D", "E"],
    fingering: {
      right: [1, 2],
      left: [5, 4, 3]
    }
  };

  assert.deepEqual(validateExercise(invalidExercise), [
    "Bad Id has a non-url-safe id",
    "Bad Id right hand fingering length 2 does not match notes length 3"
  ]);
});

test("validation rejects duplicate ids", () => {
  const duplicated = [exercises[0], exercises[0]];

  assert.deepEqual(validateExercises(duplicated), ["Duplicate exercise id c-major-scale"]);
});
