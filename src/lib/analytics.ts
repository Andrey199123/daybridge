import { track } from "@vercel/analytics";
import {
  readSessionStorage,
  removeSessionStorage,
  safeJsonParse,
  writeSessionStorage,
} from "./browser";

type AnalyticsValue = string | number | boolean | null | undefined;

export type AuthIntent = {
  flow: "signIn" | "signUp";
  method: "password" | "google" | "anonymous";
  startedAt: number;
};

const AUTH_INTENT_KEY = "arc-auth-intent";

export function trackEvent(
  name: string,
  properties: Record<string, AnalyticsValue> = {},
) {
  try {
    track(name, Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined && value !== null),
    ));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug(`Analytics track skipped for "${name}"`, error);
    }
  }
}

export function getAttribution(search: string) {
  const params = new URLSearchParams(search);

  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
  };
}

export function storeAuthIntent(intent: Omit<AuthIntent, "startedAt">) {
  writeSessionStorage(
    AUTH_INTENT_KEY,
    JSON.stringify({
      ...intent,
      startedAt: Date.now(),
    } satisfies AuthIntent),
  );
}

export function readAuthIntent(): AuthIntent | null {
  const value = readSessionStorage(AUTH_INTENT_KEY);
  if (!value) {
    return null;
  }

  const parsed = safeJsonParse<AuthIntent | null>(value, null);
  if (!parsed) {
    removeSessionStorage(AUTH_INTENT_KEY);
    return null;
  }

  return parsed;
}

export function clearAuthIntent() {
  removeSessionStorage(AUTH_INTENT_KEY);
}
