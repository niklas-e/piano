/**
 * Hides the browser's own toolbars where the Fullscreen API is available.
 * iPhones only allow it for videos, so callers must look fine without it.
 */
export function requestFullscreen(): void {
  if (!document.fullscreenEnabled || document.fullscreenElement) {
    return
  }

  document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .catch(() => {
      // Refused, for example without a recent tap. The app still fills the
      // window.
    })
}

/** Leaves the browser's full screen, resolving once the page is back. */
export async function exitFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {})
  }
}

/**
 * Keeps the screen from dimming or locking, so it stays readable while both
 * hands are busy. Returns a function that lets it sleep again.
 */
export function keepScreenOn(): () => void {
  if (!("wakeLock" in navigator)) {
    return () => {}
  }

  let lock: Promise<WakeLockSentinel | undefined> | undefined
  const request = () => {
    lock = navigator.wakeLock.request("screen").catch(() => undefined)
  }
  // The browser lets go of the lock whenever the page is hidden.
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      request()
    }
  }

  request()
  document.addEventListener("visibilitychange", handleVisibilityChange)
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    void lock?.then((sentinel) => sentinel?.release())
  }
}
