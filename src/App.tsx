import { For, Match, Show, Switch, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { exercises, getExerciseById, type Exercise } from "./exercises";
import {
  readExerciseTypeFilterPreference,
  readLastExerciseIdPreference,
  writeExerciseTypeFilterPreference,
  type ExerciseTypeFilter
} from "./preferences";
import { parsePathname } from "./routes";

export default function App() {
  const [pathname, setPathname] = createSignal(window.location.pathname);
  const route = () => parsePathname(pathname());

  onMount(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    onCleanup(() => window.removeEventListener("popstate", handlePopState));
  });

  const navigate = (href: string) => (event: MouseEvent) => {
    event.preventDefault();
    window.history.pushState({}, "", href);
    setPathname(window.location.pathname);
  };

  return (
    <div class="app-shell">
      <header class="site-header">
        <a class="site-title" href="/" onClick={navigate("/")}>
          Piano Practice
        </a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="/exercises" onClick={navigate("/exercises")}>Exercises</a>
          <a href="/metronome" onClick={navigate("/metronome")}>Metronome</a>
        </nav>
      </header>

      <main class="content">
        <Switch>
          <Match when={route().name === "home"}>
            <HomePage />
          </Match>
          <Match when={route().name === "exercises"}>
            <ExercisesPage />
          </Match>
          <Match when={route().name === "exercise"}>
            <ExercisePlaceholder />
          </Match>
          <Match when={route().name === "metronome"}>
            <MetronomePage />
          </Match>
          <Match when={route().name === "notFound"}>
            <NotFoundPage />
          </Match>
        </Switch>
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <section class="hero" aria-labelledby="home-heading">
      <p class="eyebrow">Lean piano practice tools</p>
      <h1 id="home-heading">Piano Practice</h1>
      <p>Browse technical exercises, inspect fingering, and practice with a focused metronome.</p>
      <a class="button-link" href="/exercises">Browse exercises</a>
    </section>
  );
}

function ExercisesPage() {
  const [search, setSearch] = createSignal("");
  const [typeFilter, setTypeFilter] = createSignal<ExerciseTypeFilter>(readExerciseTypeFilterPreference());
  const lastExercise = () => {
    const id = readLastExerciseIdPreference();
    return id ? getExerciseById(id) : undefined;
  };
  const filteredExercises = createMemo(() => {
    const normalizedSearch = search().trim().toLowerCase();
    const selectedType = typeFilter();

    return exercises.filter((exercise) => {
      const matchesType = selectedType === "all" || exercise.type === selectedType;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        exercise.title.toLowerCase().includes(normalizedSearch) ||
        exercise.tonic.toLowerCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
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
          {(exercise) => <ExerciseCard exercise={exercise} />}
        </For>
      </div>

      <Show when={filteredExercises().length === 0}>
        <p class="empty-state">No exercises match the current search.</p>
      </Show>
    </section>
  );
}

function ExerciseCard(props: { exercise: Exercise }) {
  const typeLabel = () => (props.exercise.type === "scale" ? "Scale" : "Arpeggio");

  return (
    <article class="exercise-card">
      <div class="card-meta">
        <span>{typeLabel()}</span>
        <span>{props.exercise.tonic}</span>
        <span>{props.exercise.range}</span>
      </div>
      <h2>
        <a href={`/exercises/${props.exercise.id}`}>{props.exercise.title}</a>
      </h2>
      <p>{props.exercise.notes.join(" - ")}</p>
    </article>
  );
}

function ExercisePlaceholder() {
  return (
    <section aria-labelledby="exercise-heading">
      <h1 id="exercise-heading">Exercise</h1>
      <p>Exercise details will appear here.</p>
    </section>
  );
}

function MetronomePage() {
  return (
    <section aria-labelledby="metronome-heading">
      <h1 id="metronome-heading">Metronome</h1>
      <p>Tempo controls will appear here.</p>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p>This route is not part of the piano practice app.</p>
      <div class="link-row">
        <a href="/exercises">Go to exercises</a>
        <a href="/metronome">Go to metronome</a>
      </div>
    </section>
  );
}
