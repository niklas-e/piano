type IconModuleLoader = () => Promise<unknown>;

export const iconModuleLoaders = {
  "metronome": () => import("@phosphor-icons/webcomponents/PhMetronome"),
  "hourglass-low": () => import("@phosphor-icons/webcomponents/PhHourglassLow"),
  "list": () => import("@phosphor-icons/webcomponents/PhList"),
  "magnifying-glass": () => import("@phosphor-icons/webcomponents/PhMagnifyingGlass"),
  "x": () => import("@phosphor-icons/webcomponents/PhX")
} satisfies Record<string, IconModuleLoader>;

export type IconName = keyof typeof iconModuleLoaders;
export type PhIconName = `ph-${IconName}`;
export type PhIconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export function getPhIconElementName(name: IconName): PhIconName {
  return `ph-${name}`;
}
