import { NOTE_NAMES, type Exercise, type Finger, type Hand, type NoteName } from "./exercises.ts";

export type PracticeRange = 1 | 2;

export type DerivedPractice = {
  label: string;
  notes: readonly NoteName[];
  fingering: readonly Finger[];
  keyIds: readonly string[];
};

const twoOctaveFingering = {
  scale: {
    right: [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1]
  },
  arpeggio: {
    right: [1, 2, 3, 1, 2, 3, 5],
    left: [5, 3, 2, 1, 3, 2, 1]
  }
} as const satisfies Record<Exercise["type"], Record<Hand, readonly Finger[]>>;

export function derivePracticeRange(exercise: Exercise, hand: Hand, range: PracticeRange): DerivedPractice {
  if (range === 1) {
    return {
      label: "1 octave",
      notes: exercise.notes,
      fingering: exercise.fingering[hand],
      keyIds: deriveKeyIds(exercise.notes)
    };
  }

  const notes = expandSequence(exercise.notes);

  return {
    label: "2 octaves",
    notes,
    fingering: twoOctaveFingering[exercise.type][hand],
    keyIds: deriveKeyIds(notes)
  };
}

function expandSequence<T>(sequence: readonly T[]): readonly T[] {
  const tail = sequence.slice(1);
  return [...sequence, ...tail];
}

function deriveKeyIds(notes: readonly NoteName[]): readonly string[] {
  let octave = 4;
  let previousNoteIndex = -1;

  return notes.map((note) => {
    const noteIndex = NOTE_NAMES.indexOf(note);

    if (previousNoteIndex >= 0 && noteIndex <= previousNoteIndex) {
      octave += 1;
    }

    previousNoteIndex = noteIndex;
    return `${note}${octave}`;
  });
}
