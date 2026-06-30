import { type Exercise, NOTE_NAMES } from "./exercises.ts"

const validNoteNames = new Set<string>(NOTE_NAMES)
const validExerciseTypes = new Set(["scale", "arpeggio"])
const urlSafeIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateExercise(exercise: Exercise): readonly string[] {
  const errors: string[] = []

  if (!urlSafeIdPattern.test(exercise.id)) {
    errors.push(`${exercise.id} has a non-url-safe id`)
  }

  if (!validExerciseTypes.has(exercise.type)) {
    errors.push(`${exercise.id} has invalid type ${exercise.type}`)
  }

  for (const note of exercise.notes) {
    if (!validNoteNames.has(note)) {
      errors.push(`${exercise.id} has invalid note ${note}`)
    }
  }

  for (const hand of ["right", "left"] as const) {
    const fingering = exercise.fingering[hand]
    if (fingering.length !== exercise.notes.length) {
      errors.push(
        `${exercise.id} ${hand} hand fingering length ${fingering.length} does not match notes length ${exercise.notes.length}`,
      )
    }
  }

  return errors
}

export function validateExercises(
  items: readonly Exercise[],
): readonly string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()

  for (const exercise of items) {
    if (seenIds.has(exercise.id)) {
      errors.push(`Duplicate exercise id ${exercise.id}`)
      continue
    }

    seenIds.add(exercise.id)
    errors.push(...validateExercise(exercise))
  }

  return errors
}
