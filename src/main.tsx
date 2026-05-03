import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const CHUNK_RELOAD_KEY = "arc-chunk-reload-at";
const SW_CLEANUP_KEY = "daybridge-sw-cleanup-v1";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
  // Dev deployments stream backend logs to connected clients; silence them in production builds.
  logger: import.meta.env.DEV,
});

// This project does not rely on a service worker, but a previous project running on the same
// origin (e.g. localhost:5173) might have left one registered. That can cause confusing
// navigation/fetch errors in development, so we proactively unregister.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  // Avoid reload loops if something keeps re-registering a service worker.
  const alreadyCleanedUp = window.sessionStorage.getItem(SW_CLEANUP_KEY) === "1";

  navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      if (registrations.length === 0) return;

      await Promise.allSettled(registrations.map((r) => r.unregister()));

      // If a service worker was controlling this page, a reload ensures it stops intercepting.
      if (!alreadyCleanedUp && navigator.serviceWorker.controller) {
        window.sessionStorage.setItem(SW_CLEANUP_KEY, "1");
        window.location.reload();
      }
    })
    .catch(() => {
      // Ignore service worker cleanup failures.
    });
}

if (import.meta.env.PROD && typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    const now = Date.now();
    const previousReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");

    if (!previousReloadAt || now - previousReloadAt > 30_000) {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
      return;
    }

    console.error("Vite preload error after automatic reload attempt", event);
  });
}

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
