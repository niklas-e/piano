import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { css } from "solid-styled"
import {
  HIGHLIGHTER_OPACITY,
  type InkTool,
  type Stroke,
  strokeSvgPath,
  strokesByLayer,
} from "../common/ink"
import { type PDFPageProxy, renderPdfPage } from "../common/pdf"

export type PageSource =
  | { kind: "pdf"; page: PDFPageProxy; aspectRatio: number }
  | { kind: "image"; url: string; aspectRatio: number }

// Canvases above this size use a lot of memory, and iOS refuses to draw them.
const maxCanvasPixels = 8_000_000
const rerenderDelayMs = 120

export function SheetPage(props: {
  index: number
  pageCount: number
  source: PageSource
  width: number
  strokes: readonly Stroke[]
  draft: Stroke | undefined
  hidden: ReadonlySet<Stroke>
  /**
   * Whether to keep the page rendered. When left out, pages near the viewport
   * are rendered.
   */
  active?: boolean
}) {
  css`
    .sheet-page {
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(47, 37, 29, 0.18), 0 12px 32px rgba(47, 37, 29, 0.08);
      flex: none;
      overflow: hidden;
      position: relative;
      /* Leave room for the sticky toolbar when a page is scrolled to. */
      scroll-margin-top: 8rem;
      -webkit-touch-callout: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .page-content,
    .page-content :global(canvas),
    .page-content img {
      height: 100%;
      inset: 0;
      position: absolute;
      width: 100%;
    }

    .page-content img {
      -webkit-user-drag: none;
    }
  `

  let element: HTMLElement | undefined
  let content: HTMLDivElement | undefined
  const [isNearViewport, setIsNearViewport] = createSignal(false)
  const height = () => props.width * props.source.aspectRatio
  const isActive = () => props.active ?? isNearViewport()

  onMount(() => {
    if (!element || props.active !== undefined) {
      return
    }

    // Only pages near the viewport keep a rendered canvas, so long scores
    // don't run out of memory.
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: "150% 0px" },
    )
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })

  createEffect(() => {
    const { source } = props
    if (source.kind !== "pdf" || !content) {
      return
    }

    const target = content
    if (!isActive()) {
      target.replaceChildren()
      source.page.cleanup()
      return
    }

    const cssWidth = props.width
    const pixelWidth = Math.floor(
      Math.min(
        cssWidth * window.devicePixelRatio,
        Math.sqrt(maxCanvasPixels / source.aspectRatio),
      ),
    )
    let cancelRender: (() => void) | undefined
    // Keep showing the previous rendering, stretched, until the new one is
    // ready, and wait for zooming to settle before re-rendering.
    const timer = window.setTimeout(
      () => {
        const render = renderPdfPage(source.page, pixelWidth)
        cancelRender = render.cancel
        render.promise.then(
          () => target.replaceChildren(render.canvas),
          () => {
            // Cancelled because the page scrolled away or zoom changed again.
          },
        )
      },
      target.childElementCount === 0 ? 0 : rerenderDelayMs,
    )

    onCleanup(() => {
      window.clearTimeout(timer)
      cancelRender?.()
    })
  })

  const visibleStrokes = () => {
    const strokes =
      props.hidden.size === 0
        ? props.strokes
        : props.strokes.filter((stroke) => !props.hidden.has(stroke))
    return strokesByLayer(props.draft ? [...strokes, props.draft] : strokes)
  }

  return (
    <figure
      ref={element}
      class="sheet-page"
      aria-label={`Page ${props.index + 1} of ${props.pageCount}`}
      data-page-index={props.index}
      style={{ width: `${props.width}px`, height: `${height()}px` }}
    >
      <div ref={content} class="page-content">
        <Show when={props.source.kind === "image" && props.source}>
          {(source) => (
            <img
              src={source().url}
              alt={`Page ${props.index + 1}`}
              draggable={false}
            />
          )}
        </Show>
      </div>
      <InkLayer
        layer="highlighter"
        aspectRatio={props.source.aspectRatio}
        strokes={visibleStrokes().highlighter}
      />
      <InkLayer
        layer="pen"
        aspectRatio={props.source.aspectRatio}
        strokes={visibleStrokes().pen}
      />
    </figure>
  )
}

function InkLayer(props: {
  layer: InkTool
  aspectRatio: number
  strokes: readonly Stroke[]
}) {
  css`
    .ink-layer {
      height: 100%;
      inset: 0;
      overflow: visible;
      pointer-events: none;
      position: absolute;
      width: 100%;
    }

    /* Highlighter darkens the music beneath it instead of covering it. */
    .ink-layer.highlighter {
      mix-blend-mode: multiply;
    }
  `

  return (
    <svg
      class={`ink-layer ${props.layer}`}
      data-ink-layer={props.layer}
      viewBox={`0 0 1 ${props.aspectRatio}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <For each={props.strokes}>
        {(stroke) => (
          <path
            d={strokeSvgPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            stroke-width={stroke.width}
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-opacity={
              stroke.tool === "highlighter" ? HIGHLIGHTER_OPACITY : undefined
            }
          />
        )}
      </For>
    </svg>
  )
}
