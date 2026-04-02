import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      svgr(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@features": path.resolve(__dirname, "./src/features"),
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@lib": path.resolve(__dirname, "./src/lib"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@store": path.resolve(__dirname, "./src/store"),
        "@layouts": path.resolve(__dirname, "./src/layouts"),
        "@routes": path.resolve(__dirname, "./src/routes"),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/setupTests.ts',
          '**/*.d.ts',
          '**/vite-env.d.ts',
          '**/main.tsx',
          '**/App.tsx',
        ],
      },
    },
    publicDir: "public",
    build: {
      assetsInlineLimit: 0,
      emptyOutDir: true,
      outDir: "dist",
      rollupOptions: {
        input: "./index.html",
      },
    },
    define: {
      "process.env": env,
    },
  };
});
