import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
import { parsePathname } from "./common/routes";
import { HomePage } from "./home/HomePage";
import { ExercisesPage } from "./exercises/ExercisesPage";
import { ExercisePage } from "./exercise/ExercisePage";
import { MetronomePage } from "./metronome/MetronomePage";
import { NotFoundPage } from "./common/NotFoundPage";

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
