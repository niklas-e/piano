export const INK_TOOLS = ["pen", "highlighter"] as const
export type InkTool = (typeof INK_TOOLS)[number]

/**
 * A free-hand stroke on one page.
 *
 * Coordinates are in page units: the page is exactly one unit wide, so x runs
 * from 0 to 1 and y from 0 to the page's height-to-width ratio. Measuring both
 * axes against the width keeps distances isotropic and independent of zoom.
 */
export type Stroke = {
  tool: InkTool
  color: string
  width: number
  /** Flat list of coordinates: x0, y0, x1, y1, … Always at least one point. */
  points: readonly number[]
}

/** Strokes for each page of a document, indexed by page. */
export type InkPages = readonly (readonly Stroke[])[]

export type PathCommand =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | { type: "quad"; cx: number; cy: number; x: number; y: number }

export type Point = { x: number; y: number }

/** Highlighter ink is translucent so the music underneath stays readable. */
export const HIGHLIGHTER_OPACITY = 0.35

const coordinatePrecision = 1e5

export function emptyInkPages(pageCount: number): InkPages {
  return Array.from({ length: pageCount }, () => [])
}

export function inkStrokeCount(pages: InkPages): number {
  return pages.reduce((count, strokes) => count + strokes.length, 0)
}

/**
 * Adds a sampled pointer position to a stroke, skipping positions that are
 * closer than `minDistance` to the previous one. Pointer events fire far more
 * often than the line visibly changes, so this keeps saved strokes small.
 */
export function appendPoint(
  points: readonly number[],
  point: Point,
  minDistance: number,
): readonly number[] {
  const x = roundCoordinate(point.x)
  const y = roundCoordinate(point.y)
  const length = points.length

  if (
    length >= 2 &&
    Math.hypot(x - points[length - 2], y - points[length - 1]) < minDistance
  ) {
    return points
  }

  return [...points, x, y]
}

/** True when the stroke never moved, so it should be drawn as a round dot. */
export function isDot(stroke: Stroke): boolean {
  const [x0, y0] = stroke.points
  for (let index = 2; index < stroke.points.length; index += 2) {
    if (stroke.points[index] !== x0 || stroke.points[index + 1] !== y0) {
      return false
    }
  }

  return true
}

/**
 * Turns sampled points into a smooth path by curving through the midpoints
 * between samples, with each sample acting as the control point. The same
 * path is drawn on screen and written into exported PDFs.
 */
export function strokePath(points: readonly number[]): PathCommand[] {
  const pointCount = points.length / 2
  const commands: PathCommand[] = [{ type: "move", x: points[0], y: points[1] }]

  if (pointCount === 1) {
    commands.push({ type: "line", x: points[0], y: points[1] })
    return commands
  }

  for (let index = 1; index < pointCount - 1; index += 1) {
    const cx = points[index * 2]
    const cy = points[index * 2 + 1]
    commands.push({
      type: "quad",
      cx,
      cy,
      x: (cx + points[index * 2 + 2]) / 2,
      y: (cy + points[index * 2 + 3]) / 2,
    })
  }

  commands.push({
    type: "line",
    x: points[points.length - 2],
    y: points[points.length - 1],
  })

  return commands
}

/**
 * Returns the strokes the eraser touches while moving from `from` to `to`.
 * The movement is sampled so that a quick swipe can't skip over a thin line.
 */
export function strokesTouchedByEraser(
  strokes: readonly Stroke[],
  from: Point,
  to: Point,
  radius: number,
): Stroke[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance / (radius / 2)))
  const samples = Array.from({ length: steps + 1 }, (_, step) => ({
    x: from.x + ((to.x - from.x) * step) / steps,
    y: from.y + ((to.y - from.y) * step) / steps,
  }))

  return strokes.filter((stroke) =>
    samples.some(
      (sample) => distanceToStroke(stroke, sample) <= radius + stroke.width / 2,
    ),
  )
}

export function distanceToStroke(stroke: Stroke, point: Point): number {
  const { points } = stroke
  let closest = Math.hypot(points[0] - point.x, points[1] - point.y)

  for (let index = 2; index < points.length; index += 2) {
    closest = Math.min(
      closest,
      distanceToSegment(
        point,
        { x: points[index - 2], y: points[index - 1] },
        { x: points[index], y: points[index + 1] },
      ),
    )
  }

  return closest
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              lengthSquared,
          ),
        )

  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

function roundCoordinate(value: number): number {
  return Math.round(value * coordinatePrecision) / coordinatePrecision
}

export function addStroke(
  pages: InkPages,
  pageIndex: number,
  stroke: Stroke,
): InkPages {
  return pages.map((strokes, index) =>
    index === pageIndex ? [...strokes, stroke] : strokes,
  )
}

export function removeStrokes(
  pages: InkPages,
  removed: ReadonlySet<Stroke>,
): InkPages {
  return pages.map((strokes) =>
    strokes.some((stroke) => removed.has(stroke))
      ? strokes.filter((stroke) => !removed.has(stroke))
      : strokes,
  )
}

export type InkHistory = {
  past: readonly InkPages[]
  present: InkPages
  future: readonly InkPages[]
}

const historyLimit = 200

export function createInkHistory(present: InkPages): InkHistory {
  return { past: [], present, future: [] }
}

/** Records an edit. Pages are immutable, so snapshots share unchanged pages. */
export function commitInk(history: InkHistory, next: InkPages): InkHistory {
  if (next === history.present) {
    return history
  }

  return {
    past: [...history.past, history.present].slice(-historyLimit),
    present: next,
    future: [],
  }
}

export function undoInk(history: InkHistory): InkHistory {
  const previous = history.past.at(-1)
  if (previous === undefined) {
    return history
  }

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redoInk(history: InkHistory): InkHistory {
  const [next, ...future] = history.future
  if (next === undefined) {
    return history
  }

  return {
    past: [...history.past, history.present],
    present: next,
    future,
  }
}

/**
 * Validates ink read back from storage, dropping anything malformed instead of
 * failing to open the document. The result always has exactly `pageCount`
 * pages.
 */
export function parseInkPages(value: unknown, pageCount: number): InkPages {
  const pages = Array.isArray(value) ? value : []

  return Array.from({ length: pageCount }, (_, index) => {
    const strokes: unknown = pages[index]
    return Array.isArray(strokes) ? strokes.filter(isStroke) : []
  })
}

function isStroke(value: unknown): value is Stroke {
  return (
    typeof value === "object" &&
    value !== null &&
    "tool" in value &&
    isInkTool(value.tool) &&
    "color" in value &&
    typeof value.color === "string" &&
    /^#[0-9a-f]{6}$/i.test(value.color) &&
    "width" in value &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    "points" in value &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length % 2 === 0 &&
    value.points.every(Number.isFinite)
  )
}

function isInkTool(value: unknown): value is InkTool {
  return INK_TOOLS.some((tool) => tool === value)
}
