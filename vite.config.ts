// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Esto es SSR, no un SPA: Vercel necesita el preset de Nitro para
    // generar .vercel/output con la funcion de servidor.
    //
    // El paquete de Lovable pone "cloudflare-module" como defaultPreset, que
    // es solo un fallback. Dentro de su sandbox lo fuerza igualmente, asi que
    // fijar "vercel" aqui no rompe su preview.
    preset: "vercel",
  },
});
