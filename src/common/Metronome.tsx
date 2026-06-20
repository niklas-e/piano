import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { clampBpm, createMetronomeEngine, msPerBeat } from "./metronome";
import { readBpmPreference, writeBpmPreference } from "./preferences";

export function MetronomeControls(props: { variant: "full" | "compact" }) {
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
