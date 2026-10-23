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
import type { InkPages, Point, Stroke } from "../common/ink"
import { PhIcon } from "../common/PhIcon"
import {
  chooseLayout,
  fitPageWidth,
  pageBox,
  pageViews,
  type Size,
  SPREAD_GAP_PX,
  stageAction,
  viewIndexForPage,
  viewLabel,
} from "../common/pageTurns"
import { exitFullscreen, keepScreenOn } from "../common/screen"
import { type PageSource, SheetPage } from "./SheetPage"

/** How long the controls stay up after opening, before the music is alone. */
const initialControlsMs = 2500
const noStrokes: ReadonlySet<Stroke> = new Set()

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

    .control:hover:not(:disabled) {
      background: rgba(255, 250, 242, 0.12);
    }

    .control:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }
  `

  // The page being read is kept rather than the view, so turning the screen
  // between one and two pages at a time stays on it.
  const [page, setPage] = createSignal(props.startPage)
  const [stage, setStage] = createSignal<Size>({ width: 0, height: 0 })
  const [controlsShown, setControlsShown] = createSignal(true)

  // Scores rarely mix page sizes, so the first page decides for all.
  const layout = createMemo(() =>
    chooseLayout(stage(), props.pages[0].aspectRatio, props.pages.length),
  )
  const views = createMemo(() => pageViews(props.pages.length, layout()))
  const viewIndex = createMemo(() => viewIndexForPage(views(), page()))
  const view = () => views()[viewIndex()]
  const isVisible = (page: number) => view().pages.includes(page)
  // The views either side are rendered too, so turning to them is instant.
  const isActive = (page: number) =>
    views()
      .slice(Math.max(0, viewIndex() - 1), viewIndex() + 2)
      .some((nearby) => nearby.pages.includes(page))

  let dialog: HTMLDialogElement | undefined
  let stageElement: HTMLDivElement | undefined

  const showView = (index: number) => {
    const all = views()
    setPage(all[Math.min(all.length - 1, Math.max(0, index))].pages[0])
  }
  const turn = (step: 1 | -1) => showView(viewIndex() + step)
  const turnFromMusic = (step: 1 | -1) => {
    setControlsShown(false)
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
    // leaves this view too.
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
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
    if (event.pointerType === "mouse" && event.button !== 0) {
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
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <Show when={stage().width > 0}>
          <Index each={props.pages}>
            {(source, index) => (
              <div hidden={!isVisible(index)}>
                <SheetPage
                  index={index}
                  pageCount={props.pages.length}
                  source={source()}
                  width={fitPageWidth(
                    pageBox(stage(), layout()),
                    source().aspectRatio,
                  )}
                  strokes={props.ink[index]}
                  draft={undefined}
                  hidden={noStrokes}
                  active={isActive(index)}
                />
              </div>
            )}
          </Index>
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
