import { For, Show, createMemo, createSignal } from "solid-js";
import { css } from "solid-styled";
import { exercises, getExerciseById, type Exercise } from "../common/exercises";
import {
  readExerciseTypeFilterPreference,
  readLastExerciseIdPreference,
  writeExerciseTypeFilterPreference,
  type ExerciseTypeFilter
} from "../common/preferences";
import { ExerciseCard } from "./ExerciseCard";

export function ExercisesPage() {
  css`
    .continue-card {
      background: #fffaf2;
      border: 1px solid #dfd1bf;
      border-radius: 1.25rem;
      box-shadow: 0 18px 50px rgba(47, 37, 29, 0.08);
      display: inline-flex;
      font-weight: 800;
      padding: 1rem 1.25rem;
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

    .catalog-controls input,
    .catalog-controls select {
      background: #fffaf2;
      border: 1px solid #8e7b67;
      border-radius: 0.8rem;
      color: #17130f;
      padding: 0.75rem 0.85rem;
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
  `;

  const [search, setSearch] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal<ExerciseTypeFilter>(readExerciseTypeFilterPreference());
  const lastExercise = () => {
    const id = readLastExerciseIdPreference();
    return id ? getExerciseById(id) : undefined;
  };
  const filteredExercises = createMemo(() => {
    const normalizedSearch = search().trim().toLowerCase();
    const selectedType = typeFilter();

    return exercises
      .map((exercise) => ({ exercise, rank: rankExercise(exercise, normalizedSearch) }))
      .filter(({ exercise, rank }) => (selectedType === "all" || exercise.type === selectedType) && Number.isFinite(rank))
      .sort((left, right) => left.rank - right.rank)
      .map(({ exercise }) => exercise);
  });

  const updateTypeFilter = (value: string) => {
    const nextValue = value as ExerciseTypeFilter;
    setTypeFilter(nextValue);
    writeExerciseTypeFilterPreference(nextValue);
  };

  return (
    <section aria-labelledby="exercises-heading" class="stack">
      <div class="section-intro">
        <p class="eyebrow">Plain technical reference</p>
        <h1 id="exercises-heading">Exercises</h1>
        <p>Search scales and arpeggios directly. No grades, levels, dashboards, or exam labels.</p>
      </div>

      <Show when={lastExercise()}>
        {(exercise) => (
          <a class="continue-card" href={`/exercises/${exercise().id}`}>
            Continue with {exercise().title}
          </a>
        )}
      </Show>

      <div class="catalog-controls">
        <label>
          <span>Search exercises</span>
          <input
            value={search()}
            onInput={(event) => setSearch(event.currentTarget.value)}
            type="search"
            placeholder="C major, arpeggio, A..."
          />
        </label>
        <label>
          <span>Exercise type</span>
          <select value={typeFilter()} onChange={(event) => updateTypeFilter(event.currentTarget.value)}>
            <option value="all">All exercises</option>
            <option value="scale">Scales</option>
            <option value="arpeggio">Arpeggios</option>
          </select>
        </label>
      </div>

      <div class="exercise-grid" aria-label="Exercise catalog">
        <For each={filteredExercises()}>
          {(exercise) => <ExerciseCard exercise={exercise} query={search()} />}
        </For>
      </div>

      <Show when={filteredExercises().length === 0}>
        <p class="empty-state">No exercises match the current search.</p>
      </Show>
    </section>
  );
}

function rankExercise(exercise: Exercise, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return 0;
  }

  if (exercise.title.toLowerCase().includes(normalizedQuery)) {
    return 0;
  }

  if (
    exercise.tonic.toLowerCase().includes(normalizedQuery) ||
    exercise.type.toLowerCase().includes(normalizedQuery) ||
    exercise.quality.toLowerCase().includes(normalizedQuery)
  ) {
    return 1;
  }

  if (exercise.notes.some((note) => note.toLowerCase().includes(normalizedQuery))) {
    return 2;
  }

  return Infinity;
}
