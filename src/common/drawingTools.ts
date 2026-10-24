import type { InkTool } from "./ink.ts"

export type DrawingTool = "scroll" | InkTool | "eraser"

export type InkColor = { value: string; label: string }

export const INK_COLORS: Record<InkTool, readonly InkColor[]> = {
  pen: [
    { value: "#17130f", label: "Black" },
    { value: "#c62f2f", label: "Red" },
    { value: "#1f5fbf", label: "Blue" },
    { value: "#2f7d3a", label: "Green" },
  ],
  highlighter: [
    { value: "#ffd400", label: "Yellow" },
    { value: "#7ed957", label: "Green" },
    { value: "#ff7eb6", label: "Pink" },
    { value: "#5cc8ff", label: "Blue" },
  ],
}

export const LINE_WIDTH_OPTIONS = [
  { name: "fine", label: "Fine", dotSize: 4 },
  { name: "medium", label: "Medium", dotSize: 8 },
  { name: "bold", label: "Bold", dotSize: 12 },
] as const
export type LineWidthName = (typeof LINE_WIDTH_OPTIONS)[number]["name"]
export const DEFAULT_LINE_WIDTH: LineWidthName = "fine"

/** Line widths in page units, where the page is one unit wide. */
export const LINE_WIDTHS: Record<InkTool, Record<LineWidthName, number>> = {
  pen: { fine: 0.0018, medium: 0.003, bold: 0.0055 },
  highlighter: { fine: 0.012, medium: 0.02, bold: 0.032 },
}

/** Eraser reach in CSS pixels, so it feels the same at any zoom level. */
export const ERASER_RADIUS_PX = 10

/** Pointer movement below this many CSS pixels doesn't add a new point. */
export const MIN_POINT_DISTANCE_PX = 0.75

export const ZOOM_LEVELS: readonly number[] = [
  0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3,
]

/** Widest a page gets at 100%, so scores don't become huge on big screens. */
export const MAX_FIT_WIDTH_PX = 1000
