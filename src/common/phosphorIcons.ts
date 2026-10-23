type IconModuleLoader = () => Promise<unknown>

export const iconModuleLoaders = {
  metronome: () => import("@phosphor-icons/webcomponents/PhMetronome"),
  "hourglass-low": () => import("@phosphor-icons/webcomponents/PhHourglassLow"),
  list: () => import("@phosphor-icons/webcomponents/PhList"),
  "magnifying-glass": () =>
    import("@phosphor-icons/webcomponents/PhMagnifyingGlass"),
  x: () => import("@phosphor-icons/webcomponents/PhX"),
  check: () => import("@phosphor-icons/webcomponents/PhCheck"),
  plus: () => import("@phosphor-icons/webcomponents/PhPlus"),
  minus: () => import("@phosphor-icons/webcomponents/PhMinus"),
  hand: () => import("@phosphor-icons/webcomponents/PhHand"),
  pen: () => import("@phosphor-icons/webcomponents/PhPen"),
  highlighter: () => import("@phosphor-icons/webcomponents/PhHighlighter"),
  "pencil-simple": () => import("@phosphor-icons/webcomponents/PhPencilSimple"),
  eraser: () => import("@phosphor-icons/webcomponents/PhEraser"),
  broom: () => import("@phosphor-icons/webcomponents/PhBroom"),
  "arrow-counter-clockwise": () =>
    import("@phosphor-icons/webcomponents/PhArrowCounterClockwise"),
  "arrow-clockwise": () =>
    import("@phosphor-icons/webcomponents/PhArrowClockwise"),
  "magnifying-glass-plus": () =>
    import("@phosphor-icons/webcomponents/PhMagnifyingGlassPlus"),
  "magnifying-glass-minus": () =>
    import("@phosphor-icons/webcomponents/PhMagnifyingGlassMinus"),
  "download-simple": () =>
    import("@phosphor-icons/webcomponents/PhDownloadSimple"),
  "share-network": () => import("@phosphor-icons/webcomponents/PhShareNetwork"),
  "corners-out": () => import("@phosphor-icons/webcomponents/PhCornersOut"),
  "corners-in": () => import("@phosphor-icons/webcomponents/PhCornersIn"),
  "caret-left": () => import("@phosphor-icons/webcomponents/PhCaretLeft"),
  "caret-down": () => import("@phosphor-icons/webcomponents/PhCaretDown"),
  "caret-right": () => import("@phosphor-icons/webcomponents/PhCaretRight"),
  rows: () => import("@phosphor-icons/webcomponents/PhRows"),
  trash: () => import("@phosphor-icons/webcomponents/PhTrash"),
  "upload-simple": () => import("@phosphor-icons/webcomponents/PhUploadSimple"),
  "file-pdf": () => import("@phosphor-icons/webcomponents/PhFilePdf"),
  image: () => import("@phosphor-icons/webcomponents/PhImage"),
} satisfies Record<string, IconModuleLoader>

export type IconName = keyof typeof iconModuleLoaders
export type PhIconName = `ph-${IconName}`
export type PhIconWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone"

export function getPhIconElementName(name: IconName): PhIconName {
  return `ph-${name}`
}
