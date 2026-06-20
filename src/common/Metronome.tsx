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
      gap: 1.25rem;
      padding: clamp(1.25rem, 4vw, 2rem);
    }

    /* ---- Full variant: pulsing BPM centerpiece ---- */
    .pulse {
      align-items: center;
      background: #2f251d;
      border-radius: 1.25rem;
      color: #fffaf2;
      display: grid;
      gap: 0.1rem;
      justify-items: center;
      min-height: 11rem;
      padding: 1.5rem 1rem;
      text-align: center;
    }

    .pulse .bpm-value {
      font-size: clamp(3.5rem, 15vw, 6.5rem);
      font-weight: 900;
      letter-spacing: -0.06em;
      line-height: 1;
    }

    .pulse .bpm-unit {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.22em;
      opacity: 0.75;
      text-transform: uppercase;
    }

    .pulse small {
      color: #d8c7b3;
      font-size: 0.82rem;
      font-weight: 700;
      margin-top: 0.4rem;
    }

    .pulse.is-running.pulse-odd {
      animation: pulse-pop var(--pulse-duration) ease-out 1;
    }

    .pulse.is-running.pulse-even {
      animation: pulse-pop-alt var(--pulse-duration) ease-out 1;
    }

    /* ---- Full variant: unified tempo bar [-5][-][N][+][+5] ---- */
    .tempo-bar {
      align-items: end;
      display: grid;
      gap: 0.5rem;
      grid-template-columns: auto auto minmax(4rem, 1fr) auto auto;
    }

    .tempo-bar button,
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

    .metronome-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .audio-message {
      margin: 0;
    }

    /* ---- Compact variant: slim pill with static BPM readout ---- */
    .metronome-card.compact {
      align-items: center;
      border-radius: 999px;
      column-gap: 0.85rem;
      display: flex;
      flex-wrap: wrap;
      padding: 0.5rem 0.85rem;
      row-gap: 0.5rem;
    }

    .compact-tempo {
      align-items: center;
      display: flex;
      gap: 0.3rem;
    }

    .compact-tempo button {
      background: #2f251d;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #fffaf2;
      cursor: pointer;
      font-weight: 900;
      height: 1.9rem;
      min-width: 1.9rem;
      padding: 0 0.45rem;
    }

    .bpm-readout {
      align-items: baseline;
      display: inline-flex;
      gap: 0.25rem;
      justify-content: center;
      min-width: 3.4rem;
    }

    .bpm-readout strong {
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: -0.04em;
    }

    .bpm-readout small {
      color: #6f5e4f;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .beat-dot {
      background: #cdbba6;
      border-radius: 999px;
      flex: none;
      height: 0.85rem;
      width: 0.85rem;
    }

    .beat-dot.is-running {
      background: #2f251d;
    }

    .beat-dot.is-running.pulse-odd {
      animation: pulse-pop var(--pulse-duration) ease-out 1;
    }

    .beat-dot.is-running.pulse-even {
      animation: pulse-pop-alt var(--pulse-duration) ease-out 1;
    }

    .metronome-card.compact .primary-button {
      margin-left: auto;
      min-height: 2rem;
      padding: 0.4rem 0.95rem;
    }

    .metronome-card.compact a {
      font-weight: 800;
      white-space: nowrap;
    }

    @keyframes pulse-pop {
      0% {
        transform: scale(1.03);
      }
      100% {
        transform: scale(1);
      }
    }

    @keyframes pulse-pop-alt {
      0% {
        transform: scale(1.03);
      }
      100% {
        transform: scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .pulse.is-running.pulse-odd,
      .pulse.is-running.pulse-even,
      .beat-dot.is-running.pulse-odd,
      .beat-dot.is-running.pulse-even {
        animation: none;
      }

      .pulse.is-running.pulse-odd,
      .pulse.is-running.pulse-even {
        outline: 3px solid #d46a2c;
      }
    }

    @media (max-width: 520px) {
      .tempo-bar {
        gap: 0.35rem;
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
  const pulseAnimationDuration = () => Math.min(300, Math.max(120, Math.round(msPerBeat(bpm()) * 0.35)));
  const pulseClass = () => (pulseCount() === 0 ? "" : pulseCount() % 2 === 0 ? " pulse-even" : " pulse-odd");

  return (
    <Show
      when={isCompact()}
      fallback={
        <div class="metronome-card full">
          <div
            class={`pulse ${isRunning() ? "is-running" : ""}${isRunning() ? pulseClass() : ""}`}
            style={{ "--pulse-duration": `${pulseAnimationDuration()}ms` }}
            aria-live="polite"
          >
            <strong class="bpm-value">{bpm()}</strong>
            <span class="bpm-unit">BPM</span>
            <small>Beat {pulseCount()}</small>
          </div>

          <div class="tempo-bar">
            <button type="button" onClick={() => updateBpm(bpm() - 5)} aria-label="-5 BPM">
              -5
            </button>
            <button type="button" onClick={() => updateBpm(bpm() - 1)} aria-label="-1 BPM">
              -
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
            <button type="button" onClick={() => updateBpm(bpm() + 1)} aria-label="+1 BPM">
              +
            </button>
            <button type="button" onClick={() => updateBpm(bpm() + 5)} aria-label="+5 BPM">
              +5
            </button>
          </div>

          <div class="metronome-actions">
            <button
              type="button"
              class="primary-button"
              onClick={toggle}
              aria-label={isRunning() ? "Stop metronome" : "Start metronome"}
            >
              {isRunning() ? "Stop metronome" : "Start metronome"}
            </button>
            <Show when={audioError()}>{(message) => <p class="audio-message">{message()}</p>}</Show>
          </div>
        </div>
      }
    >
      <div class="metronome-card compact">
        <div class="compact-tempo" role="group" aria-label="Tempo in BPM">
          <button type="button" onClick={() => updateBpm(bpm() - 5)} aria-label="-5 BPM">
            -5
          </button>
          <button type="button" onClick={() => updateBpm(bpm() - 1)} aria-label="-1 BPM">
            -
          </button>
          <span class="bpm-readout">
            <strong>{bpm()}</strong>
            <small>BPM</small>
          </span>
          <button type="button" onClick={() => updateBpm(bpm() + 1)} aria-label="+1 BPM">
            +
          </button>
          <button type="button" onClick={() => updateBpm(bpm() + 5)} aria-label="+5 BPM">
            +5
          </button>
        </div>

        <span
          class={`beat-dot ${isRunning() ? "is-running" : ""}${isRunning() ? pulseClass() : ""}`}
          style={{ "--pulse-duration": `${pulseAnimationDuration()}ms` }}
          aria-label={`Beat ${pulseCount()}`}
          aria-live="polite"
        />

        <button
          type="button"
          class="primary-button"
          onClick={toggle}
          aria-label={isRunning() ? "Stop metronome" : "Start metronome"}
        >
          {isRunning() ? "Stop" : "Start"}
        </button>

        <a href="/metronome">Open full metronome</a>
      </div>
    </Show>
  );
}
