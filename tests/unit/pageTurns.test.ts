import assert from "node:assert/strict"
import test from "node:test"
import {
  fitPageWidth,
  pageViews,
  stageAction,
  viewIndexForPage,
  viewLabel,
} from "../../src/common/pageTurns.ts"

const a4 = 297 / 210

test("a whole page fits the screen, limited by whichever side is tighter", () => {
  // A4 on a portrait tablet is limited by the width…
  assert.equal(fitPageWidth({ width: 800, height: 1280 }, a4), 800)
  // …and on a landscape screen by the height.
  assert.equal(fitPageWidth({ width: 1280, height: 800 }, a4), 565)
})

test("every page gets a view of its own", () => {
  assert.deepEqual(pageViews(3), [
    { pages: [0] },
    { pages: [1] },
    { pages: [2] },
  ])
})

test("a remembered page past the end opens the last view", () => {
  const views = pageViews(3)

  assert.equal(viewIndexForPage(views, 1), 1)
  assert.equal(viewIndexForPage(views, 7), 2)
})

test("view labels count pages from one", () => {
  assert.equal(viewLabel({ pages: [2] }, 8), "3 / 8")
  assert.equal(viewLabel({ pages: [2, 3] }, 8), "3–4 / 8")
})

test("taps go back on the left, forward on the right, and show controls in between", () => {
  const tap = (x: number) => stageAction({ x, y: 300 }, { x, y: 300 }, 1000)

  assert.equal(tap(100), "back")
  assert.equal(tap(450), "toggle-controls")
  assert.equal(tap(700), "forward")
  // A slightly shaky tap is still a tap.
  assert.equal(
    stageAction({ x: 700, y: 300 }, { x: 706, y: 305 }, 1000),
    "forward",
  )
})

test("swiping left turns forward and swiping right turns back", () => {
  assert.equal(
    stageAction({ x: 600, y: 300 }, { x: 400, y: 320 }, 1000),
    "forward",
  )
  assert.equal(
    stageAction({ x: 400, y: 300 }, { x: 600, y: 280 }, 1000),
    "back",
  )
})

test("short or mostly vertical drags do nothing", () => {
  assert.equal(
    stageAction({ x: 500, y: 300 }, { x: 470, y: 300 }, 1000),
    "none",
  )
  assert.equal(
    stageAction({ x: 500, y: 300 }, { x: 420, y: 500 }, 1000),
    "none",
  )
})
