import { For, Show } from "solid-js";
import { css } from "solid-styled";
import { isHighlightedKey, type PianoKey } from "./keyboard";
import type { Finger } from "./exercises";

export function Keyboard(props: {
  keys: readonly PianoKey[];
  keyIds: readonly string[];
  fingering: readonly Finger[];
}) {
  css`
    .keyboard-scroll {
      overflow-x: auto;
      padding-bottom: 0.75rem;
    }

    .keyboard {
      height: 11rem;
      min-width: 980px;
      position: relative;
    }

    .piano-key {
      align-items: center;
      border: 1px solid #17130f;
      display: flex;
      flex-direction: column;
      font-size: 0.72rem;
      font-weight: 800;
      justify-content: flex-end;
      left: calc(var(--white-index, 0) * 2.8rem);
      padding: 0.35rem 0.2rem;
      position: absolute;
      top: 0;
    }

    .piano-key.black {
      background: #17130f;
      color: #fffaf2;
      height: 6.4rem;
      width: 1.65rem;
      z-index: 2;
    }

    .piano-key.white {
      background: #fffaf2;
      height: 10.5rem;
      width: 2.8rem;
      z-index: 1;
    }

    .piano-key.white.is-highlighted {
      background-color: #f0b75e;
      background-image: repeating-linear-gradient(
        45deg,
        transparent 0 7px,
        rgba(23, 19, 15, 0.08) 7px 9px
      );
      border-color: #2f251d;
    }

    .piano-key.black.is-highlighted {
      background-color: #8a4a1f;
      background-image: repeating-linear-gradient(
        45deg,
        transparent 0 7px,
        rgba(255, 250, 242, 0.16) 7px 9px
      );
    }

    .piano-key strong {
      align-items: center;
      background: #2f251d;
      border-radius: 50%;
      color: #fffaf2;
      display: inline-flex;
      height: 1.35rem;
      justify-content: center;
      margin-top: 0.25rem;
      width: 1.35rem;
    }

    .piano-key.black strong {
      background: #fffaf2;
      color: #17130f;
    }

    @media (max-width: 420px) {
      .keyboard-scroll {
        margin-inline: -0.85rem;
        padding-inline: 0.85rem;
      }
    }
  `;

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
