import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { exercises, getExerciseById, type Exercise, type Hand } from "./exercises";
import { buildKeyboard, isHighlightedKey } from "./keyboard";
import { clampBpm, createMetronomeEngine, msPerBeat } from "./metronome";
import { derivePracticeRange, type PracticeRange } from "./practiceRange";
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

function ExerciseCard(props: { exercise: Exercise; query: string }) {
  const typeLabel = () => (props.exercise.type === "scale" ? "Scale" : "Arpeggio");

  return (
    <article class="exercise-card">
      <div class="card-meta">
        <span>
          <HighlightedText text={typeLabel()} query={props.query} />
        </span>
        <span>
          <HighlightedText text={props.exercise.tonic} query={props.query} />
        </span>
        <span>
          <HighlightedText text={props.exercise.quality} query={props.query} />
        </span>
      </div>
      <h2>
        <a href={`/exercises/${props.exercise.id}`}>
          <HighlightedText text={props.exercise.title} query={props.query} />
        </a>
      </h2>
      <p>
        <HighlightedText text={props.exercise.notes.join(" - ")} query={props.query} />
      </p>
    </article>
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

function HighlightedText(props: { text: string; query: string }) {
  const normalizedQuery = () => props.query.trim().toLowerCase();
  const segments = createMemo(() => {
    const query = normalizedQuery();

    if (query.length === 0) {
      return [props.text];
    }

    const text = props.text;
    const lowerText = text.toLowerCase();
    const parts = [];
    let currentIndex = 0;
    let matchIndex = lowerText.indexOf(query, currentIndex);

    while (matchIndex >= 0) {
      if (matchIndex > currentIndex) {
        parts.push(text.slice(currentIndex, matchIndex));
      }

      parts.push(<mark class="search-match">{text.slice(matchIndex, matchIndex + query.length)}</mark>);
      currentIndex = matchIndex + query.length;
      matchIndex = lowerText.indexOf(query, currentIndex);
    }

    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts;
  });

  return <>{segments()}</>;
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
  const [range, setRange] = createSignal<PracticeRange>(1);
  const keyboardKeys = buildKeyboard(3, 6);
  const practice = createMemo(() => derivePracticeRange(props.exercise, hand(), range()));
  const whiteIndexForKey = (keyIndex: number) => {
    const whiteKeysBefore = keyboardKeys.slice(0, keyIndex).filter((key) => key.type === "white").length;

    return keyboardKeys[keyIndex].type === "white" ? whiteKeysBefore : whiteKeysBefore - 0.3;
  };

  createEffect(() => {
    writeLastExerciseIdPreference(props.exercise.id);
  });

  const updateHand = (value: string) => {
    const nextHand = value === "left" ? "left" : "right";
    setHand(nextHand);
    writeHandPreference(nextHand);
  };

  const updateRange = (direction: -1 | 1) => {
    setRange((currentRange) => Math.min(2, Math.max(1, currentRange + direction)) as PracticeRange);
  };

  return (
    <section aria-labelledby="exercise-heading" class="stack">
      <div class="exercise-header">
        <p class="eyebrow">{props.exercise.type === "scale" ? "Scale" : "Arpeggio"}</p>
        <h1 id="exercise-heading">{props.exercise.title}</h1>
        <p>{props.exercise.description}</p>
        <div class="detail-chips" aria-label="Exercise details">
          <span>{props.exercise.tonic}</span>
          <span>{props.exercise.quality}</span>
        </div>
      </div>

      <div class="practice-controls">
        <fieldset class="segmented-control">
          <legend>Hand</legend>
          <div class="segmented-options">
            <label>
              <input
                type="radio"
                name="hand"
                value="right"
                checked={hand() === "right"}
                onChange={() => updateHand("right")}
              />
              Right hand
            </label>
            <label>
              <input
                type="radio"
                name="hand"
                value="left"
                checked={hand() === "left"}
                onChange={() => updateHand("left")}
              />
              Left hand
            </label>
          </div>
        </fieldset>

        <fieldset class="range-stepper">
          <legend>Range</legend>
          <div class="stepper-control">
            <button type="button" aria-label="Decrease range" onClick={() => updateRange(-1)} disabled={range() === 1}>
              -
            </button>
            <span aria-live="polite">{practice().label}</span>
            <button type="button" aria-label="Increase range" onClick={() => updateRange(1)} disabled={range() === 2}>
              +
            </button>
          </div>
        </fieldset>
      </div>

      <div class="practice-grid">
        <section class="practice-panel" aria-labelledby="notes-heading">
          <h2 id="notes-heading">Notes</h2>
          <p class="sequence">{practice().notes.join(" - ")}</p>
        </section>
        <section class="practice-panel" aria-labelledby="fingering-heading">
          <h2 id="fingering-heading">Fingering</h2>
          <p class="sequence">{practice().fingering.join(" - ")}</p>
        </section>
      </div>

      <div class="keyboard-scroll" role="group" aria-label="Practice keyboard">
        <div class="keyboard">
          <For each={keyboardKeys}>
            {(key, index) => {
              const highlighted = () => isHighlightedKey(key, practice().keyIds);
              const firstFingerForKey = () => {
                const noteIndex = practice().keyIds.indexOf(key.id);
                return noteIndex >= 0 ? practice().fingering[noteIndex] : undefined;
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
    const unsubscribeAudioError = engine.onAudioError(setAudioError);
    onCleanup(() => {
      unsubscribe();
      unsubscribeAudioError();
      engine.dispose();
    });
  });

  const isCompact = () => props.variant === "compact";
  const startLabel = () => (isCompact() ? "Start compact metronome" : "Start metronome");
  const stopLabel = () => (isCompact() ? "Stop compact metronome" : "Stop metronome");
  const pulseAnimationDuration = () => Math.min(300, Math.max(120, Math.round(msPerBeat(bpm()) * 0.35)));
  const pulseClass = () => (pulseCount() === 0 ? "" : pulseCount() % 2 === 0 ? " pulse-even" : " pulse-odd");

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

      <Show
        when={!isCompact()}
        fallback={
          <div class="compact-pulse" aria-live="polite">
            <span>{bpm()} BPM</span>
            <small>Beat {pulseCount()}</small>
          </div>
        }
      >
        <div
          class={`pulse ${isRunning() ? "is-running" : ""}${isRunning() ? pulseClass() : ""}`}
          style={{ "--pulse-duration": `${pulseAnimationDuration()}ms` }}
          aria-live="polite"
        >
          <span>{bpm()} BPM</span>
          <strong>Visual pulse</strong>
          <small>Beat {pulseCount()}</small>
        </div>
      </Show>

      <div class="metronome-actions">
        <button type="button" class="primary-button" onClick={toggle} aria-label={isRunning() ? stopLabel() : startLabel()}>
          {isRunning() ? stopLabel() : startLabel()}
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
