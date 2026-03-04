import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.js"),
      name: "CbmEditor",
      formats: ["es", "cjs"],
      fileName: (format) => `cbm-editor.${format}.js`,
    },
    rollupOptions: {
      // CodeMirror jsou peerDependencies – uživatel si je instaluje sám
      external: [
        "codemirror",
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/language",
      ],
      output: {
        globals: {
          codemirror: "CodeMirror",
          "@codemirror/state": "CodeMirrorState",
          "@codemirror/view": "CodeMirrorView",
          "@codemirror/language": "CodeMirrorLanguage",
        },
      },
    },
  },
});
