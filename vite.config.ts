import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  plugins: [
    react(),
    // Chef development plugin disabled to reduce CPU usage
    // Re-enable if you need chef.convex.dev screenshot functionality
    // mode === "development"
    //   ? {
    //       name: "inject-chef-dev",
    //       transform(code: string, id: string) {
    //         if (id.includes("main.tsx")) {
    //           return {
    //             code: `${code}
    //
    // /* Added by Vite plugin inject-chef-dev */
    // window.addEventListener('message', async (message) => {
    //   if (message.source !== window.parent) return;
    //   if (message.data.type !== 'chefPreviewRequest') return;
    //
    //   const worker = await import('https://chef.convex.dev/scripts/worker.bundled.mjs');
    //   await worker.respondToMessage(message);
    // });
    //         `,
    //             map: null,
    //           };
    //         }
    //         return null;
    //       },
    //     }
    //   : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // Exclude large directories from file watching
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.convex/**']
    },
    // Reduce polling frequency
    fs: {
      strict: false
    }
  },
  build: {
    // Reduce build overhead in development
    sourcemap: mode === 'development' ? 'cheap-module-source-map' : false,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: isSsrBuild
      ? undefined
      : {
          output: {
            manualChunks: {
              react: ["react", "react-dom", "react-router-dom"],
              convex: ["convex", "convex/react", "@convex-dev/auth/react"],
              motion: ["framer-motion"],
              daily: ["@daily-co/daily-js", "@daily-co/daily-react"],
              radix: [
                "@radix-ui/react-alert-dialog",
                "@radix-ui/react-checkbox",
                "@radix-ui/react-dialog",
                "@radix-ui/react-dropdown-menu",
                "@radix-ui/react-label",
                "@radix-ui/react-progress",
                "@radix-ui/react-select",
                "@radix-ui/react-tabs",
                "@radix-ui/react-toast",
                "@radix-ui/react-tooltip",
              ],
            },
          },
        },
  },
  optimizeDeps: {
    // Pre-bundle dependencies to reduce processing
    include: ['react', 'react-dom', 'convex', 'framer-motion'],
    // Exclude problematic dependencies
    exclude: []
  },
  esbuild: {
    // Reduce esbuild overhead in development
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}));
