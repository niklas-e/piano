import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  Show,
} from "solid-js"
import { css } from "solid-styled"
import { startAudio } from "../common/audio"
import { ExerciseStaff } from "../common/ExerciseStaff"
import type { Exercise, Hand } from "../common/exercises"
import { Keyboard } from "../common/Keyboard"
import { KeyboardMinimap } from "../common/KeyboardMinimap"
import { buildPianoKeyboard } from "../common/keyboard"
import { MetronomeControls } from "../common/Metronome"
import { PhIcon } from "../common/PhIcon"
import type { Playback } from "../common/piano"
import {
  derivePracticeRange,
  type PracticeRange,
  upAndDown,
} from "../common/practiceRange"
import {
  readBpmPreference,
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

    .play-button {
      align-items: center;
      background: #2f251d;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #fffaf2;
      cursor: pointer;
      display: inline-flex;
      font-weight: 900;
      gap: 0.45rem;
      min-height: 2.75rem;
      padding: 0.65rem 1.1rem;
    }

    .play-message {
      margin: 0;
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

  const [isPlaying, setIsPlaying] = createSignal(false)
  const [playingIndex, setPlayingIndex] = createSignal<number>()
  const [playError, setPlayError] = createSignal(false)
  let playback: Playback | undefined
  // Tells a playback that was still loading whether it has been stopped.
  let playCount = 0

  const stopPlaying = () => {
    playCount += 1
    playback?.stop()
    playback = undefined
    setIsPlaying(false)
    setPlayingIndex(undefined)
  }

  const play = async () => {
    const context = startAudio()
    const count = ++playCount
    const { keyIds } = practice()
    const order = upAndDown(keyIds.map((_, index) => index))
    setIsPlaying(true)
    setPlayError(false)

    try {
      const { playNotes } = await import("../common/piano")
      const started = await playNotes(
        context,
        order.map((index) => keyIds[index]),
        readBpmPreference(),
        (position) => {
          if (count !== playCount) {
            return
          }
          if (position === undefined) {
            setIsPlaying(false)
          }
          setPlayingIndex(position === undefined ? undefined : order[position])
        },
      )
      if (count === playCount) {
        playback = started
      } else {
        started.stop()
      }
    } catch {
      if (count === playCount) {
        setIsPlaying(false)
        setPlayError(true)
      }
    }
  }

  const playingKeyId = () => {
    const index = playingIndex()
    return index === undefined ? undefined : practice().keyIds[index]
  }

  createEffect(on(practice, stopPlaying, { defer: true }))
  onCleanup(stopPlaying)

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

        <button
          type="button"
          class="play-button"
          onClick={() => (isPlaying() ? stopPlaying() : void play())}
        >
          <PhIcon
            name={isPlaying() ? "stop" : "play"}
            aria-hidden="true"
            size={18}
            weight="fill"
          />
          {isPlaying() ? "Stop" : "Play"}
        </button>
        <Show when={playError()}>
          <p class="play-message">The piano sound couldn't be loaded.</p>
        </Show>
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
          playingIndex={playingIndex()}
        />
        <KeyboardMinimap keys={keyboardKeys} keyIds={practice().keyIds} />
      </section>

      <Keyboard
        keys={keyboardKeys}
        keyIds={practice().keyIds}
        fingering={practice().fingering}
        scrollKey={`${props.exercise.id}:${hand()}:${range()}`}
        playingKeyId={playingKeyId()}
      />

      <MetronomeControls variant="compact" />
    </section>
  )
}
