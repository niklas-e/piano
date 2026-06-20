import { createEffect, createMemo, createSignal } from "solid-js";
import { css } from "solid-styled";
import { type Exercise, type Hand } from "../common/exercises";
import { buildKeyboard } from "../common/keyboard";
import { derivePracticeRange, type PracticeRange } from "../common/practiceRange";
import { readHandPreference, writeHandPreference, writeLastExerciseIdPreference } from "../common/preferences";
import { Keyboard } from "../common/Keyboard";
import { MetronomeControls } from "../common/Metronome";

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

    .detail-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .detail-chips span {
      background: #efe1cf;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
      padding: 0.25rem 0.55rem;
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

    .stepper-control button {
      align-items: center;
      background: #2f251d;
      border: 0;
      border-radius: 50%;
      color: #fffaf2;
      cursor: pointer;
      display: flex;
      font-size: 1.1rem;
      font-weight: 900;
      height: 2rem;
      justify-content: center;
      line-height: 1;
      width: 2rem;
    }

    .stepper-control button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .stepper-control span {
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

    .practice-panel h2 {
      margin-top: 0;
    }

    .sequence {
      font-size: clamp(1.3rem, 5vw, 2.3rem);
      font-weight: 900;
      letter-spacing: -0.05em;
      margin: 0;
    }
  `;

  const [hand, setHand] = createSignal<Hand>(readHandPreference());
  const [range, setRange] = createSignal<PracticeRange>(1);
  const keyboardKeys = buildKeyboard(3, 6);
  const practice = createMemo(() => derivePracticeRange(props.exercise, hand(), range()));

  createEffect(() => {
    writeLastExerciseIdPreference(props.exercise.id);
  });

  const updateHand = (value: string) => {
    const nextHand = value === "left" ? "left" : "right";
    setHand(nextHand);
    writeHandPreference(nextHand);
  };

  const updateRange = (direction: -1 | 1) => {
    setRange((currentRange) => Math.min(2, Math.max(1, currentRange + direction)) as PracticeRange);
  };

  return (
    <section aria-labelledby="exercise-heading" class="stack">
      <div class="exercise-header">
        <p class="eyebrow">{props.exercise.type === "scale" ? "Scale" : "Arpeggio"}</p>
        <h1 id="exercise-heading">{props.exercise.title}</h1>
        <p>{props.exercise.description}</p>
        <div class="detail-chips" aria-label="Exercise details">
          <span>{props.exercise.tonic}</span>
          <span>{props.exercise.quality}</span>
        </div>
      </div>

      <div class="practice-controls">
        <fieldset class="segmented-control">
          <legend>Hand</legend>
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
          <legend>Range</legend>
          <div class="stepper-control">
            <button type="button" aria-label="Decrease range" onClick={() => updateRange(-1)} disabled={range() === 1}>
              -
            </button>
            <span aria-live="polite">{practice().label}</span>
            <button type="button" aria-label="Increase range" onClick={() => updateRange(1)} disabled={range() === 2}>
              +
            </button>
          </div>
        </fieldset>
      </div>

      <section class="practice-panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Notes</h2>
        <p class="sequence">{practice().notes.join(" - ")}</p>
      </section>

      <Keyboard keys={keyboardKeys} keyIds={practice().keyIds} fingering={practice().fingering} />

      <MetronomeControls variant="compact" />
    </section>
  );
}
