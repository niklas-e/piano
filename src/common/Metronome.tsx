import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { css } from "solid-styled";
import { clampBpm, createMetronomeEngine, msPerBeat } from "./metronome";
import { readBpmPreference, writeBpmPreference } from "./preferences";

export function MetronomeControls(props: { variant: "full" | "compact" }) {
  css`
    .metronome-card {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      display: grid;
      gap: 1rem;
      padding: clamp(1rem, 4vw, 1.5rem);
    }

    .tempo-row {
      align-items: end;
      display: grid;
      gap: 0.75rem;
      grid-template-columns: auto minmax(8rem, 1fr) auto;
    }

    .tempo-row button,
    .primary-button {
      background: #2f251d;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #fffaf2;
      cursor: pointer;
      font-weight: 900;
      min-height: 2.75rem;
      padding: 0.65rem 1rem;
    }

    .tempo-input {
      display: grid;
      font-weight: 800;
      gap: 0.35rem;
    }

    .tempo-input input {
      background: #f7f0e6;
      border: 1px solid #8e7b67;
      border-radius: 0.9rem;
      font-size: 1.4rem;
      font-weight: 900;
      padding: 0.7rem;
      text-align: center;
    }

    .pulse {
      align-items: center;
      background: #efe1cf;
      border-radius: 1rem;
      display: grid;
      gap: 0.2rem;
      justify-items: center;
      min-height: 9rem;
      padding: 1rem;
      text-align: center;
    }

    .pulse strong {
      font-size: clamp(1.5rem, 7vw, 3.5rem);
      letter-spacing: -0.06em;
    }

    .pulse.is-running.pulse-odd {
      animation: pulse-pop var(--pulse-duration) ease-out 1;
    }

    .pulse.is-running.pulse-even {
      animation: pulse-pop-alt var(--pulse-duration) ease-out 1;
    }

    .metronome-card.compact {
      align-items: center;
      border-radius: 0.9rem;
      display: grid;
      gap: 0.65rem;
      grid-template-columns: minmax(11rem, 1fr) auto auto;
      padding: 0.75rem;
    }

    .metronome-card.compact .tempo-row {
      gap: 0.45rem;
      grid-template-columns: auto minmax(4.5rem, 6rem) auto;
    }

    .metronome-card.compact .tempo-input span {
      font-size: 0.72rem;
    }

    .metronome-card.compact .tempo-input input {
      font-size: 1rem;
      padding: 0.45rem;
    }

    .metronome-card.compact .metronome-actions {
      justify-content: end;
    }

    .compact-pulse {
      display: grid;
      font-weight: 800;
      gap: 0.1rem;
      justify-items: center;
      min-width: 4.5rem;
    }

    .compact-pulse span {
      font-size: 0.95rem;
    }

    .compact-pulse small {
      color: #6f5e4f;
      font-size: 0.72rem;
    }

    .metronome-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .audio-message {
      margin: 0;
    }

    @keyframes pulse-pop {
      0% {
        transform: scale(1.025);
      }
      100% {
        transform: scale(1);
      }
    }

    @keyframes pulse-pop-alt {
      0% {
        transform: scale(1.025);
      }
      100% {
        transform: scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pulse.is-running.pulse-odd,
      .pulse.is-running.pulse-even {
        animation: none;
        outline: 3px solid #d46a2c;
      }
    }

    @media (max-width: 520px) {
      .tempo-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .metronome-card.compact {
        grid-template-columns: 1fr;
      }
    }
  `;

  const [bpm, setBpm] = createSignal(readBpmPreference());
  const [isRunning, setIsRunning] = createSignal(false);
  const [pulseCount, setPulseCount] = createSignal(0);
  const [audioError, setAudioError] = createSignal<string | undefined>();
  const engine = createMetronomeEngine(bpm());

  const updateBpm = (value: number) => {
    const nextBpm = clampBpm(value);
    setBpm(nextBpm);
    engine.setBpm(nextBpm);
    writeBpmPreference(nextBpm);
  };

  const toggle = () => {
    if (isRunning()) {
      engine.stop();
      setIsRunning(false);
      return;
    }

    engine.start();
    setAudioError(engine.getAudioError());
    setIsRunning(true);
  };

  onMount(() => {
    const unsubscribe = engine.onPulse((beat) => setPulseCount(beat));
    const unsubscribeAudioError = engine.onAudioError(setAudioError);
    onCleanup(() => {
      unsubscribe();
      unsubscribeAudioError();
      engine.dispose();
    });
  });

  const isCompact = () => props.variant === "compact";
  const startLabel = () => (isCompact() ? "Start compact metronome" : "Start metronome");
  const stopLabel = () => (isCompact() ? "Stop compact metronome" : "Stop metronome");
  const pulseAnimationDuration = () => Math.min(300, Math.max(120, Math.round(msPerBeat(bpm()) * 0.35)));
  const pulseClass = () => (pulseCount() === 0 ? "" : pulseCount() % 2 === 0 ? " pulse-even" : " pulse-odd");

  return (
    <div class={`metronome-card ${isCompact() ? "compact" : "full"}`}>
      <div class="tempo-row">
        <button type="button" onClick={() => updateBpm(bpm() - 5)} aria-label={isCompact() ? "Compact -5 BPM" : "-5 BPM"}>
          -5
        </button>
        <label class="tempo-input">
          <span>Tempo in BPM</span>
          <input
            inputmode="numeric"
            min="30"
            max="240"
            type="number"
            value={bpm()}
            onChange={(event) => updateBpm(Number(event.currentTarget.value))}
          />
        </label>
        <button type="button" onClick={() => updateBpm(bpm() + 5)} aria-label={isCompact() ? "Compact +5 BPM" : "+5 BPM"}>
          +5
        </button>
      </div>

      <Show
        when={!isCompact()}
        fallback={
          <div class="compact-pulse" aria-live="polite">
            <span>{bpm()} BPM</span>
            <small>Beat {pulseCount()}</small>
          </div>
        }
      >
        <div
          class={`pulse ${isRunning() ? "is-running" : ""}${isRunning() ? pulseClass() : ""}`}
          style={{ "--pulse-duration": `${pulseAnimationDuration()}ms` }}
          aria-live="polite"
        >
          <span>{bpm()} BPM</span>
          <strong>Visual pulse</strong>
          <small>Beat {pulseCount()}</small>
        </div>
      </Show>

      <div class="metronome-actions">
        <button type="button" class="primary-button" onClick={toggle} aria-label={isRunning() ? stopLabel() : startLabel()}>
          {isRunning() ? stopLabel() : startLabel()}
        </button>
        <Show when={audioError()}>
          {(message) => <p class="audio-message">{message()}</p>}
        </Show>
        <Show when={isCompact()}>
          <a href="/metronome">Open full metronome</a>
        </Show>
      </div>
    </div>
  );
}
