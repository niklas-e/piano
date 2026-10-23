import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js"
import { css } from "solid-styled"
import { type InkPages, parseInkPages } from "../common/ink"
import { openPdf, type PDFDocumentProxy } from "../common/pdf"
import { loadImage } from "../common/sheetImport"
import type { SheetRecord } from "../common/sheetMusicLibrary"
import { sheetMusicLibrary } from "./library"
import { SheetEditor } from "./SheetEditor"
import type { PageSource } from "./SheetPage"

export type LoadedSheet = {
  record: SheetRecord
  file: Blob
  ink: InkPages
  pages: PageSource[]
  pdf: PDFDocumentProxy | undefined
}

type ViewerState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "failed" }
  | { status: "ready"; sheet: LoadedSheet }

export function SheetViewerPage(props: { id: string }) {
  css`
    .viewer-message {
      display: grid;
      gap: 1rem;
      justify-items: start;
    }
  `

  const [state, setState] = createSignal<ViewerState>({ status: "loading" })
  let disposed = false
  let release = () => {}

  onMount(() => {
    loadSheet(props.id).then(
      (loaded) => {
        if (!loaded) {
          setState({ status: "missing" })
          return
        }

        release = loaded.release
        if (disposed) {
          release()
          return
        }
        setState({ status: "ready", sheet: loaded.sheet })
      },
      () => setState({ status: "failed" }),
    )
  })

  onCleanup(() => {
    disposed = true
    release()
  })

  return (
    <Switch>
      <Match when={state().status === "loading"}>
        <p aria-live="polite">Opening sheet music…</p>
      </Match>
      <Match when={state().status === "missing"}>
        <section class="viewer-message" aria-labelledby="missing-heading">
          <h2 id="missing-heading">Sheet music not found</h2>
          <p>It may have been deleted, or added on another device.</p>
          <a class="button-link" href="/sheet-music">
            Back to sheet music
          </a>
        </section>
      </Match>
      <Match when={state().status === "failed"}>
        <section class="viewer-message" role="alert">
          <h2>This file couldn’t be opened</h2>
          <a class="button-link" href="/sheet-music">
            Back to sheet music
          </a>
        </section>
      </Match>
      <Match
        when={(() => {
          const current = state()
          return current.status === "ready" ? current.sheet : undefined
        })()}
      >
        {(sheet) => <SheetEditor sheet={sheet()} />}
      </Match>
    </Switch>
  )
}

async function loadSheet(
  id: string,
): Promise<{ sheet: LoadedSheet; release: () => void } | undefined> {
  const [record, file, ink] = await Promise.all([
    sheetMusicLibrary.get(id),
    sheetMusicLibrary.getFile(id),
    sheetMusicLibrary.getInk(id),
  ])
  if (!record || !file || !ink) {
    return undefined
  }

  if (record.kind === "image") {
    const image = await loadImage(file)
    const url = URL.createObjectURL(file)
    return {
      sheet: {
        record,
        file,
        ink,
        pdf: undefined,
        pages: [
          {
            kind: "image",
            url,
            aspectRatio: image.naturalHeight / image.naturalWidth,
          },
        ],
      },
      release: () => URL.revokeObjectURL(url),
    }
  }

  const pdf = await openPdf(file)
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1)
      const viewport = page.getViewport({ scale: 1 })
      return {
        kind: "pdf" as const,
        page,
        aspectRatio: viewport.height / viewport.width,
      }
    }),
  )

  return {
    sheet: { record, file, ink: parseInkPages(ink, pages.length), pdf, pages },
    release: () => void pdf.loadingTask.destroy(),
  }
}
