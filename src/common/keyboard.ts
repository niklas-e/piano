import { NOTE_NAMES, type NoteName } from "./exercises.ts";

export type PianoKey = {
  note: NoteName;
  octave: number;
  type: "white" | "black";
  id: string;
};

const blackNotes = new Set<NoteName>(["C#", "D#", "F#", "G#", "A#"]);

export function buildPianoKeyboard(): readonly PianoKey[] {
  const keys: PianoKey[] = [];

  const push = (note: NoteName, octave: number) => {
    keys.push({
      note,
      octave,
      type: blackNotes.has(note) ? "black" : "white",
      id: `${note}${octave}`
    });
  };

  // Octave 0: only A0, A#0, B0
  push("A", 0);
  push("A#", 0);
  push("B", 0);

  // Octaves 1-7: full chromatic octaves
  for (let octave = 1; octave <= 7; octave += 1) {
    for (const note of NOTE_NAMES) {
      push(note, octave);
    }
  }

  // Octave 8: only C8
  push("C", 8);

  return keys;
}

export function isHighlightedKey(key: PianoKey, keyIds: readonly string[]): boolean {
  return keyIds.includes(key.id);
}

// White keys sit at integer slots (0, 1, 2, ...); black keys nudge back by 0.3
// so they straddle the seam between the two neighbouring white keys. Shared by
// the main keyboard and the minimap so their geometry can never drift apart.
export function whiteIndexForKey(keys: readonly PianoKey[], keyIndex: number): number {
  const whiteKeysBefore = keys.slice(0, keyIndex).filter((key) => key.type === "white").length;

  return keys[keyIndex].type === "white" ? whiteKeysBefore : whiteKeysBefore - 0.3;
}
