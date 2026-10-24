import { readFile } from "node:fs/promises"
import { type BrowserContext, expect, type Page, test } from "@playwright/test"
import {
  addSheets,
  createScorePdf,
  createScorePng,
  drawOnPage,
  inkPaths,
  pagePixel,
  selectTool,
} from "../fixtures/sheets"

async function goOfflineAfterFirstVisit(page: Page, context: BrowserContext) {
  await page.goto("/")
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
}

/** Collects requests the service worker couldn't answer. */
function trackFailedRequests(page: Page): string[] {
  const failed: string[] = []
  page.on("requestfailed", (request) => failed.push(request.url()))
  page.on("response", (response) => {
    if (!response.ok()) {
      failed.push(`${response.status()} ${response.url()}`)
    }
  })
  return failed
}

test("PDFs can be added, drawn on and downloaded offline", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)
  const failedRequests = trackFailedRequests(page)

  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Etude in C.pdf",
      mimeType: "application/pdf",
      buffer: await createScorePdf(2),
    },
  ])
  await page.getByRole("link", { name: "Etude in C" }).click()
  await expect(page.getByRole("figure")).toHaveCount(2)

  // The title uses a standard font that PDF.js loads from its bundled data.
  const titleRow = await Promise.all(
    Array.from({ length: 40 }, (_, step) =>
      pagePixel(page, 0, 0.1 + step * 0.005, 0.093),
    ),
  )
  expect(titleRow.some(({ r }) => r < 100)).toBe(true)

  await selectTool(page, "Pen")
  await drawOnPage(page, 0, [
    [0.2, 0.5],
    [0.8, 0.5],
  ])
  await expect(page.getByRole("status")).toHaveText("Saved")

  await page.reload()
  await expect(inkPaths(page, 0, "pen")).toHaveCount(1)

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "More" }).click()
  await page.getByRole("button", { name: "Download with drawings" }).click()
  const download = await downloadPromise
  const exported = await readFile(await download.path())
  expect(exported.subarray(0, 5).toString()).toBe("%PDF-")

  expect(failedRequests).toEqual([])
})

test("images can be added and drawn on offline", async ({ page, context }) => {
  await goOfflineAfterFirstVisit(page, context)
  const failedRequests = trackFailedRequests(page)

  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Photo.png",
      mimeType: "image/png",
      buffer: await createScorePng(page),
    },
  ])
  await page.getByRole("link", { name: "Photo" }).click()
  await expect(page.getByRole("img", { name: "Page 1" })).toBeVisible()

  await page.getByRole("button", { name: "Highlighter" }).click()
  await drawOnPage(page, 0, [
    [0.2, 0.5],
    [0.8, 0.5],
  ])
  await expect(inkPaths(page, 0, "highlighter")).toHaveCount(1)

  expect(failedRequests).toEqual([])
})

test("PDF.js decoders and fonts are cached for offline use", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)

  const statuses = await page.evaluate(() =>
    Promise.all(
      [
        "/pdfjs/wasm/openjpeg.wasm",
        "/pdfjs/wasm/jbig2.wasm",
        "/pdfjs/wasm/qcms_bg.wasm",
        "/pdfjs/standard_fonts/FoxitSerif.pfb",
        "/pdfjs/standard_fonts/LiberationSans-Regular.ttf",
        "/pdfjs/iccs/CGATS001Compat-v2-micro.icc",
      ].map(async (url) => (await fetch(url)).status),
    ),
  )

  expect(statuses.every((status) => status === 200)).toBe(true)
})
