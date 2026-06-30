import { css } from "solid-styled"

export function NotFoundPage() {
  css`
    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
  `

  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p>This route is not part of the piano practice app.</p>
      <div class="link-row">
        <a href="/exercises">Go to exercises</a>
        <a href="/metronome">Go to metronome</a>
      </div>
    </section>
  )
}
