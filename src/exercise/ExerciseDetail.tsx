import { createEffect, createMemo, createSignal } from "solid-js"
import { css } from "solid-styled"
import { ExerciseStaff } from "../common/ExerciseStaff"
import type { Exercise, Hand } from "../common/exercises"
import { Keyboard } from "../common/Keyboard"
import { KeyboardMinimap } from "../common/KeyboardMinimap"
import { buildPianoKeyboard } from "../common/keyboard"
import { MetronomeControls } from "../common/Metronome"
import {
  derivePracticeRange,
  type PracticeRange,
} from "../common/practiceRange"
import {
  readHandPreference,
  writeHandPreference,
  writeLastExerciseIdPreference,
} from "../common/preferences"
import { StepperButton } from "../common/StepperButton"

export function ExerciseDetail(props: { exercise: Exercise }) {
  css`
    .exercise-header {
      display: grid;
      gap: 0.6rem;
      max-width: 760px;
    }

    .exercise-header h1,
    .exercise-header p {
      margin: 0;
    }

    .practice-controls {
      align-items: end;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .segmented-control {
      border: 0;
      display: grid;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
    }

    .segmented-control legend,
    .range-stepper legend {
      font-weight: 800;
    }

    .segmented-options {
      background: #efe1cf;
      border: 1px solid #dfd1bf;
      border-radius: 999px;
      display: inline-flex;
      padding: 0.2rem;
    }

    .segmented-options label {
      border-radius: 999px;
      cursor: pointer;
      font-weight: 800;
      padding: 0.45rem 0.7rem;
    }

    .segmented-options input {
      opacity: 0;
      position: absolute;
    }

    .segmented-options label:has(input:focus-visible) {
      outline: 3px solid #7b4b22;
      outline-offset: 3px;
    }

    .segmented-options label:has(input:checked) {
      background: #2f251d;
      color: #fffaf2;
    }

    .range-stepper {
      border: 0;
      display: grid;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
    }

    .stepper-control {
      align-items: center;
      background: #fffaf2;
      border: 1px solid #8e7b67;
      border-radius: 999px;
      display: inline-flex;
      gap: 0.45rem;
      padding: 0.2rem;
    }

    .stepper-label {
      font-weight: 900;
      min-width: 5.8rem;
      text-align: center;
    }

    .practice-panel {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1rem;
      padding: 0.85rem;
    }
  `

  const [hand, setHand] = createSignal<Hand>(readHandPreference())
  const [range, setRange] = createSignal<PracticeRange>(1)
  const keyboardKeys = buildPianoKeyboard()
  const practice = createMemo(() =>
    derivePracticeRange(props.exercise, hand(), range()),
  )

  createEffect(() => {
    writeLastExerciseIdPreference(props.exercise.id)
  })

  const updateHand = (value: string) => {
    const nextHand = value === "left" ? "left" : "right"
    setHand(nextHand)
    writeHandPreference(nextHand)
  }

  const updateRange = (direction: -1 | 1) => {
    setRange(
      (currentRange) =>
        Math.min(2, Math.max(1, currentRange + direction)) as PracticeRange,
    )
  }

  return (
    <section aria-labelledby="exercise-heading" class="stack">
      <div class="exercise-header">
        <h1 id="exercise-heading">{props.exercise.title}</h1>
        <p>{props.exercise.description}</p>
      </div>

      <div class="practice-controls">
        <fieldset class="segmented-control">
          <div class="segmented-options">
            <label>
              <input
                type="radio"
                name="hand"
                value="right"
                checked={hand() === "right"}
                onChange={() => updateHand("right")}
              />
              Right hand
            </label>
            <label>
              <input
                type="radio"
                name="hand"
                value="left"
                checked={hand() === "left"}
                onChange={() => updateHand("left")}
              />
              Left hand
            </label>
          </div>
        </fieldset>

        <fieldset class="range-stepper">
          <div class="stepper-control">
            <StepperButton
              ariaLabel="Decrease range"
              direction="decrement"
              onClick={() => updateRange(-1)}
              disabled={range() === 1}
            />
            <span class="stepper-label" aria-live="polite">
              {practice().label}
            </span>
            <StepperButton
              ariaLabel="Increase range"
              direction="increment"
              onClick={() => updateRange(1)}
              disabled={range() === 2}
            />
          </div>
        </fieldset>
      </div>

      <section
        class="practice-panel"
        aria-label={`${props.exercise.title} notes`}
      >
        <ExerciseStaff
          notes={practice().notes}
          clef={practice().clef}
          baseOctave={practice().baseOctave}
          label={`${props.exercise.title} on the staff`}
        />
        <KeyboardMinimap keys={keyboardKeys} keyIds={practice().keyIds} />
      </section>

      <Keyboard
        keys={keyboardKeys}
        keyIds={practice().keyIds}
        fingering={practice().fingering}
        scrollKey={`${props.exercise.id}:${hand()}:${range()}`}
      />

      <MetronomeControls variant="compact" />
    </section>
  )
}
