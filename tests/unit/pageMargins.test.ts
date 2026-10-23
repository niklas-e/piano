import assert from "node:assert/strict"
import test from "node:test"
import {
  contentRegion,
  type PageRegion,
  type Pixels,
  regionAspectRatio,
  trimRegion,
  WHOLE_PAGE,
} from "../../src/common/pageMargins.ts"

type Rgba = [number, number, number, number]
const white: Rgba = [255, 255, 255, 255]
const black: Rgba = [0, 0, 0, 255]

/** A white 100 × 100 page with the given pixels painted. */
function page(paint: (x: number, y: number) => Rgba | undefined): Pixels {
  const width = 100
  const height = 100
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set(paint(x, y) ?? white, (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

const inBox =
  (left: number, top: number, right: number, bottom: number, colour = black) =>
  (x: number, y: number) =>
    x >= left && x < right && y >= top && y < bottom ? colour : undefined

test("the content region surrounds the ink on a page", () => {
  assert.deepEqual(contentRegion(page(inBox(10, 20, 90, 40))), {
    left: 0.1,
    top: 0.2,
    right: 0.9,
    bottom: 0.4,
  })
})

test("blank pages, grey paper and specks of dust have no content", () => {
  assert.equal(contentRegion(page(() => undefined)), undefined)
  assert.equal(
    contentRegion(page(inBox(0, 0, 100, 100, [200, 195, 185, 255]))),
    undefined,
  )
  assert.equal(contentRegion(page(inBox(50, 50, 51, 51))), undefined)
})

test("transparent pixels are paper", () => {
  assert.equal(
    contentRegion(page(inBox(0, 0, 100, 100, [0, 0, 0, 0]))),
    undefined,
  )
})

test("every page is trimmed alike, to all the music with room around it", () => {
  const first: PageRegion = { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 }
  const last: PageRegion = { left: 0.08, top: 0.1, right: 0.9, bottom: 0.4 }

  const region = trimRegion([first, undefined, last])
  assert.ok(Math.abs(region.left - 0.06) < 1e-9)
  assert.ok(Math.abs(region.top - 0.08) < 1e-9)
  assert.ok(Math.abs(region.right - 0.92) < 1e-9)
  assert.ok(Math.abs(region.bottom - 0.92) < 1e-9)

  assert.deepEqual(
    trimRegion([{ left: 0.01, top: 0, right: 1, bottom: 0.995 }]),
    WHOLE_PAGE,
  )
  assert.deepEqual(trimRegion([undefined]), WHOLE_PAGE)
})

test("a trimmed page is as tall, relative to its width, as the region", () => {
  assert.equal(regionAspectRatio(1.5, WHOLE_PAGE), 1.5)
  assert.equal(
    regionAspectRatio(1.5, { left: 0.25, top: 0, right: 0.75, bottom: 0.5 }),
    1.5,
  )
})
