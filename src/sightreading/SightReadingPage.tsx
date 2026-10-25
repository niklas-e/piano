import { createSignal, For, onCleanup, Show } from "solid-js"
import { css } from "solid-styled"
import { beatClock } from "../common/beatClock"
import { PhIcon } from "../common/PhIcon"
import {
  readSightReadingClefPreference,
  readSightReadingDurationPreference,
  readSightReadingSoundPreference,
  writeSightReadingClefPreference,
  writeSightReadingDurationPreference,
  writeSightReadingSoundPreference,
} from "../common/preferences"
import { Staff } from "../common/Staff"
import {
  ANSWER_OPTIONS,
  type AnswerRow,
  accuracyPercent,
  CLEF_SETTINGS,
  type Clef,
  type ClefSetting,
  DURATION_OPTIONS,
  formatClock,
  type Note,
  noteName,
  randomClef,
  randomNote,
  visibleRows,
  type WrongAnswer,
} from "../common/sightReading"

type Phase = "setup" | "playing" | "results"
type Prompt = { note: Note; clef: Clef; rows: Set<AnswerRow> }

const clefLabels: Record<ClefSetting, string> = {
  treble: "Treble",
  bass: "Bass",
  both: "Both",
}

function makePrompt(setting: ClefSetting): Prompt {
  const clef = randomClef(setting)
  const note = randomNote(clef)
  return { note, clef, rows: visibleRows(note) }
}

export function SightReadingPage() {
  css`
    .sight-reading {
      max-width: 640px;
    }

    .panel {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      display: grid;
      gap: 1.25rem;
      padding: clamp(1.25rem, 4vw, 2rem);
      position: relative;
      transition: border-color 0.5s ease, background-color 0.5s ease;
    }

    .panel-no-padding {
      padding: 0;
    }

    /* Brief, fading tint on the staff panel as answer feedback. The flash state
       snaps on (no transition) and the base .panel rule eases it back out. */
    .panel.flash-correct,
    .panel.flash-wrong {
      transition: none;
    }

    .panel.flash-correct {
      background: #eef5ed;
      border-color: #2f6b3a;
    }

    .panel.flash-wrong {
      background: #f7ece9;
      border-color: #a23b2c;
    }

    /* Shape-based indicator (check vs cross) so feedback never relies on color
       alone, which red/green color blindness can't distinguish. */
    .feedback-mark {
      align-items: center;
      border-radius: 999px;
      color: #fffaf2;
      display: inline-flex;
      justify-content: center;
      padding: 0.3rem;
      position: absolute;
      right: 0.75rem;
      top: 0.75rem;
    }

    .feedback-mark.feedback-correct {
      background: #2f6b3a;
    }

    .feedback-mark.feedback-wrong {
      background: #a23b2c;
    }

    .field {
      display: grid;
      gap: 0.6rem;
    }

    .field-label {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .segmented {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .segmented button {
      border: 1px solid #2f251d;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 700;
      min-height: 2.75rem;
      padding: 0.55rem 1rem;
    }

    .segmented button[aria-pressed="true"] {
      background: #2f251d;
      color: #fffaf2;
    }

    .primary-button {
      background: #2f251d;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #fffaf2;
      cursor: pointer;
      font-weight: 900;
      min-height: 2.75rem;
      padding: 0.7rem 1.2rem;
    }

    .ghost-button {
      background: transparent;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #2f251d;
      cursor: pointer;
      font-weight: 700;
      min-height: 2.75rem;
      padding: 0.7rem 1.2rem;
    }

    .scoreboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      text-align: center;
    }

    .scoreboard dt {
      color: #8c6e4a;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .scoreboard dd {
      font-feature-settings: "tnum" 1;
      font-size: clamp(1.6rem, 6vw, 2.2rem);
      font-weight: 900;
      letter-spacing: -0.03em;
    }

    .answer-grid {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(7, 1fr);
    }

    .answer-grid button {
      align-items: center;
      background: #f1e7d8;
      border: 1px solid #cdbba6;
      border-radius: 0.75rem;
      cursor: pointer;
      display: flex;
      font-weight: 800;
      justify-content: center;
      min-height: 3rem;
      padding: 0.5rem 0.25rem;
    }

    @media (hover: hover) {
      .answer-grid button:hover {
        background: #e7d8c2;
      }
    }

    .results-list {
      display: grid;
      gap: 0.5rem;
      list-style: none;
    }

    .results-list li {
      align-items: center;
      background: #f7f0e6;
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      padding: 0.6rem 0.9rem;
    }

    .results-list .missed-names {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
    }

    .results-list .picked {
      color: #a23b2c;
      font-weight: 800;
    }

    .results-list .correct {
      color: #2f6b3a;
      font-weight: 800;
    }

    .perfect {
      color: #2f6b3a;
      font-weight: 700;
    }

    @media (max-width: 420px) {
      .answer-grid button {
        font-size: 0.85rem;
        min-height: 2.6rem;
      }
    }
  `

  const [clefSetting, setClefSetting] = createSignal<ClefSetting>(
    readSightReadingClefPreference(),
  )
  const [duration, setDuration] = createSignal(
    readSightReadingDurationPreference(),
  )
  const [sound, setSound] = createSignal(readSightReadingSoundPreference())
  const [phase, setPhase] = createSignal<Phase>("setup")
  const [prompt, setPrompt] = createSignal<Prompt>(makePrompt(clefSetting()))
  const [correct, setCorrect] = createSignal(0)
  const [total, setTotal] = createSignal(0)
  const [wrong, setWrong] = createSignal<WrongAnswer[]>([])
  const [remaining, setRemaining] = createSignal(0)
  const [elapsed, setElapsed] = createSignal(0)
  const [feedback, setFeedback] = createSignal<"correct" | "wrong" | null>(null)

  let timerId: number | undefined
  let feedbackTimer: number | undefined
  let startedAt = 0

  const stopTimer = () => {
    if (timerId !== undefined) {
      window.clearInterval(timerId)
      timerId = undefined
    }
  }

  const endGame = () => {
    stopTimer()
    setPhase("results")
  }

  const startTimer = () => {
    stopTimer()
    startedAt = performance.now()
    const tick = () => {
      const seconds = Math.floor((performance.now() - startedAt) / 1000)
      if (duration() === 0) {
        setElapsed(seconds)
        return
      }
      const left = duration() - seconds
      setRemaining(Math.max(0, left))
      if (left <= 0) {
        endGame()
      }
    }
    tick()
    timerId = window.setInterval(tick, 200)
  }

  const start = () => {
    writeSightReadingClefPreference(clefSetting())
    writeSightReadingDurationPreference(duration())
    writeSightReadingSoundPreference(sound())
    if (sound()) {
      // Browsers only start audio from a tap or click.
      beatClock.startAudio()
      void import("../common/piano")
    }
    setCorrect(0)
    setTotal(0)
    setWrong([])
    setRemaining(duration())
    setElapsed(0)
    setPrompt(makePrompt(clefSetting()))
    setPhase("playing")
    startTimer()
  }

  const answer = (name: string) => {
    if (feedback()) return // Ignore clicks while the answered note is still flashing.
    const current = prompt()
    setTotal((value) => value + 1)
    const isCorrect = name === noteName(current.note)
    if (isCorrect) {
      setCorrect((value) => value + 1)
    } else {
      setWrong((list) => [
        ...list,
        { note: current.note, clef: current.clef, picked: name },
      ])
    }
    if (isCorrect && sound()) {
      playNoteOf(current.note)
    }
    // Flash feedback on the answered note, then advance to the next one.
    setFeedback(isCorrect ? "correct" : "wrong")
    window.clearTimeout(feedbackTimer)
    feedbackTimer = window.setTimeout(() => {
      setFeedback(null)
      setPrompt(makePrompt(clefSetting()))
    }, 450)
  }

  // So the note's sound is learned along with its name and place.
  const playNoteOf = (note: Note) => {
    beatClock.startAudio()
    import("../common/piano")
      .then(({ playNote }) =>
        playNote(beatClock, `${noteName(note)}${note.octave}`),
      )
      // Naming notes still works without the sound.
      .catch((error) => console.warn(error))
  }

  const backToSetup = () => {
    stopTimer()
    setPhase("setup")
  }

  const timeLabel = () =>
    formatClock(duration() === 0 ? elapsed() : remaining())

  onCleanup(() => {
    stopTimer()
    window.clearTimeout(feedbackTimer)
  })

  return (
    <section class="sight-reading stack" aria-label="Sight reading">
      <Show when={phase() === "setup"}>
        <div class="hero-copy stack">
          <p class="eyebrow">Note identification</p>
          <h1>Sight Reading</h1>
          <p>
            Name each note as it appears. Pick a clef and a length, then start.
          </p>
        </div>

        <div class="panel">
          <div class="field">
            <span class="field-label">Clef</span>
            <fieldset class="segmented" aria-label="Clef">
              <For each={CLEF_SETTINGS}>
                {(option) => (
                  <button
                    type="button"
                    aria-pressed={clefSetting() === option}
                    onClick={() => setClefSetting(option)}
                  >
                    {clefLabels[option]}
                  </button>
                )}
              </For>
            </fieldset>
          </div>

          <div class="field">
            <span class="field-label">Length</span>
            <fieldset class="segmented" aria-label="Length">
              <For each={DURATION_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    aria-pressed={duration() === option.seconds}
                    onClick={() => setDuration(option.seconds)}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </fieldset>
          </div>

          <div class="field">
            <span class="field-label">Sound</span>
            <fieldset class="segmented" aria-label="Sound">
              <button
                type="button"
                aria-pressed={sound()}
                onClick={() => setSound(true)}
              >
                On
              </button>
              <button
                type="button"
                aria-pressed={!sound()}
                onClick={() => setSound(false)}
              >
                Off
              </button>
            </fieldset>
          </div>

          <button type="button" class="primary-button" onClick={start}>
            Start
          </button>
        </div>
      </Show>

      <Show when={phase() === "playing"}>
        <dl class="scoreboard">
          <div>
            <dt>Time</dt>
            <dd>{timeLabel()}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{correct()}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{accuracyPercent(correct(), total())}%</dd>
          </div>
        </dl>

        <div
          classList={{
            panel: true,
            "panel-no-padding": true,
            "flash-correct": feedback() === "correct",
            "flash-wrong": feedback() === "wrong",
          }}
        >
          <Show when={feedback()}>
            {(mark) => (
              <span
                class={`feedback-mark feedback-${mark()}`}
                aria-hidden="true"
              >
                <PhIcon
                  name={mark() === "correct" ? "check" : "x"}
                  weight="bold"
                  size={22}
                />
              </span>
            )}
          </Show>
          <Staff note={prompt().note} clef={prompt().clef} />
        </div>

        <fieldset class="answer-grid" aria-label="Note options">
          <For
            each={ANSWER_OPTIONS.filter((option) =>
              prompt().rows.has(option.row),
            )}
          >
            {(option) => (
              <button
                type="button"
                style={{
                  "grid-column": String(option.column),
                  "grid-row": String(option.row),
                }}
                aria-label={`Answer ${option.name}`}
                onClick={() => answer(option.name)}
              >
                {option.name}
              </button>
            )}
          </For>
        </fieldset>

        <button type="button" class="ghost-button" onClick={endGame}>
          End
        </button>
      </Show>

      <Show when={phase() === "results"}>
        <div class="hero-copy stack">
          <p class="eyebrow">Results</p>
          <h1>{correct()} correct</h1>
          <p>
            {accuracyPercent(correct(), total())}% accuracy over {total()}{" "}
            notes.
          </p>
        </div>

        <div class="segmented">
          <button type="button" class="primary-button" onClick={start}>
            Play again
          </button>
          <button type="button" class="ghost-button" onClick={backToSetup}>
            Change settings
          </button>
        </div>

        <div class="panel">
          <Show
            when={wrong().length > 0}
            fallback={
              <p class="perfect">No mistakes. Every note named correctly.</p>
            }
          >
            <span class="field-label">Missed notes</span>
            <ul class="results-list">
              <For each={wrong()}>
                {(item) => (
                  <li>
                    <Staff note={item.note} clef={item.clef} />
                    <span class="missed-names">
                      <span>
                        You picked <span class="picked">{item.picked}</span>
                      </span>
                      <span>
                        Answer{" "}
                        <span class="correct">{noteName(item.note)}</span>
                      </span>
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </section>
  )
}
