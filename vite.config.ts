import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

// one view per build, singlefile can't do multiple inputs
const view = process.env.VIEW;
if (!view) throw new Error("set VIEW=mapping, frame or about");

export default defineConfig({
  root: "src/views",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src/views", import.meta.url)) } },
  build: {
    outDir: "../../dist/views",
    emptyOutDir: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: `src/views/${view}.html` },
  },
});
