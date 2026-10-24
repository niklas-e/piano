import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  Index,
  type JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { css } from "solid-styled"
import {
  type DrawingTool,
  INK_COLORS,
  LINE_WIDTH_OPTIONS,
  LINE_WIDTH_SAMPLES,
  LINE_WIDTHS,
  type LineWidthName,
  MAX_FIT_WIDTH_PX,
  ZOOM_LEVELS,
} from "../common/drawingTools"
import {
  commitInk,
  createInkHistory,
  type InkPages,
  type InkTool,
  inkStrokeCount,
  type Point,
  redoInk,
  undoInk,
} from "../common/ink"
import { PhIcon } from "../common/PhIcon"
import type { IconName } from "../common/phosphorIcons"
import {
  readInkColorPreference,
  readLineWidthPreference,
  writeInkColorPreference,
  writeLineWidthPreference,
} from "../common/preferences"
import { exitFullscreen, requestFullscreen } from "../common/screen"
import { downloadFile, exportAnnotatedSheet } from "../common/sheetExport"
import { EditableTitle } from "./EditableTitle"
import { FullScreenView } from "./FullScreenView"
import { sheetMusicLibrary } from "./library"
import { SheetPage } from "./SheetPage"
import type { LoadedSheet } from "./SheetViewerPage"
import { createStrokeInput, type StrokeStyle } from "./strokeInput"

/** Drawing and erasing are handled by `createStrokeInput`. */
type Gesture =
  | { type: "none" }
  | {
      type: "pan"
      last: Point
      /** Finger spread and zoom when two fingers came down, for pinching. */
      pinch: { distance: number; zoom: number } | undefined
    }

type SaveState = "saved" | "saving" | "failed"
type ExportState = "idle" | "exporting" | "failed" | "share-ready"

const tools: readonly { tool: DrawingTool; label: string; icon: IconName }[] = [
  { tool: "scroll", label: "Scroll", icon: "hand" },
  { tool: "pen", label: "Pen", icon: "pen" },
  { tool: "highlighter", label: "Highlighter", icon: "highlighter" },
  { tool: "eraser", label: "Eraser", icon: "eraser" },
]

const saveDelayMs = 500
const minZoom = Math.min(...ZOOM_LEVELS)
const maxZoom = Math.max(...ZOOM_LEVELS)

export function SheetEditor(props: { sheet: LoadedSheet }) {
  css`
    .sheet-editor {
      display: grid;
      gap: 0.75rem;
    }

    .viewer-heading {
      align-items: baseline;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      justify-content: space-between;
    }

    .save-state {
      color: #8c6e4a;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .save-state.failed {
      color: #a23b2c;
    }

    .toolbar {
      align-items: center;
      background: #f7f0e6;
      border-bottom: 1px solid #dfd1bf;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      margin-inline: -0.5rem;
      padding: 0.5rem;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .tool-group {
      align-items: center;
      display: flex;
      flex: none;
      gap: 0.25rem;
    }

    /* Drawing on the left, and looking around the sheet on the right. */
    .tool-group.zoom {
      margin-inline-start: auto;
    }

    .tool-button {
      align-items: center;
      border: 1px solid transparent;
      border-radius: 0.75rem;
      cursor: pointer;
      display: inline-flex;
      font-weight: 800;
      justify-content: center;
      min-height: 2.75rem;
      min-width: 2.75rem;
      padding: 0.5rem;
    }

    .tool-button:hover:not(:disabled) {
      background: #efe3d2;
    }

    .tool-button[aria-pressed="true"] {
      background: #2f251d;
      color: #fffaf2;
    }

    .tool-button:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }

    .zoom-level {
      font-feature-settings: "tnum" 1;
      font-size: 0.9rem;
      min-width: 4rem;
    }

    .page-picker {
      align-items: center;
      border-radius: 0.75rem;
      display: inline-flex;
      min-height: 2.75rem;
      position: relative;
    }

    .page-picker:hover {
      background: #efe3d2;
    }

    .page-select {
      appearance: none;
      background: none;
      cursor: pointer;
      font-feature-settings: "tnum" 1;
      font-size: 0.9rem;
      font-weight: 800;
      min-height: 2.75rem;
      padding: 0.5rem 1.6rem 0.5rem 0.6rem;
    }

    .page-picker :global(.ph-icon) {
      pointer-events: none;
      position: absolute;
      right: 0.4rem;
    }

    .style-button {
      gap: 0.125rem;
      padding-inline: 0.375rem;
    }

    .style-button :global(.ph-icon) {
      opacity: 0.6;
    }

    .style:popover-open {
      display: grid;
      gap: 0.25rem;
    }

    .style-options {
      display: flex;
      gap: 0.25rem;
    }

    .width-option[aria-pressed="true"] {
      background: none;
      box-shadow: inset 0 0 0 2px #2f251d;
    }

    .width-option[aria-pressed="true"]:hover {
      background: #efe3d2;
    }

    .swatch {
      background: var(--swatch);
      border: 2px solid #fffaf2;
      border-radius: 999px;
      box-shadow: 0 0 0 1px #cdbba6;
      cursor: pointer;
      height: 2rem;
      margin: 0.375rem;
      padding: 0;
      width: 2rem;
    }

    .swatch[aria-pressed="true"] {
      box-shadow: 0 0 0 2px #2f251d;
    }

    .popover {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 0.75rem;
      box-shadow: 0 0.5rem 1.5rem rgba(47, 37, 29, 0.18);
      margin: auto;
      padding: 0.375rem;
    }

    /* Just below the button that opened it, kept on screen. Without anchor
       positioning, it's shown in the middle of the screen instead. */
    @supports (position-area: block-end) {
      .popover {
        inset: auto;
        margin: 0.25rem 0;
        position-area: block-end span-inline-end;
        position-try-fallbacks: flip-inline;
      }

      .popover.menu {
        position-area: block-end span-inline-start;
      }
    }

    .menu {
      flex-direction: column;
    }

    .menu:popover-open {
      display: flex;
    }

    .menu-item {
      align-items: center;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      font-weight: 700;
      gap: 0.75rem;
      min-height: 2.75rem;
      padding: 0.5rem 1rem 0.5rem 0.75rem;
      text-align: start;
      white-space: nowrap;
    }

    .menu-item:hover:not(:disabled) {
      background: #efe3d2;
    }

    .menu-item:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }

    .pages-scroll {
      overflow-x: auto;
    }

    .pages {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 100%;
      padding: 0.5rem 0 2rem;
      width: max-content;
    }

    .pages[data-tool="scroll"] {
      cursor: grab;
    }

    .pages[data-tool="scroll"]:active {
      cursor: grabbing;
    }

    /* While drawing, the page must not scroll under the finger or pen. Two
       fingers still scroll, handled by the editor itself. */
    .pages:not([data-tool="scroll"]) {
      touch-action: none;
    }

    .pages[data-tool="pen"],
    .pages[data-tool="highlighter"] {
      cursor: crosshair;
    }

    .pages[data-tool="eraser"] {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='11' cy='11' r='10' fill='white' fill-opacity='0.5' stroke='%232f251d' stroke-width='1.5'/%3E%3C/svg%3E") 11 11, cell;
    }

    @media (max-width: 640px) {
      .toolbar {
        gap: 0.25rem 0.5rem;
        justify-content: center;
      }

      .tool-group.zoom {
        margin-inline-start: 0;
      }

      .tool-button {
        min-height: 2.5rem;
        min-width: 2.5rem;
        padding: 0.4rem;
      }

    }
  `

  const { sheet } = props
  const [ink, setInk] = createSignal(createInkHistory(sheet.ink))
  const [tool, setTool] = createSignal<DrawingTool>(
    window.matchMedia("(pointer: coarse)").matches ? "scroll" : "pen",
  )
  const [colors, setColors] = createSignal<Record<InkTool, string>>({
    pen: readInkColorPreference("pen"),
    highlighter: readInkColorPreference("highlighter"),
  })
  const [lineWidths, setLineWidths] = createSignal<
    Record<InkTool, LineWidthName>
  >({
    pen: readLineWidthPreference("pen"),
    highlighter: readLineWidthPreference("highlighter"),
  })
  const [zoom, setZoom] = createSignal(1)
  const [fitWidth, setFitWidth] = createSignal(0)
  const [saveState, setSaveState] = createSignal<SaveState>("saved")
  const [exportState, setExportState] = createSignal<ExportState>("idle")
  const [name, setName] = createSignal(sheet.record.name)
  const [renameFailed, setRenameFailed] = createSignal(false)
  const [currentPage, setCurrentPage] = createSignal(sheet.record.lastPage)
  const [fullScreen, setFullScreen] = createSignal<{ startPage: number }>()

  const strokeStyle = (tool: InkTool): StrokeStyle => ({
    tool,
    color: colors()[tool],
    width: LINE_WIDTHS[tool][lineWidths()[tool]],
  })
  /** A stylus in full screen draws with the chosen tool, or else the pen. */
  const stylusStyle = (): StrokeStyle | "eraser" => {
    const current = tool()
    if (current === "eraser") {
      return "eraser"
    }
    return strokeStyle(current === "scroll" ? "pen" : current)
  }

  const inkTool = (): InkTool | undefined => {
    const current = tool()
    return current === "pen" || current === "highlighter" ? current : undefined
  }
  /** The tool whose style is shown, which is the pen when none draws. */
  const styledTool = () => inkTool() ?? "pen"
  const pageWidth = () => Math.floor(fitWidth() * zoom())
  const strokeCount = () => inkStrokeCount(ink().present)

  let toolbar: HTMLDivElement | undefined
  let menu: HTMLFieldSetElement | undefined
  const menuId = createUniqueId()
  const styleId = createUniqueId()
  let stylePopover: HTMLFieldSetElement | undefined
  const isStyleOpen = () => stylePopover?.matches(":popover-open") ?? false
  const closeStyle = () => {
    if (isStyleOpen()) {
      stylePopover?.hidePopover()
    }
  }
  // Tapping the active pen or highlighter again opens its style, and once
  // more closes it. The tap closes it by itself before its click arrives, so
  // whether it was open is noted when the tap starts.
  let styleWasOpen = false
  let scroller: HTMLDivElement | undefined
  let pagesElement: HTMLDivElement | undefined

  // --- Saving ---------------------------------------------------------------

  let pendingSave: InkPages | undefined
  let saveTimer: number | undefined

  const flushSave = async () => {
    window.clearTimeout(saveTimer)
    const pages = pendingSave
    if (!pages) {
      return
    }

    pendingSave = undefined
    try {
      await sheetMusicLibrary.saveInk(sheet.record.id, pages)
      if (!pendingSave) {
        setSaveState("saved")
      }
    } catch {
      setSaveState("failed")
    }
  }

  createEffect(
    on(
      () => ink().present,
      (pages) => {
        pendingSave = pages
        setSaveState("saving")
        window.clearTimeout(saveTimer)
        saveTimer = window.setTimeout(() => void flushSave(), saveDelayMs)
      },
      { defer: true },
    ),
  )

  // Reopening the sheet later continues from the same page.
  let lastPageTimer: number | undefined
  const saveLastPage = () => {
    window.clearTimeout(lastPageTimer)
    lastPageTimer = undefined
    sheetMusicLibrary.saveLastPage(sheet.record.id, currentPage()).catch(() => {
      // Only a convenience. The sheet opens on the first page instead.
    })
  }
  const flushLastPage = () => {
    if (lastPageTimer !== undefined) {
      saveLastPage()
    }
  }
  createEffect(
    on(
      currentPage,
      () => {
        window.clearTimeout(lastPageTimer)
        lastPageTimer = window.setTimeout(saveLastPage, saveDelayMs)
      },
      { defer: true },
    ),
  )

  onMount(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushSave()
        flushLastPage()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handleVisibilityChange)
    onCleanup(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handleVisibilityChange)
      void flushSave()
      flushLastPage()
    })
  })

  // --- Layout ---------------------------------------------------------------

  onMount(() => {
    if (!scroller) {
      return
    }

    const target = scroller
    const updateFitWidth = () =>
      setFitWidth(Math.min(target.clientWidth, MAX_FIT_WIDTH_PX))
    updateFitWidth()
    const observer = new ResizeObserver(updateFitWidth)
    observer.observe(target)
    onCleanup(() => observer.disconnect())
  })

  /**
   * Zooms while keeping the spot under `anchor` (in client coordinates, the
   * middle of the viewport by default) where it is.
   */
  const changeZoom = (
    next: number,
    anchor: Point = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    },
  ) => {
    const clamped = Math.min(maxZoom, Math.max(minZoom, next))
    if (!pagesElement || !scroller) {
      setZoom(clamped)
      return
    }

    const before = pagesElement.getBoundingClientRect()
    const scrollerLeft = scroller.getBoundingClientRect().left
    const anchorY = (anchor.y - before.top) / before.height
    const anchorX =
      (scroller.scrollLeft + anchor.x - scrollerLeft) / pagesElement.scrollWidth

    setZoom(clamped)

    const after = pagesElement.getBoundingClientRect()
    window.scrollBy(0, after.top + anchorY * after.height - anchor.y)
    scroller.scrollLeft =
      anchorX * pagesElement.scrollWidth - (anchor.x - scrollerLeft)
  }

  const nextZoomLevel = () => ZOOM_LEVELS.find((level) => level > zoom() + 0.01)
  const previousZoomLevel = () =>
    ZOOM_LEVELS.findLast((level) => level < zoom() - 0.01)

  onMount(() => {
    if (!scroller) {
      return
    }

    // Trackpad pinches arrive as wheel events with the Ctrl key held, and so
    // does Ctrl + mouse wheel.
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return
      }

      event.preventDefault()
      const delta = Math.max(-40, Math.min(40, event.deltaY))
      changeZoom(zoom() * Math.exp(-delta * 0.005), {
        x: event.clientX,
        y: event.clientY,
      })
    }
    scroller.addEventListener("wheel", handleWheel, { passive: false })
    onCleanup(() => scroller?.removeEventListener("wheel", handleWheel))
  })

  const pageElements = () =>
    pagesElement?.querySelectorAll<HTMLElement>("[data-page-index]") ?? []

  /** The page being read: the one a third of the way down the visible area. */
  const pageInView = (): number => {
    const top = toolbar?.getBoundingClientRect().bottom ?? 0
    const readingLine = top + (window.innerHeight - top) / 3
    const pages = [...pageElements()]
    const index = pages.findIndex(
      (page) => page.getBoundingClientRect().bottom > readingLine,
    )
    return index === -1 ? Math.max(0, pages.length - 1) : index
  }

  const goToPage = (page: number) => {
    pageElements()[page]?.scrollIntoView({ block: "start" })
    setCurrentPage(page)
  }

  onMount(() => {
    // Open on the page that was read last, once the pages exist after the
    // first layout.
    queueMicrotask(() => {
      if (currentPage() > 0) {
        goToPage(currentPage())
      }
    })

    let frame: number | undefined
    const updateCurrentPage = () => {
      frame = undefined
      // Full screen keeps track of its own page, while resizing to it
      // moves the pages here.
      if (fullScreen() === undefined) {
        setCurrentPage(pageInView())
      }
    }
    const scheduleUpdate = () => {
      frame ??= window.requestAnimationFrame(updateCurrentPage)
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)
    onCleanup(() => {
      window.cancelAnimationFrame(frame ?? 0)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    })
  })

  const enterFullScreen = () => {
    // Asked for straight away, while the tap still allows it.
    requestFullscreen()
    setFullScreen({ startPage: pageInView() })
  }

  const exitFullScreen = (page: number) => {
    const { startPage } = fullScreen() ?? {}
    setFullScreen(undefined)
    // Without turning, the pages are still where they were left.
    if (page === startPage) {
      return
    }

    const showPage = () =>
      pageElements()[page]?.scrollIntoView({ block: "start" })
    showPage()
    // Leaving the browser's full screen puts back the scroll position from
    // before it.
    void exitFullscreen().then(showPage)
  }

  // --- Editing --------------------------------------------------------------

  const changeInk = (change: (pages: InkPages) => InkPages) =>
    setInk((history) => commitInk(history, change(history.present)))
  const undo = () => setInk(undoInk)
  const redo = () => setInk(redoInk)
  const clearAll = () =>
    setInk((history) =>
      commitInk(
        history,
        history.present.map(() => []),
      ),
    )

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        // Text fields keep their own undo.
        event.target instanceof HTMLInputElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === "z") {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      } else if (key === "y") {
        event.preventDefault()
        redo()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  // --- Pointer input --------------------------------------------------------

  let gesture: Gesture = { type: "none" }
  // Pointers that may scroll: fingers while drawing, and the mouse with the
  // scroll tool. Touch scrolling with the scroll tool is left to the browser.
  const panPointers = new Map<number, Point>()
  // Once a stylus has been used, fingers only scroll, so a resting palm
  // doesn't leave marks.
  let hasSeenPen = false

  const startPan = () => {
    const pointers = [...panPointers.values()]
    gesture = {
      type: "pan",
      last: centroid(pointers),
      pinch:
        pointers.length >= 2
          ? { distance: distance(pointers[0], pointers[1]), zoom: zoom() }
          : undefined,
    }
  }

  const strokeInput = createStrokeInput({
    ink: () => ink().present,
    commit: changeInk,
  })
  const { draft, erased } = strokeInput

  const cancelGesture = () => {
    gesture = { type: "none" }
    strokeInput.cancel()
  }

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    // A tap that closes a popover only closes it.
    if (toolbar?.querySelector(":popover-open")) {
      return
    }

    const currentTool = tool()
    if (currentTool === "scroll") {
      if (event.pointerType === "mouse" && event.button === 0) {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        panPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        startPan()
      }
      return
    }

    if (event.pointerType === "pen") {
      hasSeenPen = true
    }

    if (event.pointerType === "touch") {
      panPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (hasSeenPen || panPointers.size > 1) {
        // A second finger turns an accidental stroke into scrolling.
        if (gesture.type !== "pan") {
          cancelGesture()
        }
        startPan()
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (
      gesture.type !== "none" ||
      strokeInput.isActive() ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return
    }

    const page =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-page-index]")
        : null
    if (!page) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    strokeInput.start(
      event,
      page,
      currentTool === "eraser" ? "eraser" : strokeStyle(currentTool),
    )
  }

  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    if (panPointers.has(event.pointerId)) {
      panPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (gesture.type === "pan") {
        const pointers = [...panPointers.values()]
        const center = centroid(pointers)
        // Scroll first so the content follows the fingers, then zoom around
        // where they are now.
        window.scrollBy(0, gesture.last.y - center.y)
        if (scroller) {
          scroller.scrollLeft += gesture.last.x - center.x
        }
        if (gesture.pinch && pointers.length >= 2) {
          const spread = distance(pointers[0], pointers[1])
          changeZoom(
            (gesture.pinch.zoom * spread) / gesture.pinch.distance,
            center,
          )
        }
        gesture = { ...gesture, last: center }
        return
      }
    }

    if (gesture.type === "none") {
      strokeInput.move(event)
    }
  }

  const handlePointerEnd = (event: PointerEvent, isCancelled: boolean) => {
    if (panPointers.delete(event.pointerId) && gesture.type === "pan") {
      if (panPointers.size === 0) {
        gesture = { type: "none" }
      } else {
        startPan()
      }
      return
    }

    strokeInput.end(event, isCancelled)
  }

  // --- Exporting ------------------------------------------------------------

  let preparedExport: { pages: InkPages; name: string; file: File } | undefined

  const prepareExport = async (): Promise<File> => {
    const pages = ink().present
    const currentName = name()
    if (
      preparedExport?.pages !== pages ||
      preparedExport.name !== currentName
    ) {
      const file = await exportAnnotatedSheet(
        { ...sheet.record, name: currentName },
        sheet.file,
        pages,
        sheet.pdf,
      )
      preparedExport = { pages, name: currentName, file }
    }
    return preparedExport.file
  }

  const rename = (next: string) => {
    const previous = name()
    setName(next)
    setRenameFailed(false)
    sheetMusicLibrary.rename(sheet.record.id, next).catch(() => {
      setName(previous)
      setRenameFailed(true)
    })
  }

  const download = async () => {
    setExportState("exporting")
    try {
      downloadFile(await prepareExport())
      setExportState("idle")
    } catch {
      setExportState("failed")
    }
  }

  const canShareFiles = (() => {
    try {
      return (
        typeof navigator.canShare === "function" &&
        navigator.canShare({
          files: [new File([], "sheet", { type: sheet.record.mimeType })],
        })
      )
    } catch {
      return false
    }
  })()

  const share = async () => {
    setExportState("exporting")
    try {
      const file = await prepareExport()
      await navigator.share({ files: [file], title: name() })
      setExportState("idle")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setExportState("idle")
      } else if (
        error instanceof DOMException &&
        error.name === "NotAllowedError"
      ) {
        // Preparing a large file can outlast the tap that allowed sharing.
        // The file is ready now, so the next tap shares straight away.
        setExportState("share-ready")
      } else {
        setExportState("failed")
      }
    }
  }

  const statusText = () => {
    if (renameFailed()) {
      return "Couldn’t rename"
    }

    const currentExport = exportState()
    switch (currentExport) {
      case "exporting":
        return "Preparing file…"
      case "failed":
        return "Couldn’t prepare the file"
      case "share-ready":
        return "Ready, tap Share again"
      case "idle":
        break
      default: {
        const exhaustive: never = currentExport
        throw new Error(`Unhandled export state: ${exhaustive}`)
      }
    }

    const currentSave = saveState()
    switch (currentSave) {
      case "saving":
        return "Saving…"
      case "failed":
        return "Couldn’t save drawings"
      case "saved":
        return strokeCount() > 0 ? "Saved" : ""
      default: {
        const exhaustive: never = currentSave
        throw new Error(`Unhandled save state: ${exhaustive}`)
      }
    }
  }

  // Switching tools mid-stroke would leave a half-drawn line behind.
  createEffect(on(tool, () => cancelGesture(), { defer: true }))

  return (
    <>
      <section class="sheet-editor" aria-labelledby="sheet-title">
        <div class="viewer-heading">
          <EditableTitle id="sheet-title" title={name()} onRename={rename} />
          <p
            class={`save-state${
              saveState() === "failed" ||
              exportState() === "failed" ||
              renameFailed()
                ? " failed"
                : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {statusText()}
          </p>
        </div>

        <div
          ref={toolbar}
          class="toolbar"
          role="toolbar"
          aria-label="Drawing tools"
        >
          <fieldset class="tool-group" aria-label="Tool">
            <For each={tools}>
              {(item) => (
                <button
                  type="button"
                  class="tool-button"
                  aria-label={item.label}
                  title={item.label}
                  aria-pressed={tool() === item.tool}
                  onPointerDown={() => {
                    styleWasOpen = isStyleOpen()
                  }}
                  onClick={(event) => {
                    const wasOpen = styleWasOpen || isStyleOpen()
                    styleWasOpen = false
                    if (tool() !== item.tool || inkTool() === undefined) {
                      setTool(item.tool)
                    } else if (wasOpen) {
                      closeStyle()
                    } else {
                      stylePopover?.showPopover({ source: event.currentTarget })
                    }
                  }}
                >
                  <PhIcon name={item.icon} aria-hidden="true" size={22} />
                </button>
              )}
            </For>
          </fieldset>

          <button
            type="button"
            class="tool-button style-button"
            aria-label="Color and line width"
            title="Color and line width"
            disabled={inkTool() === undefined}
            popovertarget={styleId}
          >
            <StrokeSample
              tool={styledTool()}
              color={colors()[styledTool()]}
              width={lineWidths()[styledTool()]}
            />
            <PhIcon name="caret-down" aria-hidden="true" size={14} />
          </button>
          <fieldset
            ref={stylePopover}
            id={styleId}
            class="popover style"
            popover
            aria-label="Color and line width"
          >
            <fieldset class="style-options" aria-label="Color">
              <For each={INK_COLORS[styledTool()]}>
                {(color) => (
                  <button
                    type="button"
                    class="swatch"
                    style={{ "--swatch": color.value }}
                    aria-label={color.label}
                    title={color.label}
                    aria-pressed={colors()[styledTool()] === color.value}
                    onClick={() => {
                      setColors((current) => ({
                        ...current,
                        [styledTool()]: color.value,
                      }))
                      writeInkColorPreference(styledTool(), color.value)
                    }}
                  />
                )}
              </For>
            </fieldset>
            <fieldset class="style-options" aria-label="Line width">
              <For each={LINE_WIDTH_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class="tool-button width-option"
                    aria-label={option.label}
                    title={option.label}
                    aria-pressed={lineWidths()[styledTool()] === option.name}
                    onClick={() => {
                      setLineWidths((current) => ({
                        ...current,
                        [styledTool()]: option.name,
                      }))
                      writeLineWidthPreference(styledTool(), option.name)
                    }}
                  >
                    <StrokeSample
                      tool={styledTool()}
                      color={colors()[styledTool()]}
                      width={option.name}
                    />
                  </button>
                )}
              </For>
            </fieldset>
          </fieldset>

          <fieldset class="tool-group" aria-label="History">
            <button
              type="button"
              class="tool-button"
              aria-label="Undo"
              title="Undo"
              disabled={ink().past.length === 0}
              onClick={undo}
            >
              <PhIcon
                name="arrow-counter-clockwise"
                aria-hidden="true"
                size={22}
              />
            </button>
            <button
              type="button"
              class="tool-button"
              aria-label="Redo"
              title="Redo"
              disabled={ink().future.length === 0}
              onClick={redo}
            >
              <PhIcon name="arrow-clockwise" aria-hidden="true" size={22} />
            </button>
          </fieldset>

          <fieldset class="tool-group zoom" aria-label="Zoom">
            <button
              type="button"
              class="tool-button"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={previousZoomLevel() === undefined}
              onClick={() => changeZoom(previousZoomLevel() ?? zoom())}
            >
              <PhIcon
                name="magnifying-glass-minus"
                aria-hidden="true"
                size={22}
              />
            </button>
            <button
              type="button"
              class="tool-button zoom-level"
              aria-label={`Zoom ${Math.round(zoom() * 100)}%, reset to fit width`}
              title="Fit width"
              onClick={() => changeZoom(1)}
            >
              {Math.round(zoom() * 100)}%
            </button>
            <button
              type="button"
              class="tool-button"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={nextZoomLevel() === undefined}
              onClick={() => changeZoom(nextZoomLevel() ?? zoom())}
            >
              <PhIcon
                name="magnifying-glass-plus"
                aria-hidden="true"
                size={22}
              />
            </button>
          </fieldset>

          <fieldset class="tool-group" aria-label="Pages">
            <Show when={sheet.pages.length > 1}>
              <label class="page-picker" title="Go to page">
                <select
                  class="page-select"
                  aria-label="Page"
                  onChange={(event) =>
                    goToPage(Number(event.currentTarget.value))
                  }
                >
                  <Index each={sheet.pages}>
                    {(_, index) => (
                      <option value={index} selected={index === currentPage()}>
                        {index + 1} / {sheet.pages.length}
                      </option>
                    )}
                  </Index>
                </select>
                <PhIcon name="caret-down" aria-hidden="true" size={14} />
              </label>
            </Show>
            <button
              type="button"
              class="tool-button"
              aria-label="Full screen"
              title="Full screen"
              onClick={enterFullScreen}
            >
              <PhIcon name="corners-out" aria-hidden="true" size={22} />
            </button>
          </fieldset>

          <button
            type="button"
            class="tool-button"
            aria-label="More"
            title="More"
            popovertarget={menuId}
          >
            <PhIcon name="dots-three" aria-hidden="true" size={22} />
          </button>
          <fieldset
            ref={menu}
            id={menuId}
            class="popover menu"
            popover
            aria-label="More"
          >
            <button
              type="button"
              class="menu-item"
              disabled={exportState() === "exporting"}
              onClick={() => {
                menu?.hidePopover()
                void download()
              }}
            >
              <PhIcon name="download-simple" aria-hidden="true" size={22} />
              Download with drawings
            </button>
            <Show when={canShareFiles}>
              <button
                type="button"
                class="menu-item"
                disabled={exportState() === "exporting"}
                onClick={() => {
                  menu?.hidePopover()
                  void share()
                }}
              >
                <PhIcon name="share-network" aria-hidden="true" size={22} />
                Share with drawings
              </button>
            </Show>
            <button
              type="button"
              class="menu-item"
              disabled={strokeCount() === 0}
              onClick={() => {
                menu?.hidePopover()
                clearAll()
              }}
            >
              <PhIcon name="broom" aria-hidden="true" size={22} />
              Clear all drawings
            </button>
          </fieldset>
        </div>

        <div ref={scroller} class="pages-scroll">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Drawing is a pointer-only activity; the toolbar and the pages stay usable without it. */}
          <div
            ref={pagesElement}
            class="pages"
            data-tool={tool()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerEnd(event, false)}
            onPointerCancel={(event) => handlePointerEnd(event, true)}
            onLostPointerCapture={(event) => handlePointerEnd(event, true)}
            onContextMenu={(event) => {
              if (tool() !== "scroll") {
                event.preventDefault()
              }
            }}
          >
            <Show when={fitWidth() > 0}>
              <Index each={sheet.pages}>
                {(source, index) => (
                  <SheetPage
                    index={index}
                    pageCount={sheet.pages.length}
                    source={source()}
                    width={pageWidth()}
                    strokes={ink().present[index]}
                    draft={
                      draft()?.pageIndex === index ? draft()?.stroke : undefined
                    }
                    hidden={erased()}
                    // Full screen covers these, so their memory is better
                    // spent on its own pages.
                    active={fullScreen() ? false : undefined}
                  />
                )}
              </Index>
            </Show>
          </div>
        </div>
      </section>

      <Show when={fullScreen()}>
        {(entered) => (
          <FullScreenView
            pages={sheet.pages}
            name={name()}
            ink={ink().present}
            startPage={entered().startPage}
            stylusStyle={stylusStyle()}
            canUndo={ink().past.length > 0}
            onInkChange={changeInk}
            onUndo={undo}
            onPageChange={setCurrentPage}
            onExit={exitFullScreen}
          />
        )}
      </Show>
    </>
  )
}

/** A short squiggle showing how a stroke will look. */
function StrokeSample(props: {
  tool: InkTool
  color: string
  width: LineWidthName
}) {
  return (
    <svg width="36" height="20" viewBox="0 0 36 20" aria-hidden="true">
      <path
        d="M5 12c3-5 6-6 9-3s5 5 8 2 5-5 9-3"
        fill="none"
        stroke={props.color}
        stroke-width={LINE_WIDTH_SAMPLES[props.tool][props.width]}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

function centroid(points: readonly Point[]): Point {
  const sum = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function distance(a: Point, b: Point): number {
  return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
}
