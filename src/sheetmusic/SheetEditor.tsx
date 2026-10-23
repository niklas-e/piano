import {
  createEffect,
  createSignal,
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
  addStroke,
  appendPoint,
  commitInk,
  createInkHistory,
  type InkPages,
  type InkTool,
  inkStrokeCount,
  type Point,
  redoInk,
  removeStrokes,
  type Stroke,
  strokesTouchedByEraser,
  undoInk,
} from "../common/ink"
import { PhIcon } from "../common/PhIcon"
import type { IconName } from "../common/phosphorIcons"
import {
  type DrawingTool,
  ERASER_RADIUS_PX,
  INK_COLORS,
  LINE_WIDTH_OPTIONS,
  LINE_WIDTHS,
  type LineWidthName,
  MAX_FIT_WIDTH_PX,
  MIN_POINT_DISTANCE_PX,
  ZOOM_LEVELS,
} from "./drawingTools"
import { sheetMusicLibrary } from "./library"
import { SheetPage } from "./SheetPage"
import type { LoadedSheet } from "./SheetViewerPage"

type Gesture =
  | { type: "none" }
  | {
      type: "draw"
      pointerId: number
      pageIndex: number
      page: HTMLElement
      stroke: Stroke
    }
  | {
      type: "erase"
      pointerId: number
      pageIndex: number
      page: HTMLElement
      last: Point
    }
  | { type: "pan"; last: Point }

type SaveState = "saved" | "saving" | "failed"

const tools: readonly { tool: DrawingTool; label: string; icon: IconName }[] = [
  { tool: "scroll", label: "Scroll", icon: "hand" },
  { tool: "pen", label: "Pen", icon: "pen" },
  { tool: "highlighter", label: "Highlighter", icon: "highlighter" },
  { tool: "eraser", label: "Eraser", icon: "eraser" },
]

const saveDelayMs = 500

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

    .viewer-title {
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
      overflow-wrap: anywhere;
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

    .width-dot {
      background: currentColor;
      border-radius: 999px;
      display: block;
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
      cursor: auto;
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

    /* On phones, keep undo next to the tools and let the rest wrap below. */
    @media (max-width: 640px) {
      .toolbar {
        gap: 0.25rem 0.5rem;
        justify-content: center;
      }

      .tool-button {
        min-height: 2.5rem;
        min-width: 2.5rem;
        padding: 0.4rem;
      }

      .swatch {
        height: 1.75rem;
        width: 1.75rem;
      }

      .tool-group.tools {
        order: -2;
      }

      .tool-group.history {
        order: -1;
      }
    }
  `

  const { sheet } = props
  const [ink, setInk] = createSignal(createInkHistory(sheet.ink))
  const [tool, setTool] = createSignal<DrawingTool>(
    window.matchMedia("(pointer: coarse)").matches ? "scroll" : "pen",
  )
  const [colors, setColors] = createSignal<Record<InkTool, string>>({
    pen: INK_COLORS.pen[0].value,
    highlighter: INK_COLORS.highlighter[0].value,
  })
  const [lineWidths, setLineWidths] = createSignal<
    Record<InkTool, LineWidthName>
  >({ pen: "medium", highlighter: "medium" })
  const [zoom, setZoom] = createSignal(1)
  const [fitWidth, setFitWidth] = createSignal(0)
  const [draft, setDraft] = createSignal<{
    pageIndex: number
    stroke: Stroke
  }>()
  const [erased, setErased] = createSignal<ReadonlySet<Stroke>>(new Set())
  const [saveState, setSaveState] = createSignal<SaveState>("saved")

  const inkTool = (): InkTool | undefined => {
    const current = tool()
    return current === "pen" || current === "highlighter" ? current : undefined
  }
  const pageWidth = () => Math.floor(fitWidth() * zoom())
  const strokeCount = () => inkStrokeCount(ink().present)

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

  onMount(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushSave()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handleVisibilityChange)
    onCleanup(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handleVisibilityChange)
      void flushSave()
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

  /** Zooms while keeping the middle of the viewport on the same spot. */
  const changeZoom = (next: number) => {
    if (!pagesElement || !scroller) {
      setZoom(next)
      return
    }

    const before = pagesElement.getBoundingClientRect()
    const centerY = window.innerHeight / 2
    const centerX = scroller.clientWidth / 2
    const anchorY = (centerY - before.top) / before.height
    const anchorX = (scroller.scrollLeft + centerX) / pagesElement.scrollWidth

    setZoom(next)

    const after = pagesElement.getBoundingClientRect()
    window.scrollBy(0, after.top + anchorY * after.height - centerY)
    scroller.scrollLeft = anchorX * pagesElement.scrollWidth - centerX
  }

  const zoomIndex = () => ZOOM_LEVELS.indexOf(zoom())
  const zoomIn = () => {
    const next = ZOOM_LEVELS[zoomIndex() + 1]
    if (next !== undefined) {
      changeZoom(next)
    }
  }
  const zoomOut = () => {
    const next = ZOOM_LEVELS[zoomIndex() - 1]
    if (next !== undefined) {
      changeZoom(next)
    }
  }

  // --- Editing --------------------------------------------------------------

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
  const touches = new Map<number, Point>()
  // Once a stylus has been used, fingers only scroll, so a resting palm
  // doesn't leave marks.
  let hasSeenPen = false

  const touchCentroid = (): Point => {
    let x = 0
    let y = 0
    for (const touch of touches.values()) {
      x += touch.x
      y += touch.y
    }
    return { x: x / touches.size, y: y / touches.size }
  }

  const cancelGesture = () => {
    gesture = { type: "none" }
    setDraft(undefined)
    setErased(new Set<Stroke>())
  }

  const finishGesture = () => {
    if (gesture.type === "draw") {
      const { pageIndex, stroke } = gesture
      setInk((history) =>
        commitInk(history, addStroke(history.present, pageIndex, stroke)),
      )
    } else if (gesture.type === "erase" && erased().size > 0) {
      const removed = erased()
      setInk((history) =>
        commitInk(history, removeStrokes(history.present, removed)),
      )
    }

    cancelGesture()
  }

  const eraseAlong = (from: Point, to: Point, page: HTMLElement) => {
    if (gesture.type !== "erase") {
      return
    }

    const alreadyErased = erased()
    const candidates = ink().present[gesture.pageIndex].filter(
      (stroke) => !alreadyErased.has(stroke),
    )
    const radius = ERASER_RADIUS_PX / page.getBoundingClientRect().width
    const touched = strokesTouchedByEraser(candidates, from, to, radius)
    if (touched.length > 0) {
      setErased(new Set([...alreadyErased, ...touched]))
    }
  }

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    const currentTool = tool()
    if (currentTool === "scroll") {
      return
    }

    if (event.pointerType === "pen") {
      hasSeenPen = true
    }

    if (event.pointerType === "touch") {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (hasSeenPen || touches.size > 1) {
        // A second finger turns an accidental stroke into scrolling.
        if (gesture.type !== "pan") {
          cancelGesture()
        }
        gesture = { type: "pan", last: touchCentroid() }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (
      gesture.type !== "none" ||
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
    const pageIndex = Number(page.dataset.pageIndex)
    const point = pagePoint(event, page)

    if (currentTool === "eraser") {
      gesture = {
        type: "erase",
        pointerId: event.pointerId,
        pageIndex,
        page,
        last: point,
      }
      eraseAlong(point, point, page)
      return
    }

    const stroke: Stroke = {
      tool: currentTool,
      color: colors()[currentTool],
      width: LINE_WIDTHS[currentTool][lineWidths()[currentTool]],
      points: appendPoint([], point, 0),
    }
    gesture = {
      type: "draw",
      pointerId: event.pointerId,
      pageIndex,
      page,
      stroke,
    }
    setDraft({ pageIndex, stroke })
  }

  const handlePointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (gesture.type === "pan") {
        const centroid = touchCentroid()
        window.scrollBy(0, gesture.last.y - centroid.y)
        if (scroller) {
          scroller.scrollLeft += gesture.last.x - centroid.x
        }
        gesture = { type: "pan", last: centroid }
        return
      }
    }

    if (gesture.type === "none" || gesture.type === "pan") {
      return
    }
    if (gesture.pointerId !== event.pointerId) {
      return
    }

    const { page } = gesture
    const samples = event.getCoalescedEvents?.() ?? []
    const events = samples.length > 0 ? samples : [event]

    if (gesture.type === "erase") {
      for (const sample of events) {
        const point = pagePoint(sample, page)
        eraseAlong(gesture.last, point, page)
        gesture = { ...gesture, last: point }
      }
      return
    }

    const minDistance =
      MIN_POINT_DISTANCE_PX / page.getBoundingClientRect().width
    let { points } = gesture.stroke
    for (const sample of events) {
      points = appendPoint(points, pagePoint(sample, page), minDistance)
    }

    if (points !== gesture.stroke.points) {
      const stroke = { ...gesture.stroke, points }
      gesture = { ...gesture, stroke }
      setDraft({ pageIndex: gesture.pageIndex, stroke })
    }
  }

  const handlePointerEnd = (event: PointerEvent, isCancelled: boolean) => {
    if (touches.delete(event.pointerId) && gesture.type === "pan") {
      gesture =
        touches.size === 0
          ? { type: "none" }
          : { type: "pan", last: touchCentroid() }
      return
    }

    if (
      (gesture.type === "draw" || gesture.type === "erase") &&
      gesture.pointerId === event.pointerId
    ) {
      isCancelled && gesture.type === "draw" ? cancelGesture() : finishGesture()
    }
  }

  // Switching tools mid-stroke would leave a half-drawn line behind.
  createEffect(on(tool, () => cancelGesture(), { defer: true }))

  return (
    <section class="sheet-editor" aria-labelledby="sheet-title">
      <div class="viewer-heading">
        <h1 id="sheet-title" class="viewer-title">
          {sheet.record.name}
        </h1>
        <p class={`save-state ${saveState()}`} role="status" aria-live="polite">
          {saveState() === "saving"
            ? "Saving…"
            : saveState() === "failed"
              ? "Couldn’t save drawings"
              : strokeCount() > 0
                ? "Saved"
                : ""}
        </p>
      </div>

      <div class="toolbar" role="toolbar" aria-label="Drawing tools">
        <fieldset class="tool-group tools" aria-label="Tool">
          <For each={tools}>
            {(item) => (
              <button
                type="button"
                class="tool-button"
                aria-label={item.label}
                title={item.label}
                aria-pressed={tool() === item.tool}
                onClick={() => setTool(item.tool)}
              >
                <PhIcon name={item.icon} aria-hidden="true" size={22} />
              </button>
            )}
          </For>
        </fieldset>

        <Show when={inkTool()}>
          {(currentTool) => (
            <>
              <fieldset class="tool-group" aria-label="Color">
                <For each={INK_COLORS[currentTool()]}>
                  {(color) => (
                    <button
                      type="button"
                      class="swatch"
                      style={{ "--swatch": color.value }}
                      aria-label={color.label}
                      title={color.label}
                      aria-pressed={colors()[currentTool()] === color.value}
                      onClick={() =>
                        setColors((current) => ({
                          ...current,
                          [currentTool()]: color.value,
                        }))
                      }
                    />
                  )}
                </For>
              </fieldset>
              <fieldset class="tool-group" aria-label="Line width">
                <For each={LINE_WIDTH_OPTIONS}>
                  {(option) => (
                    <button
                      type="button"
                      class="tool-button"
                      aria-label={option.label}
                      title={option.label}
                      aria-pressed={lineWidths()[currentTool()] === option.name}
                      onClick={() =>
                        setLineWidths((current) => ({
                          ...current,
                          [currentTool()]: option.name,
                        }))
                      }
                    >
                      <span
                        class="width-dot"
                        style={{
                          width: `${option.dotSize}px`,
                          height: `${option.dotSize}px`,
                        }}
                      />
                    </button>
                  )}
                </For>
              </fieldset>
            </>
          )}
        </Show>

        <fieldset class="tool-group history" aria-label="History">
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
          <button
            type="button"
            class="tool-button"
            aria-label="Clear all drawings"
            title="Clear all drawings"
            disabled={strokeCount() === 0}
            onClick={clearAll}
          >
            <PhIcon name="broom" aria-hidden="true" size={22} />
          </button>
        </fieldset>

        <fieldset class="tool-group" aria-label="Zoom">
          <button
            type="button"
            class="tool-button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoomIndex() <= 0}
            onClick={zoomOut}
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
            disabled={zoomIndex() >= ZOOM_LEVELS.length - 1}
            onClick={zoomIn}
          >
            <PhIcon name="magnifying-glass-plus" aria-hidden="true" size={22} />
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
                />
              )}
            </Index>
          </Show>
        </div>
      </div>
    </section>
  )
}

function pagePoint(event: PointerEvent, page: HTMLElement): Point {
  const rect = page.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.width,
  }
}
