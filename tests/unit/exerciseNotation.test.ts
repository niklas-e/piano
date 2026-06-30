import assert from "node:assert/strict"
import test from "node:test"
import { sequenceToAbc } from "../../src/common/exerciseNotation.ts"

test("sequenceToAbc ascends octaves and renders note names as lyrics", () => {
  const abc = sequenceToAbc(["C", "D", "E", "F", "G", "A", "B", "C"])
  // Tonic returns an octave up: first C is middle (C), the closing C is lowercase.
  assert.match(abc, /\nC D E F G A B c\n/)
  assert.match(abc, /w: C D E F G A B C/)
  assert.match(abc, /K:C clef=treble/)
})

test("sequenceToAbc marks sharps and keeps them in the lyrics", () => {
  const abc = sequenceToAbc(["A", "C#", "E", "A"])
  // A4 then up: ^c and e are octave 5, closing a is the octave above the tonic.
  assert.match(abc, /\nA \^c e a\n/)
  assert.match(abc, /w: A C# E A/)
})

test("sequenceToAbc honours clef and base octave for the left hand", () => {
  const abc = sequenceToAbc(["C", "D", "E", "F", "G", "A", "B", "C"], "bass", 3)
  assert.match(abc, /K:C clef=bass/)
  // From C3: the run sits an octave lower than the right-hand default.
  assert.match(abc, /\nC, D, E, F, G, A, B, C\n/)
})
