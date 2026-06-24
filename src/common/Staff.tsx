import { createEffect } from "solid-js";
import { css } from "solid-styled";
import abcjs from "abcjs";
import { buildAbc, type Clef, type Note } from "./sightReading";

/**
 * Renders a single whole note on a treble or bass staff via abcjs.
 * Re-renders whenever the note or clef changes.
 */
export function Staff(props: { note: Note; clef: Clef }) {
  css`
    .staff {
      display: grid;
      justify-items: center;
      min-height: 9rem;
      width: 100%;
    }
  `;

  let container!: HTMLDivElement;

  createEffect(() => {
    const abc = buildAbc(props.note, props.clef);
    if (!container) return;

    abcjs.renderAbc(container, abc, {
      // ponytail: defaults are fine; only the few knobs that affect layout/size are set.
      responsive: "resize",
      staffwidth: 300,
      scale: 1.5,
      paddingtop: 0,
      paddingbottom: 0,
      ariaLabel: "One note on the staff to identify"
    });
  });

  return <div class="staff" ref={container} role="img" aria-label="One note on the staff to identify" />;
}
