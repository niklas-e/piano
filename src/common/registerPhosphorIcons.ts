import { iconModuleLoaders } from "./phosphorIcons"

await Promise.all(
  Object.values(iconModuleLoaders).map((loadIconModule) => loadIconModule()),
)
