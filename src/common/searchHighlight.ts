/**
 * Shared manager for the CSS Custom Highlight API "search-match" highlight.
 *
 * Each `HighlightedText` instance contributes its own match `Range`s keyed by a
 * private token. All contributed ranges are aggregated into a single
 * document-level `Highlight` registered as "search-match" and styled via
 * `::highlight(search-match)` in the global stylesheet. This avoids mutating
 * the DOM (no wrapper `<mark>` elements) to render search highlights.
 *
 * When the API is unavailable every function is a no-op, so callers degrade
 * gracefully to plain, un-highlighted text.
 */

export const supportsHighlightApi =
  typeof CSS !== "undefined" &&
  "highlights" in CSS &&
  typeof Highlight === "function" &&
  typeof Range === "function";

const HIGHLIGHT_NAME = "search-match";
const registry = new Map<symbol, Range[]>();

let highlight: Highlight | undefined;

function rebuild(): void {
  if (!highlight) {
    return;
  }

  highlight.clear();
  for (const ranges of registry.values()) {
    for (const range of ranges) {
      highlight.add(range);
    }
  }
}

function ensureHighlight(): Highlight | undefined {
  if (!supportsHighlightApi) {
    return undefined;
  }

  if (!highlight) {
    highlight = new Highlight();
    CSS.highlights.set(HIGHLIGHT_NAME, highlight);
  }

  return highlight;
}

/**
 * Register (or replace) the ranges contributed by `token`. Passing an empty
 * array removes the token's contribution.
 */
export function setHighlightRanges(token: symbol, ranges: Range[]): void {
  if (!ensureHighlight()) {
    return;
  }

  if (ranges.length === 0) {
    registry.delete(token);
  } else {
    registry.set(token, ranges);
  }

  rebuild();
}

/** Remove any ranges contributed by `token`. */
export function clearHighlightRanges(token: symbol): void {
  if (!supportsHighlightApi) {
    return;
  }

  if (registry.delete(token)) {
    rebuild();
  }
}
