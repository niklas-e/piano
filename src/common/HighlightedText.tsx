import { createEffect, onCleanup } from "solid-js"
import {
  clearHighlightRanges,
  setHighlightRanges,
  supportsHighlightApi,
} from "./searchHighlight"

/**
 * Renders `text` and, when it contains the current `query`, highlights the
 * matching ranges using the CSS Custom Highlight API. No DOM mutation and no
 * wrapper `<mark>` elements are involved; matches are painted via
 * `::highlight(search-match)`. Falls back to plain text where the API is
 * unavailable.
 */
export function HighlightedText(props: { text: string; query: string }) {
  let container: HTMLSpanElement | undefined
  const token = Symbol("search-highlight")

  createEffect(() => {
    const query = props.query.trim().toLowerCase()
    const text = props.text

    if (!supportsHighlightApi || !container) {
      return
    }

    const textNode = container.firstChild
    if (
      query.length === 0 ||
      !textNode ||
      textNode.nodeType !== Node.TEXT_NODE
    ) {
      clearHighlightRanges(token)
      return
    }

    const haystack = text.toLowerCase()
    const ranges: Range[] = []
    let matchIndex = haystack.indexOf(query)

    while (matchIndex >= 0) {
      const range = new Range()
      range.setStart(textNode, matchIndex)
      range.setEnd(textNode, matchIndex + query.length)
      ranges.push(range)
      matchIndex = haystack.indexOf(query, matchIndex + query.length)
    }

    setHighlightRanges(token, ranges)
  })

  onCleanup(() => clearHighlightRanges(token))

  return <span ref={container}>{props.text}</span>
}
