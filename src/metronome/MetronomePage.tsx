import { css } from "solid-styled";
import { MetronomeControls } from "../common/Metronome";

export function MetronomePage() {
  css`
    .metronome-view {
      max-width: 760px;
    }
  `;

  return (
    <section aria-label="Metronome" class="stack metronome-view">
      <MetronomeControls variant="full" />
    </section>
  );
}
