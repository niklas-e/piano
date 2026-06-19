import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
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
  return (
    <section aria-labelledby="exercises-heading">
      <h1 id="exercises-heading">Exercises</h1>
      <p>Scales and arpeggios will appear here.</p>
    </section>
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
