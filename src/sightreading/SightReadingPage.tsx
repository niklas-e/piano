import { For, Show, createSignal, onCleanup } from "solid-js";
import { css } from "solid-styled";
import { Staff } from "../common/Staff";
import {
  ANSWER_OPTIONS,
  CLEFS,
  DURATION_OPTIONS,
  accuracyPercent,
  formatClock,
  noteName,
  randomNote,
  type Clef,
  type Note,
  type WrongAnswer
} from "../common/sightReading";
import {
  readSightReadingClefPreference,
  readSightReadingDurationPreference,
  writeSightReadingClefPreference,
  writeSightReadingDurationPreference
} from "../common/preferences";

type Phase = "setup" | "playing" | "results";

const clefLabels: Record<Clef, string> = { treble: "Treble", bass: "Bass" };

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

    .answer-grid button:hover {
      background: #e7d8c2;
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
      gap: 0.5rem;
      justify-content: space-between;
      padding: 0.6rem 0.9rem;
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
  `;

  const [clef, setClef] = createSignal<Clef>(readSightReadingClefPreference());
  const [duration, setDuration] = createSignal(readSightReadingDurationPreference());
  const [phase, setPhase] = createSignal<Phase>("setup");
  const [note, setNote] = createSignal<Note>(randomNote(clef()));
  const [correct, setCorrect] = createSignal(0);
  const [total, setTotal] = createSignal(0);
  const [wrong, setWrong] = createSignal<WrongAnswer[]>([]);
  const [remaining, setRemaining] = createSignal(0);
  const [elapsed, setElapsed] = createSignal(0);

  let timerId: number | undefined;
  let startedAt = 0;

  const stopTimer = () => {
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      timerId = undefined;
    }
  };

  const endGame = () => {
    stopTimer();
    setPhase("results");
  };

  const startTimer = () => {
    stopTimer();
    startedAt = performance.now();
    const tick = () => {
      const seconds = Math.floor((performance.now() - startedAt) / 1000);
      if (duration() === 0) {
        setElapsed(seconds);
        return;
      }
      const left = duration() - seconds;
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        endGame();
      }
    };
    tick();
    timerId = window.setInterval(tick, 200);
  };

  const start = () => {
    writeSightReadingClefPreference(clef());
    writeSightReadingDurationPreference(duration());
    setCorrect(0);
    setTotal(0);
    setWrong([]);
    setRemaining(duration());
    setElapsed(0);
    setNote(randomNote(clef()));
    setPhase("playing");
    startTimer();
  };

  const answer = (name: string) => {
    const correctName = noteName(note());
    setTotal((value) => value + 1);
    if (name === correctName) {
      setCorrect((value) => value + 1);
    } else {
      setWrong((list) => [...list, { shown: correctName, picked: name }]);
    }
    setNote(randomNote(clef()));
  };

  const backToSetup = () => {
    stopTimer();
    setPhase("setup");
  };

  const timeLabel = () => formatClock(duration() === 0 ? elapsed() : remaining());

  onCleanup(stopTimer);

  return (
    <section class="sight-reading stack" aria-label="Sight reading">
      <Show when={phase() === "setup"}>
        <div class="hero-copy stack">
          <p class="eyebrow">Note identification</p>
          <h1>Sight Reading</h1>
          <p>Name each note as it appears. Pick a clef and a length, then start.</p>
        </div>

        <div class="panel">
          <div class="field">
            <span class="field-label">Clef</span>
            <div class="segmented" role="group" aria-label="Clef">
              <For each={CLEFS}>
                {(option) => (
                  <button type="button" aria-pressed={clef() === option} onClick={() => setClef(option)}>
                    {clefLabels[option]}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="field">
            <span class="field-label">Length</span>
            <div class="segmented" role="group" aria-label="Length">
              <For each={DURATION_OPTIONS}>
                {(option) => (
                  <button type="button" aria-pressed={duration() === option.seconds} onClick={() => setDuration(option.seconds)}>
                    {option.label}
                  </button>
                )}
              </For>
            </div>
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

        <div class="panel">
          <Staff note={note()} clef={clef()} />
        </div>

        <div class="answer-grid" role="group" aria-label="Note options">
          <For each={ANSWER_OPTIONS}>
            {(option) => (
              <button
                type="button"
                style={{ "grid-column": String(option.column), "grid-row": String(option.row) }}
                aria-label={`Answer ${option.name}`}
                onClick={() => answer(option.name)}
              >
                {option.name}
              </button>
            )}
          </For>
        </div>

        <button type="button" class="ghost-button" onClick={endGame}>
          End
        </button>
      </Show>

      <Show when={phase() === "results"}>
        <div class="hero-copy stack">
          <p class="eyebrow">Results</p>
          <h1>{correct()} correct</h1>
          <p>{accuracyPercent(correct(), total())}% accuracy over {total()} notes.</p>
        </div>

        <div class="panel">
          <Show
            when={wrong().length > 0}
            fallback={<p class="perfect">No mistakes. Every note named correctly.</p>}
          >
            <span class="field-label">Missed notes</span>
            <ul class="results-list">
              <For each={wrong()}>
                {(item) => (
                  <li>
                    <span>You picked <span class="picked">{item.picked}</span></span>
                    <span>Answer <span class="correct">{item.shown}</span></span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class="segmented">
          <button type="button" class="primary-button" onClick={start}>
            Play again
          </button>
          <button type="button" class="ghost-button" onClick={backToSetup}>
            Change settings
          </button>
        </div>
      </Show>
    </section>
  );
}
