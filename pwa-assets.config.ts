import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config"

// Padding is the share of the canvas left around the artwork. The favicon is
// an opaque white tile, so every generated icon is opaque too.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Regular install icons look like the favicon, without extra padding:
    // https://web.dev/articles/maskable-icon
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // Platforms may crop everything outside a centred circle with a radius of
    // 40% of the icon, so the logo is kept just inside it.
    maskable: { ...minimal2023Preset.maskable, padding: 0.26 },
    // iOS rounds the corners itself and wants content centred, and the logo
    // fills 140 of 180 pixels:
    // https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
    apple: { ...minimal2023Preset.apple, padding: 0.22 },
  },
  images: ["public/favicon.svg"],
})
