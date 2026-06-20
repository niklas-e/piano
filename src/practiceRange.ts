import type { Exercise, Finger, Hand, NoteName } from "./exercises.ts";

export type PracticeRange = "1-octave" | "2-octaves";

export type DerivedPractice = {
  label: string;
  notes: readonly NoteName[];
  fingering: readonly Finger[];
};

export function derivePracticeRange(exercise: Exercise, hand: Hand, range: PracticeRange): DerivedPractice {
  if (range === "1-octave") {
    return { label: "1 octave", notes: exercise.notes, fingering: exercise.fingering[hand] };
  }

  const notes = expandSequence(exercise.notes);
  const fingering = expandSequence(exercise.fingering[hand]);

  return { label: "2 octaves", notes, fingering };
}

function expandSequence<T>(sequence: readonly T[]): readonly T[] {
  const tail = sequence.slice(1);
  return [...sequence, ...tail];
}
