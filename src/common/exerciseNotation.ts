import { NOTE_NAMES, type NoteName } from "./exercises.ts"
import { type Clef, type Letter, noteToAbc } from "./sightReading.ts"

/**
 * Turns an ascending note sequence (a scale or arpeggio) into an abcjs tune,
 * with the note names rendered underneath as lyrics — abcjs has no built-in
 * way to label noteheads, so the `w:` lyric line is the lightest way to do it.
 *
 * Exercise notes are pitch classes without octaves, so we walk the sequence and
 * bump the octave whenever the next pitch class isn't higher than the last one
 * (the only spellings used are sharps, matching the exercise data). `baseOctave`
 * and `clef` follow the hand: right hand reads treble from C4, left reads bass
 * from C3, matching the keyboard range shown alongside.
 */
export function sequenceToAbc(
  notes: readonly NoteName[],
  clef: Clef = "treble",
  baseOctave = 4,
): string {
  let octave = baseOctave
  let prevPitchClass = -1
  const tokens = notes.map((name) => {
    const pitchClass = NOTE_NAMES.indexOf(name)
    if (prevPitchClass !== -1 && pitchClass <= prevPitchClass) octave += 1
    prevPitchClass = pitchClass
    return noteToAbc({
      letter: name[0] as Letter,
      octave,
      accidental: name.length > 1 ? "sharp" : "natural",
    })
  })
  // L:1/4 keeps the noteheads compact; M:none drops the time signature.
  return `X:1\nM:none\nL:1/4\nK:C clef=${clef}\n${tokens.join(" ")}\nw: ${notes.join(" ")}`
}
