export type PersistableStorage = Pick<StorageManager, "persist" | "persisted">

/**
 * Asks the browser not to evict saved preferences when storage runs low.
 *
 * Only requested when running as an installed app: Chromium and Safari grant
 * it silently there, while Firefox shows a permission prompt that would be
 * out of place on a casual visit.
 */
export async function requestPersistentStorage(
  isInstalled = isRunningAsInstalledApp(),
  storage = getStorageManager(),
): Promise<boolean> {
  if (!isInstalled || !storage) {
    return false
  }

  try {
    return (await storage.persisted()) || (await storage.persist())
  } catch {
    return false
  }
}

function isRunningAsInstalledApp(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)").matches === true
  )
}

function getStorageManager(): PersistableStorage | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.storage
}
