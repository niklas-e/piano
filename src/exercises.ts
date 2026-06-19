export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

export type Finger = 1 | 2 | 3 | 4 | 5;
export type ExerciseType = "scale" | "arpeggio";
export type Hand = "right" | "left";

export type Exercise = {
  id: string;
  type: ExerciseType;
  title: string;
  tonic: NoteName;
  quality: string;
  range: string;
  notes: readonly NoteName[];
  fingering: Record<Hand, readonly Finger[]>;
  description?: string;
};

const majorScaleFingering = {
  right: [1, 2, 3, 1, 2, 3, 4, 5],
  left: [5, 4, 3, 2, 1, 3, 2, 1]
} as const satisfies Record<Hand, readonly Finger[]>;

const minorScaleFingering = majorScaleFingering;

const arpeggioFingering = {
  right: [1, 2, 3, 5],
  left: [5, 3, 2, 1]
} as const satisfies Record<Hand, readonly Finger[]>;

export const exercises = [
  scale("c-major-scale", "C major scale", "C", "major", ["C", "D", "E", "F", "G", "A", "B", "C"], majorScaleFingering),
  scale("g-major-scale", "G major scale", "G", "major", ["G", "A", "B", "C", "D", "E", "F#", "G"], majorScaleFingering),
  scale("d-major-scale", "D major scale", "D", "major", ["D", "E", "F#", "G", "A", "B", "C#", "D"], majorScaleFingering),
  scale("a-major-scale", "A major scale", "A", "major", ["A", "B", "C#", "D", "E", "F#", "G#", "A"], majorScaleFingering),
  scale("e-major-scale", "E major scale", "E", "major", ["E", "F#", "G#", "A", "B", "C#", "D#", "E"], majorScaleFingering),
  scale("a-natural-minor-scale", "A natural minor scale", "A", "natural minor", ["A", "B", "C", "D", "E", "F", "G", "A"], minorScaleFingering),
  scale("e-natural-minor-scale", "E natural minor scale", "E", "natural minor", ["E", "F#", "G", "A", "B", "C", "D", "E"], minorScaleFingering),
  scale("d-natural-minor-scale", "D natural minor scale", "D", "natural minor", ["D", "E", "F", "G", "A", "A#", "C", "D"], minorScaleFingering),
  scale("b-natural-minor-scale", "B natural minor scale", "B", "natural minor", ["B", "C#", "D", "E", "F#", "G", "A", "B"], minorScaleFingering),
  arpeggio("c-major-arpeggio", "C major arpeggio", "C", "major", ["C", "E", "G", "C"]),
  arpeggio("g-major-arpeggio", "G major arpeggio", "G", "major", ["G", "B", "D", "G"]),
  arpeggio("d-major-arpeggio", "D major arpeggio", "D", "major", ["D", "F#", "A", "D"]),
  arpeggio("a-major-arpeggio", "A major arpeggio", "A", "major", ["A", "C#", "E", "A"]),
  arpeggio("e-major-arpeggio", "E major arpeggio", "E", "major", ["E", "G#", "B", "E"]),
  arpeggio("a-minor-arpeggio", "A minor arpeggio", "A", "minor", ["A", "C", "E", "A"]),
  arpeggio("e-minor-arpeggio", "E minor arpeggio", "E", "minor", ["E", "G", "B", "E"]),
  arpeggio("d-minor-arpeggio", "D minor arpeggio", "D", "minor", ["D", "F", "A", "D"]),
  arpeggio("b-minor-arpeggio", "B minor arpeggio", "B", "minor", ["B", "D", "F#", "B"])
] as const satisfies readonly Exercise[];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id);
}

function scale(
  id: string,
  title: string,
  tonic: NoteName,
  quality: string,
  notes: readonly NoteName[],
  fingering: Record<Hand, readonly Finger[]>
): Exercise {
  return {
    id,
    type: "scale",
    title,
    tonic,
    quality,
    range: "one octave",
    notes,
    fingering,
    description: "Practice evenly with relaxed hand shape before increasing the tempo."
  };
}

function arpeggio(id: string, title: string, tonic: NoteName, quality: string, notes: readonly NoteName[]): Exercise {
  return {
    id,
    type: "arpeggio",
    title,
    tonic,
    quality,
    range: "one octave",
    notes,
    fingering: arpeggioFingering,
    description: "Keep the wrist loose and listen for an even chord-tone shape."
  };
}
