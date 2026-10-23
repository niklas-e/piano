import { type BrowserContext, expect, type Page, test } from "@playwright/test"

async function goOfflineAfterFirstVisit(page: Page, context: BrowserContext) {
  await page.goto("/")
  // The service worker only takes control once it has precached the build.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
}

test("network is really unavailable once offline", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)

  // A query string misses the precache, so this has to hit the network.
  const fetchSucceeded = await page.evaluate(() =>
    fetch("/favicon.svg?uncached").then(
      () => true,
      () => false,
    ),
  )

  expect(fetchSucceeded).toBe(false)
})

test("app shell reloads offline from the service worker", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)

  const responses: { url: string; fromServiceWorker: boolean }[] = []
  page.on("response", (response) => {
    responses.push({
      url: response.url(),
      fromServiceWorker: response.fromServiceWorker(),
    })
  })

  await page.reload()

  await expect(
    page.getByRole("heading", { name: "Piano Practice" }),
  ).toBeVisible()
  await expect(page.locator(".site-logo")).toHaveJSProperty("complete", true)
  expect(
    await page
      .locator(".site-logo")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => customElements.get("ph-list") !== undefined),
  ).toBe(true)
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family === "Inter Variable" && font.status === "loaded",
      ),
    ),
  ).toBe(true)

  expect(responses.length).toBeGreaterThan(0)
  expect(responses.filter((response) => !response.fromServiceWorker)).toEqual(
    [],
  )
})

test("every route opens offline as a direct link", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)

  await page.goto("/exercises")
  await expect(page.locator(".site-title")).toHaveText("Exercises")

  await page.goto("/exercises/a-major-scale")
  await expect(
    page.getByRole("heading", { name: "A major scale" }),
  ).toBeVisible()
  await expect(page.locator(".exercise-staff svg")).toBeVisible()

  await page.goto("/metronome")
  await expect(page.locator(".site-title")).toHaveText("Metronome")

  await page.goto("/sight-reading")
  await expect(
    page.getByRole("heading", { name: "Sight Reading" }),
  ).toBeVisible()

  await page.goto("/not-a-real-route")
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible()
})

test("links navigate between pages offline", async ({ page, context }) => {
  await goOfflineAfterFirstVisit(page, context)

  await page
    .getByRole("navigation", { name: "Practice tools" })
    .getByRole("link", { name: /Exercises/ })
    .click()
  await expect(page).toHaveURL("/exercises")

  await page
    .getByRole("link", { name: /A major scale/ })
    .first()
    .click()
  await expect(
    page.getByRole("heading", { name: "A major scale" }),
  ).toBeVisible()

  await page.locator(".site-title").click()
  await expect(page).toHaveURL("/exercises")

  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Metronome" })
    .click()
  await expect(page.locator(".site-title")).toHaveText("Metronome")
})

test("manifest and its icons are available offline", async ({
  page,
  context,
}) => {
  await goOfflineAfterFirstVisit(page, context)

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href")
  expect(manifestHref).not.toBeNull()

  const result = await page.evaluate(async (href) => {
    const manifest = await (await fetch(href)).json()
    const iconUrls: string[] = manifest.icons.map(
      (icon: { src: string }) => new URL(icon.src, location.href).href,
    )
    const appleTouchIcon = document.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]',
    )
    if (appleTouchIcon) {
      iconUrls.push(appleTouchIcon.href)
    }
    const statuses = await Promise.all(
      iconUrls.map(async (url) => (await fetch(url)).status),
    )

    return { manifest, statuses }
  }, manifestHref ?? "")

  expect(result.manifest).toMatchObject({
    name: "Piano Practice",
    start_url: "/",
    display: "standalone",
  })
  expect(result.manifest.icons).toContainEqual(
    expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
  )
  expect(result.statuses.length).toBeGreaterThan(0)
  expect(result.statuses.every((status) => status === 200)).toBe(true)
})
