import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import solid from "vite-plugin-solid"
import solidStyled from "vite-plugin-solid-styled"

const themeColor = "#f7f0e6"

const pdfjsRoot = fileURLToPath(
  new URL("./node_modules/pdfjs-dist/", import.meta.url),
)
// Data files PDF.js fetches at runtime: image decoders, fonts for PDFs that
// don't embed them, CJK character maps, and colour profiles. The JavaScript
// scripting engine is left out because the viewer never runs PDF scripts.
const pdfjsAssetDirectories = ["cmaps", "iccs", "standard_fonts", "wasm"]
const isPdfjsAsset = (name: string) => !name.startsWith("quickjs")

/** Serves PDF.js data files under /pdfjs/ in dev and copies them into builds. */
function pdfjsAssets(): Plugin {
  return {
    name: "pdfjs-assets",
    configureServer(server) {
      server.middlewares.use("/pdfjs/", (request, response, next) => {
        const relativePath = decodeURIComponent(
          new URL(request.url ?? "/", "http://localhost").pathname,
        )
        const filePath = path.join(pdfjsRoot, relativePath)
        const [directory, name] = path
          .relative(pdfjsRoot, filePath)
          .split(path.sep)

        if (
          !pdfjsAssetDirectories.includes(directory) ||
          !name ||
          !isPdfjsAsset(name) ||
          !existsSync(filePath)
        ) {
          next()
          return
        }

        response.setHeader(
          "Content-Type",
          filePath.endsWith(".wasm")
            ? "application/wasm"
            : "application/octet-stream",
        )
        createReadStream(filePath).pipe(response)
      })
    },
    generateBundle() {
      for (const directory of pdfjsAssetDirectories) {
        for (const name of readdirSync(path.join(pdfjsRoot, directory))) {
          if (isPdfjsAsset(name)) {
            this.emitFile({
              type: "asset",
              fileName: `pdfjs/${directory}/${name}`,
              source: readFileSync(path.join(pdfjsRoot, directory, name)),
            })
          }
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    pdfjsAssets(),
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
      // Precache the whole build, including fonts and public/ icons, so every
      // route works offline after the first visit. The glob already covers
      // the manifest icons, so don't let the plugin add them a second time.
      includeManifestIcons: false,
      workbox: {
        globPatterns: [
          "**/*.{js,mjs,css,html,svg,png,ico,woff2}",
          "pdfjs/**/*.{wasm,pfb,ttf,icc}",
        ],
        // The character maps are only needed for some CJK documents and
        // weigh more than the rest of the app, and the JavaScript decoders
        // only for browsers without WebAssembly. They are cached the first
        // time they're used instead.
        globIgnores: ["pdfjs/cmaps/**", "pdfjs/wasm/*_nowasm_fallback.js"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/pdfjs/"),
            handler: "CacheFirst",
            options: { cacheName: "pdfjs-assets" },
          },
        ],
      },
    }),
  ],
})
