import { createEffect, createSignal, Show } from "solid-js"
import { css } from "solid-styled"
import { PhIcon } from "../common/PhIcon"

const maxTitleLength = 200

/**
 * A heading that turns into a text field when clicked. Enter or leaving the
 * field keeps the new title, Escape keeps the old one.
 */
export function EditableTitle(props: {
  id: string
  title: string
  onRename: (title: string) => void
}) {
  css`
    .editable-title {
      flex: 1 1 16rem;
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
      min-width: 0;
    }

    .title-button,
    .title-input {
      border-radius: 0.5rem;
      font-weight: inherit;
      letter-spacing: inherit;
      line-height: inherit;
      margin: -0.2rem -0.4rem;
      padding: 0.2rem 0.4rem;
    }

    .title-button {
      align-items: baseline;
      cursor: text;
      display: inline-flex;
      gap: 0.4rem;
      max-width: calc(100% + 0.8rem);
      overflow-wrap: anywhere;
      text-align: left;
    }

    .title-button:hover {
      background: #efe3d2;
    }

    .title-button .ph-icon {
      color: #8c6e4a;
      flex: none;
      opacity: 0.7;
    }

    .title-button:hover .ph-icon,
    .title-button:focus-visible .ph-icon {
      opacity: 1;
    }

    .title-input {
      background: #fffaf2;
      border: 1px solid #b38f64;
      width: calc(100% + 0.8rem);
    }

    .title-input:focus-visible {
      outline-offset: 0;
    }
  `

  const [isEditing, setIsEditing] = createSignal(false)
  let button: HTMLButtonElement | undefined
  let input: HTMLInputElement | undefined

  createEffect(() => {
    if (isEditing()) {
      input?.focus()
      input?.select()
    }
  })

  const stopEditing = (keep: boolean, refocus: boolean) => {
    if (!isEditing() || !input) {
      return
    }

    const title = input.value.trim()
    setIsEditing(false)
    if (keep && title.length > 0 && title !== props.title) {
      props.onRename(title)
    }
    // After Enter or Escape, keep keyboard focus where it was. After a tap
    // elsewhere, leave focus on whatever was tapped.
    if (refocus) {
      button?.focus()
    }
  }

  return (
    <h1 id={props.id} class="editable-title">
      <Show
        when={isEditing()}
        fallback={
          <button
            ref={button}
            type="button"
            class="title-button"
            title="Rename"
            onClick={() => setIsEditing(true)}
          >
            {props.title}
            <PhIcon name="pencil-simple" aria-hidden="true" size="0.7em" />
          </button>
        }
      >
        <input
          ref={input}
          class="title-input"
          aria-label="Title"
          maxLength={maxTitleLength}
          value={props.title}
          enterkeyhint="done"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              stopEditing(true, true)
            } else if (event.key === "Escape") {
              event.preventDefault()
              stopEditing(false, true)
            }
          }}
          onBlur={() => stopEditing(true, false)}
        />
      </Show>
    </h1>
  )
}
