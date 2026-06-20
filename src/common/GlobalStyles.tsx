import { css } from "solid-styled";

/**
 * Global design tokens, CSS reset, and the few primitives that are genuinely
 * shared across views (typography, spacing helpers, pill buttons). Component
 * specific styling lives co-located in each component via scoped `css`.
 */
export function GlobalStyles() {
  css`
    @global {
      :root {
        color: #17130f;
        background: #f7f0e6;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-synthesis: none;
        line-height: 1.5;
        text-rendering: optimizeLegibility;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        border: 0;
      }

      body {
        min-width: 320px;
      }

      a {
        color: inherit;
      }

      img,
      picture,
      svg,
      canvas {
        display: block;
        max-width: 100%;
      }

      button,
      input,
      select,
      textarea {
        color: inherit;
        font: inherit;
      }

      button {
        appearance: none;
        background: none;
      }

      :focus-visible {
        outline: 3px solid #d46a2c;
        outline-offset: 3px;
      }

      .hero h1,
      section h1 {
        font-size: clamp(2.25rem, 10vw, 5.5rem);
        letter-spacing: -0.08em;
        line-height: 0.92;
        margin: 0 0 1rem;
      }

      .eyebrow {
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        margin: 0 0 0.75rem;
        text-transform: uppercase;
      }

      .stack {
        display: grid;
        gap: 1.5rem;
      }

      .section-intro {
        max-width: 760px;
      }

      .button-link {
        border: 1px solid #2f251d;
        border-radius: 999px;
        padding: 0.55rem 0.85rem;
        text-decoration: none;
      }

      ::highlight(search-match) {
        background-color: #f3c05f;
        color: #17130f;
      }
    }
  `;

  return null;
}
