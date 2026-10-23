import {
  HIGHLIGHTER_OPACITY,
  type InkPages,
  isDot,
  type Stroke,
  strokePath,
  strokesByLayer,
} from "./ink"
import type { PDFDocumentProxy } from "./pdf"
import { renderPdfPage } from "./pdf"
import { hexToRgb, pageUnitsToPdfMatrix, pdfPathOperations } from "./pdfInk"
import { loadImage } from "./sheetImport"
import type { SheetRecord } from "./sheetMusicLibrary"

// Browsers, iOS Safari in particular, refuse to encode larger canvases.
const maxExportPixels = 16_000_000
// Resolution for PDF pages that have to be flattened into images.
const rasterDpi = 200
const keptImageTypes = new Set(["image/png", "image/jpeg", "image/webp"])

/** Produces a copy of the sheet with its drawings, ready to save or share. */
export async function exportAnnotatedSheet(
  record: SheetRecord,
  file: Blob,
  ink: InkPages,
  pdf: PDFDocumentProxy | undefined,
): Promise<File> {
  if (pdf) {
    const bytes = await writeInkIntoPdf(file, ink, pdf).catch(() =>
      // Encrypted or unusually built PDFs can't be edited in place, so their
      // pages are flattened into images instead.
      flattenPdf(ink, pdf),
    )
    // pdf-lib types its output loosely enough to include shared memory.
    return new File([new Uint8Array(bytes)], exportFileName(record, "pdf"), {
      type: "application/pdf",
    })
  }

  const type = keptImageTypes.has(record.mimeType)
    ? record.mimeType
    : "image/png"
  const blob = await drawInkOnImage(file, ink[0], type)
  return new File([blob], exportFileName(record, extensionFor(blob.type)), {
    type: blob.type,
  })
}

/** Adds the ink to the original PDF as vector paths, keeping everything else. */
async function writeInkIntoPdf(
  file: Blob,
  ink: InkPages,
  pdf: PDFDocumentProxy,
): Promise<Uint8Array> {
  const lib = await import("@cantoo/pdf-lib")
  const document = await lib.PDFDocument.load(await file.arrayBuffer(), {
    updateMetadata: false,
  })
  const pages = document.getPages()
  if (pages.length !== ink.length) {
    throw new Error("Page count doesn't match")
  }

  for (const [index, strokes] of ink.entries()) {
    if (strokes.length === 0) {
      continue
    }

    const viewport = (await pdf.getPage(index + 1)).getViewport({ scale: 1 })
    const [a, b, c, d, e, f] = pageUnitsToPdfMatrix(
      viewport.transform,
      viewport.width,
    )
    const page = pages[index]
    const layers = strokesByLayer(strokes)
    const strokeOperators = (stroke: Stroke) => {
      const { r, g, b: blue } = hexToRgb(stroke.color)
      return [
        lib.setStrokingRgbColor(r, g, blue),
        lib.setLineWidth(stroke.width),
        ...pdfPathOperations(stroke.points).map((operation) => {
          switch (operation.op) {
            case "move":
              return lib.moveTo(operation.x, operation.y)
            case "line":
              return lib.lineTo(operation.x, operation.y)
            case "curve":
              return lib.appendBezierCurve(
                operation.x1,
                operation.y1,
                operation.x2,
                operation.y2,
                operation.x,
                operation.y,
              )
            default: {
              const exhaustive: never = operation
              throw new Error(`Unhandled path operation: ${exhaustive}`)
            }
          }
        }),
        lib.stroke(),
      ]
    }

    const operators = [
      lib.pushGraphicsState(),
      lib.concatTransformationMatrix(a, b, c, d, e, f),
      lib.setLineCap(lib.LineCapStyle.Round),
      lib.setLineJoin(lib.LineJoinStyle.Round),
    ]

    if (layers.highlighter.length > 0) {
      const highlighterState = page.node.newExtGState(
        "Highlighter",
        document.context.obj({
          Type: "ExtGState",
          CA: HIGHLIGHTER_OPACITY,
          BM: "Multiply",
        }),
      )
      operators.push(
        lib.pushGraphicsState(),
        lib.setGraphicsState(highlighterState),
        ...layers.highlighter.flatMap(strokeOperators),
        lib.popGraphicsState(),
      )
    }

    operators.push(
      ...layers.pen.flatMap(strokeOperators),
      lib.popGraphicsState(),
    )
    page.pushOperators(...operators)
  }

  return document.save()
}

/** Builds a new PDF of page images with the ink drawn on top. */
async function flattenPdf(
  ink: InkPages,
  pdf: PDFDocumentProxy,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("@cantoo/pdf-lib")
  const document = await PDFDocument.create()

  for (let index = 0; index < pdf.numPages; index += 1) {
    const page = await pdf.getPage(index + 1)
    const viewport = page.getViewport({ scale: 1 })
    const scale = Math.min(
      rasterDpi / 72,
      Math.sqrt(maxExportPixels / (viewport.width * viewport.height)),
    )
    const render = renderPdfPage(page, viewport.width * scale)
    await render.promise

    const context = render.canvas.getContext("2d")
    if (context) {
      drawInk(context, ink[index], render.canvas.width)
    }

    const image = await document.embedJpg(
      await (await canvasToBlob(render.canvas, "image/jpeg")).arrayBuffer(),
    )
    document.addPage([viewport.width, viewport.height]).drawImage(image, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    })
  }

  return document.save()
}

async function drawInkOnImage(
  file: Blob,
  strokes: readonly Stroke[],
  type: string,
): Promise<Blob> {
  const image = await loadImage(file)
  const scale = Math.min(
    1,
    Math.sqrt(maxExportPixels / (image.naturalWidth * image.naturalHeight)),
  )
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas is not available")
  }

  if (type === "image/jpeg") {
    // JPEG has no transparency, which would otherwise turn black.
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  drawInk(context, strokes, canvas.width)

  return canvasToBlob(canvas, type)
}

/** Draws ink the way the viewer shows it, `scale` pixels per page unit. */
function drawInk(
  context: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  scale: number,
) {
  const { highlighter, pen } = strokesByLayer(strokes)

  context.save()
  context.globalAlpha = HIGHLIGHTER_OPACITY
  context.globalCompositeOperation = "multiply"
  for (const stroke of highlighter) {
    drawStroke(context, stroke, scale)
  }
  context.restore()

  for (const stroke of pen) {
    drawStroke(context, stroke, scale)
  }
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number,
) {
  context.fillStyle = stroke.color
  context.strokeStyle = stroke.color
  context.lineWidth = stroke.width * scale
  context.lineCap = "round"
  context.lineJoin = "round"
  context.beginPath()

  if (isDot(stroke)) {
    const [x, y] = stroke.points
    context.arc(
      x * scale,
      y * scale,
      (stroke.width * scale) / 2,
      0,
      Math.PI * 2,
    )
    context.fill()
    return
  }

  for (const command of strokePath(stroke.points)) {
    switch (command.type) {
      case "move":
        context.moveTo(command.x * scale, command.y * scale)
        break
      case "line":
        context.lineTo(command.x * scale, command.y * scale)
        break
      case "quad":
        context.quadraticCurveTo(
          command.cx * scale,
          command.cy * scale,
          command.x * scale,
          command.y * scale,
        )
        break
      default: {
        const exhaustive: never = command
        throw new Error(`Unhandled path command: ${exhaustive}`)
      }
    }
  }
  context.stroke()
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn’t encode the image")),
      type,
      0.92,
    )
  })
}

function exportFileName(record: SheetRecord, extension: string): string {
  return `${record.name} (annotated).${extension}`
}

function extensionFor(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    default:
      return "png"
  }
}

/** Saves a file through the browser's usual download flow. */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  link.style.display = "none"
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start reading the file only after the click returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
