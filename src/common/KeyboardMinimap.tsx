import { For } from "solid-js";
import { css } from "solid-styled";
import { isHighlightedKey, type PianoKey } from "./keyboard";

export function KeyboardMinimap(props: {
  keys: readonly PianoKey[];
  keyIds: readonly string[];
}) {
  css`
    .minimap {
      height: 2.5rem;
      margin-top: 0.75rem;
      position: relative;
      width: 100%;
    }

    .minimap-key {
      border: 1px solid #c9b89f;
      box-sizing: border-box;
      position: absolute;
      top: 0;
    }

    .minimap-key.white {
      background: #fffaf2;
      height: 2.5rem;
      z-index: 1;
    }

    .minimap-key.black {
      background: #17130f;
      height: 1.5rem;
      z-index: 2;
    }

    .minimap-key.white.is-highlighted {
      background: #f0b75e;
    }

    .minimap-key.black.is-highlighted {
      background: #8a4a1f;
    }
  `;

  const whiteCount = props.keys.filter((key) => key.type === "white").length;
  const unit = 100 / whiteCount;
  const blackWidthRatio = 1.65 / 2.8;

  const whiteIndexForKey = (keyIndex: number) => {
    const whiteKeysBefore = props.keys.slice(0, keyIndex).filter((key) => key.type === "white").length;

    return props.keys[keyIndex].type === "white" ? whiteKeysBefore : whiteKeysBefore - 0.3;
  };

  return (
    <div class="minimap" data-testid="keyboard-minimap" role="img" aria-label="Exercise position on the full keyboard">
      <For each={props.keys}>
        {(key, index) => {
          const highlighted = () => isHighlightedKey(key, props.keyIds);
          const widthFactor = key.type === "white" ? 1 : blackWidthRatio;

          return (
            <div
              class={`minimap-key ${key.type}${highlighted() ? " is-highlighted" : ""}`}
              data-testid={`minimap-key-${key.id}`}
              style={{
                left: `${whiteIndexForKey(index()) * unit}%`,
                width: `${unit * widthFactor}%`
              }}
            />
          );
        }}
      </For>
    </div>
  );
}
