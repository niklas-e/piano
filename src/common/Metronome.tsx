import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { css } from "solid-styled";
import { clampBpm, createMetronomeEngine, formatElapsed, msPerBeat, tapTempoBpm, TAP_RESET_GAP_MS } from "./metronome";
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

    .pulse small {
      color: #d8c7b3;
      font-feature-settings: "tnum" 1;
      font-size: 0.82rem;
      font-weight: 700;
      margin-top: 0.4rem;
    }

    .pulse.is-running.pulse-odd {
      animation: pulse-glow var(--pulse-duration) ease-out 1;
    }

    .pulse.is-running.pulse-even {
      animation: pulse-glow-alt var(--pulse-duration) ease-out 1;
    }

    /* ---- Full variant: unified tempo bar [-5][-][N][+][+5] ---- */
    .tempo-bar {
      align-items: center;
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

    .tempo-field {
      background: #f7f0e6;
      border: 1px solid #8e7b67;
      border-radius: 0.9rem;
      font-size: 1.4rem;
      font-weight: 900;
      padding: 0.7rem;
      text-align: center;
    }

    .tap-button {
      background: transparent;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: #2f251d;
      cursor: pointer;
      font-weight: 900;
      min-height: 2.75rem;
      padding: 0.65rem 1.1rem;
    }

    .tap-button:hover {
      background: #f1e7d8;
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

    .seg-control {
      align-items: stretch;
      background: #2f251d;
      border-radius: 999px;
      display: inline-flex;
      overflow: hidden;
    }

    .seg-control .seg-btn {
      background: #2f251d;
      border: none;
      color: #fffaf2;
      cursor: pointer;
      font-weight: 900;
      min-width: 2.1rem;
      padding: 0.4rem 0.6rem;
    }

    .seg-control .seg-btn:hover {
      background: #45372b;
    }

    .seg-control .seg-readout {
      align-items: center;
      background: #fffaf2;
      border-radius: 999px;
      display: inline-flex;
      justify-content: center;
      margin: 0.18rem;
      min-width: 2.8rem;
      padding: 0.1rem 0.55rem;
    }

    .bpm-readout strong {
      font-size: 1.3rem;
      font-weight: 900;
      letter-spacing: -0.04em;
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

    /* identical-by-design: alternating animation-names force a per-beat restart of the glow */
    @keyframes pulse-glow {
      0% {
        box-shadow: 0 0 0 0.55rem rgba(212, 106, 44, 0.45);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(212, 106, 44, 0);
      }
    }

    @keyframes pulse-glow-alt {
      0% {
        box-shadow: 0 0 0 0.55rem rgba(212, 106, 44, 0.45);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(212, 106, 44, 0);
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

  const [elapsedMs, setElapsedMs] = createSignal(0);
  let tapTimes: number[] = [];
  let elapsedTimerId: number | undefined;
  let elapsedStartedAt = 0;

  const stopElapsedTimer = () => {
    if (elapsedTimerId !== undefined) {
      window.clearInterval(elapsedTimerId);
      elapsedTimerId = undefined;
    }
  };

  const startElapsedTimer = () => {
    stopElapsedTimer();
    elapsedStartedAt = performance.now();
    setElapsedMs(0);
    elapsedTimerId = window.setInterval(() => {
      setElapsedMs(performance.now() - elapsedStartedAt);
    }, 250);
  };

  const handleTap = () => {
    const now = performance.now();
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > TAP_RESET_GAP_MS) {
      tapTimes = [];
    }
    tapTimes.push(now);
    if (tapTimes.length > 5) {
      tapTimes = tapTimes.slice(-5);
    }
    const nextBpm = tapTempoBpm(tapTimes);
    if (nextBpm !== null) {
      updateBpm(nextBpm);
    }
  };

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
      stopElapsedTimer();
      setElapsedMs(0);
      return;
    }

    engine.start();
    setAudioError(engine.getAudioError());
    setIsRunning(true);
    startElapsedTimer();
  };

  onMount(() => {
    const unsubscribe = engine.onPulse((beat) => setPulseCount(beat));
    const unsubscribeAudioError = engine.onAudioError(setAudioError);
    onCleanup(() => {
      stopElapsedTimer();
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
            data-beat={pulseCount()}
          >
            <strong class="bpm-value">{bpm()}</strong>
            <small class="elapsed" aria-hidden="true">{formatElapsed(elapsedMs())}</small>
          </div>

          <div class="tempo-bar">
            <button type="button" onClick={() => updateBpm(bpm() - 5)} aria-label="-5 BPM">
              -5
            </button>
            <button type="button" onClick={() => updateBpm(bpm() - 1)} aria-label="-1 BPM">
              -
            </button>
            <input
              class="tempo-field"
              aria-label="Tempo in BPM"
              inputmode="numeric"
              min="30"
              max="240"
              type="number"
              value={bpm()}
              onChange={(event) => updateBpm(Number(event.currentTarget.value))}
            />
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
            <button type="button" class="tap-button" onClick={handleTap} aria-label="Tap tempo">
              Tap
            </button>
            <Show when={audioError()}>{(message) => <p class="audio-message">{message()}</p>}</Show>
          </div>
        </div>
      }
    >
      <div class="metronome-card compact">
        <div class="seg-control" role="group" aria-label="Tempo in BPM">
          <button type="button" class="seg-btn" onClick={() => updateBpm(bpm() - 5)} aria-label="-5 BPM">
            -5
          </button>
          <button type="button" class="seg-btn" onClick={() => updateBpm(bpm() - 1)} aria-label="-1 BPM">
            -
          </button>
          <span class="seg-readout bpm-readout">
            <strong>{bpm()}</strong>
          </span>
          <button type="button" class="seg-btn" onClick={() => updateBpm(bpm() + 1)} aria-label="+1 BPM">
            +
          </button>
          <button type="button" class="seg-btn" onClick={() => updateBpm(bpm() + 5)} aria-label="+5 BPM">
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
      </div>
    </Show>
  );
}
