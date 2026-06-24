import { For, createEffect, createSignal } from "solid-js";
import { css } from "solid-styled";
import { PhIcon } from "./PhIcon";
import { getRouteHeader, isPrimaryNavigationRoute, type Route } from "./routes";

const primaryNavigationItems = [
  { href: "/exercises", label: "Exercises" },
  { href: "/metronome", label: "Metronome" },
  { href: "/sight-reading", label: "Sight Reading" }
] as const;

export function AppHeader(props: { route: Route; navigate: (href: string) => (event: MouseEvent) => void }) {
  css`
    .site-header {
      align-items: center;
      border-bottom: 1px solid #dfd1bf;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 1rem clamp(1rem, 4vw, 3rem);
    }

    .site-title {
      color: inherit;
      font-size: clamp(1.2rem, 3vw, 1.5rem);
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

    .site-nav a[aria-current="page"] {
      background: #2f251d;
      color: #fffaf2;
    }

    .menu-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      background: #fffaf2;
      border: 1px solid #2f251d;
      border-radius: 999px;
      color: inherit;
      cursor: pointer;
      min-height: 2.75rem;
      min-width: 2.75rem;
      padding: 0.55rem;
    }

    @media (max-width: 640px) {
      .menu-toggle {
        display: inline-flex;
      }

      .site-nav {
        display: none;
        flex-direction: column;
        grid-column: 1 / -1;
        width: 100%;
      }

      .site-nav.is-open {
        display: flex;
      }

      .site-nav a {
        text-align: center;
        width: 100%;
      }
    }
  `;

  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const headerLink = () => getRouteHeader(props.route);

  createEffect(() => {
    props.route;
    setIsMenuOpen(false);
  });

  const handleNavigation = (href: string) => {
    const navigate = props.navigate(href);

    return (event: MouseEvent) => {
      setIsMenuOpen(false);
      navigate(event);
    };
  };

  return (
    <header class="site-header">
      <a class="site-title" href={headerLink().href} onClick={handleNavigation(headerLink().href)}>
        {headerLink().title}
      </a>

      <button
        type="button"
        class="menu-toggle"
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen()}
        aria-label={isMenuOpen() ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        {isMenuOpen() ? <PhIcon name="x" aria-hidden="true" size={20} weight="bold" /> : <PhIcon name="list" aria-hidden="true" size={20} weight="bold" />}
      </button>

      <nav id="primary-navigation" class={`site-nav${isMenuOpen() ? " is-open" : ""}`} aria-label="Primary navigation">
        <For each={primaryNavigationItems}>
          {(item) => (
            <a
              href={item.href}
              onClick={handleNavigation(item.href)}
              aria-current={isPrimaryNavigationRoute(props.route, item.href) ? "page" : undefined}
            >
              {item.label}
            </a>
          )}
        </For>
      </nav>
    </header>
  );
}
