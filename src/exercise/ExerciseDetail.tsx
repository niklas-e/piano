import { createEffect, createMemo, createSignal } from "solid-js";
import { type Exercise, type Hand } from "../common/exercises";
import { buildKeyboard } from "../common/keyboard";
import { derivePracticeRange, type PracticeRange } from "../common/practiceRange";
import { readHandPreference, writeHandPreference, writeLastExerciseIdPreference } from "../common/preferences";
import { Keyboard } from "../common/Keyboard";
import { MetronomeControls } from "../common/Metronome";

export function ExerciseDetail(props: { exercise: Exercise }) {
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

      <div class="practice-grid">
        <section class="practice-panel" aria-labelledby="notes-heading">
          <h2 id="notes-heading">Notes</h2>
          <p class="sequence">{practice().notes.join(" - ")}</p>
        </section>
        <section class="practice-panel" aria-labelledby="fingering-heading">
          <h2 id="fingering-heading">Fingering</h2>
          <p class="sequence">{practice().fingering.join(" - ")}</p>
        </section>
      </div>

      <Keyboard keys={keyboardKeys} keyIds={practice().keyIds} fingering={practice().fingering} />

      <section class="compact-metronome" aria-labelledby="compact-metronome-heading">
        <h2 id="compact-metronome-heading">Compact metronome</h2>
        <MetronomeControls variant="compact" />
      </section>
    </section>
  );
}
