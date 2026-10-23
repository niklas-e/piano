import type { Point } from "./ink.ts"

export type Size = { width: number; height: number }

/**
 * What fills the screen in full screen: whole pages, left to right, or the
 * top half of the next page over the bottom half of this one, so the next
 * page can be read before this one is finished.
 */
export type PageView =
  | { kind: "pages"; pages: readonly number[] }
  | { kind: "half"; page: number; next: number }

/** Where the reader is: on a page, or halfway from it to the next. */
export type Place = { page: number; halfway: boolean }

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

/**
 * The views to turn through. With half-page turns, single pages turn half a
 * page at a time, and pairs one page at a time, so the page being finished
 * stays in sight either way.
 */
export function pageViews(
  pageCount: number,
  layout: PageLayout,
  halfPageTurns: boolean,
): PageView[] {
  const pages = (first: number, count: number): PageView => ({
    kind: "pages",
    pages: Array.from(
      { length: Math.min(count, pageCount - first) },
      (_, offset) => first + offset,
    ),
  })

  if (layout === "spread") {
    const step = halfPageTurns ? 1 : 2
    const count = halfPageTurns
      ? Math.max(1, pageCount - 1)
      : Math.ceil(pageCount / 2)
    return Array.from({ length: count }, (_, index) => pages(index * step, 2))
  }

  return Array.from({ length: pageCount }, (_, page): PageView[] =>
    halfPageTurns && page + 1 < pageCount
      ? [pages(page, 1), { kind: "half", page, next: page + 1 }]
      : [pages(page, 1)],
  ).flat()
}

export function viewPages(view: PageView): readonly number[] {
  switch (view.kind) {
    case "pages":
      return view.pages
    case "half":
      return [view.page, view.next]
    default: {
      const exhaustive: never = view
      throw new Error(`Unhandled page view: ${exhaustive}`)
    }
  }
}

export function placeOfView(view: PageView): Place {
  return view.kind === "half"
    ? { page: view.page, halfway: true }
    : { page: view.pages[0], halfway: false }
}

/**
 * The view for a place, preferring one that starts with its page. Places
 * from another layout land on the nearest view, and pages past the end on
 * the last one.
 */
export function viewIndexForPlace(
  views: readonly PageView[],
  place: Place,
): number {
  const starting = views.findIndex(
    (view) => view.kind === "pages" && view.pages[0] === place.page,
  )
  if (starting !== -1) {
    return place.halfway && views[starting + 1]?.kind === "half"
      ? starting + 1
      : starting
  }

  const showing = views.findIndex((view) =>
    viewPages(view).includes(place.page),
  )
  return showing === -1 ? Math.max(0, views.length - 1) : showing
}

/** Like "3 / 8", or "3–4 / 8" when a view shows more than one page. */
export function viewLabel(view: PageView, pageCount: number): string {
  const pages = viewPages(view)
  const first = pages[0] + 1
  const last = pages[pages.length - 1] + 1
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
