export type Route =
  | { name: "home" }
  | { name: "exercises" }
  | { name: "exercise"; id: string }
  | { name: "metronome" }
  | { name: "notFound" };

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

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
