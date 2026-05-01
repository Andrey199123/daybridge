import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";

export type PageSchema = Record<string, unknown> | Array<Record<string, unknown>>;

export type PageMetadata = {
  title?: string;
  description?: string;
  robots?: string;
  imageUrl?: string;
  canonicalPath?: string;
  type?: string;
  schema?: PageSchema;
};

type RouteMetadata = {
  pattern: string;
  title: string;
  description: string;
  robots?: string;
  type?: string;
};

const DEFAULT_IMAGE_PATH = "/preview.png";
const SCHEMA_SELECTOR = 'script[data-arc-schema="true"]';

const ROUTE_METADATA: RouteMetadata[] = [
  {
    pattern: "/",
    title: "DayBridge | Daily Support Planner for Seniors",
    description:
      "DayBridge helps older adults manage routines, appointments, reminders, errands, and care-circle check-ins.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/blog",
    title: "DayBridge Blog | Senior Daily Support and Care Planning",
    description:
      "Read DayBridge updates and practical guidance for seniors and care circles coordinating daily support.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/blog/:postId",
    title: "DayBridge Blog | Senior Daily Support and Care Planning",
    description:
      "Read DayBridge updates and practical guidance for seniors and care circles coordinating daily support.",
    robots: "index, follow",
    type: "article",
  },
  {
    pattern: "/contact",
    title: "Contact DayBridge",
    description:
      "Get in touch with DayBridge about partnerships, support, feedback, or launch questions.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/help",
    title: "DayBridge Help",
    description:
      "Learn how DayBridge helps seniors and care circles plan routines, track care plans, and coordinate support.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/privacy",
    title: "DayBridge Privacy Policy",
    description: "Read how DayBridge handles data, privacy, and user information.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/terms",
    title: "DayBridge Terms of Service",
    description: "Read the terms that govern use of DayBridge.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/status",
    title: "DayBridge Status",
    description: "Check the current service status for DayBridge.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/sitemap",
    title: "DayBridge Sitemap",
    description: "Browse the public pages available on DayBridge.",
    robots: "index, follow",
    type: "website",
  },
  {
    pattern: "/auth",
    title: "Sign In to DayBridge",
    description:
      "Sign in or create your DayBridge account to access your daily board, care plans, and progress.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/forgot-password",
    title: "Reset Your DayBridge Password",
    description: "Request a password reset link for your DayBridge account.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/reset-password",
    title: "Choose a New DayBridge Password",
    description: "Reset your DayBridge account password with a valid reset link.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/settings",
    title: "DayBridge Settings",
    description: "Manage your DayBridge account settings and preferences.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/email-tracking",
    title: "DayBridge Email Tracking Dashboard",
    description: "Internal email tracking dashboard for DayBridge.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/profile/:userId",
    title: "DayBridge Profile",
    description: "Public DayBridge profile.",
    robots: "noindex, nofollow",
    type: "profile",
  },
  {
    pattern: "/dashboard",
    title: "DayBridge Day Map",
    description: "Your DayBridge daily support board.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/missions",
    title: "DayBridge Care Plans",
    description: "Your DayBridge care plans and daily checkpoints.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/mini-arcs",
    title: "DayBridge Quick Routines",
    description: "Your DayBridge quick routines and support paths.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/achievements",
    title: "DayBridge Milestones",
    description: "Your DayBridge milestones and streaks.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/skills",
    title: "DayBridge Strengths",
    description: "Your DayBridge strengths and support log.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/resume",
    title: "DayBridge Care Summary",
    description: "Your live DayBridge care summary.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/connect",
    title: "DayBridge Care Circle",
    description: "Your DayBridge care-circle connections.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/shop",
    title: "DayBridge Support Shop",
    description: "Your DayBridge rewards and accessibility unlocks.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/timeline",
    title: "DayBridge Calendar",
    description: "Your DayBridge calendar and timeline.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/leaderboard",
    title: "DayBridge Care Signals",
    description: "Your DayBridge care signals.",
    robots: "noindex, nofollow",
    type: "website",
  },
  {
    pattern: "/goal/:goalId",
    title: "DayBridge Care Plan",
    description: "Your DayBridge care-plan details.",
    robots: "noindex, nofollow",
    type: "website",
  },
];

function getOrigin() {
  if (typeof window === "undefined") {
    return "https://daybridge.app";
  }

  return window.location.origin;
}

export function resolveRouteMetadata(pathname: string) {
  const match = ROUTE_METADATA.find((route) =>
    matchPath({ path: route.pattern, end: true }, pathname),
  );

  return (
    match || {
      title: "DayBridge",
      description:
        "DayBridge helps seniors and care circles coordinate daily support with AI-assisted planning.",
      robots: "noindex, nofollow",
      type: "website",
    }
  );
}

function upsertMeta(
  selector: string,
  create: () => HTMLMetaElement,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function clearSchemaScripts() {
  document
    .querySelectorAll<HTMLScriptElement>(SCHEMA_SELECTOR)
    .forEach((script) => script.remove());
}

function injectSchema(schema?: PageSchema) {
  clearSchemaScripts();

  if (!schema) {
    return;
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.arcSchema = "true";
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

export function applyMetadata(pathname: string, override?: PageMetadata) {
  const routeMetadata = resolveRouteMetadata(pathname);
  const metadata = {
    ...routeMetadata,
    ...override,
  };
  const origin = getOrigin();
  const canonicalPath = override?.canonicalPath || pathname;
  const canonicalUrl = `${origin}${canonicalPath}`;
  const imageUrl = override?.imageUrl
    ? override.imageUrl.startsWith("http")
      ? override.imageUrl
      : `${origin}${override.imageUrl}`
    : `${origin}${DEFAULT_IMAGE_PATH}`;

  document.title = metadata.title;

  upsertMeta(
    'meta[name="description"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      return meta;
    },
    metadata.description,
  );

  upsertMeta(
    'meta[name="robots"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      return meta;
    },
    metadata.robots || "index, follow",
  );

  upsertMeta(
    'meta[property="og:type"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      return meta;
    },
    metadata.type || "website",
  );

  upsertMeta(
    'meta[property="og:title"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      return meta;
    },
    metadata.title || routeMetadata.title,
  );

  upsertMeta(
    'meta[property="og:description"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      return meta;
    },
    metadata.description || routeMetadata.description,
  );

  upsertMeta(
    'meta[property="og:url"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    },
    canonicalUrl,
  );

  upsertMeta(
    'meta[property="og:image"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      return meta;
    },
    imageUrl,
  );

  upsertMeta(
    'meta[property="twitter:card"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "twitter:card");
      return meta;
    },
    "summary_large_image",
  );

  upsertMeta(
    'meta[property="twitter:title"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "twitter:title");
      return meta;
    },
    metadata.title || routeMetadata.title,
  );

  upsertMeta(
    'meta[property="twitter:description"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "twitter:description");
      return meta;
    },
    metadata.description || routeMetadata.description,
  );

  upsertMeta(
    'meta[property="twitter:url"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "twitter:url");
      return meta;
    },
    canonicalUrl,
  );

  upsertMeta(
    'meta[property="twitter:image"]',
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "twitter:image");
      return meta;
    },
    imageUrl,
  );

  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", canonicalUrl);
  injectSchema(metadata.schema);
}

export function usePageMetadata(metadata?: PageMetadata) {
  const location = useLocation();

  useEffect(() => {
    if (!metadata) {
      return;
    }

    applyMetadata(location.pathname, metadata);

    return () => {
      applyMetadata(location.pathname);
    };
  }, [location.pathname, metadata]);
}

export function RouteMetadataManager() {
  const location = useLocation();

  useEffect(() => {
    applyMetadata(location.pathname);
  }, [location.pathname]);

  return null;
}
