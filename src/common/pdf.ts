import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs"

export type { PDFDocumentProxy, PDFPageProxy }

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs")

let pdfjs: Promise<Pdfjs> | undefined

/**
 * Loads PDF.js on first use so that the rest of the app doesn't pay for it.
 * The legacy build is used because the modern one relies on JavaScript
 * features that current Safari and Chrome don't have yet.
 */
export function loadPdfjs(): Promise<Pdfjs> {
  pdfjs ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]).then(([library, worker]) => {
    library.GlobalWorkerOptions.workerSrc = worker.default
    return library
  })

  return pdfjs
}

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  const library = await loadPdfjs()
  const assets = `${import.meta.env.BASE_URL}pdfjs/`

  return library.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assets}cmaps/`,
    iccUrl: `${assets}iccs/`,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    enableXfa: false,
  }).promise
}

export async function isPasswordError(error: unknown): Promise<boolean> {
  const library = await loadPdfjs()
  return error instanceof library.PasswordException
}

export type PageRender = {
  canvas: HTMLCanvasElement
  promise: Promise<void>
  cancel(): void
}

/** Renders a page into a new canvas that is `pixelWidth` device pixels wide. */
export function renderPdfPage(
  page: PDFPageProxy,
  pixelWidth: number,
): PageRender {
  const unscaled = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: pixelWidth / unscaled.width })
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)

  const task = page.render({ canvas, viewport })

  return { canvas, promise: task.promise, cancel: () => task.cancel() }
}
