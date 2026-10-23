import { expect, type Page, test } from "@playwright/test"

type IconMeasurements = {
  width: number
  height: number
  /** Share of pixels that aren't fully opaque. */
  transparentShare: number
  /** Width of the dark logo artwork as a share of the icon width. */
  logoWidthShare: number
  /** Furthest logo pixel from the centre as a share of the icon width. */
  logoRadiusShare: number
}

async function measureIcon(page: Page, url: string): Promise<IconMeasurements> {
  return page.evaluate(async (src) => {
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("No 2D context")
    }
    context.drawImage(image, 0, 0)
    const { data, width, height } = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

    let transparent = 0
    let minX = width
    let maxX = -1
    let maxRadius = 0
    for (let index = 0; index < data.length; index += 4) {
      const x = (index / 4) % width
      const y = Math.floor(index / 4 / width)
      if (data[index + 3] < 255) {
        transparent += 1
      }
      if (data[index + 3] > 128 && data[index] < 128) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        maxRadius = Math.max(
          maxRadius,
          Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2),
        )
      }
    }

    return {
      width,
      height,
      transparentShare: transparent / (width * height),
      logoWidthShare: (maxX - minX + 1) / width,
      logoRadiusShare: maxRadius / width,
    }
  }, url)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("the iOS home screen icon is opaque, square and leaves room for its rounded corners", async ({
  page,
}) => {
  const href = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href")
  const icon = await measureIcon(page, href ?? "")

  expect(icon).toMatchObject({ width: 180, height: 180, transparentShare: 0 })
  // About 140 of 180 pixels, centred, like most home screen icons.
  expect(icon.logoWidthShare).toBeGreaterThan(0.65)
  expect(icon.logoWidthShare).toBeLessThan(0.8)
})

test("the maskable icon is opaque and keeps the logo inside the safe zone", async ({
  page,
}) => {
  const icon = await measureIcon(page, "/maskable-icon-512x512.png")

  expect(icon).toMatchObject({ width: 512, height: 512, transparentShare: 0 })
  // Platforms may crop anything outside a circle with a 40% radius.
  expect(icon.logoRadiusShare).toBeLessThanOrEqual(0.4)
  expect(icon.logoRadiusShare).toBeGreaterThan(0.35)
})

test("regular install icons fill their square like the favicon", async ({
  page,
}) => {
  for (const size of [64, 192, 512]) {
    const icon = await measureIcon(page, `/pwa-${size}x${size}.png`)

    expect(icon).toMatchObject({
      width: size,
      height: size,
      transparentShare: 0,
    })
    expect(icon.logoWidthShare).toBeGreaterThan(0.85)
  }
})
