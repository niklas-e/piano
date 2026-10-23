import type { Point } from "./ink.ts"

export type Size = { width: number; height: number }

/** Pages that fill the screen together in full screen, left to right. */
export type PageView = { pages: readonly number[] }

/** One page at a time, or two side by side like an open book. */
export type PageLayout = "single" | "spread"

/** What a tap or swipe on the full screen pages asks for. */
export type StageAction = "back" | "forward" | "toggle-controls" | "none"

/** Taps on the left of the screen go back, and on the right go forward. */
const backZoneEnd = 0.3
/** Forward is wider than back since it's needed far more often. */
const forwardZoneStart = 0.6
/** Pointer movement up to this many CSS pixels still counts as a tap. */
const maxTapDistancePx = 10
const minSwipeDistancePx = 50
/** Space between the pages of a spread, in CSS pixels. */
export const SPREAD_GAP_PX = 8
/**
 * Two pages side by side are worth it when each is nearly as big as one page
 * alone would be. Portrait pages on a landscape screen usually are.
 */
const minSpreadScale = 0.85

export function chooseLayout(
  box: Size,
  aspectRatio: number,
  pageCount: number,
): PageLayout {
  if (pageCount < 2) {
    return "single"
  }

  const single = fitPageWidth(pageBox(box, "single"), aspectRatio)
  const spread = fitPageWidth(pageBox(box, "spread"), aspectRatio)
  return spread >= single * minSpreadScale ? "spread" : "single"
}

/** The room each page has in a layout. */
export function pageBox(box: Size, layout: PageLayout): Size {
  return layout === "spread"
    ? { width: (box.width - SPREAD_GAP_PX) / 2, height: box.height }
    : box
}

export function pageViews(pageCount: number, layout: PageLayout): PageView[] {
  const step = layout === "spread" ? 2 : 1
  return Array.from({ length: Math.ceil(pageCount / step) }, (_, index) => ({
    pages: Array.from(
      { length: Math.min(step, pageCount - index * step) },
      (_, offset) => index * step + offset,
    ),
  }))
}

/** The view that shows `page`, or the nearest one if the page is gone. */
export function viewIndexForPage(
  views: readonly PageView[],
  page: number,
): number {
  const index = views.findIndex((view) => view.pages.includes(page))
  return index === -1 ? Math.max(0, views.length - 1) : index
}

/** Like "3 / 8", or "3–4 / 8" when a view shows more than one page. */
export function viewLabel(view: PageView, pageCount: number): string {
  const first = view.pages[0] + 1
  const last = view.pages[view.pages.length - 1] + 1
  return `${first === last ? first : `${first}–${last}`} / ${pageCount}`
}

/** The widest a page can be while all of it fits in `box`. */
export function fitPageWidth(box: Size, aspectRatio: number): number {
  return Math.max(0, Math.floor(Math.min(box.width, box.height / aspectRatio)))
}

/**
 * Decides what a pointer that went down at `start` and up at `end` means,
 * with both in CSS pixels from the stage's top left corner.
 */
export function stageAction(
  start: Point,
  end: Point,
  stageWidth: number,
): StageAction {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (Math.hypot(dx, dy) <= maxTapDistancePx) {
    const position = end.x / stageWidth
    if (position < backZoneEnd) {
      return "back"
    }
    return position >= forwardZoneStart ? "forward" : "toggle-controls"
  }

  if (Math.abs(dx) >= minSwipeDistancePx && Math.abs(dx) > Math.abs(dy) * 1.5) {
    // Swiping left pulls the next page in, like turning a real one.
    return dx < 0 ? "forward" : "back"
  }

  return "none"
}
