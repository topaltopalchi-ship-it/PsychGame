import { defineConfig } from "vite";

export default defineConfig({
  root: "game",
  base: "/PsychGame/",

  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
