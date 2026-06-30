import { createMemo, createSignal, For, Show } from "solid-js"
import { css } from "solid-styled"
import { type Exercise, exercises, getExerciseById } from "../common/exercises"
import { PhIcon } from "../common/PhIcon"
import {
  type ExerciseTypeFilter,
  readExerciseTypeFilterPreference,
  readLastExerciseIdPreference,
  writeExerciseTypeFilterPreference,
} from "../common/preferences"
import { ExerciseCard } from "./ExerciseCard"

export function ExercisesPage() {
  css`
    .continue-card {
      align-items: center;
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      box-shadow: 0 18px 50px rgba(47, 37, 29, 0.08);
      display: inline-flex;
      gap: 0.65rem;
      font-weight: 800;
      padding: 0.75rem 0.85rem;
      text-decoration: none;
    }

    .catalog-controls {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
    }

    .catalog-controls label {
      display: grid;
      gap: 0.4rem;
      font-weight: 800;
    }

    .search-field,
    .catalog-controls select {
      background: #fffaf2;
      border: 1px solid #8e7b67;
      border-radius: 0.8rem;
      color: #17130f;
    }

    .search-field {
      align-items: center;
      display: flex;
      overflow: hidden;
      padding-left: 0.85rem;
    }

    .search-field input {
      background: transparent;
      border: none;
      color: inherit;
      flex: 1;
      padding-left: 0.55rem;
    }

    .search-field input:focus {
      outline: none;
    }

    .exercise-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .empty-state {
      border: 1px dashed #8e7b67;
      border-radius: 1rem;
      padding: 1rem;
    }

    @media (max-width: 640px) {
      .catalog-controls {
        grid-template-columns: 1fr;
      }
    }
  `

  const [search, setSearch] = createSignal("")
  const [typeFilter, setTypeFilter] = createSignal<ExerciseTypeFilter>(
    readExerciseTypeFilterPreference(),
  )
  const lastExercise = () => {
    const id = readLastExerciseIdPreference()
    return id ? getExerciseById(id) : undefined
  }
  const filteredExercises = createMemo(() => {
    const normalizedSearch = search().trim().toLowerCase()
    const selectedType = typeFilter()

    return exercises
      .map((exercise) => ({
        exercise,
        rank: rankExercise(exercise, normalizedSearch),
      }))
      .filter(
        ({ exercise, rank }) =>
          (selectedType === "all" || exercise.type === selectedType) &&
          Number.isFinite(rank),
      )
      .sort((left, right) => left.rank - right.rank)
      .map(({ exercise }) => exercise)
  })

  const updateTypeFilter = (value: string) => {
    const nextValue = value as ExerciseTypeFilter
    setTypeFilter(nextValue)
    writeExerciseTypeFilterPreference(nextValue)
  }

  return (
    <section aria-label="Exercises" class="stack">
      <Show when={lastExercise()}>
        {(exercise) => (
          <a class="continue-card" href={`/exercises/${exercise().id}`}>
            <PhIcon name="hourglass-low" aria-hidden="true" size={18} />
            Continue with {exercise().title}
          </a>
        )}
      </Show>

      <div class="catalog-controls">
        <label>
          <div class="search-field">
            <PhIcon
              name="magnifying-glass"
              aria-hidden="true"
              size={18}
              weight="bold"
            />
            <input
              value={search()}
              onInput={(event) => setSearch(event.currentTarget.value)}
              type="search"
              placeholder="C major, arpeggio, A..."
              aria-label="Search exercises"
            />
          </div>
        </label>
        <label>
          <select
            value={typeFilter()}
            onChange={(event) => updateTypeFilter(event.currentTarget.value)}
            aria-label="Exercise type"
          >
            <option value="all">All exercises</option>
            <option value="scale">Scales</option>
            <option value="arpeggio">Arpeggios</option>
          </select>
        </label>
      </div>

      <div class="exercise-grid">
        <For each={filteredExercises()}>
          {(exercise) => <ExerciseCard exercise={exercise} query={search()} />}
        </For>
      </div>

      <Show when={filteredExercises().length === 0}>
        <p class="empty-state">No exercises match the current search.</p>
      </Show>
    </section>
  )
}

function rankExercise(exercise: Exercise, query: string): number {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery.length === 0) {
    return 0
  }

  if (exercise.title.toLowerCase().includes(normalizedQuery)) {
    return 0
  }

  if (
    exercise.tonic.toLowerCase().includes(normalizedQuery) ||
    exercise.type.toLowerCase().includes(normalizedQuery) ||
    exercise.quality.toLowerCase().includes(normalizedQuery)
  ) {
    return 1
  }

  if (
    exercise.notes.some((note) => note.toLowerCase().includes(normalizedQuery))
  ) {
    return 2
  }

  return Infinity
}
