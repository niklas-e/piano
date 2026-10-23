import abcjs from "abcjs"
import { createEffect } from "solid-js"
import { css } from "solid-styled"
import { sequenceToAbc } from "./exerciseNotation"
import type { NoteName } from "./exercises"
import type { Clef } from "./sightReading"

/**
 * Renders a scale or arpeggio on a staff via abcjs, with the note names shown
 * underneath as lyrics. `responsive: "resize"` fills the container width; the
 * wrapper must be a full-width block (not a shrink-to-fit flex item) or abcjs
 * measures the content instead of the panel and renders tiny on narrow screens.
 */
export function ExerciseStaff(props: {
  notes: readonly NoteName[]
  clef: Clef
  baseOctave: number
  label: string
}) {
  css`
    .exercise-staff {
      width: 100%;
    }
  `

  let container!: HTMLDivElement

  createEffect(() => {
    const abc = sequenceToAbc(props.notes, props.clef, props.baseOctave)
    if (!container) return

    abcjs.renderAbc(container, abc, {
      responsive: "resize",
      add_classes: true,
      paddingtop: 0,
      paddingbottom: 0,
      paddingleft: 0,
      paddingright: 0,
      ariaLabel: props.label,
      // abcjs defaults to Times New Roman, which isn't installed everywhere.
      format: { vocalfont: '"Inter Variable" 13 bold' },
    })
  })

  return (
    <div
      class="exercise-staff"
      ref={container}
      role="img"
      aria-label={props.label}
    />
  )
}
