import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

/**
 * Rasterises the source SVG artwork into the PNG icons the web app manifest
 * and iOS need (Safari does not render SVG apple-touch-icons, and Android
 * adaptive icons require a dedicated maskable variant with a safe zone).
 *
 * Uses the Chromium binary already installed for Playwright e2e tests, so no
 * extra image-processing dependency is required. Re-run after changing
 * `public/favicon.svg` or `public/logo.svg`:
 *
 *   pnpm gen:icons
 */

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
)

const faviconSvg = readFileSync(path.join(publicDir, "favicon.svg"), "utf8")
const logoSvg = readFileSync(path.join(publicDir, "logo.svg"), "utf8")

/** Fraction of the canvas the artwork occupies inside a maskable safe zone. */
const MASKABLE_SCALE = 0.66
/** Opaque background so iOS/adaptive masks never show transparency. */
const BACKGROUND = "#ffffff"

type IconSpec = {
  file: string
  size: number
  svg: string
  /** Artwork size relative to the canvas (1 = full bleed). */
  scale: number
}

const icons: IconSpec[] = [
  // Full-bleed install icons (favicon.svg carries its own opaque background).
  { file: "pwa-192x192.png", size: 192, svg: faviconSvg, scale: 1 },
  { file: "pwa-512x512.png", size: 512, svg: faviconSvg, scale: 1 },
  // iOS home-screen icon.
  { file: "apple-touch-icon.png", size: 180, svg: faviconSvg, scale: 1 },
  // Android adaptive icon: logo inset within the maskable safe zone.
  {
    file: "maskable-icon-512x512.png",
    size: 512,
    svg: logoSvg,
    scale: MASKABLE_SCALE,
  },
]

const pageHtml = ({ size, svg, scale }: IconSpec) => {
  const inner = Math.round(size * scale)
  return `<!doctype html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;background:${BACKGROUND}}
    .icon{width:${inner}px;height:${inner}px}
    .icon svg{display:block;width:100%;height:100%}
  </style></head><body><div class="icon">${svg}</div></body></html>`
}

const browser = await chromium.launch()

try {
  for (const spec of icons) {
    const page = await browser.newPage({
      viewport: { width: spec.size, height: spec.size },
      deviceScaleFactor: 1,
    })
    await page.setContent(pageHtml(spec))
    await page.screenshot({
      path: path.join(publicDir, spec.file),
      clip: { x: 0, y: 0, width: spec.size, height: spec.size },
    })
    await page.close()
    console.log(`wrote public/${spec.file} (${spec.size}x${spec.size})`)
  }
} finally {
  await browser.close()
}
