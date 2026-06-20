import assert from "node:assert/strict";
import test from "node:test";
import { exercises } from "../../src/common/exercises.ts";
import { derivePracticeRange } from "../../src/common/practiceRange.ts";

const cMajor = exercises.find((exercise) => exercise.id === "c-major-scale");
const aMinorArpeggio = exercises.find((exercise) => exercise.id === "a-minor-arpeggio");

test("derivePracticeRange returns one-octave source sequence with octave-aware key ids", () => {
  assert.ok(cMajor);
  const practice = derivePracticeRange(cMajor, "right", 1);

  assert.equal(practice.label, "1 octave");
  assert.deepEqual(practice.notes, ["C", "D", "E", "F", "G", "A", "B", "C"]);
  assert.deepEqual(practice.fingering, [1, 2, 3, 1, 2, 3, 4, 5]);
  assert.deepEqual(practice.keyIds, ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]);
});

test("derivePracticeRange expands scale notes and uses explicit two-octave fingering", () => {
  assert.ok(cMajor);
  const practice = derivePracticeRange(cMajor, "right", 2);

  assert.equal(practice.label, "2 octaves");
  assert.deepEqual(practice.notes, ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G", "A", "B", "C"]);
  assert.deepEqual(practice.fingering, [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5]);
  assert.deepEqual(practice.keyIds, ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"]);
});

test("derivePracticeRange uses explicit two-octave arpeggio fingering for both hands", () => {
  assert.ok(aMinorArpeggio);
  const rightHand = derivePracticeRange(aMinorArpeggio, "right", 2);
  const leftHand = derivePracticeRange(aMinorArpeggio, "left", 2);

  assert.deepEqual(rightHand.notes, ["A", "C", "E", "A", "C", "E", "A"]);
  assert.deepEqual(rightHand.fingering, [1, 2, 3, 1, 2, 3, 5]);
  assert.deepEqual(rightHand.keyIds, ["A4", "C5", "E5", "A5", "C6", "E6", "A6"]);
  assert.deepEqual(leftHand.notes, ["A", "C", "E", "A", "C", "E", "A"]);
  assert.deepEqual(leftHand.fingering, [5, 3, 2, 1, 3, 2, 1]);
  assert.deepEqual(leftHand.keyIds, ["A4", "C5", "E5", "A5", "C6", "E6", "A6"]);
});
