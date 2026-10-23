import { fileURLToPath } from "node:url"
import { degrees, PDFDocument, rgb, StandardFonts } from "@cantoo/pdf-lib"
import { expect, type Page } from "@playwright/test"
import type { InkTool } from "../../src/common/ink.ts"

/**
 * Builds a small score-like PDF: one staff per page, labelled with a standard
 * (non-embedded) font so PDF.js has to load its bundled font data.
 */
export async function createScorePdf(
  pageCount: number,
  options: { rotate?: number } = {},
): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([595, 842])
    if (options.rotate) {
      page.setRotation(degrees(options.rotate))
    }
    page.drawText(`Etude page ${index + 1}`, { x: 60, y: 760, size: 24, font })
    for (let line = 0; line < 5; line += 1) {
      page.drawLine({
        start: { x: 60, y: 600 + line * 12 },
        end: { x: 535, y: 600 + line * 12 },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
    }
  }

  return Buffer.from(await pdf.save())
}

/**
 * Encrypted copies of `createScorePdf`, like scores from publishers that
 * restrict editing, made once with `PDFDocument.encrypt()`. The first opens
 * without a password (the owner password is "publisher"); the second needs
 * the user password "secret".
 */
export const encryptedScorePdfPath = fileURLToPath(
  new URL("./encrypted-score.pdf", import.meta.url),
)
export const passwordProtectedScorePdfPath = fileURLToPath(
  new URL("./password-protected-score.pdf", import.meta.url),
)

/** Paints a small PNG "photo" of a staff in the browser. */
export async function createScorePng(
  page: Page,
  size = { width: 800, height: 600 },
): Promise<Buffer> {
  const dataUrl = await page.evaluate(({ width, height }) => {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("No 2D context")
    }
    context.fillStyle = "#fdfbf5"
    context.fillRect(0, 0, width, height)
    context.fillStyle = "#000000"
    for (let line = 0; line < 5; line += 1) {
      context.fillRect(40, 200 + line * 16, width - 80, 2)
    }
    return canvas.toDataURL("image/png")
  }, size)

  return Buffer.from(dataUrl.split(",")[1], "base64")
}

/** Adds files through the library's file picker and waits for their cards. */
export async function addSheets(
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[],
) {
  await page.getByLabel("Add sheet music").setInputFiles(files)
  for (const file of files) {
    await expect(
      page.getByRole("link", { name: file.name.replace(/\.[^.]+$/, "") }),
    ).toBeVisible()
  }
}

/** Drags across a page, with coordinates as fractions of the page size. */
export async function drawOnPage(
  page: Page,
  pageIndex: number,
  points: [number, number][],
) {
  const sheetPage = page.locator(`[data-page-index="${pageIndex}"]`)
  await sheetPage.scrollIntoViewIfNeeded()
  const box = await sheetPage.boundingBox()
  if (!box) {
    throw new Error(`Page ${pageIndex} is not visible`)
  }

  const [first, ...rest] = points.map(([x, y]) => ({
    x: box.x + x * box.width,
    y: box.y + y * box.height,
  }))
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 4 })
  }
  await page.mouse.up()
}

export function inkPaths(page: Page, pageIndex: number, layer: InkTool) {
  return page.locator(
    `[data-page-index="${pageIndex}"] [data-ink-layer="${layer}"] path`,
  )
}

/** Reads the colour of the rendered page at a point given as page fractions. */
export async function pagePixel(
  page: Page,
  pageIndex: number,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number }> {
  const canvas = page.locator(`[data-page-index="${pageIndex}"] canvas`)
  await expect(canvas).toBeVisible()

  return canvas.evaluate(
    (element: HTMLCanvasElement, point) => {
      const context = element.getContext("2d")
      if (!context) {
        throw new Error("No 2D context")
      }
      const [r, g, b] = context.getImageData(
        Math.round(point.x * element.width),
        Math.round(point.y * element.height),
        1,
        1,
      ).data
      return { r, g, b }
    },
    { x, y },
  )
}
