import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js"
import { css } from "solid-styled"
import { AppHeader } from "./common/AppHeader"
import { GlobalStyles } from "./common/GlobalStyles"
import { NotFoundPage } from "./common/NotFoundPage"
import { parsePathname } from "./common/routes"
import { ExercisePage } from "./exercise/ExercisePage"
import { ExercisesPage } from "./exercises/ExercisesPage"
import { HomePage } from "./home/HomePage"
import { MetronomePage } from "./metronome/MetronomePage"
import { SightReadingPage } from "./sightreading/SightReadingPage"

export default function App() {
  css`
    .app-shell {
      min-height: 100vh;
    }

    .content {
      margin: 0 auto;
      max-width: 1120px;
      padding: clamp(1.25rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem);
    }

    @media (max-width: 420px) {
      .content {
        padding-inline: 0.85rem;
      }
    }
  `

  const [pathname, setPathname] = createSignal(window.location.pathname)
  const route = () => parsePathname(pathname())

  onMount(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    onCleanup(() => window.removeEventListener("popstate", handlePopState))
  })

  const navigate = (href: string) => (event: MouseEvent) => {
    event.preventDefault()
    window.history.pushState({}, "", href)
    setPathname(window.location.pathname)
  }

  return (
    <div class="app-shell">
      <GlobalStyles />
      <AppHeader route={route()} navigate={navigate} />

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
              const currentRoute = matchedRoute()
              return currentRoute.name === "exercise" ? (
                <ExercisePage id={currentRoute.id} />
              ) : null
            }}
          </Match>
          <Match when={route().name === "metronome"}>
            <MetronomePage />
          </Match>
          <Match when={route().name === "sight-reading"}>
            <SightReadingPage />
          </Match>
          <Match when={route().name === "notFound"}>
            <NotFoundPage />
          </Match>
        </Switch>
      </main>
    </div>
  )
}
