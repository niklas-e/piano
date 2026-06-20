import type { JSX } from "solid-js";
import { css } from "solid-styled";

export function StepperButton(props: {
  direction: "increment" | "decrement";
  ariaLabel: string;
  variant?: "round" | "pill" | "segment";
  disabled?: boolean;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  class?: string;
  children?: JSX.Element;
}) {
  css`
    .stepper-button {
      align-items: center;
      justify-content: center;
      background: #2f251d;
      border: 0;
      border-radius: 50%;
      color: #fffaf2;
      cursor: pointer;
      display: inline-flex;
      font-weight: 900;
    }

    .stepper-button.round {
      border-radius: 50%;
      height: 2rem;
      width: 2rem;
    }

    .stepper-button.pill {
      border: 1px solid #2f251d;
      border-radius: 999px;
      min-height: 2.75rem;
      min-width: 2.75rem;
      padding: 0.65rem 1rem;
    }

    .stepper-button.segment {
      border-radius: 0;
      min-width: 2.1rem;
      padding: 0.4rem 0.6rem;
    }

    .stepper-button.segment:hover {
      background: #45372b;
    }

    .stepper-button-label {
      display: block;
      line-height: 1;
    }

    .stepper-button:disabled {
      cursor: not-allowed;
      opacity: 0.42;
    }

    .stepper-button-glyph {
      display: block;
      height: 0.9rem;
      position: relative;
      width: 0.9rem;
    }

    .stepper-button-glyph::before,
    .stepper-button-glyph::after {
      background: currentColor;
      border-radius: 999px;
      content: "";
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    .stepper-button-glyph::before {
      height: 0.14rem;
      width: 100%;
    }

    .stepper-button-glyph::after {
      height: 100%;
      width: 0.14rem;
    }

    .stepper-button-glyph.is-minus::after {
      display: none;
    }
  `;

  const variant = props.variant ?? "round";

  return (
    <button
      type="button"
      class={props.class ? `stepper-button ${variant} ${props.class}` : `stepper-button ${variant}`}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children ?? (
        <span aria-hidden="true" class={props.direction === "decrement" ? "stepper-button-glyph is-minus" : "stepper-button-glyph"} />
      )}
    </button>
  );
}
