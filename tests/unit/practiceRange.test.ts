import assert from "node:assert/strict";
import test from "node:test";
import { exercises } from "../../src/exercises.ts";
import { derivePracticeRange } from "../../src/practiceRange.ts";

const cMajor = exercises.find((exercise) => exercise.id === "c-major-scale");
const aMinorArpeggio = exercises.find((exercise) => exercise.id === "a-minor-arpeggio");

test("derivePracticeRange returns one-octave source sequence", () => {
  assert.ok(cMajor);
  const practice = derivePracticeRange(cMajor, "right", "1-octave");

  assert.equal(practice.label, "1 octave");
  assert.deepEqual(practice.notes, ["C", "D", "E", "F", "G", "A", "B", "C"]);
  assert.deepEqual(practice.fingering, [1, 2, 3, 1, 2, 3, 4, 5]);
});

test("derivePracticeRange expands scales to two octaves without duplicating the join note", () => {
  assert.ok(cMajor);
  const practice = derivePracticeRange(cMajor, "right", "2-octaves");

  assert.equal(practice.label, "2 octaves");
  assert.deepEqual(practice.notes, ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B", "C"]);
  assert.equal(practice.fingering.length, practice.notes.length);
});

test("derivePracticeRange repeats arpeggio shape for two octaves", () => {
  assert.ok(aMinorArpeggio);
  const practice = derivePracticeRange(aMinorArpeggio, "left", "2-octaves");

  assert.deepEqual(practice.notes, ["A", "C", "E", "A", "C", "E", "A"]);
  assert.equal(practice.fingering.length, practice.notes.length);
});
