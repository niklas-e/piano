import assert from "node:assert/strict"
import test from "node:test"
import {
  addStroke,
  appendPoint,
  commitInk,
  createInkHistory,
  distanceToStroke,
  emptyInkPages,
  inkStrokeCount,
  isDot,
  parseInkPages,
  redoInk,
  removeStrokes,
  type Stroke,
  strokePath,
  strokeSvgPath,
  strokesByLayer,
  strokesTouchedByEraser,
  undoInk,
} from "../../src/common/ink.ts"

function stroke(points: number[], width = 0.01): Stroke {
  return { tool: "pen", color: "#17130f", width, points }
}

test("points closer than the minimum distance are skipped", () => {
  let points = appendPoint([], { x: 0.1, y: 0.1 }, 0.01)
  points = appendPoint(points, { x: 0.105, y: 0.1 }, 0.01)
  points = appendPoint(points, { x: 0.12, y: 0.1 }, 0.01)

  assert.deepEqual(points, [0.1, 0.1, 0.12, 0.1])
})

test("points are rounded so saved strokes stay compact", () => {
  assert.deepEqual(
    appendPoint([], { x: 1 / 3, y: 2 / 3 }, 0),
    [0.33333, 0.66667],
  )
})

test("a stroke that never moved is a dot", () => {
  assert.equal(isDot(stroke([0.2, 0.3])), true)
  assert.equal(isDot(stroke([0.2, 0.3, 0.2, 0.3])), true)
  assert.equal(isDot(stroke([0.2, 0.3, 0.2, 0.31])), false)
})

test("a single point becomes a zero-length line", () => {
  assert.deepEqual(strokePath([0.5, 0.5]), [
    { type: "move", x: 0.5, y: 0.5 },
    { type: "line", x: 0.5, y: 0.5 },
  ])
})

test("two points become a straight line", () => {
  assert.deepEqual(strokePath([0, 0, 1, 1]), [
    { type: "move", x: 0, y: 0 },
    { type: "line", x: 1, y: 1 },
  ])
})

test("inner points become curve control points through the midpoints", () => {
  assert.deepEqual(strokePath([0, 0, 1, 0, 1, 1, 2, 1]), [
    { type: "move", x: 0, y: 0 },
    { type: "quad", cx: 1, cy: 0, x: 1, y: 0.5 },
    { type: "quad", cx: 1, cy: 1, x: 1.5, y: 1 },
    { type: "line", x: 2, y: 1 },
  ])
})

test("strokes become SVG path data", () => {
  assert.equal(strokeSvgPath([0, 0, 1, 0, 2, 1]), "M0 0Q1 0 1.5 0.5L2 1")
  assert.equal(strokeSvgPath([0.5, 0.5]), "M0.5 0.5L0.5 0.5")
})

test("distance to a stroke is measured to its closest segment", () => {
  const line = stroke([0, 0, 1, 0])

  assert.equal(distanceToStroke(line, { x: 0.5, y: 0.25 }), 0.25)
  assert.equal(distanceToStroke(line, { x: 1.3, y: 0.4 }), 0.5)
  assert.equal(distanceToStroke(stroke([0.5, 0.5]), { x: 0.5, y: 0.75 }), 0.25)
})

test("the eraser touches strokes within its radius plus half the line width", () => {
  const near = stroke([0, 0.1, 1, 0.1], 0.02)
  const far = stroke([0, 0.5, 1, 0.5], 0.02)

  assert.deepEqual(
    strokesTouchedByEraser(
      [near, far],
      { x: 0.5, y: 0.125 },
      { x: 0.5, y: 0.125 },
      0.02,
    ),
    [near],
  )
})

test("a fast eraser swipe still catches lines it crossed between samples", () => {
  const vertical = stroke([0.5, 0, 0.5, 1], 0.002)

  assert.deepEqual(
    strokesTouchedByEraser(
      [vertical],
      { x: 0.1, y: 0.5 },
      { x: 0.9, y: 0.5 },
      0.01,
    ),
    [vertical],
  )
})

test("highlighter strokes are layered beneath pen strokes in drawing order", () => {
  const firstPen = stroke([0.1, 0.1])
  const highlight: Stroke = { ...stroke([0.2, 0.2]), tool: "highlighter" }
  const secondPen = stroke([0.3, 0.3])

  assert.deepEqual(strokesByLayer([firstPen, highlight, secondPen]), {
    highlighter: [highlight],
    pen: [firstPen, secondPen],
  })
})

test("adding and removing strokes leaves other pages untouched", () => {
  const pages = emptyInkPages(3)
  const first = stroke([0.1, 0.1])
  const second = stroke([0.2, 0.2])

  const added = addStroke(addStroke(pages, 1, first), 1, second)
  assert.equal(added[0], pages[0])
  assert.equal(added[2], pages[2])
  assert.deepEqual(added[1], [first, second])
  assert.equal(inkStrokeCount(added), 2)

  const removed = removeStrokes(added, new Set([first]))
  assert.deepEqual(removed[1], [second])
  assert.equal(removed[0], pages[0])
})

test("undo and redo walk through committed edits", () => {
  const empty = emptyInkPages(1)
  const once = addStroke(empty, 0, stroke([0.1, 0.1]))
  const twice = addStroke(once, 0, stroke([0.2, 0.2]))

  let history = commitInk(commitInk(createInkHistory(empty), once), twice)
  assert.equal(history.present, twice)

  history = undoInk(undoInk(history))
  assert.equal(history.present, empty)
  assert.equal(undoInk(history), history)

  history = redoInk(history)
  assert.equal(history.present, once)

  const branched = commitInk(history, empty)
  assert.deepEqual(branched.future, [])
  assert.equal(redoInk(branched), branched)
})

test("committing unchanged pages does not add an undo step", () => {
  const history = createInkHistory(emptyInkPages(1))

  assert.equal(commitInk(history, history.present), history)
})

test("stored ink is matched to the page count and malformed strokes dropped", () => {
  const valid = stroke([0.1, 0.2, 0.3, 0.4])
  const parsed = parseInkPages(
    [
      [
        valid,
        { ...valid, tool: "laser" },
        { ...valid, color: "red" },
        { ...valid, width: -1 },
        { ...valid, points: [0.1] },
        { ...valid, points: [0.1, Number.NaN] },
        null,
      ],
      "not a page",
      [valid],
    ],
    2,
  )

  assert.deepEqual(parsed, [[valid], []])
  assert.deepEqual(parseInkPages(undefined, 2), [[], []])
})
