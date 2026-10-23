import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import solid from "vite-plugin-solid"
import solidStyled from "vite-plugin-solid-styled"

const themeColor = "#f7f0e6"

export default defineConfig({
  plugins: [
    solid(),
    solidStyled({
      filter: {
        include: "src/**/*.tsx",
        exclude: "node_modules/**/*.{ts,js,tsx,jsx}",
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Piano Practice",
        short_name: "Piano",
        description: "Technical exercises and theory for piano practice.",
        theme_color: themeColor,
        background_color: themeColor,
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // Precache the whole build, including public/ icons, so every route
      // works offline after the first visit. The glob already covers the
      // manifest icons, so don't let the plugin add them a second time.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
})
