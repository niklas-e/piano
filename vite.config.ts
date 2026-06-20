import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import solidStyled from "vite-plugin-solid-styled";

export default defineConfig({
  plugins: [
    solid(),
    solidStyled({
      filter: {
        include: "src/**/*.tsx",
        exclude: "node_modules/**/*.{ts,js,tsx,jsx}"
      }
    })
  ]
});
