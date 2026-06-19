import assert from "node:assert/strict";
import test from "node:test";
import { buildKeyboard, isHighlightedKey } from "../../src/keyboard.ts";

test("buildKeyboard creates complete octave ranges", () => {
  const keys = buildKeyboard(3, 4);

  assert.equal(keys.length, 24);
  assert.deepEqual(keys[0], { note: "C", octave: 3, type: "white", id: "C3" });
  assert.deepEqual(keys[1], { note: "C#", octave: 3, type: "black", id: "C#3" });
  assert.deepEqual(keys.at(-1), { note: "B", octave: 4, type: "white", id: "B4" });
});

test("isHighlightedKey matches exercise pitch classes", () => {
  const keys = buildKeyboard(4, 4);
  const cKey = keys.find((key) => key.id === "C4");
  const cSharpKey = keys.find((key) => key.id === "C#4");

  assert.equal(cKey ? isHighlightedKey(cKey, ["C", "E", "G", "C"]) : false, true);
  assert.equal(cSharpKey ? isHighlightedKey(cSharpKey, ["C", "E", "G", "C"]) : true, false);
});
