import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_BPM,
  MIN_BPM,
  readBpmPreference,
  readExerciseTypeFilterPreference,
  readHandPreference,
  readLastExerciseIdPreference,
  type StorageLike,
  writeBpmPreference,
  writeExerciseTypeFilterPreference,
  writeHandPreference,
  writeLastExerciseIdPreference,
} from "../../src/common/preferences.ts"

test("BPM preference validates bounds", () => {
  const storage = memoryStorage()

  assert.equal(readBpmPreference(storage), 80)

  writeBpmPreference(120, storage)
  assert.equal(readBpmPreference(storage), 120)

  writeBpmPreference(MIN_BPM - 1, storage)
  assert.equal(readBpmPreference(storage), 80)

  writeBpmPreference(MAX_BPM + 1, storage)
  assert.equal(readBpmPreference(storage), 80)
})

test("exercise filter and hand preferences reject invalid stored values", () => {
  const storage = memoryStorage()

  writeExerciseTypeFilterPreference("arpeggio", storage)
  writeHandPreference("left", storage)

  assert.equal(readExerciseTypeFilterPreference(storage), "arpeggio")
  assert.equal(readHandPreference(storage), "left")

  storage.setItem("piano:exercise-type-filter", "grade-1")
  storage.setItem("piano:hand", "both")

  assert.equal(readExerciseTypeFilterPreference(storage), "all")
  assert.equal(readHandPreference(storage), "right")
})

test("last exercise id preference keeps only url-safe ids", () => {
  const storage = memoryStorage()

  assert.equal(readLastExerciseIdPreference(storage), undefined)

  writeLastExerciseIdPreference("c-major-scale", storage)
  assert.equal(readLastExerciseIdPreference(storage), "c-major-scale")

  storage.setItem("piano:last-exercise-id", "Bad Id")
  assert.equal(readLastExerciseIdPreference(storage), undefined)
})

test("preference helpers tolerate throwing storage reads and writes", () => {
  const storage = throwingStorage()

  assert.equal(readBpmPreference(storage), 80)
  assert.equal(readExerciseTypeFilterPreference(storage), "all")
  assert.equal(readHandPreference(storage), "right")
  assert.equal(readLastExerciseIdPreference(storage), undefined)

  assert.doesNotThrow(() => writeBpmPreference(120, storage))
  assert.doesNotThrow(() => writeExerciseTypeFilterPreference("scale", storage))
  assert.doesNotThrow(() => writeHandPreference("left", storage))
  assert.doesNotThrow(() =>
    writeLastExerciseIdPreference("c-major-scale", storage),
  )
})

function memoryStorage(): StorageLike {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

function throwingStorage(): StorageLike {
  return {
    getItem() {
      throw new Error("storage read blocked")
    },
    setItem() {
      throw new Error("storage write blocked")
    },
  }
}
