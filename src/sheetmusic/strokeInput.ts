import { createSignal } from "solid-js"
import { ERASER_RADIUS_PX, MIN_POINT_DISTANCE_PX } from "../common/drawingTools"
import {
  addStroke,
  appendPoint,
  type InkPages,
  type Point,
  removeStrokes,
  type Stroke,
  strokesTouchedByEraser,
} from "../common/ink"

/** How a new stroke looks: everything but where it goes. */
export type StrokeStyle = Omit<Stroke, "points">

type StrokeGesture =
  | {
      type: "draw"
      pointerId: number
      pageIndex: number
      page: HTMLElement
      stroke: Stroke
    }
  | {
      type: "erase"
      pointerId: number
      pageIndex: number
      page: HTMLElement
      last: Point
    }

/**
 * Draws or erases on a page while one pointer moves across it. The stroke
 * being drawn and the strokes being erased are only shown until the pointer
 * lifts, when the change is handed to `commit`.
 */
export function createStrokeInput(options: {
  /** The strokes on each page now, for the eraser to find. */
  ink: () => InkPages
  commit: (change: (pages: InkPages) => InkPages) => void
}) {
  let gesture: StrokeGesture | undefined
  const [draft, setDraft] = createSignal<{
    pageIndex: number
    stroke: Stroke
  }>()
  const [erased, setErased] = createSignal<ReadonlySet<Stroke>>(new Set())

  const cancel = () => {
    gesture = undefined
    setDraft(undefined)
    setErased(new Set<Stroke>())
  }

  const finish = () => {
    if (gesture?.type === "draw") {
      const { pageIndex, stroke } = gesture
      options.commit((pages) => addStroke(pages, pageIndex, stroke))
    } else if (gesture?.type === "erase" && erased().size > 0) {
      const removed = erased()
      options.commit((pages) => removeStrokes(pages, removed))
    }

    cancel()
  }

  const eraseAlong = (from: Point, to: Point, page: HTMLElement) => {
    if (gesture?.type !== "erase") {
      return
    }

    const alreadyErased = erased()
    const candidates = options
      .ink()
      [gesture.pageIndex].filter((stroke) => !alreadyErased.has(stroke))
    const radius = ERASER_RADIUS_PX / page.getBoundingClientRect().width
    const touched = strokesTouchedByEraser(candidates, from, to, radius)
    if (touched.length > 0) {
      setErased(new Set([...alreadyErased, ...touched]))
    }
  }

  return {
    draft,
    erased,
    cancel,

    /** Whether a stroke or an erasure is under way. */
    isActive: () => gesture !== undefined,

    /** Starts a stroke in `style`, or erasing, on `page` under the pointer. */
    start(
      event: PointerEvent,
      page: HTMLElement,
      style: StrokeStyle | "eraser",
    ) {
      const pageIndex = Number(page.dataset.pageIndex)
      const point = pagePoint(event, page)

      if (style === "eraser") {
        gesture = {
          type: "erase",
          pointerId: event.pointerId,
          pageIndex,
          page,
          last: point,
        }
        eraseAlong(point, point, page)
        return
      }

      const stroke: Stroke = { ...style, points: appendPoint([], point, 0) }
      gesture = {
        type: "draw",
        pointerId: event.pointerId,
        pageIndex,
        page,
        stroke,
      }
      setDraft({ pageIndex, stroke })
    },

    move(event: PointerEvent) {
      if (gesture?.pointerId !== event.pointerId) {
        return
      }

      const { page } = gesture
      const samples = event.getCoalescedEvents?.() ?? []
      const events = samples.length > 0 ? samples : [event]

      if (gesture.type === "erase") {
        for (const sample of events) {
          const point = pagePoint(sample, page)
          eraseAlong(gesture.last, point, page)
          gesture = { ...gesture, last: point }
        }
        return
      }

      const minDistance =
        MIN_POINT_DISTANCE_PX / page.getBoundingClientRect().width
      let { points } = gesture.stroke
      for (const sample of events) {
        points = appendPoint(points, pagePoint(sample, page), minDistance)
      }

      if (points !== gesture.stroke.points) {
        const stroke = { ...gesture.stroke, points }
        gesture = { ...gesture, stroke }
        setDraft({ pageIndex: gesture.pageIndex, stroke })
      }
    },

    /** Ends the gesture if `event` is its pointer lifting or giving up. */
    end(event: PointerEvent, isCancelled: boolean) {
      if (gesture?.pointerId !== event.pointerId) {
        return
      }

      isCancelled && gesture.type === "draw" ? cancel() : finish()
    },
  }
}

function pagePoint(event: PointerEvent, page: HTMLElement): Point {
  const rect = page.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.width,
  }
}
