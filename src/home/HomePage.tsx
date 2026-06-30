import { For } from "solid-js"
import { css } from "solid-styled"

const sections = [
  {
    title: "Exercises",
    description: "Browse technical exercises for focused piano practice.",
    meta: "Scales and arpeggios",
    href: "/exercises",
  },
  {
    title: "Metronome",
    description: "Practice with a steady pulse and adjustable tempo.",
    meta: "Tempo practice",
    href: "/metronome",
  },
  {
    title: "Sight Reading",
    description: "Identify notes on the staff against the clock.",
    meta: "Note recognition",
    href: "/sight-reading",
  },
] as const

export function HomePage() {
  css`
    .hero {
      max-width: 860px;
    }

    .hero-copy {
      max-width: 760px;
    }

    .launcher-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .launcher-card {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      box-shadow: 0 18px 50px rgba(47, 37, 29, 0.08);
      display: grid;
      gap: 0.6rem;
      min-height: 11.5rem;
      padding: 1.2rem;
      text-decoration: none;
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
    }

    .launcher-card:hover,
    .launcher-card:focus-visible {
      border-color: #b38f64;
      box-shadow: 0 22px 60px rgba(47, 37, 29, 0.12);
      transform: translateY(-2px);
    }

    .launcher-title {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .launcher-description {
      color: #4f4338;
      max-width: 26ch;
    }

    .launcher-meta {
      color: #8c6e4a;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-top: auto;
      text-transform: uppercase;
    }

    @media (max-width: 640px) {
      .launcher-card {
        min-height: auto;
      }
    }
  `

  return (
    <section class="hero stack" aria-labelledby="home-heading">
      <div class="hero-copy stack">
        <p class="eyebrow">Lean piano practice tools</p>
        <h1 id="home-heading">Piano Practice</h1>
        <p>
          Browse technical exercises, inspect fingering, and practice with a
          focused metronome.
        </p>
      </div>

      <nav class="launcher-grid" aria-label="Practice tools">
        <For each={sections}>
          {(section) => (
            <a class="launcher-card" href={section.href}>
              <h2 class="launcher-title">{section.title}</h2>
              <p class="launcher-description">{section.description}</p>
              <p class="launcher-meta">{section.meta}</p>
            </a>
          )}
        </For>
      </nav>
    </section>
  )
}
