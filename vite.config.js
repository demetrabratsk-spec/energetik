import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" делает пути относительными — работает на GitHub Pages
// без привязки к имени репозитория.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
