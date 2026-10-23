/** Part of a page, as fractions of its width and height. */
export type PageRegion = {
  left: number
  top: number
  right: number
  bottom: number
}

export type Pixels = {
  /** RGBA, four bytes per pixel, row by row. */
  data: Uint8ClampedArray
  width: number
  height: number
}

export const WHOLE_PAGE: PageRegion = { left: 0, top: 0, right: 1, bottom: 1 }

/** Darker than this counts as ink, so grey paper and faint scans don't. */
const inkLuminance = 160
/** A row or column needs this many inky pixels, so specks of dust don't. */
const minInkPixels = 2
/** Room kept around the music, as a fraction of the page. */
const padding = 0.02

/** The part of a page image with ink on it, or nothing for a blank page. */
export function contentRegion(pixels: Pixels): PageRegion | undefined {
  const { data, width, height } = pixels
  const rowInk = new Array<number>(height).fill(0)
  const columnInk = new Array<number>(width).fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const luminance =
        0.299 * data[offset] +
        0.587 * data[offset + 1] +
        0.114 * data[offset + 2]
      // Transparent pixels are paper, whatever their colour.
      if (data[offset + 3] >= 128 && luminance < inkLuminance) {
        rowInk[y] += 1
        columnInk[x] += 1
      }
    }
  }

  const hasInk = (count: number) => count >= minInkPixels
  const top = rowInk.findIndex(hasInk)
  const left = columnInk.findIndex(hasInk)
  if (top === -1 || left === -1) {
    return undefined
  }

  return {
    left: left / width,
    top: top / height,
    right: (columnInk.findLastIndex(hasInk) + 1) / width,
    bottom: (rowInk.findLastIndex(hasInk) + 1) / height,
  }
}

/**
 * The region to show of every page: all the music on any of them, with a
 * little room around it. Using the same region for every page keeps the
 * music the same size from page to page.
 */
export function trimRegion(
  regions: readonly (PageRegion | undefined)[],
): PageRegion {
  const found = regions.filter((region) => region !== undefined)
  if (found.length === 0) {
    return WHOLE_PAGE
  }

  return {
    left: Math.max(0, Math.min(...found.map((r) => r.left)) - padding),
    top: Math.max(0, Math.min(...found.map((r) => r.top)) - padding),
    right: Math.min(1, Math.max(...found.map((r) => r.right)) + padding),
    bottom: Math.min(1, Math.max(...found.map((r) => r.bottom)) + padding),
  }
}

/** The height-to-width ratio of the part of a page that a region shows. */
export function regionAspectRatio(
  aspectRatio: number,
  region: PageRegion,
): number {
  return (
    (aspectRatio * (region.bottom - region.top)) / (region.right - region.left)
  )
}
