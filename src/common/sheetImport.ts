import { isPasswordError, openPdf, renderPdfPage } from "./pdf"
import type { NewSheet, SheetKind } from "./sheetMusicLibrary"

const thumbnailWidth = 360
const imageExtensions = /\.(png|jpe?g|gif|webp|avif|bmp|heic|heif)$/i

export const ACCEPTED_SHEET_TYPES = "application/pdf,.pdf,image/*"

/** A failure worth showing to the person who picked the file. */
export class SheetImportError extends Error {}

export function sheetKindOf(file: File): SheetKind | undefined {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return "pdf"
  }

  if (file.type.startsWith("image/") || imageExtensions.test(file.name)) {
    return "image"
  }

  return undefined
}

/** Reads a picked file far enough to know it can be shown, and thumbnails it. */
export async function prepareSheet(file: File): Promise<NewSheet> {
  const kind = sheetKindOf(file)
  const name = file.name.replace(/\.[^.]+$/, "") || file.name

  switch (kind) {
    case "pdf":
    case "image": {
      const details =
        kind === "pdf" ? await preparePdf(file) : await prepareImage(file)
      return { ...details, name, kind, size: file.size, file }
    }
    case undefined:
      throw new SheetImportError("Only PDFs and images can be added.")
    default: {
      const exhaustive: never = kind
      throw new Error(`Unhandled sheet kind: ${exhaustive}`)
    }
  }
}

async function preparePdf(file: File) {
  let pdf: Awaited<ReturnType<typeof openPdf>>
  try {
    pdf = await openPdf(file)
  } catch (error) {
    throw new SheetImportError(
      (await isPasswordError(error))
        ? "Password-protected PDFs can’t be opened."
        : "This PDF couldn’t be read.",
    )
  }

  try {
    const render = renderPdfPage(await pdf.getPage(1), thumbnailWidth)
    await render.promise

    return {
      mimeType: "application/pdf",
      pageCount: pdf.numPages,
      thumbnail: await canvasToBlob(render.canvas),
    }
  } finally {
    await pdf.loadingTask.destroy()
  }
}

async function prepareImage(file: File) {
  const image = await loadImage(file).catch(() => {
    throw new SheetImportError("This browser can’t show this type of image.")
  })
  const canvas = document.createElement("canvas")
  canvas.width = thumbnailWidth
  canvas.height = Math.round(
    (thumbnailWidth * image.naturalHeight) / image.naturalWidth,
  )
  const context = canvas.getContext("2d")
  if (context) {
    // Thumbnails are JPEGs, which would turn transparency black.
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  }

  return {
    mimeType: file.type || "image/png",
    pageCount: 1,
    thumbnail: await canvasToBlob(canvas),
  }
}

/** Decodes an image file. Browsers apply its EXIF orientation. */
export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.8)
  })
}
