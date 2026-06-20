import { css } from "solid-styled";
import { MetronomeControls } from "../common/Metronome";

export function MetronomePage() {
  css`
    .metronome-view {
      max-width: 760px;
    }
  `;

  return (
    <section aria-labelledby="metronome-heading" class="stack metronome-view">
      <div class="section-intro">
        <h1 id="metronome-heading">Metronome</h1>
      </div>
      <MetronomeControls variant="full" />
    </section>
  );
}
