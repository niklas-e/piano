import { readFile } from "node:fs/promises"
import { PDFDict, PDFDocument, PDFName } from "@cantoo/pdf-lib"
import { expect, type Page, test } from "@playwright/test"
import {
  addSheets,
  createScorePdf,
  createScorePng,
  drawOnPage,
  encryptedScorePdfPath,
  inkPaths,
  pagePixel,
  passwordProtectedScorePdfPath,
} from "../fixtures/sheets"

async function openSheet(page: Page, name: string) {
  await page.goto("/sheet-music")
  await page.getByRole("link", { name }).click()
  await expect(page.getByRole("heading", { name })).toBeVisible()
}

async function drawRedLine(
  page: Page,
  pageIndex: number,
  from: [number, number],
  to: [number, number],
) {
  await page.getByRole("button", { name: "Pen" }).click()
  await page.getByRole("button", { name: "Red", exact: true }).click()
  await page.getByRole("button", { name: "Bold" }).click()
  await drawOnPage(page, pageIndex, [from, to])
}

async function downloadWithDrawings(page: Page) {
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download with drawings" }).click()
  const download = await downloadPromise
  const path = await download.path()

  return {
    name: download.suggestedFilename(),
    buffer: await readFile(path),
  }
}

/** Adds an exported file back into the library to look at what it contains. */
async function reopenExport(
  page: Page,
  file: { name: string; buffer: Buffer },
  mimeType: string,
) {
  await page.goto("/sheet-music")
  await addSheets(page, [{ ...file, name: `Exported ${file.name}`, mimeType }])
  await page
    .getByRole("link", {
      name: `Exported ${file.name.replace(/\.[^.]+$/, "")}`,
    })
    .click()
}

const isRed = ({ r, g, b }: { r: number; g: number; b: number }) =>
  r > 150 && g < 110 && b < 110
const isWhite = ({ r, g, b }: { r: number; g: number; b: number }) =>
  r > 245 && g > 245 && b > 245

test("PDFs download with the drawings written into their pages", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Etude in C.pdf",
      mimeType: "application/pdf",
      buffer: await createScorePdf(3),
    },
  ])
  await openSheet(page, "Etude in C")
  await drawRedLine(page, 1, [0.2, 0.5], [0.8, 0.5])
  await page.getByRole("button", { name: "Highlighter" }).click()
  await drawOnPage(page, 1, [
    [0.2, 0.7],
    [0.8, 0.7],
  ])

  const file = await downloadWithDrawings(page)
  expect(file.name).toBe("Etude in C (annotated).pdf")

  // Written in as vectors: the page keeps its text, and gains a translucent
  // graphics state for the highlighter.
  const exported = await PDFDocument.load(file.buffer)
  expect(exported.getPageCount()).toBe(3)
  const resources = exported.getPage(1).node.Resources()
  expect(resources?.lookup(PDFName.of("Font"))).toBeInstanceOf(PDFDict)
  expect(
    resources
      ?.lookup(PDFName.of("ExtGState"), PDFDict)
      .keys()
      .map((key) => key.asString()),
  ).toContainEqual(expect.stringMatching(/^\/Highlighter/))

  await reopenExport(page, file, "application/pdf")
  await expect(page.getByRole("figure")).toHaveCount(3)
  // The drawings are part of the pages now, not separate ink.
  await expect(inkPaths(page, 1, "pen")).toHaveCount(0)

  expect(isRed(await pagePixel(page, 1, 0.5, 0.5))).toBe(true)
  expect(isWhite(await pagePixel(page, 1, 0.5, 0.6))).toBe(true)
  expect(isWhite(await pagePixel(page, 0, 0.5, 0.5))).toBe(true)

  const highlighted = await pagePixel(page, 1, 0.5, 0.7)
  expect(highlighted.r).toBeGreaterThan(235)
  expect(highlighted.b).toBeLessThan(200)
})

test("drawings stay in place on rotated PDF pages", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Sideways.pdf",
      mimeType: "application/pdf",
      buffer: await createScorePdf(1, { rotate: 90 }),
    },
  ])
  await openSheet(page, "Sideways")
  const box = await page.getByRole("figure").boundingBox()
  expect(box && box.width > box.height).toBe(true)

  await drawRedLine(page, 0, [0.2, 0.5], [0.4, 0.5])
  await reopenExport(page, await downloadWithDrawings(page), "application/pdf")

  expect(isRed(await pagePixel(page, 0, 0.3, 0.5))).toBe(true)
  expect(isRed(await pagePixel(page, 0, 0.7, 0.5))).toBe(false)
  expect(isRed(await pagePixel(page, 0, 0.3, 0.3))).toBe(false)
})

test("encrypted PDFs download as flattened copies with the drawings", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Published.pdf",
      mimeType: "application/pdf",
      buffer: await readFile(encryptedScorePdfPath),
    },
  ])
  await openSheet(page, "Published")
  await drawRedLine(page, 0, [0.2, 0.5], [0.8, 0.5])

  await reopenExport(page, await downloadWithDrawings(page), "application/pdf")
  await expect(page.getByRole("figure")).toHaveCount(2)
  expect(isRed(await pagePixel(page, 0, 0.5, 0.5))).toBe(true)
  expect(isWhite(await pagePixel(page, 1, 0.5, 0.5))).toBe(true)
})

test("password-protected PDFs are rejected with a reason", async ({ page }) => {
  await page.goto("/sheet-music")
  await page.getByLabel("Add sheet music").setInputFiles({
    name: "Locked.pdf",
    mimeType: "application/pdf",
    buffer: await readFile(passwordProtectedScorePdfPath),
  })

  await expect(page.getByRole("alert")).toHaveText(
    "Couldn’t add Locked.pdf: Password-protected PDFs can’t be opened.",
  )
})

test("images download at full size with the drawings", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Photo.png",
      mimeType: "image/png",
      buffer: await createScorePng(page, { width: 1200, height: 900 }),
    },
  ])
  await openSheet(page, "Photo")
  await drawRedLine(page, 0, [0.2, 0.5], [0.8, 0.5])

  // Downloads are named after the current title.
  await page.getByRole("button", { name: "Photo" }).click()
  await page.getByRole("textbox", { name: "Title" }).fill("Scale study")
  await page.keyboard.press("Enter")

  const file = await downloadWithDrawings(page)
  expect(file.name).toBe("Scale study (annotated).png")

  const image = await page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob()
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("No 2D context")
    }
    context.drawImage(bitmap, 0, 0)
    const pixel = (x: number, y: number) => {
      const [r, g, b] = context.getImageData(x, y, 1, 1).data
      return { r, g, b }
    }
    return {
      width: bitmap.width,
      height: bitmap.height,
      onLine: pixel(600, 450),
      offLine: pixel(600, 650),
    }
  }, file.buffer.toString("base64"))

  expect(image).toMatchObject({ width: 1200, height: 900 })
  expect(isRed(image.onLine)).toBe(true)
  expect(isRed(image.offLine)).toBe(false)
})
