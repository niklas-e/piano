import assert from "node:assert/strict";
import test from "node:test";
import { buildPianoKeyboard, isHighlightedKey } from "../../src/common/keyboard.ts";

test("isHighlightedKey matches exact keyboard key ids", () => {
  const keys = buildPianoKeyboard();
  const cKey = keys.find((key) => key.id === "C4");
  const dKey = keys.find((key) => key.id === "D4");
  const cSharpKey = keys.find((key) => key.id === "C#4");

  assert.equal(cKey ? isHighlightedKey(cKey, ["C4", "E4", "G4", "C5"]) : false, true);
  assert.equal(dKey ? isHighlightedKey(dKey, ["C4", "E4", "G4", "C5"]) : true, false);
  assert.equal(cSharpKey ? isHighlightedKey(cSharpKey, ["C4", "E4", "G4", "C5"]) : true, false);
});

test("buildPianoKeyboard spans the standard 88-key range A0 to C8", () => {
  const keys = buildPianoKeyboard();

  assert.equal(keys.length, 88);
  assert.deepEqual(keys[0], { note: "A", octave: 0, type: "white", id: "A0" });
  assert.deepEqual(keys[1], { note: "A#", octave: 0, type: "black", id: "A#0" });
  assert.deepEqual(keys[2], { note: "B", octave: 0, type: "white", id: "B0" });
  assert.deepEqual(keys.at(-1), { note: "C", octave: 8, type: "white", id: "C8" });

  const whiteCount = keys.filter((key) => key.type === "white").length;
  const blackCount = keys.filter((key) => key.type === "black").length;
  assert.equal(whiteCount, 52);
  assert.equal(blackCount, 36);

  // Octaves 1-7 are full chromatic octaves; octave 8 is only C8.
  assert.ok(keys.some((key) => key.id === "C1"));
  assert.ok(keys.some((key) => key.id === "B7"));
  assert.equal(keys.filter((key) => key.octave === 8).length, 1);
});
