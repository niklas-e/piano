import {
  DEFAULT_LINE_WIDTH,
  INK_COLORS,
  LINE_WIDTH_OPTIONS,
  type LineWidthName,
} from "./drawingTools.ts"
import type { ExerciseType, Hand } from "./exercises.ts"
import type { InkTool } from "./ink.ts"
import {
  CLEF_SETTINGS,
  type ClefSetting,
  DURATION_OPTIONS,
} from "./sightReading.ts"

export const MIN_BPM = 30
export const MAX_BPM = 240
export const DEFAULT_BPM = 80

export type ExerciseTypeFilter = ExerciseType | "all"

export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const keys = {
  bpm: "piano:bpm",
  exerciseTypeFilter: "piano:exercise-type-filter",
  hand: "piano:hand",
  inkColor: {
    pen: "piano:ink-color:pen",
    highlighter: "piano:ink-color:highlighter",
  },
  lineWidth: {
    pen: "piano:line-width:pen",
    highlighter: "piano:line-width:highlighter",
  },
  lastExerciseId: "piano:last-exercise-id",
  sightReadingClef: "piano:sight-reading-clef",
  sightReadingDuration: "piano:sight-reading-duration",
} as const

export const DEFAULT_SIGHT_READING_CLEF: ClefSetting = "treble"
export const DEFAULT_SIGHT_READING_DURATION = 60

const exerciseTypeFilters = new Set<ExerciseTypeFilter>([
  "all",
  "scale",
  "arpeggio",
])
const hands = new Set<Hand>(["right", "left"])
const clefs = new Set<ClefSetting>(CLEF_SETTINGS)
const durations = new Set<number>(
  DURATION_OPTIONS.map((option) => option.seconds),
)
const urlSafeIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function readBpmPreference(storage = getBrowserStorage()): number {
  const rawValue = readStorageItem(storage, keys.bpm)
  const bpm =
    rawValue === null || rawValue === undefined ? NaN : Number(rawValue)

  return isValidBpm(bpm) ? bpm : DEFAULT_BPM
}

export function writeBpmPreference(
  bpm: number,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(
    storage,
    keys.bpm,
    String(isValidBpm(bpm) ? bpm : DEFAULT_BPM),
  )
}

export function readExerciseTypeFilterPreference(
  storage = getBrowserStorage(),
): ExerciseTypeFilter {
  const rawValue = readStorageItem(storage, keys.exerciseTypeFilter)

  return isExerciseTypeFilter(rawValue) ? rawValue : "all"
}

export function writeExerciseTypeFilterPreference(
  value: ExerciseTypeFilter,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(
    storage,
    keys.exerciseTypeFilter,
    isExerciseTypeFilter(value) ? value : "all",
  )
}

export function readHandPreference(storage = getBrowserStorage()): Hand {
  const rawValue = readStorageItem(storage, keys.hand)

  return isHand(rawValue) ? rawValue : "right"
}

export function writeHandPreference(
  value: Hand,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(storage, keys.hand, isHand(value) ? value : "right")
}

export function readLastExerciseIdPreference(
  storage = getBrowserStorage(),
): string | undefined {
  const rawValue = readStorageItem(storage, keys.lastExerciseId)

  return rawValue !== null &&
    rawValue !== undefined &&
    urlSafeIdPattern.test(rawValue)
    ? rawValue
    : undefined
}

export function writeLastExerciseIdPreference(
  id: string,
  storage = getBrowserStorage(),
): void {
  if (!urlSafeIdPattern.test(id)) {
    return
  }

  writeStorageItem(storage, keys.lastExerciseId, id)
}

export function readSightReadingClefPreference(
  storage = getBrowserStorage(),
): ClefSetting {
  const rawValue = readStorageItem(storage, keys.sightReadingClef)

  return isClef(rawValue) ? rawValue : DEFAULT_SIGHT_READING_CLEF
}

export function writeSightReadingClefPreference(
  value: ClefSetting,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(
    storage,
    keys.sightReadingClef,
    isClef(value) ? value : DEFAULT_SIGHT_READING_CLEF,
  )
}

export function readSightReadingDurationPreference(
  storage = getBrowserStorage(),
): number {
  const rawValue = readStorageItem(storage, keys.sightReadingDuration)
  const seconds =
    rawValue === null || rawValue === undefined ? NaN : Number(rawValue)

  return durations.has(seconds) ? seconds : DEFAULT_SIGHT_READING_DURATION
}

export function writeSightReadingDurationPreference(
  seconds: number,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(
    storage,
    keys.sightReadingDuration,
    String(durations.has(seconds) ? seconds : DEFAULT_SIGHT_READING_DURATION),
  )
}

export function readInkColorPreference(
  tool: InkTool,
  storage = getBrowserStorage(),
): string {
  const rawValue = readStorageItem(storage, keys.inkColor[tool])
  const colors = INK_COLORS[tool]

  return (
    colors.find((color) => color.value === rawValue)?.value ?? colors[0].value
  )
}

export function writeInkColorPreference(
  tool: InkTool,
  color: string,
  storage = getBrowserStorage(),
): void {
  if (INK_COLORS[tool].some((option) => option.value === color)) {
    writeStorageItem(storage, keys.inkColor[tool], color)
  }
}

export function readLineWidthPreference(
  tool: InkTool,
  storage = getBrowserStorage(),
): LineWidthName {
  const rawValue = readStorageItem(storage, keys.lineWidth[tool])

  return (
    LINE_WIDTH_OPTIONS.find((option) => option.name === rawValue)?.name ??
    DEFAULT_LINE_WIDTH
  )
}

export function writeLineWidthPreference(
  tool: InkTool,
  width: LineWidthName,
  storage = getBrowserStorage(),
): void {
  writeStorageItem(storage, keys.lineWidth[tool], width)
}

function isValidBpm(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_BPM && value <= MAX_BPM
}

function isExerciseTypeFilter(value: unknown): value is ExerciseTypeFilter {
  return (
    typeof value === "string" &&
    exerciseTypeFilters.has(value as ExerciseTypeFilter)
  )
}

function isHand(value: unknown): value is Hand {
  return typeof value === "string" && hands.has(value as Hand)
}

function isClef(value: unknown): value is ClefSetting {
  return typeof value === "string" && clefs.has(value as ClefSetting)
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function readStorageItem(
  storage: StorageLike | undefined,
  key: string,
): string | null | undefined {
  try {
    return storage?.getItem(key)
  } catch {
    return undefined
  }
}

function writeStorageItem(
  storage: StorageLike | undefined,
  key: string,
  value: string,
): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // Storage may be disabled, private, or full. Preferences are optional.
  }
}
