import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.BACKEND_URL || env.VITE_API_TARGET || "http://localhost:8080";

  return {
    plugins: [react()],
    // Vite по умолчанию отдаёт в import.meta.env только переменные с префиксом VITE_.
    // BACKEND_URL и ADMIN_PASSWORD задаются без него, поэтому перечисляем их здесь явно.
    envPrefix: ["VITE_", "BACKEND_URL", "ADMIN_PASSWORD"],
    resolve: { alias: { "@": "/src" } },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      allowedHosts: ["noscam.accesscam.org"],
      proxy: {
        "/api": {
          // Роуты бэкенда идут с префиксом /api — путь не переписываем
          target: backendUrl,
          changeOrigin: true,
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
