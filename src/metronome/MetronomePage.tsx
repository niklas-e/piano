import { MetronomeControls } from "../common/Metronome";

export function MetronomePage() {
  return (
    <section aria-labelledby="metronome-heading" class="stack metronome-view">
      <div class="section-intro">
        <p class="eyebrow">Steady tempo</p>
        <h1 id="metronome-heading">Metronome</h1>
        <p>Set a practical tempo, start the pulse, and keep the exercise work focused.</p>
      </div>
      <MetronomeControls variant="full" />
    </section>
  );
}
