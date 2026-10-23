import assert from "node:assert/strict"
import test from "node:test"
import {
  applyMatrix,
  hexToRgb,
  type Matrix,
  pageUnitsToPdfMatrix,
  pdfPathOperations,
} from "../../src/common/pdfInk.ts"

function assertPointClose(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) {
  assert.ok(
    Math.abs(actual.x - expected.x) < 1e-9 &&
      Math.abs(actual.y - expected.y) < 1e-9,
    `expected (${expected.x}, ${expected.y}), got (${actual.x}, ${actual.y})`,
  )
}

test("page units map onto an upright A4 page with its origin at the bottom", () => {
  // PDF.js flips the y axis so that the top of the page is displayed first.
  const matrix = pageUnitsToPdfMatrix([1, 0, 0, -1, 0, 842], 595)

  assertPointClose(applyMatrix(matrix, 0, 0), { x: 0, y: 842 })
  assertPointClose(applyMatrix(matrix, 1, 842 / 595), { x: 595, y: 0 })
  assertPointClose(applyMatrix(matrix, 0.5, 0.1), { x: 297.5, y: 842 - 59.5 })
})

test("page units land where they were drawn on rotated and cropped pages", () => {
  // A page rotated by 90° whose crop box doesn't start at the origin.
  const viewportTransform: Matrix = [0, 1, 1, 0, -30, -20]
  const displayedWidth = 842
  const matrix = pageUnitsToPdfMatrix(viewportTransform, displayedWidth)

  for (const [x, y] of [
    [0, 0],
    [1, 0.7],
    [0.25, 0.4],
  ]) {
    const pdfPoint = applyMatrix(matrix, x, y)
    assertPointClose(applyMatrix(viewportTransform, pdfPoint.x, pdfPoint.y), {
      x: x * displayedWidth,
      y: y * displayedWidth,
    })
  }
})

test("quadratic curves become cubic curves with the same shape", () => {
  assert.deepEqual(pdfPathOperations([0, 0, 3, 0, 3, 3, 6, 3]), [
    { op: "move", x: 0, y: 0 },
    { op: "curve", x1: 2, y1: 0, x2: 3, y2: 0.5, x: 3, y: 1.5 },
    { op: "curve", x1: 3, y1: 2.5, x2: 3.5, y2: 3, x: 4.5, y: 3 },
    { op: "line", x: 6, y: 3 },
  ])
})

test("hex colours split into 0–1 channels", () => {
  assert.deepEqual(hexToRgb("#ff8000"), { r: 1, g: 128 / 255, b: 0 })
})
