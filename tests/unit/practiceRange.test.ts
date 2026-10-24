import assert from "node:assert/strict"
import test from "node:test"
import { exercises } from "../../src/common/exercises.ts"
import {
  derivePracticeRange,
  upAndDown,
} from "../../src/common/practiceRange.ts"

const cMajor = exercises.find((exercise) => exercise.id === "c-major-scale")
const aMajor = exercises.find((exercise) => exercise.id === "a-major-scale")
const aMinorArpeggio = exercises.find(
  (exercise) => exercise.id === "a-minor-arpeggio",
)

test("derivePracticeRange returns one-octave source sequence with octave-aware key ids", () => {
  assert.ok(cMajor)
  const practice = derivePracticeRange(cMajor, "right", 1)

  assert.equal(practice.label, "1 octave")
  assert.deepEqual(practice.notes, ["C", "D", "E", "F", "G", "A", "B", "C"])
  assert.deepEqual(practice.fingering, [1, 2, 3, 1, 2, 3, 4, 5])
  assert.deepEqual(practice.keyIds, [
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
  ])
})

test("derivePracticeRange expands scale notes and uses explicit two-octave fingering", () => {
  assert.ok(cMajor)
  const practice = derivePracticeRange(cMajor, "right", 2)

  assert.equal(practice.label, "2 octaves")
  assert.deepEqual(practice.notes, [
    "C",
    "D",
    "E",
    "F",
    "G",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "A",
    "B",
    "C",
  ])
  assert.deepEqual(
    practice.fingering,
    [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5],
  )
  assert.deepEqual(practice.keyIds, [
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
    "A5",
    "B5",
    "C6",
  ])
})

test("derivePracticeRange uses explicit two-octave arpeggio fingering for both hands", () => {
  assert.ok(aMinorArpeggio)
  const rightHand = derivePracticeRange(aMinorArpeggio, "right", 2)
  const leftHand = derivePracticeRange(aMinorArpeggio, "left", 2)

  assert.deepEqual(rightHand.notes, ["A", "C", "E", "A", "C", "E", "A"])
  assert.deepEqual(rightHand.fingering, [1, 2, 3, 1, 2, 3, 5])
  // Centred on the treble staff, the two-octave run sits a third lower than an A4 start.
  assert.deepEqual(rightHand.keyIds, ["A3", "C4", "E4", "A4", "C5", "E5", "A5"])
  assert.deepEqual(leftHand.notes, ["A", "C", "E", "A", "C", "E", "A"])
  assert.deepEqual(leftHand.fingering, [5, 3, 2, 1, 3, 2, 1])
  // Centred on the bass staff, the left hand drops two octaves below the right.
  assert.deepEqual(leftHand.keyIds, ["A1", "C2", "E2", "A2", "C3", "E3", "A3"])
})

test("derivePracticeRange anchors the left hand one octave below the right hand", () => {
  assert.ok(cMajor)
  const leftHand = derivePracticeRange(cMajor, "left", 1)

  assert.deepEqual(leftHand.keyIds, [
    "C3",
    "D3",
    "E3",
    "F3",
    "G3",
    "A3",
    "B3",
    "C4",
  ])
  assert.deepEqual(leftHand.fingering, [5, 4, 3, 2, 1, 3, 2, 1])
})

test("derivePracticeRange exposes the clef and base octave per hand", () => {
  assert.ok(cMajor)
  const right = derivePracticeRange(cMajor, "right", 1)
  const left = derivePracticeRange(cMajor, "left", 1)

  assert.equal(right.clef, "treble")
  assert.equal(right.baseOctave, 4)
  assert.equal(left.clef, "bass")
  assert.equal(left.baseOctave, 3)
})

test("derivePracticeRange centres a two-octave scale instead of climbing off the top", () => {
  assert.ok(aMajor)
  // A4 start would reach A6 (three ledger lines up); centring pulls the run down to A3-A5.
  const right = derivePracticeRange(aMajor, "right", 2)
  assert.equal(right.keyIds[0], "A3")
  assert.equal(right.keyIds.at(-1), "A5")
})

test("a run is played up to its top note and back down without repeating it", () => {
  assert.deepEqual(upAndDown(["C4", "E4", "G4", "C5"]), [
    "C4",
    "E4",
    "G4",
    "C5",
    "G4",
    "E4",
    "C4",
  ])
})
