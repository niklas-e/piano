import { NOTE_NAMES, type NoteName } from "./exercises.ts";

export type PianoKey = {
  note: NoteName;
  octave: number;
  type: "white" | "black";
  id: string;
};

const blackNotes = new Set<NoteName>(["C#", "D#", "F#", "G#", "A#"]);

export function buildKeyboard(startOctave = 3, endOctave = 5): readonly PianoKey[] {
  const keys: PianoKey[] = [];

  for (let octave = startOctave; octave <= endOctave; octave += 1) {
    for (const note of NOTE_NAMES) {
      keys.push({
        note,
        octave,
        type: blackNotes.has(note) ? "black" : "white",
        id: `${note}${octave}`
      });
    }
  }

  return keys;
}

export function isHighlightedKey(key: PianoKey, notes: readonly NoteName[]): boolean {
  return notes.includes(key.note);
}
