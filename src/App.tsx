import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
import { css } from "solid-styled";
import { parsePathname } from "./common/routes";
import { GlobalStyles } from "./common/GlobalStyles";
import { HomePage } from "./home/HomePage";
import { ExercisesPage } from "./exercises/ExercisesPage";
import { ExercisePage } from "./exercise/ExercisePage";
import { MetronomePage } from "./metronome/MetronomePage";
import { NotFoundPage } from "./common/NotFoundPage";

export default function App() {
  css`
    .app-shell {
      min-height: 100vh;
    }

    .site-header {
      align-items: center;
      border-bottom: 1px solid #dfd1bf;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem clamp(1rem, 4vw, 3rem);
    }

    .site-title {
      font-weight: 800;
      letter-spacing: -0.03em;
      text-decoration: none;
    }

    .site-nav {
      display: flex;
      gap: 0.5rem;
    }

    .site-nav a {
      border: 1px solid #2f251d;
      border-radius: 999px;
      padding: 0.55rem 0.85rem;
      text-decoration: none;
    }

    .content {
      margin: 0 auto;
      max-width: 1120px;
      padding: clamp(1.25rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem);
    }

    @media (max-width: 640px) {
      .site-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    @media (max-width: 420px) {
      .content {
        padding-inline: 0.85rem;
      }

      .site-nav {
        width: 100%;
      }

      .site-nav a {
        text-align: center;
        width: 100%;
      }
    }
  `;

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
      <GlobalStyles />
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
