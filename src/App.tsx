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
import { SheetMusicPage } from "./sheetmusic/SheetMusicPage"
import { SheetViewerPage } from "./sheetmusic/SheetViewerPage"
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
    // Route every same-origin link through the client-side router so that
    // navigation never reloads the page, which keeps it instant and offline.
    const handleClick = (event: MouseEvent) => {
      const href = getInAppHref(event)
      if (href === undefined) {
        return
      }

      event.preventDefault()
      if (href === currentHref()) {
        return
      }

      window.history.pushState({}, "", href)
      setPathname(window.location.pathname)
      window.scrollTo(0, 0)
    }

    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleClick)
    onCleanup(() => {
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleClick)
    })
  })

  return (
    <div class="app-shell">
      <GlobalStyles />
      <AppHeader route={route()} />

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
          <Match when={route().name === "sheet-music"}>
            <SheetMusicPage />
          </Match>
          <Match when={route().name === "sheet" && route()} keyed>
            {(currentRoute) =>
              currentRoute.name === "sheet" ? (
                <SheetViewerPage id={currentRoute.id} />
              ) : null
            }
          </Match>
          <Match when={route().name === "notFound"}>
            <NotFoundPage />
          </Match>
        </Switch>
      </main>
    </div>
  )
}

function getInAppHref(event: MouseEvent): string | undefined {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  ) {
    return undefined
  }

  const anchor = event.target.closest("a")
  if (
    !anchor ||
    (anchor.target !== "" && anchor.target !== "_self") ||
    anchor.hasAttribute("download")
  ) {
    return undefined
  }

  const url = new URL(anchor.href)
  return url.origin === window.location.origin
    ? url.pathname + url.search + url.hash
    : undefined
}

function currentHref(): string {
  const { pathname, search, hash } = window.location
  return pathname + search + hash
}
