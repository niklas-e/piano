import type { ExerciseType, Hand } from "./exercises.ts";

export const MIN_BPM = 30;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 80;

export type ExerciseTypeFilter = ExerciseType | "all";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const keys = {
  bpm: "piano:bpm",
  exerciseTypeFilter: "piano:exercise-type-filter",
  hand: "piano:hand",
  lastExerciseId: "piano:last-exercise-id"
} as const;

const exerciseTypeFilters = new Set<ExerciseTypeFilter>(["all", "scale", "arpeggio"]);
const hands = new Set<Hand>(["right", "left"]);
const urlSafeIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readBpmPreference(storage = getBrowserStorage()): number {
  const rawValue = readStorageItem(storage, keys.bpm);
  const bpm = rawValue === null || rawValue === undefined ? NaN : Number(rawValue);

  return isValidBpm(bpm) ? bpm : DEFAULT_BPM;
}

export function writeBpmPreference(bpm: number, storage = getBrowserStorage()): void {
  writeStorageItem(storage, keys.bpm, String(isValidBpm(bpm) ? bpm : DEFAULT_BPM));
}

export function readExerciseTypeFilterPreference(storage = getBrowserStorage()): ExerciseTypeFilter {
  const rawValue = readStorageItem(storage, keys.exerciseTypeFilter);

  return isExerciseTypeFilter(rawValue) ? rawValue : "all";
}

export function writeExerciseTypeFilterPreference(value: ExerciseTypeFilter, storage = getBrowserStorage()): void {
  writeStorageItem(storage, keys.exerciseTypeFilter, isExerciseTypeFilter(value) ? value : "all");
}

export function readHandPreference(storage = getBrowserStorage()): Hand {
  const rawValue = readStorageItem(storage, keys.hand);

  return isHand(rawValue) ? rawValue : "right";
}

export function writeHandPreference(value: Hand, storage = getBrowserStorage()): void {
  writeStorageItem(storage, keys.hand, isHand(value) ? value : "right");
}

export function readLastExerciseIdPreference(storage = getBrowserStorage()): string | undefined {
  const rawValue = readStorageItem(storage, keys.lastExerciseId);

  return rawValue !== null && rawValue !== undefined && urlSafeIdPattern.test(rawValue) ? rawValue : undefined;
}

export function writeLastExerciseIdPreference(id: string, storage = getBrowserStorage()): void {
  if (!urlSafeIdPattern.test(id)) {
    return;
  }

  writeStorageItem(storage, keys.lastExerciseId, id);
}

function isValidBpm(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_BPM && value <= MAX_BPM;
}

function isExerciseTypeFilter(value: unknown): value is ExerciseTypeFilter {
  return typeof value === "string" && exerciseTypeFilters.has(value as ExerciseTypeFilter);
}

function isHand(value: unknown): value is Hand {
  return typeof value === "string" && hands.has(value as Hand);
}

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function readStorageItem(storage: StorageLike | undefined, key: string): string | null | undefined {
  try {
    return storage?.getItem(key);
  } catch {
    return undefined;
  }
}

function writeStorageItem(storage: StorageLike | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage may be disabled, private, or full. Preferences are optional.
  }
}
