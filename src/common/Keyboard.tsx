import { For, Show } from "solid-js";
import { isHighlightedKey, type PianoKey } from "./keyboard";
import type { Finger } from "./exercises";

export function Keyboard(props: {
  keys: readonly PianoKey[];
  keyIds: readonly string[];
  fingering: readonly Finger[];
}) {
  const whiteIndexForKey = (keyIndex: number) => {
    const whiteKeysBefore = props.keys.slice(0, keyIndex).filter((key) => key.type === "white").length;

    return props.keys[keyIndex].type === "white" ? whiteKeysBefore : whiteKeysBefore - 0.3;
  };

  return (
    <div class="keyboard-scroll" role="group" aria-label="Practice keyboard">
      <div class="keyboard">
        <For each={props.keys}>
          {(key, index) => {
            const highlighted = () => isHighlightedKey(key, props.keyIds);
            const firstFingerForKey = () => {
              const noteIndex = props.keyIds.indexOf(key.id);
              return noteIndex >= 0 ? props.fingering[noteIndex] : undefined;
            };

            return (
              <div
                class={`piano-key ${key.type}${highlighted() ? " is-highlighted" : ""}`}
                data-testid={`key-${key.id}`}
                aria-label={`${key.note}${key.octave}${highlighted() ? " highlighted" : ""}`}
                style={{ "--key-index": String(index()), "--white-index": String(whiteIndexForKey(index())) }}
              >
                <Show when={key.type === "white"}>
                  <span class="key-label">{key.note}</span>
                </Show>
                <Show when={highlighted() && firstFingerForKey()}>
                  {(finger) => <strong>{finger()}</strong>}
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
