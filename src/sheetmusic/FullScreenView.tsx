import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  type JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { css } from "solid-styled"
import type { InkPages, Point } from "../common/ink"
import { PhIcon } from "../common/PhIcon"
import {
  type PageRegion,
  regionAspectRatio,
  WHOLE_PAGE,
} from "../common/pageMargins"
import {
  chooseLayout,
  fitPageWidth,
  type Place,
  pageBox,
  pageViews,
  placeOfView,
  type Size,
  SPREAD_GAP_PX,
  stageAction,
  viewIndexForPlace,
  viewLabel,
  viewPages,
} from "../common/pageTurns"
import {
  readHalfPageTurnsPreference,
  readTrimMarginsPreference,
  writeHalfPageTurnsPreference,
  writeTrimMarginsPreference,
} from "../common/preferences"
import { exitFullscreen, keepScreenOn } from "../common/screen"
import { type PageSource, SheetPage } from "./SheetPage"
import { createStrokeInput, type StrokeStyle } from "./strokeInput"
import { findTrimRegion } from "./trimMargins"

/** How long the controls stay up after opening, before the music is alone. */
const initialControlsMs = 2500

const forwardKeys = new Set(["ArrowRight", "ArrowDown", "PageDown", " "])
const backKeys = new Set(["ArrowLeft", "ArrowUp", "PageUp"])

/**
 * Shows whole pages on a plain background, for playing from. Taps, swipes
 * and the keyboard turn pages, including page turner pedals, which type
 * arrow or page keys.
 */
export function FullScreenView(props: {
  pages: readonly PageSource[]
  name: string
  ink: InkPages
  startPage: number
  /** What a stylus draws with. Fingers and the mouse turn pages. */
  stylusStyle: StrokeStyle | "eraser"
  canUndo: boolean
  onInkChange: (change: (pages: InkPages) => InkPages) => void
  onUndo: () => void
  onPageChange: (page: number) => void
  onExit: (page: number) => void
}) {
  css`
    .full-screen {
      background: #1d1712;
      color: #fffaf2;
      height: 100%;
      inset: 0;
      max-height: none;
      max-width: none;
      overflow: hidden;
      /* The sheet behind keeps its scroll position. */
      overscroll-behavior: contain;
      position: fixed;
      touch-action: none;
      width: 100%;
    }

    .full-screen::backdrop {
      background: #1d1712;
    }

    .stage {
      align-items: center;
      display: flex;
      inset: 0;
      justify-content: center;
      outline: none;
      position: absolute;
      user-select: none;
      -webkit-user-select: none;
    }

    .controls {
      align-items: center;
      background: rgba(29, 23, 18, 0.92);
      display: flex;
      gap: 0.5rem 1rem;
      inset: 0 0 auto;
      justify-content: space-between;
      opacity: 0;
      padding: 0.5rem;
      pointer-events: none;
      position: absolute;
      transform: translateY(-100%);
      transition: opacity 160ms ease, transform 160ms ease;
    }

    .full-screen[data-controls="shown"] .controls,
    .controls:has(:focus-visible) {
      opacity: 1;
      pointer-events: auto;
      transform: none;
    }

    .title {
      flex: 1;
      font-weight: 800;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .paging {
      align-items: center;
      display: flex;
      gap: 0.25rem;
    }

    .page-label {
      font-feature-settings: "tnum" 1;
      min-width: 4.5rem;
      text-align: center;
    }

    .control {
      align-items: center;
      border-radius: 0.75rem;
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      min-height: 2.75rem;
      min-width: 2.75rem;
      padding: 0.5rem;
    }

    .control:hover:not(:disabled, [aria-pressed="true"]) {
      background: rgba(255, 250, 242, 0.12);
    }

    /* On phones, the title gets a row of its own above the buttons. */
    @media (max-width: 560px) {
      .controls {
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .title {
        flex-basis: 100%;
        order: -1;
        padding-inline: 0.5rem;
      }
    }

    .control[aria-pressed="true"] {
      background: #fffaf2;
      color: #1d1712;
    }

    .trim {
      background: #ffffff;
      overflow: hidden;
      position: relative;
    }

    .trimmed-page {
      position: absolute;
    }

    /* The top half of the next page, over the end of the one being read. */
    .upcoming {
      align-items: center;
      clip-path: inset(0 0 50% 0);
      display: flex;
      inset: 0;
      justify-content: center;
      position: absolute;
      z-index: 1;
    }

    .half-divider {
      border-top: 2px solid rgba(29, 23, 18, 0.55);
      box-shadow: 0 0 10px 2px rgba(29, 23, 18, 0.3);
      inset: 50% 0 auto;
      pointer-events: none;
      position: absolute;
      z-index: 2;
    }

    .control:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }
  `

  // The place being read is kept rather than the view, so turning the
  // screen between one and two pages at a time stays on the same page.
  const [place, setPlace] = createSignal<Place>({
    page: props.startPage,
    halfway: false,
  })
  const [stage, setStage] = createSignal<Size>({ width: 0, height: 0 })
  const [controlsShown, setControlsShown] = createSignal(true)
  const [halfPageTurns, setHalfPageTurns] = createSignal(
    readHalfPageTurnsPreference(),
  )

  // Scores rarely mix page sizes, so the first page decides for all.
  const layout = createMemo(() =>
    chooseLayout(stage(), props.pages[0].aspectRatio, props.pages.length),
  )
  const views = createMemo(() =>
    pageViews(props.pages.length, layout(), halfPageTurns()),
  )
  const viewIndex = createMemo(() => viewIndexForPlace(views(), place()))
  const view = () => views()[viewIndex()]
  const page = () => place().page
  const isVisible = (page: number) => viewPages(view()).includes(page)
  /** The next page, while its top half shows over the end of this one. */
  const upcomingPage = () => {
    const current = view()
    return current.kind === "half" ? current.next : undefined
  }
  // The views either side are rendered too, so turning to them is instant.
  const isActive = (page: number) =>
    views()
      .slice(Math.max(0, viewIndex() - 1), viewIndex() + 2)
      .some((nearby) => viewPages(nearby).includes(page))

  const strokeInput = createStrokeInput({
    ink: () => props.ink,
    commit: (change) => props.onInkChange(change),
  })

  let dialog: HTMLDialogElement | undefined
  let stageElement: HTMLDivElement | undefined

  const showView = (index: number) => {
    const all = views()
    setPlace(placeOfView(all[Math.min(all.length - 1, Math.max(0, index))]))
  }
  const [trimMargins, setTrimMargins] = createSignal(
    readTrimMarginsPreference(),
  )
  const [trimmed, setTrimmed] = createSignal<PageRegion>()
  createEffect(() => {
    if (trimMargins() && !trimmed()) {
      void findTrimRegion(props.pages).then(setTrimmed, () =>
        setTrimmed(WHOLE_PAGE),
      )
    }
  })
  /** What shows of every page: all of it, or only the music on it. */
  const region = () => (trimMargins() && trimmed()) || WHOLE_PAGE

  /**
   * Sizes a page so the region of it on show fits, and places it so that
   * region is what the clipping box around it shows.
   */
  const pageGeometry = (source: PageSource) => {
    const shown = region()
    const aspectRatio = regionAspectRatio(source.aspectRatio, shown)
    const visibleWidth = fitPageWidth(pageBox(stage(), layout()), aspectRatio)
    const width = visibleWidth / (shown.right - shown.left)
    return {
      width,
      visibleWidth,
      visibleHeight: visibleWidth * aspectRatio,
      left: -shown.left * width,
      top: -shown.top * width * source.aspectRatio,
    }
  }

  const toggleTrimMargins = () => {
    const enabled = !trimMargins()
    setTrimMargins(enabled)
    writeTrimMarginsPreference(enabled)
  }
  const toggleHalfPageTurns = () => {
    const enabled = !halfPageTurns()
    setHalfPageTurns(enabled)
    writeHalfPageTurnsPreference(enabled)
  }
  const turn = (step: 1 | -1) => showView(viewIndex() + step)
  const turnFromMusic = (step: 1 | -1) => {
    setControlsShown(false)
    // A control focused earlier would otherwise keep the controls in sight,
    // and take the next press of Space.
    stageElement?.focus()
    turn(step)
  }
  const close = () => dialog?.close()

  createEffect(
    on(page, (current) => props.onPageChange(current), { defer: true }),
  )

  onMount(() => {
    if (!dialog || !stageElement) {
      return
    }

    dialog.showModal()
    onCleanup(keepScreenOn())
    onCleanup(() => void exitFullscreen())

    const target = stageElement
    const observer = new ResizeObserver(() =>
      setStage({ width: target.clientWidth, height: target.clientHeight }),
    )
    observer.observe(target)
    onCleanup(() => observer.disconnect())

    // Leaving the browser's full screen, with Escape or a system gesture,
    // leaves this view too. Only once it was entered, since leaving it from
    // an earlier visit can still be underway.
    let wasFullscreen = false
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        wasFullscreen = true
      } else if (wasFullscreen) {
        close()
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    onCleanup(() =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange),
    )

    const timer = window.setTimeout(
      () => setControlsShown(false),
      initialControlsMs,
    )
    onCleanup(() => window.clearTimeout(timer))
  })

  const handleKeyDown: JSX.EventHandler<HTMLDialogElement, KeyboardEvent> = (
    event,
  ) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      // Buttons react to Space and Enter themselves.
      (event.target instanceof HTMLButtonElement &&
        (event.key === " " || event.key === "Enter"))
    ) {
      return
    }

    if (event.key === " " && event.shiftKey) {
      event.preventDefault()
      turnFromMusic(-1)
    } else if (forwardKeys.has(event.key)) {
      event.preventDefault()
      turnFromMusic(1)
    } else if (backKeys.has(event.key)) {
      event.preventDefault()
      turnFromMusic(-1)
    } else if (event.key === "Home") {
      event.preventDefault()
      showView(0)
    } else if (event.key === "End") {
      event.preventDefault()
      showView(views().length - 1)
    }
  }

  // Only a single pointer turns pages, so a pinch or a resting palm doesn't.
  const pointers = new Map<number, Point>()
  let pointerStart: { id: number; at: Point } | undefined

  const stagePoint = (event: PointerEvent, stage: HTMLElement): Point => {
    const rect = stage.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handlePointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    if (event.pointerType === "pen") {
      const page =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-page-index]")
          : null
      if (page && !strokeInput.isActive()) {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        strokeInput.start(event, page, props.stylusStyle)
      }
      return
    }

    // A palm resting while the stylus draws mustn't turn the page.
    if (
      strokeInput.isActive() ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return
    }

    const point = stagePoint(event, event.currentTarget)
    pointers.set(event.pointerId, point)
    pointerStart =
      pointers.size === 1 ? { id: event.pointerId, at: point } : undefined
  }

  const handlePointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (
    event,
  ) => {
    strokeInput.end(event, false)
    pointers.delete(event.pointerId)
    if (pointerStart?.id !== event.pointerId) {
      return
    }

    const action = stageAction(
      pointerStart.at,
      stagePoint(event, event.currentTarget),
      event.currentTarget.clientWidth,
    )
    pointerStart = undefined
    switch (action) {
      case "back":
        turnFromMusic(-1)
        break
      case "forward":
        turnFromMusic(1)
        break
      case "toggle-controls":
        setControlsShown((shown) => !shown)
        break
      case "none":
        break
      default: {
        const exhaustive: never = action
        throw new Error(`Unhandled stage action: ${exhaustive}`)
      }
    }
  }

  const handlePointerCancel = (event: PointerEvent) => {
    strokeInput.end(event, true)
    pointers.delete(event.pointerId)
    if (pointerStart?.id === event.pointerId) {
      pointerStart = undefined
    }
  }

  return (
    <dialog
      ref={dialog}
      class="full-screen"
      aria-label={`${props.name}, full screen`}
      data-controls={controlsShown() ? "shown" : "hidden"}
      onKeyDown={handleKeyDown}
      onClose={() => props.onExit(page())}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Taps and swipes are shortcuts; the controls and keyboard turn pages too. */}
      <div
        ref={stageElement}
        class="stage"
        style={{ gap: `${SPREAD_GAP_PX}px` }}
        tabIndex={-1}
        autofocus
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => strokeInput.move(event)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Show when={stage().width > 0}>
          <Index each={props.pages}>
            {(source, index) => {
              const geometry = () => pageGeometry(source())
              return (
                <div
                  class={upcomingPage() === index ? "upcoming" : undefined}
                  hidden={!isVisible(index)}
                >
                  <div
                    class="trim"
                    style={{
                      width: `${geometry().visibleWidth}px`,
                      height: `${geometry().visibleHeight}px`,
                    }}
                  >
                    <div
                      class="trimmed-page"
                      style={{
                        left: `${geometry().left}px`,
                        top: `${geometry().top}px`,
                      }}
                    >
                      <SheetPage
                        index={index}
                        pageCount={props.pages.length}
                        source={source()}
                        width={geometry().width}
                        strokes={props.ink[index]}
                        draft={
                          strokeInput.draft()?.pageIndex === index
                            ? strokeInput.draft()?.stroke
                            : undefined
                        }
                        hidden={strokeInput.erased()}
                        active={isActive(index)}
                      />
                    </div>
                  </div>
                </div>
              )
            }}
          </Index>
          <Show when={upcomingPage() !== undefined}>
            <div class="half-divider" />
          </Show>
        </Show>
      </div>

      <div class="controls">
        <button
          type="button"
          class="control"
          aria-label="Exit full screen"
          title="Exit full screen"
          onClick={close}
        >
          <PhIcon name="corners-in" aria-hidden="true" size={22} />
        </button>
        <p class="title">{props.name}</p>
        <button
          type="button"
          class="control"
          aria-label="Undo"
          title="Undo"
          disabled={!props.canUndo}
          onClick={() => props.onUndo()}
        >
          <PhIcon name="arrow-counter-clockwise" aria-hidden="true" size={22} />
        </button>
        <button
          type="button"
          class="control"
          aria-label="Trim margins"
          title="Trim margins: leave out the empty edges of the pages, so the music is bigger"
          aria-pressed={trimMargins()}
          onClick={toggleTrimMargins}
        >
          <PhIcon name="crop" aria-hidden="true" size={22} />
        </button>
        <button
          type="button"
          class="control"
          aria-label="Half-page turns"
          title="Half-page turns: show the top of the next page while finishing this one"
          aria-pressed={halfPageTurns()}
          onClick={toggleHalfPageTurns}
        >
          <PhIcon name="rows" aria-hidden="true" size={22} />
        </button>
        <div class="paging">
          <button
            type="button"
            class="control"
            aria-label="Previous page"
            title="Previous page"
            disabled={viewIndex() === 0}
            onClick={() => turn(-1)}
          >
            <PhIcon name="caret-left" aria-hidden="true" size={22} />
          </button>
          <p class="page-label" aria-live="polite">
            {viewLabel(view(), props.pages.length)}
          </p>
          <button
            type="button"
            class="control"
            aria-label="Next page"
            title="Next page"
            disabled={viewIndex() === views().length - 1}
            onClick={() => turn(1)}
          >
            <PhIcon name="caret-right" aria-hidden="true" size={22} />
          </button>
        </div>
      </div>
    </dialog>
  )
}
