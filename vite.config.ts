// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const leafletStubId = "\0leaflet-ssr-stub";

function ssrStubLeaflet() {
  return {
    name: "ssr-stub-leaflet",
    enforce: "pre" as const,
    resolveId(id: string, _importer: string | undefined, options: { ssr?: boolean }) {
      if (options?.ssr && (id === "leaflet" || id === "leaflet.markercluster")) {
        return leafletStubId;
      }
    },
    load(id: string) {
      if (id === leafletStubId) {
        return "const stub = {}; export default stub;";
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [ssrStubLeaflet()],
  },
});
