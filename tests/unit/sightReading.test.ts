import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_OPTIONS,
  STAFF_SLOTS,
  accuracyPercent,
  buildAbc,
  formatClock,
  noteName,
  noteToAbc,
  randomNote,
  validAccidentals,
  type Note
} from "../../src/common/sightReading.ts";

test("noteName renders accidentals as # and b", () => {
  assert.equal(noteName({ letter: "C", octave: 4, accidental: "natural" }), "C");
  assert.equal(noteName({ letter: "F", octave: 4, accidental: "sharp" }), "F#");
  assert.equal(noteName({ letter: "B", octave: 4, accidental: "flat" }), "Bb");
});

test("only standard enharmonic spellings are offered", () => {
  assert.deepEqual(validAccidentals("E"), ["natural", "flat"]);
  assert.deepEqual(validAccidentals("B"), ["natural", "flat"]);
  assert.deepEqual(validAccidentals("C"), ["natural", "sharp"]);
  assert.deepEqual(validAccidentals("F"), ["natural", "sharp"]);
  assert.deepEqual(validAccidentals("G"), ["natural", "sharp", "flat"]);
});

test("noteToAbc encodes octaves with commas and apostrophes", () => {
  assert.equal(noteToAbc({ letter: "C", octave: 4, accidental: "natural" }), "C");
  assert.equal(noteToAbc({ letter: "C", octave: 5, accidental: "natural" }), "c");
  assert.equal(noteToAbc({ letter: "C", octave: 3, accidental: "natural" }), "C,");
  assert.equal(noteToAbc({ letter: "E", octave: 2, accidental: "natural" }), "E,,");
  assert.equal(noteToAbc({ letter: "F", octave: 5, accidental: "sharp" }), "^f");
  assert.equal(noteToAbc({ letter: "B", octave: 3, accidental: "flat" }), "_B,");
});

test("buildAbc drops the meter and uses the requested clef", () => {
  const abc = buildAbc({ letter: "F", octave: 4, accidental: "sharp" }, "bass");
  assert.match(abc, /M:none/);
  assert.match(abc, /K:C clef=bass/);
  assert.match(abc, /\^F$/);
});

test("randomNote stays within the clef's slots and valid spellings", () => {
  let seed = 0;
  const sequence = [0, 0.2, 0.4, 0.6, 0.8, 0.99, 0.5, 0.1, 0.7, 0.35];
  const random = () => sequence[seed++ % sequence.length];

  for (let i = 0; i < 50; i += 1) {
    const note: Note = randomNote("treble", random);
    const slotExists = STAFF_SLOTS.treble.some((slot) => slot.letter === note.letter && slot.octave === note.octave);
    assert.ok(slotExists, `slot ${note.letter}${note.octave} should exist`);
    assert.ok(validAccidentals(note.letter).includes(note.accidental));
  }
});

test("answer options cover every generated note name", () => {
  const names = new Set(ANSWER_OPTIONS.map((option) => option.name));
  for (const clef of ["treble", "bass"] as const) {
    for (const slot of STAFF_SLOTS[clef]) {
      for (const accidental of validAccidentals(slot.letter)) {
        assert.ok(names.has(noteName({ ...slot, accidental })), `${slot.letter}${accidental} must be answerable`);
      }
    }
  }
});

test("answer options have 7 naturals, 5 sharps, 5 flats", () => {
  assert.equal(ANSWER_OPTIONS.filter((option) => option.row === 2).length, 7);
  assert.equal(ANSWER_OPTIONS.filter((option) => option.row === 1).length, 5);
  assert.equal(ANSWER_OPTIONS.filter((option) => option.row === 3).length, 5);
});

test("accuracyPercent reports 100 when nothing answered", () => {
  assert.equal(accuracyPercent(0, 0), 100);
  assert.equal(accuracyPercent(3, 4), 75);
});

test("formatClock pads minutes and seconds", () => {
  assert.equal(formatClock(16), "00:16");
  assert.equal(formatClock(75), "01:15");
  assert.equal(formatClock(-5), "00:00");
});
