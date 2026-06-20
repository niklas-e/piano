export type Route =
  | { name: "home" }
  | { name: "exercises" }
  | { name: "exercise"; id: string }
  | { name: "metronome" }
  | { name: "notFound" };

export type RouteHeader = {
  href: string;
  title: string;
};

export function parsePathname(pathname: string): Route {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return { name: "home" };
  }

  if (normalizedPathname === "/exercises") {
    return { name: "exercises" };
  }

  if (normalizedPathname.startsWith("/exercises/")) {
    const id = normalizedPathname.slice("/exercises/".length);
    return id.length > 0 && !id.includes("/") ? { name: "exercise", id } : { name: "notFound" };
  }

  if (normalizedPathname === "/metronome") {
    return { name: "metronome" };
  }

  return { name: "notFound" };
}

export function getRouteHeader(route: Route): RouteHeader {
  switch (route.name) {
    case "exercises":
    case "exercise":
      return { href: "/exercises", title: "Exercises" };
    case "metronome":
      return { href: "/metronome", title: "Metronome" };
    case "home":
    case "notFound":
      return { href: "/", title: "Piano Practice" };
  }
}

export function isPrimaryNavigationRoute(route: Route, href: string): boolean {
  if (href === "/exercises") {
    return route.name === "exercises" || route.name === "exercise";
  }

  if (href === "/metronome") {
    return route.name === "metronome";
  }

  return false;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
