import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET || "http://localhost:8080";

  return {
    plugins: [react()],
    resolve: { alias: { "@": "/src" } },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          manualChunks: undefined as any,
          chunkFileNames: "js/[name].js",
          entryFileNames: "js/[name].js",
        },
      },
    },
  };
});
