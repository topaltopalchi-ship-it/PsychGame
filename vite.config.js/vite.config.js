import { defineConfig } from "vite";

export default defineConfig({
  root: "game",

  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
