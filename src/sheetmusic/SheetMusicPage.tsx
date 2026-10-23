import { createSignal, For, onCleanup, Show } from "solid-js"
import { css } from "solid-styled"
import { PhIcon } from "../common/PhIcon"
import { requestPersistentStorage } from "../common/persistentStorage"
import {
  ACCEPTED_SHEET_TYPES,
  prepareSheet,
  SheetImportError,
} from "../common/sheetImport"
import type { SheetRecord } from "../common/sheetMusicLibrary"
import { sheetMusicLibrary } from "./library"

type ImportProblem = { fileName: string; message: string }

export function SheetMusicPage() {
  css`
    .sheet-library {
      position: relative;
    }

    .library-intro {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.5rem;
      justify-content: space-between;
    }

    .library-intro p {
      color: #4f4338;
      max-width: 52ch;
    }

    .add-button {
      align-items: center;
      background: #2f251d;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #fffaf2;
      cursor: pointer;
      display: inline-flex;
      font-weight: 900;
      gap: 0.5rem;
      min-height: 2.75rem;
      padding: 0.7rem 1.2rem;
    }

    .add-button:focus-within {
      outline: 3px solid #d46a2c;
      outline-offset: 3px;
    }

    .file-input {
      height: 1px;
      opacity: 0;
      overflow: hidden;
      position: absolute;
      width: 1px;
    }

    .drop-zone {
      align-items: center;
      background: #fffaf2;
      border: 2px dashed #cdbba6;
      border-radius: 1.25rem;
      color: #4f4338;
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      padding: clamp(2rem, 8vw, 4rem) 1.5rem;
      text-align: center;
    }

    .drop-zone strong {
      color: #17130f;
      font-size: 1.15rem;
    }

    .drop-overlay {
      align-items: center;
      background: rgba(255, 250, 242, 0.92);
      border: 2px dashed #b38f64;
      border-radius: 1.25rem;
      display: flex;
      font-size: 1.25rem;
      font-weight: 800;
      inset: -0.75rem;
      justify-content: center;
      pointer-events: none;
      position: absolute;
      z-index: 2;
    }

    .status {
      font-weight: 700;
    }

    .problems {
      background: #f7ece9;
      border: 1px solid #a23b2c;
      border-radius: 1rem;
      display: grid;
      gap: 0.35rem;
      list-style: none;
      padding: 0.85rem 1rem;
    }

    .problems strong {
      overflow-wrap: anywhere;
    }

    .sheet-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      list-style: none;
    }

    .privacy-note {
      color: #8c6e4a;
      font-size: 0.9rem;
    }
  `

  const [sheets, setSheets] = createSignal<SheetRecord[]>()
  const [isStorageUnavailable, setIsStorageUnavailable] = createSignal(false)
  const [busyFileName, setBusyFileName] = createSignal<string>()
  const [problems, setProblems] = createSignal<ImportProblem[]>([])
  const [isDragging, setIsDragging] = createSignal(false)

  const refresh = async () => {
    try {
      const latest = await sheetMusicLibrary.list()
      // Keep unchanged records so their cards (and thumbnails) aren't rebuilt.
      const previous = new Map(sheets()?.map((sheet) => [sheet.id, sheet]))
      setSheets(
        latest.map((sheet) => {
          const kept = previous.get(sheet.id)
          return kept?.updatedAt === sheet.updatedAt ? kept : sheet
        }),
      )
    } catch {
      setIsStorageUnavailable(true)
    }
  }
  void refresh()

  const addFiles = async (files: readonly File[]) => {
    setProblems([])
    let added = 0

    for (const file of files) {
      setBusyFileName(file.name)
      try {
        await sheetMusicLibrary.add(await prepareSheet(file))
        added += 1
      } catch (error) {
        setProblems((current) => [
          ...current,
          { fileName: file.name, message: describeImportError(error) },
        ])
      }
    }

    setBusyFileName(undefined)
    if (added > 0) {
      await refresh()
      // Uploaded scores are worth keeping, so this is the moment to ask the
      // browser not to clear them when the device runs low on space.
      void requestPersistentStorage(true)
    }
  }

  const deleteSheet = async (sheet: SheetRecord) => {
    if (!window.confirm(`Delete “${sheet.name}” and its drawings?`)) {
      return
    }

    await sheetMusicLibrary.remove(sheet.id)
    await refresh()
  }

  // Count enter/leave pairs because they also fire for every child element.
  let dragDepth = 0
  const hasFiles = (event: DragEvent) =>
    event.dataTransfer?.types.includes("Files") === true

  return (
    <section
      class="sheet-library stack"
      aria-label="Sheet music library"
      onDragEnter={(event) => {
        if (hasFiles(event)) {
          dragDepth += 1
          setIsDragging(true)
        }
      }}
      onDragOver={(event) => {
        if (hasFiles(event)) {
          event.preventDefault()
        }
      }}
      onDragLeave={() => {
        dragDepth = Math.max(0, dragDepth - 1)
        setIsDragging(dragDepth > 0)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepth = 0
        setIsDragging(false)
        void addFiles([...(event.dataTransfer?.files ?? [])])
      }}
    >
      <div class="library-intro">
        <p>
          Add PDFs or photos of your scores, then draw on them as you practice.
        </p>
        <label class="add-button">
          <PhIcon name="upload-simple" aria-hidden="true" size={18} />
          Add sheet music
          <input
            class="file-input"
            type="file"
            accept={ACCEPTED_SHEET_TYPES}
            multiple
            disabled={busyFileName() !== undefined}
            onChange={(event) => {
              const input = event.currentTarget
              const files = [...(input.files ?? [])]
              input.value = ""
              void addFiles(files)
            }}
          />
        </label>
      </div>

      <div aria-live="polite">
        <Show when={busyFileName()}>
          {(fileName) => <p class="status">Adding {fileName()}…</p>}
        </Show>
      </div>

      <Show when={problems().length > 0}>
        <ul class="problems" role="alert">
          <For each={problems()}>
            {(problem) => (
              <li>
                Couldn’t add <strong>{problem.fileName}</strong>:{" "}
                {problem.message}
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={isStorageUnavailable()}>
        <p role="alert">
          Sheet music can’t be stored in this browser. Private browsing may be
          blocking it.
        </p>
      </Show>

      <Show when={sheets()}>
        {(loadedSheets) => (
          <Show
            when={loadedSheets().length > 0}
            fallback={
              <div class="drop-zone">
                <PhIcon name="file-pdf" aria-hidden="true" size={40} />
                <strong>No sheet music yet</strong>
                <p>Drop PDFs or images here, or use Add sheet music.</p>
              </div>
            }
          >
            <ul class="sheet-grid" aria-label="Sheet music">
              <For each={loadedSheets()}>
                {(sheet) => (
                  <SheetCard
                    sheet={sheet}
                    onDelete={() => void deleteSheet(sheet)}
                  />
                )}
              </For>
            </ul>
          </Show>
        )}
      </Show>

      <p class="privacy-note">
        Files stay on this device. Nothing is uploaded anywhere.
      </p>

      <Show when={isDragging()}>
        <div class="drop-overlay">Drop to add sheet music</div>
      </Show>
    </section>
  )
}

function SheetCard(props: { sheet: SheetRecord; onDelete: () => void }) {
  css`
    .sheet-card {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      box-shadow: 0 18px 50px rgba(47, 37, 29, 0.08);
      overflow: hidden;
      position: relative;
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
    }

    .sheet-card:hover,
    .sheet-card:focus-within {
      border-color: #b38f64;
      box-shadow: 0 22px 60px rgba(47, 37, 29, 0.12);
      transform: translateY(-2px);
    }

    .sheet-link {
      display: grid;
      gap: 0.2rem;
      text-decoration: none;
    }

    .sheet-link:focus-visible {
      outline-offset: -3px;
    }

    .sheet-thumbnail {
      align-items: center;
      aspect-ratio: 4 / 5;
      background: #ffffff;
      border-bottom: 1px solid #dfd1bf;
      color: #8c6e4a;
      display: flex;
      justify-content: center;
      margin-bottom: 0.6rem;
      overflow: hidden;
    }

    .sheet-thumbnail img {
      height: 100%;
      object-fit: cover;
      object-position: top;
      width: 100%;
    }

    .sheet-name {
      font-weight: 800;
      overflow-wrap: anywhere;
      padding: 0 3.5rem 0 1rem;
    }

    .sheet-meta {
      color: #8c6e4a;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0 1rem 1rem;
    }

    .delete-button {
      align-items: center;
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 999px;
      bottom: 0.75rem;
      color: #a23b2c;
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      min-height: 2.5rem;
      min-width: 2.5rem;
      padding: 0.5rem;
      position: absolute;
      right: 0.75rem;
    }

    .delete-button:hover {
      background: #f7ece9;
      border-color: #a23b2c;
    }
  `

  const thumbnailUrl =
    props.sheet.thumbnail && URL.createObjectURL(props.sheet.thumbnail)
  onCleanup(() => {
    if (thumbnailUrl) {
      URL.revokeObjectURL(thumbnailUrl)
    }
  })

  return (
    <li class="sheet-card">
      <a class="sheet-link" href={`/sheet-music/${props.sheet.id}`}>
        <span class="sheet-thumbnail">
          <Show
            when={thumbnailUrl}
            fallback={
              <PhIcon
                name={props.sheet.kind === "pdf" ? "file-pdf" : "image"}
                aria-hidden="true"
                size={40}
              />
            }
          >
            {(url) => <img src={url()} alt="" />}
          </Show>
        </span>
        <span class="sheet-name">{props.sheet.name}</span>
        <span class="sheet-meta">{describeSheet(props.sheet)}</span>
      </a>
      <button
        type="button"
        class="delete-button"
        aria-label={`Delete ${props.sheet.name}`}
        title="Delete"
        onClick={() => props.onDelete()}
      >
        <PhIcon name="trash" aria-hidden="true" size={18} />
      </button>
    </li>
  )
}

function describeSheet(sheet: SheetRecord): string {
  const kind = sheet.kind === "pdf" ? "PDF" : "Image"
  const pages =
    sheet.kind === "pdf"
      ? ` · ${sheet.pageCount} ${sheet.pageCount === 1 ? "page" : "pages"}`
      : ""

  return `${kind}${pages} · ${formatFileSize(sheet.size)}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function describeImportError(error: unknown): string {
  if (error instanceof SheetImportError) {
    return error.message
  }

  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "There isn’t enough storage space left on this device."
  }

  return "Something went wrong while saving it."
}
