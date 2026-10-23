import {
  contentRegion,
  type PageRegion,
  type Pixels,
  trimRegion,
} from "../common/pageMargins"
import { renderPdfPage } from "../common/pdf"
import type { PageSource } from "./SheetPage"

/** Wide enough to find the margins, small enough to look at every page. */
const analysisWidth = 200

const regions = new WeakMap<readonly PageSource[], Promise<PageRegion>>()

/**
 * Finds the part of a score's pages worth showing, looking at each opened
 * score only once.
 */
export function findTrimRegion(
  pages: readonly PageSource[],
): Promise<PageRegion> {
  let region = regions.get(pages)
  if (!region) {
    region = findRegions(pages).then(trimRegion)
    regions.set(pages, region)
  }
  return region
}

async function findRegions(
  pages: readonly PageSource[],
): Promise<(PageRegion | undefined)[]> {
  const found: (PageRegion | undefined)[] = []
  // One page at a time, so the pages on screen still render promptly.
  for (const source of pages) {
    found.push(contentRegion(await pagePixels(source)))
  }
  return found
}

async function pagePixels(source: PageSource): Promise<Pixels> {
  if (source.kind === "pdf") {
    const render = renderPdfPage(source.page, analysisWidth)
    await render.promise
    return readPixels(render.canvas)
  }

  const image = new Image()
  image.src = source.url
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = analysisWidth
  canvas.height = Math.round(analysisWidth * source.aspectRatio)
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return readPixels(canvas)
}

function readPixels(canvas: HTMLCanvasElement): Pixels {
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("No 2D context")
  }
  return context.getImageData(0, 0, canvas.width, canvas.height)
}
