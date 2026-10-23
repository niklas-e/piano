import assert from "node:assert/strict"
import test from "node:test"
import {
  chooseLayout,
  fitPageWidth,
  type PageView,
  pageBox,
  pageViews,
  placeOfView,
  stageAction,
  viewIndexForPlace,
  viewLabel,
} from "../../src/common/pageTurns.ts"

const a4 = 297 / 210

test("a whole page fits the screen, limited by whichever side is tighter", () => {
  // A4 on a portrait tablet is limited by the width…
  assert.equal(fitPageWidth({ width: 800, height: 1280 }, a4), 800)
  // …and on a landscape screen by the height.
  assert.equal(fitPageWidth({ width: 1280, height: 800 }, a4), 565)
})

test("portrait pages are shown in pairs on landscape screens only", () => {
  const portraitTablet = { width: 820, height: 1180 }
  const landscapeTablet = { width: 1180, height: 820 }
  const laptop = { width: 1440, height: 900 }

  assert.equal(chooseLayout(portraitTablet, a4, 8), "single")
  assert.equal(chooseLayout(landscapeTablet, a4, 8), "spread")
  assert.equal(chooseLayout(laptop, a4, 8), "spread")
  // A single page has nothing to pair with.
  assert.equal(chooseLayout(laptop, a4, 1), "single")
  // Landscape pages would shrink to half their size.
  assert.equal(chooseLayout(laptop, 0.7, 8), "single")
})

test("pages in a spread share the width, with a gap between them", () => {
  assert.deepEqual(pageBox({ width: 1208, height: 800 }, "spread"), {
    width: 600,
    height: 800,
  })
  assert.deepEqual(pageBox({ width: 1208, height: 800 }, "single"), {
    width: 1208,
    height: 800,
  })
})

const pages = (...list: number[]): PageView => ({ kind: "pages", pages: list })
const half = (page: number): PageView => ({
  kind: "half",
  page,
  next: page + 1,
})
const at = (page: number, halfway = false) => ({ page, halfway })

test("every page gets a view of its own, or shares one in pairs", () => {
  assert.deepEqual(pageViews(3, "single", false), [
    pages(0),
    pages(1),
    pages(2),
  ])
  assert.deepEqual(pageViews(5, "spread", false), [
    pages(0, 1),
    pages(2, 3),
    pages(4),
  ])
})

test("half-page turns stop halfway between pages, or move pairs by one", () => {
  assert.deepEqual(pageViews(3, "single", true), [
    pages(0),
    half(0),
    pages(1),
    half(1),
    pages(2),
  ])
  assert.deepEqual(pageViews(4, "spread", true), [
    pages(0, 1),
    pages(1, 2),
    pages(2, 3),
  ])
})

test("a place opens the view that starts with its page", () => {
  const spreads = pageViews(5, "spread", false)
  assert.equal(viewIndexForPlace(spreads, at(3)), 1)
  assert.equal(viewIndexForPlace(spreads, at(4)), 2)

  const sliding = pageViews(4, "spread", true)
  assert.equal(viewIndexForPlace(sliding, at(2)), 2)
  assert.equal(viewIndexForPlace(sliding, at(3)), 2)

  const halves = pageViews(3, "single", true)
  assert.equal(viewIndexForPlace(halves, at(1)), 2)
  assert.equal(viewIndexForPlace(halves, at(1, true)), 3)
  // The last page has no next one to be halfway to.
  assert.equal(viewIndexForPlace(halves, at(2, true)), 4)
  // Without half-page turns, halfway rounds back to the page.
  assert.equal(viewIndexForPlace(pageViews(3, "single", false), at(1, true)), 1)
  // A remembered page past the end opens the last view.
  assert.equal(viewIndexForPlace(halves, at(7)), 4)
})

test("turning to a view and back finds the same view", () => {
  for (const views of [
    pageViews(5, "single", true),
    pageViews(5, "spread", true),
    pageViews(5, "spread", false),
  ]) {
    views.forEach((view, index) => {
      assert.equal(viewIndexForPlace(views, placeOfView(view)), index)
    })
  }
})

test("view labels count pages from one", () => {
  assert.equal(viewLabel(pages(2), 8), "3 / 8")
  assert.equal(viewLabel(pages(2, 3), 8), "3–4 / 8")
  assert.equal(viewLabel(half(2), 8), "3–4 / 8")
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
