import { expect, test } from "@playwright/test"
import {
  addSheets,
  createScorePdf,
  createScorePng,
  drawOnPage,
  inkPaths,
} from "../fixtures/sheets"

const pdfFile = async (name = "Etude in C.pdf", pageCount = 3) => ({
  name,
  mimeType: "application/pdf",
  buffer: await createScorePdf(pageCount),
})

test("an empty library explains how to add sheet music", async ({ page }) => {
  await page.goto("/sheet-music")

  await expect(page.locator(".site-title")).toHaveText("Sheet Music")
  await expect(page.getByText("No sheet music yet")).toBeVisible()
  await expect(page.getByText("Files stay on this device")).toBeVisible()
})

test("added PDFs and images are listed and open with every page", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [
    await pdfFile(),
    {
      name: "Photo of a score.png",
      mimeType: "image/png",
      buffer: await createScorePng(page),
    },
  ])

  const library = page.getByRole("list", { name: "Sheet music" })
  await expect(library.getByRole("listitem")).toHaveCount(2)
  await expect(library.getByText("PDF · 3 pages")).toBeVisible()
  await expect(library.getByText(/^Image · /)).toBeVisible()
  await expect(library.locator("img")).toHaveCount(2)

  await page.getByRole("link", { name: "Etude in C" }).click()
  await expect(page).toHaveURL(/\/sheet-music\/[\w-]+$/)
  await expect(page.getByRole("heading", { name: "Etude in C" })).toBeVisible()
  await expect(page.getByRole("figure")).toHaveCount(3)
  await expect(
    page.getByRole("figure", { name: "Page 1 of 3" }).locator("canvas"),
  ).toBeVisible()

  await page.goBack()
  await page.getByRole("link", { name: "Photo of a score" }).click()
  await expect(page.getByRole("figure")).toHaveCount(1)
  await expect(page.getByRole("img", { name: "Page 1" })).toBeVisible()
})

test("files that aren't PDFs or images are rejected with a reason", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await page.getByLabel("Add sheet music").setInputFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") },
    {
      name: "broken.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not really a pdf"),
    },
  ])

  const alert = page.getByRole("alert")
  await expect(alert).toContainText(
    "Couldn’t add notes.txt: Only PDFs and images can be added.",
  )
  await expect(alert).toContainText(
    "Couldn’t add broken.pdf: This PDF couldn’t be read.",
  )
  await expect(page.getByText("No sheet music yet")).toBeVisible()
})

test("drawings are kept on the page after reloading", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()

  await page.getByRole("button", { name: "Pen" }).click()
  await drawOnPage(page, 0, [
    [0.2, 0.3],
    [0.4, 0.35],
    [0.6, 0.3],
  ])
  await page.getByRole("button", { name: "Highlighter" }).click()
  await page.getByRole("button", { name: "Pink" }).click()
  await drawOnPage(page, 1, [
    [0.1, 0.5],
    [0.8, 0.5],
  ])

  await expect(inkPaths(page, 0, "pen")).toHaveCount(1)
  await expect(inkPaths(page, 1, "highlighter")).toHaveAttribute(
    "stroke",
    "#ff7eb6",
  )
  await expect(page.getByRole("status")).toHaveText("Saved")

  await page.reload()
  await expect(inkPaths(page, 0, "pen")).toHaveCount(1)
  await expect(inkPaths(page, 1, "highlighter")).toHaveCount(1)
  await expect(inkPaths(page, 2, "pen")).toHaveCount(0)

  // The chosen colour is remembered too.
  await page.getByRole("button", { name: "Highlighter" }).click()
  await expect(page.getByRole("button", { name: "Pink" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("undo, redo, erase and clear all change the drawings", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile("Etude in C.pdf", 1)])
  await page.getByRole("link", { name: "Etude in C" }).click()

  const strokes = inkPaths(page, 0, "pen")
  await page.getByRole("button", { name: "Pen" }).click()
  await drawOnPage(page, 0, [
    [0.2, 0.2],
    [0.8, 0.2],
  ])
  await drawOnPage(page, 0, [
    [0.2, 0.4],
    [0.8, 0.4],
  ])
  await expect(strokes).toHaveCount(2)

  await page.getByRole("button", { name: "Undo" }).click()
  await expect(strokes).toHaveCount(1)
  await page.keyboard.press("ControlOrMeta+Shift+Z")
  await expect(strokes).toHaveCount(2)
  await page.keyboard.press("ControlOrMeta+Z")
  await expect(strokes).toHaveCount(1)
  await page.getByRole("button", { name: "Redo" }).click()
  await expect(strokes).toHaveCount(2)

  // A swipe across the first line only.
  await page.getByRole("button", { name: "Eraser" }).click()
  await drawOnPage(page, 0, [
    [0.5, 0.1],
    [0.5, 0.3],
  ])
  await expect(strokes).toHaveCount(1)
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(strokes).toHaveCount(2)

  await page.getByRole("button", { name: "More" }).click()
  await page.getByRole("button", { name: "Clear all drawings" }).click()
  await expect(strokes).toHaveCount(0)
  await page.getByRole("button", { name: "More" }).click()
  await expect(
    page.getByRole("button", { name: "Clear all drawings" }),
  ).toBeDisabled()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(strokes).toHaveCount(2)
})

test("tapping the page to close a menu doesn't draw", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile("Etude in C.pdf", 1)])
  await page.getByRole("link", { name: "Etude in C" }).click()

  await page.getByRole("button", { name: "Pen" }).click()
  await page.getByRole("button", { name: "More" }).click()
  const clearAll = page.getByRole("button", { name: "Clear all drawings" })
  await expect(clearAll).toBeVisible()

  await drawOnPage(page, 0, [[0.5, 0.5]])
  await expect(clearAll).toBeHidden()
  await expect(inkPaths(page, 0, "pen")).toHaveCount(0)

  await drawOnPage(page, 0, [[0.5, 0.5]])
  await expect(inkPaths(page, 0, "pen")).toHaveCount(1)
})

test("the scroll tool never draws", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile("Etude in C.pdf", 1)])
  await page.getByRole("link", { name: "Etude in C" }).click()

  await page.getByRole("button", { name: "Scroll" }).click()
  await drawOnPage(page, 0, [
    [0.2, 0.2],
    [0.8, 0.2],
  ])

  await expect(inkPaths(page, 0, "pen")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled()
})

test("zooming resizes pages and drawings stay in place", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile("Etude in C.pdf", 1)])
  await page.getByRole("link", { name: "Etude in C" }).click()

  await page.getByRole("button", { name: "Pen" }).click()
  await drawOnPage(page, 0, [
    [0.25, 0.25],
    [0.5, 0.25],
  ])

  const sheetPage = page.getByRole("figure", { name: "Page 1 of 1" })
  const stroke = inkPaths(page, 0, "pen")
  const relativeStrokeBox = async () => {
    const [pageBox, strokeBox] = await Promise.all([
      sheetPage.boundingBox(),
      stroke.boundingBox(),
    ])
    if (!pageBox || !strokeBox) {
      throw new Error("Missing boxes")
    }
    return {
      pageWidth: pageBox.width,
      left: (strokeBox.x - pageBox.x) / pageBox.width,
      width: strokeBox.width / pageBox.width,
    }
  }

  const before = await relativeStrokeBox()
  await page.getByRole("button", { name: "Zoom in" }).click()
  await expect(page.getByRole("button", { name: /^Zoom 125%/ })).toBeVisible()
  const after = await relativeStrokeBox()

  expect(after.pageWidth).toBeCloseTo(before.pageWidth * 1.25, 0)
  expect(after.left).toBeCloseTo(before.left, 2)
  expect(after.width).toBeCloseTo(before.width, 2)

  await page.getByRole("button", { name: /^Zoom 125%/ }).click()
  await expect(page.getByRole("button", { name: /^Zoom 100%/ })).toBeVisible()
})

test("Ctrl + wheel zooms and the scroll tool drags the page", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()

  const box = await page
    .getByRole("figure", { name: "Page 1 of 3" })
    .boundingBox()
  if (!box) {
    throw new Error("Page 1 is not visible")
  }
  await page.mouse.move(box.x + box.width / 2, box.y + 300)
  await page.keyboard.down("Control")
  await page.mouse.wheel(0, -40)
  await page.keyboard.up("Control")
  await expect(
    page.getByRole("button", { name: /^Zoom 1[1-9]\d%/ }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Scroll" }).click()
  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.mouse.move(box.x + box.width / 2, 700)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, 500, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(scrollBefore + 150)
  await expect(inkPaths(page, 0, "pen")).toHaveCount(0)
})

test("the page in view is shown and other pages can be picked", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()

  const picker = page.getByRole("combobox", { name: "Page" })
  await expect(picker.locator("option:checked")).toHaveText("1 / 3")

  await picker.selectOption("3 / 3")
  await expect(
    page.getByRole("figure", { name: "Page 3 of 3" }),
  ).toBeInViewport()

  await page
    .getByRole("figure", { name: "Page 2 of 3" })
    .scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 200))
  await expect(picker.locator("option:checked")).toHaveText("2 / 3")
})

test("sheets open on the page that was read last", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()
  await page.getByRole("combobox", { name: "Page" }).selectOption("3 / 3")

  await page.goBack()
  await page.getByRole("link", { name: "Etude in C" }).click()
  await expect(
    page.getByRole("figure", { name: "Page 3 of 3" }),
  ).toBeInViewport()
  await expect(
    page.getByRole("combobox", { name: "Page" }).locator("option:checked"),
  ).toHaveText("3 / 3")
})

test("the title can be renamed in place", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()

  const heading = page.getByRole("heading", { level: 1 })
  const titleField = page.getByRole("textbox", { name: "Title" })

  // Enter keeps the new title, with the old one selected for replacing.
  await heading.getByRole("button", { name: "Etude in C" }).click()
  await expect(titleField).toBeFocused()
  await page.keyboard.type("Clair de lune")
  await page.keyboard.press("Enter")
  await expect(heading).toHaveText("Clair de lune")
  await expect(heading.getByRole("button")).toBeFocused()

  // Escape and empty titles keep the current one.
  await heading.getByRole("button").click()
  await titleField.fill("Something else")
  await page.keyboard.press("Escape")
  await expect(heading).toHaveText("Clair de lune")
  await heading.getByRole("button").click()
  await titleField.fill("   ")
  await page.keyboard.press("Enter")
  await expect(heading).toHaveText("Clair de lune")

  // Leaving the field keeps the edit too.
  await heading.getByRole("button").click()
  await titleField.fill("  Clair de lune, L. 32  ")
  await page.getByRole("button", { name: "Pen" }).click()
  await expect(heading).toHaveText("Clair de lune, L. 32")
  await expect(page.getByRole("button", { name: "Pen" })).toBeFocused()

  await page.reload()
  await expect(heading).toHaveText("Clair de lune, L. 32")
  await page.locator(".site-title").click()
  await expect(
    page.getByRole("link", { name: "Clair de lune, L. 32" }),
  ).toBeVisible()
})

test("undo shortcuts in the title field don't undo drawings", async ({
  page,
}) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile("Etude in C.pdf", 1)])
  await page.getByRole("link", { name: "Etude in C" }).click()
  await page.getByRole("button", { name: "Pen" }).click()
  await drawOnPage(page, 0, [
    [0.2, 0.4],
    [0.8, 0.4],
  ])

  await page.getByRole("button", { name: "Etude in C" }).click()
  await page.keyboard.type("x")
  await page.keyboard.press("ControlOrMeta+Z")

  await expect(inkPaths(page, 0, "pen")).toHaveCount(1)
})

test("deleting a sheet removes it from the library", async ({ page }) => {
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])

  page.once("dialog", (dialog) => void dialog.accept())
  await page.getByRole("button", { name: "Delete Etude in C" }).click()

  await expect(page.getByText("No sheet music yet")).toBeVisible()
  await page.reload()
  await expect(page.getByText("No sheet music yet")).toBeVisible()
})

test("an unknown sheet links back to the library", async ({ page }) => {
  await page.goto("/sheet-music/not-a-real-sheet")

  await expect(
    page.getByRole("heading", { name: "Sheet music not found" }),
  ).toBeVisible()
  await page.getByRole("link", { name: "Back to sheet music" }).click()
  await expect(page).toHaveURL("/sheet-music")
})

test("the drawing toolbar fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/sheet-music")
  await addSheets(page, [await pdfFile()])
  await page.getByRole("link", { name: "Etude in C" }).click()
  await page.getByRole("button", { name: "Pen" }).click()

  const toolbar = page.getByRole("toolbar", { name: "Drawing tools" })
  for (const name of ["Undo", "Zoom in", "Bold", "Red"]) {
    await expect(
      toolbar.getByRole("button", { name, exact: true }),
    ).toBeInViewport()
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 820, height: 1180 } })

  type TouchPoint = { x: number; y: number; id: number }

  test("one finger draws and two fingers scroll", async ({ page }) => {
    await page.goto("/sheet-music")
    await addSheets(page, [await pdfFile()])
    await page.getByRole("link", { name: "Etude in C" }).click()
    await page.getByRole("button", { name: "Pen" }).click()

    const client = await page.context().newCDPSession(page)
    const touch = async (
      type: "touchStart" | "touchMove" | "touchEnd",
      touchPoints: TouchPoint[],
    ) => client.send("Input.dispatchTouchEvent", { type, touchPoints })

    const box = await page
      .getByRole("figure", { name: "Page 1 of 3" })
      .boundingBox()
    if (!box) {
      throw new Error("Page 1 is not visible")
    }
    const x = box.x + box.width * 0.3
    const y = box.y + box.width * 0.5

    await touch("touchStart", [{ x, y, id: 1 }])
    for (let step = 1; step <= 5; step += 1) {
      await touch("touchMove", [{ x: x + step * 30, y, id: 1 }])
    }
    await touch("touchEnd", [])
    await expect(inkPaths(page, 0, "pen")).toHaveCount(1)

    const scrollBefore = await page.evaluate(() => window.scrollY)
    await touch("touchStart", [
      { x, y: y + 200, id: 1 },
      { x: x + 100, y: y + 200, id: 2 },
    ])
    for (let step = 1; step <= 5; step += 1) {
      await touch("touchMove", [
        { x, y: y + 200 - step * 40, id: 1 },
        { x: x + 100, y: y + 200 - step * 40, id: 2 },
      ])
    }
    await touch("touchEnd", [])

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollBefore + 150)
    await expect(inkPaths(page, 0, "pen")).toHaveCount(1)

    // Spreading two fingers apart zooms in.
    const center = { x: box.x + box.width / 2, y: 600 }
    await touch("touchStart", [
      { x: center.x - 50, y: center.y, id: 1 },
      { x: center.x + 50, y: center.y, id: 2 },
    ])
    for (let step = 1; step <= 5; step += 1) {
      await touch("touchMove", [
        { x: center.x - 50 - step * 10, y: center.y, id: 1 },
        { x: center.x + 50 + step * 10, y: center.y, id: 2 },
      ])
    }
    await touch("touchEnd", [])
    await expect(page.getByRole("button", { name: /^Zoom 200%/ })).toBeVisible()
    await expect(inkPaths(page, 0, "pen")).toHaveCount(1)
  })
})
