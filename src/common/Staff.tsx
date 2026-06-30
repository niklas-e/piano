import abcjs from "abcjs"
import { createEffect } from "solid-js"
import { css } from "solid-styled"
import { buildAbc, type Clef, type Note } from "./sightReading"

const STAFF_WIDTH = 160
const SCALE = 2

/**
 * Renders a single whole note on a treble or bass staff via abcjs.
 *
 * abcjs emits a variable-height SVG, so we pin the staff lines to a fixed
 * vertical window to stop it jumping between notes, and re-emit every line at a
 * shared thickness so they don't snap to uneven pixel heights.
 */
export function Staff(props: { note: Note; clef: Clef }) {
  css`
    .staff {
      align-items: flex-start;
      display: flex;
      justify-content: center;
      margin: 0 auto;
      max-width: 100%;
    }
  `

  let container!: HTMLDivElement

  createEffect(() => {
    const abc = buildAbc(props.note, props.clef)
    if (!container) return

    abcjs.renderAbc(container, abc, {
      staffwidth: STAFF_WIDTH,
      scale: SCALE,
      paddingtop: 0,
      paddingbottom: 0,
      paddingleft: 0,
      paddingright: 0,
      ariaLabel: "One note on the staff to identify",
    })

    const svg = container.querySelector("svg")
    // abcjs omits its `.abcjs-staff` class unless `add_classes` is set, so anchor
    // on the top staff line and its parent group (the five staff lines).
    const topLine = container.querySelector<SVGPathElement>(".abcjs-top-line")
    const staffGroup = topLine?.parentElement as SVGGraphicsElement | null
    if (!(svg instanceof SVGSVGElement) || !topLine || !staffGroup) return

    // Lines are thin filled rects at fractional y; crispEdges snaps them to 1px
    // or 2px depending on sub-pixel offset, so they look uneven. Re-emit each at a
    // shared whole-unit thickness and top so they all snap identically.
    const staffLines = Array.from(
      staffGroup.querySelectorAll<SVGPathElement>("path"),
    )
    const ledgerLines = Array.from(
      container.querySelectorAll<SVGPathElement>('path[data-name="ledger"]'),
    )
    const thickness = Math.max(1, Math.round(topLine.getBBox().height))
    for (const line of [...staffLines, ...ledgerLines]) {
      const box = line.getBBox()
      const top = Math.round(box.y + box.height / 2 - thickness / 2)
      const bottom = top + thickness
      const x1 = box.x
      const x2 = box.x + box.width
      line.setAttribute(
        "d",
        `M ${x1} ${top} L ${x2} ${top} L ${x2} ${bottom} L ${x1} ${bottom} z`,
      )
      line.setAttribute("shape-rendering", "crispEdges")
    }

    // Pin the staff to a fixed window so it doesn't jump between notes. getBBox is
    // in unscaled user units; the SVG is drawn scaled by SCALE from its top-left,
    // so * SCALE for on-screen pixels. Margin each side leaves room for the clef
    // and a note up to three ledger lines out.
    const { y, height } = staffGroup.getBBox()
    const staffPx = height * SCALE
    const margin = Math.round(staffPx * 1.35)
    container.style.height = `${Math.round(staffPx + margin * 2)}px`
    svg.style.display = "block"
    svg.style.marginTop = `${Math.round(margin - y * SCALE)}px`
  })

  // ponytail: on very narrow screens the fixed-width SVG can clip at the edges;
  // revisit with a downscale-to-fit wrapper if mobile sight reading needs it.
  return (
    <div
      class="staff"
      ref={container}
      role="img"
      aria-label="One note on the staff to identify"
    />
  )
}
