import { defineConfig } from "vite";

export default defineConfig({
  root: "game",
  base: "/PsychGame/",
  build: {
    rollupOptions: {
      input: {
        game: "game/index.html",
        clinician: "game/clinician.html"
      }
    },
    outDir: "../dist",
    emptyOutDir: true
  }
});
