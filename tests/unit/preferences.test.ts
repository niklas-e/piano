import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_BPM,
  MIN_BPM,
  readBpmPreference,
  readExerciseTypeFilterPreference,
  readHalfPageTurnsPreference,
  readHandPreference,
  readInkColorPreference,
  readLastExerciseIdPreference,
  readLineWidthPreference,
  readSightReadingSoundPreference,
  readTrimMarginsPreference,
  type StorageLike,
  writeBpmPreference,
  writeExerciseTypeFilterPreference,
  writeHalfPageTurnsPreference,
  writeHandPreference,
  writeInkColorPreference,
  writeLastExerciseIdPreference,
  writeLineWidthPreference,
  writeSightReadingSoundPreference,
  writeTrimMarginsPreference,
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

test("ink colours are remembered per tool and only from that tool's palette", () => {
  const storage = memoryStorage()

  assert.equal(readInkColorPreference("pen", storage), "#17130f")
  assert.equal(readInkColorPreference("highlighter", storage), "#ffd400")

  writeInkColorPreference("pen", "#c62f2f", storage)
  writeInkColorPreference("highlighter", "#c62f2f", storage)
  assert.equal(readInkColorPreference("pen", storage), "#c62f2f")
  assert.equal(readInkColorPreference("highlighter", storage), "#ffd400")

  storage.setItem("piano:ink-color:pen", "#123456")
  assert.equal(readInkColorPreference("pen", storage), "#17130f")
})

test("line widths are remembered per tool", () => {
  const storage = memoryStorage()

  assert.equal(readLineWidthPreference("pen", storage), "medium")

  writeLineWidthPreference("pen", "bold", storage)
  assert.equal(readLineWidthPreference("pen", storage), "bold")
  assert.equal(readLineWidthPreference("highlighter", storage), "medium")

  storage.setItem("piano:line-width:pen", "huge")
  assert.equal(readLineWidthPreference("pen", storage), "medium")
})

test("half-page turns are off until turned on", () => {
  const storage = memoryStorage()

  assert.equal(readHalfPageTurnsPreference(storage), false)
  writeHalfPageTurnsPreference(true, storage)
  assert.equal(readHalfPageTurnsPreference(storage), true)
  writeHalfPageTurnsPreference(false, storage)
  assert.equal(readHalfPageTurnsPreference(storage), false)
})

test("margins are trimmed until turned off", () => {
  const storage = memoryStorage()

  assert.equal(readTrimMarginsPreference(storage), true)
  writeTrimMarginsPreference(false, storage)
  assert.equal(readTrimMarginsPreference(storage), false)
  writeTrimMarginsPreference(true, storage)
  assert.equal(readTrimMarginsPreference(storage), true)
})

test("sight reading sound is on until turned off", () => {
  const storage = memoryStorage()

  assert.equal(readSightReadingSoundPreference(storage), true)
  writeSightReadingSoundPreference(false, storage)
  assert.equal(readSightReadingSoundPreference(storage), false)
  writeSightReadingSoundPreference(true, storage)
  assert.equal(readSightReadingSoundPreference(storage), true)
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
