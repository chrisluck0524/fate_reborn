import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import info from "./info.json" with { type: "json" };

export default defineConfig(({ mode }) => ({
  define: { "process.env.NODE_ENV": JSON.stringify(mode) },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: "info.json", dest: "" },
        { src: "README.md", dest: "" },
        { src: "assets", dest: "" },
      ],
    }),
  ],
  build: {
    sourcemap: true,
    minify: false,
    lib: { entry: { extension: "src/index.js" }, formats: ["es"] },
    outDir: `../../../apps/core/extension/${info.name}`,
    emptyOutDir: true,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      external: ["noname"],
      output: {
        preserveModules: true,
        preserveModulesRoot: "./",
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
}));
