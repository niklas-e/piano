import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { exercises, getExerciseById, type Exercise, type Hand } from "./exercises";
import { buildKeyboard, isHighlightedKey } from "./keyboard";
import { clampBpm, createMetronomeEngine } from "./metronome";
import {
  readBpmPreference,
  readExerciseTypeFilterPreference,
  readHandPreference,
  readLastExerciseIdPreference,
  writeBpmPreference,
  writeExerciseTypeFilterPreference,
  writeHandPreference,
  writeLastExerciseIdPreference,
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
          <Match when={route().name === "exercise" && route()}>
            {(matchedRoute) => {
              const currentRoute = matchedRoute();
              return currentRoute.name === "exercise" ? <ExercisePage id={currentRoute.id} /> : null;
            }}
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

function ExercisePage(props: { id: string }) {
  const exercise = () => getExerciseById(props.id);

  return (
    <Show when={exercise()} fallback={<ExerciseNotFoundPage />}>
      {(selectedExercise) => <ExerciseDetail exercise={selectedExercise()} />}
    </Show>
  );
}

function ExerciseDetail(props: { exercise: Exercise }) {
  const [hand, setHand] = createSignal<Hand>(readHandPreference());
  const keyboardKeys = buildKeyboard(3, 5);

  createEffect(() => {
    writeLastExerciseIdPreference(props.exercise.id);
  });

  const updateHand = (value: string) => {
    const nextHand = value === "left" ? "left" : "right";
    setHand(nextHand);
    writeHandPreference(nextHand);
  };

  const selectedFingering = () => props.exercise.fingering[hand()];

  return (
    <section aria-labelledby="exercise-heading" class="stack">
      <div class="section-intro">
        <p class="eyebrow">{props.exercise.type === "scale" ? "Scale" : "Arpeggio"}</p>
        <h1 id="exercise-heading">{props.exercise.title}</h1>
        <p>{props.exercise.description}</p>
      </div>

      <dl class="summary-grid">
        <div>
          <dt>Tonic</dt>
          <dd>{props.exercise.tonic}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>{props.exercise.quality}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{props.exercise.range}</dd>
        </div>
      </dl>

      <label class="hand-select">
        <span>Hand</span>
        <select value={hand()} onChange={(event) => updateHand(event.currentTarget.value)}>
          <option value="right">Right hand</option>
          <option value="left">Left hand</option>
        </select>
      </label>

      <div class="practice-grid">
        <section class="practice-panel" aria-labelledby="notes-heading">
          <h2 id="notes-heading">Notes</h2>
          <p class="sequence">{props.exercise.notes.join(" - ")}</p>
        </section>
        <section class="practice-panel" aria-labelledby="fingering-heading">
          <h2 id="fingering-heading">Fingering</h2>
          <p class="sequence">{selectedFingering().join(" - ")}</p>
        </section>
      </div>

      <div class="keyboard-scroll" role="group" aria-label="Practice keyboard">
        <div class="keyboard">
          <For each={keyboardKeys}>
            {(key) => {
              const highlighted = () => isHighlightedKey(key, props.exercise.notes);
              const firstFingerForNote = () => {
                const noteIndex = props.exercise.notes.indexOf(key.note);
                return noteIndex >= 0 ? selectedFingering()[noteIndex] : undefined;
              };

              return (
                <div
                  class={`piano-key ${key.type}${highlighted() ? " is-highlighted" : ""}`}
                  data-testid={`key-${key.id}`}
                  aria-label={`${key.note}${key.octave}${highlighted() ? " highlighted" : ""}`}
                >
                  <span>{key.note}</span>
                  <Show when={highlighted() && firstFingerForNote()}>
                    {(finger) => <strong>{finger()}</strong>}
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <section class="compact-metronome" aria-labelledby="compact-metronome-heading">
        <h2 id="compact-metronome-heading">Compact metronome</h2>
        <MetronomeControls variant="compact" />
      </section>
    </section>
  );
}

function ExerciseNotFoundPage() {
  return (
    <section aria-labelledby="exercise-not-found-heading" class="stack">
      <h1 id="exercise-not-found-heading">Exercise not found</h1>
      <p>The selected exercise is not in the catalog.</p>
      <a class="button-link" href="/exercises">Back to exercises</a>
    </section>
  );
}

function MetronomePage() {
  return (
    <section aria-labelledby="metronome-heading" class="stack metronome-view">
      <div class="section-intro">
        <p class="eyebrow">Steady tempo</p>
        <h1 id="metronome-heading">Metronome</h1>
        <p>Set a practical tempo, start the pulse, and keep the exercise work focused.</p>
      </div>
      <MetronomeControls variant="full" />
    </section>
  );
}

function MetronomeControls(props: { variant: "full" | "compact" }) {
  const [bpm, setBpm] = createSignal(readBpmPreference());
  const [isRunning, setIsRunning] = createSignal(false);
  const [pulseCount, setPulseCount] = createSignal(0);
  const [audioError, setAudioError] = createSignal<string | undefined>();
  const engine = createMetronomeEngine(bpm());

  const updateBpm = (value: number) => {
    const nextBpm = clampBpm(value);
    setBpm(nextBpm);
    engine.setBpm(nextBpm);
    writeBpmPreference(nextBpm);
  };

  const toggle = () => {
    if (isRunning()) {
      engine.stop();
      setIsRunning(false);
      return;
    }

    engine.start();
    setAudioError(engine.getAudioError());
    setIsRunning(true);
  };

  onMount(() => {
    const unsubscribe = engine.onPulse((beat) => setPulseCount(beat));
    onCleanup(() => {
      unsubscribe();
      engine.dispose();
    });
  });

  const isCompact = () => props.variant === "compact";
  const startLabel = () => (isCompact() ? "Start compact metronome" : "Start metronome");
  const stopLabel = () => (isCompact() ? "Stop compact metronome" : "Stop metronome");

  return (
    <div class={`metronome-card ${isCompact() ? "compact" : "full"}`}>
      <div class="tempo-row">
        <button type="button" onClick={() => updateBpm(bpm() - 5)} aria-label={isCompact() ? "Compact -5 BPM" : "-5 BPM"}>
          -5
        </button>
        <label class="tempo-input">
          <span>Tempo in BPM</span>
          <input
            inputmode="numeric"
            min="30"
            max="240"
            type="number"
            value={bpm()}
            onChange={(event) => updateBpm(Number(event.currentTarget.value))}
          />
        </label>
        <button type="button" onClick={() => updateBpm(bpm() + 5)} aria-label={isCompact() ? "Compact +5 BPM" : "+5 BPM"}>
          +5
        </button>
      </div>

      <div class={`pulse ${isRunning() ? "is-running" : ""}`} aria-live="polite">
        <span>{bpm()} BPM</span>
        <strong>Visual pulse</strong>
        <small>Beat {pulseCount()}</small>
      </div>

      <div class="metronome-actions">
        <button type="button" class="primary-button" onClick={toggle} aria-label={isRunning() ? stopLabel() : startLabel()}>
          {isRunning() ? "Stop" : "Start"}
        </button>
        <Show when={audioError()}>
          {(message) => <p class="audio-message">{message()}</p>}
        </Show>
        <Show when={isCompact()}>
          <a href="/metronome">Open full metronome</a>
        </Show>
      </div>
    </div>
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
