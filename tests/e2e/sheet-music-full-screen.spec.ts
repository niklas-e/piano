import { expect, type Page, test } from "@playwright/test"
import { addSheets, createScorePdf } from "../fixtures/sheets"

// Upright, like a tablet on a music stand, so pages show one at a time.
test.use({ viewport: { width: 1024, height: 1280 } })

async function openSheet(page: Page, pageCount = 3) {
  await page.goto("/sheet-music")
  await addSheets(page, [
    {
      name: "Etude in C.pdf",
      mimeType: "application/pdf",
      buffer: await createScorePdf(pageCount),
    },
  ])
  await page.getByRole("link", { name: "Etude in C" }).click()
  await expect(page.getByRole("figure")).toHaveCount(pageCount)
}

const fullScreen = (page: Page) =>
  page.getByRole("dialog", { name: "Etude in C, full screen" })

/** The one page on screen, which must fit the window whole. */
async function expectWholePage(page: Page, name: string) {
  const sheetPage = fullScreen(page).getByRole("figure")
  await expect(sheetPage).toHaveCount(1)
  await expect(sheetPage).toHaveAccessibleName(name)
  await expect(sheetPage.locator("canvas")).toBeVisible()

  // Retried, since turning the screen resizes the page a moment later.
  await expect(async () => {
    const box = await sheetPage.boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) {
      throw new Error("Missing boxes")
    }
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    // As big as fits: as tall or as wide as the window.
    expect(
      Math.max(box.height / viewport.height, box.width / viewport.width),
    ).toBeGreaterThan(0.99)
  }).toPass()
}

test("full screen shows whole pages that the keyboard turns", async ({
  page,
}) => {
  await openSheet(page)
  await page
    .getByRole("figure", { name: "Page 2 of 3" })
    .scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: "Full screen" }).click()

  await expect(fullScreen(page)).toBeVisible()
  await expectWholePage(page, "Page 2 of 3")

  // Page turner pedals type these keys.
  await page.keyboard.press("ArrowRight")
  await expectWholePage(page, "Page 3 of 3")
  await page.keyboard.press("ArrowRight")
  await expectWholePage(page, "Page 3 of 3")
  await page.keyboard.press("PageUp")
  await page.keyboard.press("ArrowLeft")
  await expectWholePage(page, "Page 1 of 3")
  await page.keyboard.press(" ")
  await expectWholePage(page, "Page 2 of 3")
  await page.keyboard.press("End")
  await expectWholePage(page, "Page 3 of 3")

  await page.keyboard.press("Escape")
  await expect(fullScreen(page)).toBeHidden()
  await expect(
    page.getByRole("figure", { name: "Page 3 of 3" }),
  ).toBeInViewport()
  await expect(
    page.getByRole("toolbar", { name: "Drawing tools" }),
  ).toBeVisible()
})

test("leaving full screen without turning keeps the scroll position", async ({
  page,
}) => {
  await openSheet(page)
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.getByRole("button", { name: "Full screen" }).click()
  await expectWholePage(page, "Page 1 of 3")

  await page.keyboard.press("Escape")
  await expect(fullScreen(page)).toBeHidden()
  expect(await page.evaluate(() => window.scrollY)).toBe(500)
})

test("the controls show the page and turn and close it", async ({ page }) => {
  await openSheet(page)
  await page.getByRole("button", { name: "Full screen" }).click()

  const dialog = fullScreen(page)
  await expect(dialog.getByText("1 / 3")).toBeVisible()
  await dialog.getByRole("button", { name: "Next page" }).click()
  await expect(dialog.getByText("2 / 3")).toBeVisible()
  await expectWholePage(page, "Page 2 of 3")

  // Turning from the music hides the controls, and a tap in the middle
  // brings them back.
  await page.keyboard.press("ArrowRight")
  await expect(
    dialog.getByRole("button", { name: "Exit full screen" }),
  ).not.toBeInViewport()
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error("No viewport")
  }
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  await dialog.getByRole("button", { name: "Exit full screen" }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole("figure", { name: "Page 3 of 3" }),
  ).toBeInViewport()
})

test("pages turned in full screen are where the sheet reopens", async ({
  page,
}) => {
  await openSheet(page)
  await page.getByRole("button", { name: "Full screen" }).click()
  await page.keyboard.press("End")
  await expectWholePage(page, "Page 3 of 3")

  await page.goBack()
  await page.getByRole("link", { name: "Etude in C" }).click()
  await expect(
    page.getByRole("combobox", { name: "Page" }).locator("option:checked"),
  ).toHaveText("3 / 3")
  await expect(
    page.getByRole("figure", { name: "Page 3 of 3" }),
  ).toBeInViewport()
})

test("full screen keeps the screen awake until it closes", async ({ page }) => {
  await page.addInitScript(() => {
    const log: string[] = []
    Object.assign(window, { wakeLockLog: log })
    Object.defineProperty(navigator, "wakeLock", {
      value: {
        request: async () => {
          log.push("request")
          return {
            release: async () => {
              log.push("release")
            },
          }
        },
      },
    })
  })
  const wakeLockLog = () =>
    page.evaluate(
      () => (window as unknown as { wakeLockLog: string[] }).wakeLockLog,
    )

  await openSheet(page, 1)
  expect(await wakeLockLog()).toEqual([])
  await page.getByRole("button", { name: "Full screen" }).click()
  await expect(fullScreen(page)).toBeVisible()
  await expect.poll(wakeLockLog).toEqual(["request"])

  await page.keyboard.press("Escape")
  await expect(fullScreen(page)).toBeHidden()
  await expect.poll(wakeLockLog).toEqual(["request", "release"])
})

test.describe("on a landscape screen", () => {
  test.use({ viewport: { width: 1366, height: 1024 } })

  test("pages are shown in pairs, and singly once turned upright", async ({
    page,
  }) => {
    // Like an iPhone, which only lets videos go full screen. The test
    // browser can't resize a full screen window either.
    await page.addInitScript(() =>
      Object.defineProperty(Document.prototype, "fullscreenEnabled", {
        get: () => false,
      }),
    )
    await openSheet(page)
    await page.getByRole("button", { name: "Full screen" }).click()

    const dialog = fullScreen(page)
    const pages = dialog.getByRole("figure")
    await expect(pages).toHaveCount(2)
    await expect(pages.first()).toHaveAccessibleName("Page 1 of 3")
    await expect(pages.last()).toHaveAccessibleName("Page 2 of 3")
    await expect(dialog.getByText("1–2 / 3")).toBeAttached()
    const [left, right] = await Promise.all([
      pages.first().boundingBox(),
      pages.last().boundingBox(),
    ])
    if (!left || !right) {
      throw new Error("Missing boxes")
    }
    expect(left.x + left.width).toBeLessThan(right.x)
    // Together they're as wide as the screen.
    expect(left.width + right.width).toBeGreaterThan(1366 - 16)

    // The odd page out keeps the size of the pair.
    await page.keyboard.press("ArrowRight")
    await expect(pages).toHaveCount(1)
    await expect(pages).toHaveAccessibleName("Page 3 of 3")
    await expect(dialog.getByText("3 / 3")).toBeAttached()
    expect((await pages.boundingBox())?.width).toBeCloseTo(left.width, 0)

    // Turning the screen keeps the page, then turns one page at a time.
    await page.setViewportSize({ width: 1024, height: 1366 })
    await expectWholePage(page, "Page 3 of 3")
    await page.keyboard.press("ArrowLeft")
    await expectWholePage(page, "Page 2 of 3")
    await page.setViewportSize({ width: 1366, height: 1024 })
    await expect(pages).toHaveCount(2)
    await expect(dialog.getByText("1–2 / 3")).toBeAttached()
  })
})

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 820, height: 1180 } })

  test("taps on the sides and swipes turn pages", async ({ page }) => {
    await openSheet(page)
    await page.getByRole("button", { name: "Full screen" }).click()
    await expectWholePage(page, "Page 1 of 3")

    await page.touchscreen.tap(700, 600)
    await expectWholePage(page, "Page 2 of 3")
    await page.touchscreen.tap(100, 600)
    await expectWholePage(page, "Page 1 of 3")

    const client = await page.context().newCDPSession(page)
    const swipe = async (fromX: number, toX: number) => {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: fromX, y: 600, id: 1 }],
      })
      for (let step = 1; step <= 5; step += 1) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: fromX + ((toX - fromX) * step) / 5, y: 600, id: 1 },
          ],
        })
      }
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      })
    }

    await swipe(600, 200)
    await expectWholePage(page, "Page 2 of 3")
    await swipe(200, 600)
    await expectWholePage(page, "Page 1 of 3")
  })
})
