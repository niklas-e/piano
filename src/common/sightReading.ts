export type Clef = "treble" | "bass"
export type ClefSetting = Clef | "both"
export type Accidental = "natural" | "sharp" | "flat"
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B"
export type Note = { letter: Letter; octave: number; accidental: Accidental }
export type AnswerRow = 1 | 2 | 3
export type WrongAnswer = { note: Note; clef: Clef; picked: string }

export type DurationOption = { label: string; seconds: number }

// seconds: 0 means unlimited (ended manually).
export const DURATION_OPTIONS: readonly DurationOption[] = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "Unlimited", seconds: 0 },
] as const

export const CLEFS: readonly Clef[] = ["treble", "bass"] as const
export const CLEF_SETTINGS: readonly ClefSetting[] = [
  "treble",
  "bass",
  "both",
] as const

// Reading ranges extend up to three ledger lines above and below each staff,
// since those notes are common in real music. A staff slot is just a letter +
// octave; the accidental is chosen per draw.
// Treble: F3 (3rd ledger below) up to F6 (3rd ledger above).
const trebleSlots = slots(3, ["E", "F", "G", "A", "B"]).concat(
  slots(4, ["C", "D", "E", "F", "G", "A", "B"]),
  slots(5, ["C", "D", "E", "F", "G", "A", "B"]),
  slots(6, ["C", "D", "E", "F"]),
)
// Bass: A1 (3rd ledger below) up to G4 (3rd ledger above).
const bassSlots = slots(1, ["G", "A", "B"]).concat(
  slots(2, ["C", "D", "E", "F", "G", "A", "B"]),
  slots(3, ["C", "D", "E", "F", "G", "A", "B"]),
  slots(4, ["C", "D", "E", "F", "G", "A"]),
)

export const STAFF_SLOTS: Record<
  Clef,
  ReadonlyArray<{ letter: Letter; octave: number }>
> = {
  treble: trebleSlots,
  bass: bassSlots,
}

// Standard enharmonic spellings only (no E#/B#/Cb/Fb).
const sharpLetters = new Set<Letter>(["C", "D", "F", "G", "A"])
const flatLetters = new Set<Letter>(["D", "E", "G", "A", "B"])

// Answer buttons laid out piano-style: column = base letter (C..B -> 1..7),
// row 1 = sharps, row 2 = naturals, row 3 = flats.
const letterColumn: Record<Letter, number> = {
  C: 1,
  D: 2,
  E: 3,
  F: 4,
  G: 5,
  A: 6,
  B: 7,
}

export type AnswerOption = { name: string; column: number; row: 1 | 2 | 3 }

export const ANSWER_OPTIONS: readonly AnswerOption[] = buildAnswerOptions()

export function noteName(note: Note): string {
  return (
    note.letter +
    (note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : "")
  )
}

export function validAccidentals(letter: Letter): Accidental[] {
  const accidentals: Accidental[] = ["natural"]
  if (sharpLetters.has(letter)) accidentals.push("sharp")
  if (flatLetters.has(letter)) accidentals.push("flat")
  return accidentals
}

export function randomNote(
  clef: Clef,
  random: () => number = Math.random,
): Note {
  const slotList = STAFF_SLOTS[clef]
  const slot = slotList[Math.floor(random() * slotList.length)]
  const accidentals = validAccidentals(slot.letter)
  const accidental = accidentals[Math.floor(random() * accidentals.length)]
  return { letter: slot.letter, octave: slot.octave, accidental }
}

export function randomClef(
  setting: ClefSetting,
  random: () => number = Math.random,
): Clef {
  if (setting === "both") {
    return random() < 0.5 ? "treble" : "bass"
  }
  return setting
}

export function accidentalRow(accidental: Accidental): AnswerRow {
  return accidental === "sharp" ? 1 : accidental === "flat" ? 3 : 2
}

/**
 * Two answer rows to show: the naturals row plus the row that contains the
 * correct answer (a random accidental row when the note itself is natural).
 * The staff already reveals sharp vs flat, so this leaks nothing.
 */
export function visibleRows(
  note: Note,
  random: () => number = Math.random,
): Set<AnswerRow> {
  const rows = new Set<AnswerRow>([2])
  rows.add(
    note.accidental === "natural"
      ? random() < 0.5
        ? 1
        : 3
      : accidentalRow(note.accidental),
  )
  return rows
}

export function noteToAbc(note: Note): string {
  const prefix =
    note.accidental === "sharp" ? "^" : note.accidental === "flat" ? "_" : ""
  if (note.octave >= 5) {
    return prefix + note.letter.toLowerCase() + "'".repeat(note.octave - 5)
  }
  return prefix + note.letter + ",".repeat(4 - note.octave)
}

export function buildAbc(note: Note, clef: Clef): string {
  // M:none drops the time signature; L:1 makes a whole note matching the staff icon.
  return `X:1\nM:none\nL:1\nK:C clef=${clef}\n${noteToAbc(note)}`
}

export function accuracyPercent(correct: number, total: number): number {
  return total === 0 ? 100 : Math.round((correct / total) * 100)
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

function slots(
  octave: number,
  letters: Letter[],
): { letter: Letter; octave: number }[] {
  return letters.map((letter) => ({ letter, octave }))
}

function buildAnswerOptions(): AnswerOption[] {
  const naturals: Letter[] = ["C", "D", "E", "F", "G", "A", "B"]
  const options: AnswerOption[] = naturals.map((letter) => ({
    name: letter,
    column: letterColumn[letter],
    row: 2,
  }))

  for (const letter of naturals) {
    if (sharpLetters.has(letter))
      options.push({ name: `${letter}#`, column: letterColumn[letter], row: 1 })
    if (flatLetters.has(letter))
      options.push({ name: `${letter}b`, column: letterColumn[letter], row: 3 })
  }

  return options
}
