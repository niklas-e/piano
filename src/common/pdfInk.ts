import { strokePath } from "./ink.ts"

/** An affine transform in PDF order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [number, number, number, number, number, number]

export type PdfPathOperation =
  | { op: "move"; x: number; y: number }
  | { op: "line"; x: number; y: number }
  | {
      op: "curve"
      x1: number
      y1: number
      x2: number
      y2: number
      x: number
      y: number
    }

/**
 * Returns the matrix that maps page units onto a PDF page's own coordinate
 * space, so ink can be written into the page exactly where it was drawn.
 *
 * `viewportTransform` is PDF.js's viewport transform at scale 1, which maps
 * the page's coordinate space to what is displayed, after the page's rotation
 * and crop box are applied. Page units are displayed coordinates divided by
 * the displayed width.
 */
export function pageUnitsToPdfMatrix(
  viewportTransform: readonly number[],
  viewportWidth: number,
): Matrix {
  const [a, b, c, d, e, f] = viewportTransform
  const determinant = a * d - b * c
  const inverse: Matrix = [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ]

  return [
    inverse[0] * viewportWidth,
    inverse[1] * viewportWidth,
    inverse[2] * viewportWidth,
    inverse[3] * viewportWidth,
    inverse[4],
    inverse[5],
  ]
}

export function applyMatrix(
  [a, b, c, d, e, f]: Matrix,
  x: number,
  y: number,
): { x: number; y: number } {
  return { x: a * x + c * y + e, y: b * x + d * y + f }
}

/**
 * The stroke's path in PDF terms. PDF paths have no quadratic curves, so each
 * one becomes the cubic curve with the same shape.
 */
export function pdfPathOperations(
  points: readonly number[],
): PdfPathOperation[] {
  let currentX = 0
  let currentY = 0

  return strokePath(points).map((command): PdfPathOperation => {
    switch (command.type) {
      case "move":
      case "line": {
        currentX = command.x
        currentY = command.y
        return { op: command.type, x: command.x, y: command.y }
      }
      case "quad": {
        const operation: PdfPathOperation = {
          op: "curve",
          x1: currentX + (2 / 3) * (command.cx - currentX),
          y1: currentY + (2 / 3) * (command.cy - currentY),
          x2: command.x + (2 / 3) * (command.cx - command.x),
          y2: command.y + (2 / 3) * (command.cy - command.y),
          x: command.x,
          y: command.y,
        }
        currentX = command.x
        currentY = command.y
        return operation
      }
      default: {
        const exhaustive: never = command
        throw new Error(`Unhandled path command: ${exhaustive}`)
      }
    }
  })
}

/** Splits a #rrggbb colour into 0–1 channels. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16)
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  }
}
