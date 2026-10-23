import type { Point } from "./ink.ts"

export type Size = { width: number; height: number }

/** Pages that fill the screen together in full screen, left to right. */
export type PageView = { pages: readonly number[] }

/** What a tap or swipe on the full screen pages asks for. */
export type StageAction = "back" | "forward" | "toggle-controls" | "none"

/** Taps on the left of the screen go back, and on the right go forward. */
const backZoneEnd = 0.3
/** Forward is wider than back since it's needed far more often. */
const forwardZoneStart = 0.6
/** Pointer movement up to this many CSS pixels still counts as a tap. */
const maxTapDistancePx = 10
const minSwipeDistancePx = 50

export function pageViews(pageCount: number): PageView[] {
  return Array.from({ length: pageCount }, (_, page) => ({ pages: [page] }))
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
