import { createEffect } from "solid-js";
import { css } from "solid-styled";
import abcjs from "abcjs";
import { buildAbc, type Clef, type Note } from "./sightReading";

const STAFF_WIDTH = 160;
const SCALE = 2;
const BOX_WIDTH = 280;

/**
 * Renders a single whole note on a treble or bass staff via abcjs.
 *
 * abcjs emits a variable-height SVG (a high/low note adds ledger-line height and
 * the treble clef is tall). Centering that in a tight box clips the clef and
 * makes the staff appear to jump. Instead we measure the staff lines and pin
 * them to a fixed vertical window, so the box size and staff position stay
 * constant for every note. We render at a fixed scale (no responsive resize) and
 * snap the lines to the pixel grid so they all keep the same crisp thickness.
 */
export function Staff(props: { note: Note; clef: Clef }) {
  css`
    .staff {
      align-items: flex-start;
      display: flex;
      justify-content: center;
      margin: 0 auto;
      max-width: 100%;
      overflow: hidden;
      width: ${`${BOX_WIDTH}px`};
    }
  `;

  let container!: HTMLDivElement;

  createEffect(() => {
    const abc = buildAbc(props.note, props.clef);
    if (!container) return;

    abcjs.renderAbc(container, abc, {
      staffwidth: STAFF_WIDTH,
      scale: SCALE,
      paddingtop: 0,
      paddingbottom: 0,
      paddingleft: 0,
      paddingright: 0,
      ariaLabel: "One note on the staff to identify"
    });

    const svg = container.querySelector("svg");
    const staff = container.querySelector<SVGGraphicsElement>(".abcjs-staff");
    if (!(svg instanceof SVGSVGElement) || !staff) return;

    // Staff and ledger lines are filled rects; snapping their edges to the pixel
    // grid keeps every line the same thickness regardless of sub-pixel placement.
    container
      .querySelectorAll(".abcjs-staff, .abcjs-ledger")
      .forEach((line) => line.setAttribute("shape-rendering", "crispEdges"));

    // Pin the five staff lines to a fixed window with equal margin above/below,
    // large enough for the clef and any in-range ledger note. The staff height is
    // constant, so the box height and staff position never change between notes.
    const { y, height } = staff.getBBox();
    const margin = height;
    container.style.height = `${Math.round(height + margin * 2)}px`;
    svg.style.display = "block";
    svg.style.marginTop = `${Math.round(margin - y)}px`;
  });

  // ponytail: on very narrow screens the fixed-width SVG can clip at the edges;
  // revisit with a downscale-to-fit wrapper if mobile sight reading needs it.
  return <div class="staff" ref={container} role="img" aria-label="One note on the staff to identify" />;
}
