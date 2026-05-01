export const DEFAULT_SITE_ORIGIN = "https://daybridge.app";
export const SKIP_ONBOARDING_KEY = "skipOnboarding";
export const GUEST_MODE_KEY = "guestMode";
export const FORCE_TUTORIAL_REPLAY_KEY = "forceTutorialReplay";

export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getWindowOrigin() {
  return isBrowser() ? window.location.origin : DEFAULT_SITE_ORIGIN;
}

export function getLocationSearch() {
  return isBrowser() ? window.location.search : "";
}

export function matchesMediaQuery(query: string) {
  return isBrowser() && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

export function getViewportSize(fallback = { width: 0, height: 0 }) {
  if (!isBrowser()) {
    return fallback;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function getNavigatorOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function readSessionStorage(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionStorage(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function removeSessionStorage(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function readLocalStorage(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function removeLocalStorage(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function prepareGuestSession() {
  writeSessionStorage(SKIP_ONBOARDING_KEY, "true");
  writeSessionStorage(GUEST_MODE_KEY, "true");
  writeSessionStorage(FORCE_TUTORIAL_REPLAY_KEY, "true");
  removeSessionStorage("tutorialProgress");
  removeSessionStorage("tutorialPaused");
  removeSessionStorage("tutorialActive");
}

export function clearGuestSession() {
  removeSessionStorage(GUEST_MODE_KEY);
  removeSessionStorage(FORCE_TUTORIAL_REPLAY_KEY);
}
