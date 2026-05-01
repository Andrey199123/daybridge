import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const CHUNK_RELOAD_KEY = "arc-chunk-reload-at";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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
