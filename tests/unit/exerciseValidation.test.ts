import assert from "node:assert/strict"
import test from "node:test"
import {
  type Exercise,
  exercises,
  getExerciseById,
} from "../../src/common/exercises.ts"
import {
  validateExercise,
  validateExercises,
} from "../../src/common/exerciseValidation.ts"

test("bundled exercises are valid and have unique ids", () => {
  assert.deepEqual(validateExercises(exercises), [])
  assert.equal(
    new Set(exercises.map((exercise) => exercise.id)).size,
    exercises.length,
  )
})

test("exercise lookup returns known exercises", () => {
  assert.equal(getExerciseById("c-major-scale")?.title, "C major scale")
  assert.equal(getExerciseById("a-minor-arpeggio")?.type, "arpeggio")
  assert.equal(getExerciseById("missing-exercise"), undefined)
})

test("validation rejects invalid ids and mismatched fingering", () => {
  const invalidExercise: Exercise = {
    id: "Bad Id",
    type: "scale",
    title: "Bad scale",
    tonic: "C",
    quality: "major",
    notes: ["C", "D", "E"],
    fingering: {
      right: [1, 2],
      left: [5, 4, 3],
    },
  }

  assert.deepEqual(validateExercise(invalidExercise), [
    "Bad Id has a non-url-safe id",
    "Bad Id right hand fingering length 2 does not match notes length 3",
  ])
})

test("validation rejects duplicate ids", () => {
  const duplicated = [exercises[0], exercises[0]]

  assert.deepEqual(validateExercises(duplicated), [
    "Duplicate exercise id a-major-scale",
  ])
})
