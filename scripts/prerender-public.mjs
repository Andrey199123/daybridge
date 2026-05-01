import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import {
  getBlogPageMetadata,
  getBlogPostMetadata,
  getStaticMetadata,
  render,
  renderBlogIndexPage,
  renderBlogPostPage,
} from "../dist-ssr/entry-server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const templatePath = path.join(distDir, "index.html");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const staticRouteConfig = [
  { pathname: "/", changefreq: "daily", priority: "1.0" },
  { pathname: "/blog", changefreq: "weekly", priority: "0.8" },
  { pathname: "/contact", changefreq: "monthly", priority: "0.7" },
  { pathname: "/help", changefreq: "monthly", priority: "0.6" },
  { pathname: "/privacy", changefreq: "yearly", priority: "0.3" },
  { pathname: "/terms", changefreq: "yearly", priority: "0.3" },
  { pathname: "/status", changefreq: "weekly", priority: "0.4" },
  { pathname: "/sitemap", changefreq: "yearly", priority: "0.3" },
];

function withOrigin(pathname) {
  return `https://arcgoalgetter.com${pathname}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function buildHead(html, pathname, metadata) {
  const canonicalUrl = withOrigin(pathname);
  const imageUrl = metadata.imageUrl
    ? metadata.imageUrl.startsWith("http")
      ? metadata.imageUrl
      : withOrigin(metadata.imageUrl.startsWith("/") ? metadata.imageUrl : `/${metadata.imageUrl}`)
    : "https://arcgoalgetter.com/preview.png";
  const heroImagePreload =
    pathname === "/"
      ? '\n    <link rel="preload" as="image" href="/arc-personal-galaxy.png" imagesizes="(max-width: 1024px) 100vw, 52vw" fetchpriority="high" />'
      : "";
  const schemaScript = metadata.schema
    ? `\n    <script type="application/ld+json" data-arc-schema="true">${escapeJsonForHtml(
        metadata.schema,
      )}</script>`
    : "";
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const robots = escapeHtml(metadata.robots || "index, follow");
  const type = escapeHtml(metadata.type || "website");
  const escapedCanonicalUrl = escapeHtml(canonicalUrl);
  const escapedImageUrl = escapeHtml(imageUrl);

  return html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content=".*?" \/>/,
      `<meta name="description" content="${description}" />`,
    )
    .replace(
      /<meta name="robots" content=".*?" \/>/,
      `<meta name="robots" content="${robots}" />`,
    )
    .replace(
      /<meta property="og:type" content=".*?" \/>/,
      `<meta property="og:type" content="${type}" />`,
    )
    .replace(
      /<meta property="og:url" content=".*?" \/>/,
      `<meta property="og:url" content="${escapedCanonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:title" content=".*?" \/>/,
      `<meta property="og:title" content="${title}" />`,
    )
    .replace(
      /<meta property="og:description" content=".*?" \/>/,
      `<meta property="og:description" content="${description}" />`,
    )
    .replace(
      /<meta property="og:image" content=".*?" \/>/,
      `<meta property="og:image" content="${escapedImageUrl}" />`,
    )
    .replace(
      /<meta property="twitter:url" content=".*?" \/>/,
      `<meta property="twitter:url" content="${escapedCanonicalUrl}" />`,
    )
    .replace(
      /<meta property="twitter:title" content=".*?" \/>/,
      `<meta property="twitter:title" content="${title}" />`,
    )
    .replace(
      /<meta property="twitter:description" content=".*?" \/>/,
      `<meta property="twitter:description" content="${description}" />`,
    )
    .replace(
      /<meta property="twitter:image" content=".*?" \/>/,
      `<meta property="twitter:image" content="${escapedImageUrl}" />`,
    )
    .replace(
      /<link rel="canonical" href=".*?" \/>/,
      `<link rel="canonical" href="${escapedCanonicalUrl}" />${heroImagePreload}${schemaScript}`,
    );
}

async function writeRoute(pathname, html) {
  const outputPath =
    pathname === "/"
      ? path.join(distDir, "index.html")
      : path.join(distDir, pathname.slice(1), "index.html");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");
}

async function writeSitemap(routes) {
  const sitemapBody = routes
    .map(
      (route) => `  <url>
    <loc>${escapeHtml(withOrigin(route.pathname))}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapBody}
</urlset>
`;

  await fs.writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");
}

function getDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function getBlogPosts() {
  const convexUrl = process.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    console.warn("Skipping blog prerender because VITE_CONVEX_URL is not available.");
    return [];
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const posts = await client.query(api.posts.getPosts, {});
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.warn("Skipping blog prerender because fetching posts failed.", error);
    return [];
  }
}

async function main() {
  const template = await fs.readFile(templatePath, "utf8");
  const buildDate = getDateOnly(Date.now());
  const blogPosts = await getBlogPosts();
  const routes = staticRouteConfig.map((route) => {
    if (route.pathname === "/blog") {
      const newestPost = blogPosts[0];
      return {
        ...route,
        metadata: getBlogPageMetadata(blogPosts),
        appHtml: renderBlogIndexPage(blogPosts),
        lastmod: newestPost ? getDateOnly(newestPost._creationTime) : buildDate,
      };
    }

    return {
      ...route,
      metadata: getStaticMetadata(route.pathname),
      appHtml: render(route.pathname),
      lastmod: buildDate,
    };
  });

  for (const post of blogPosts) {
    routes.push({
      pathname: `/blog/${post._id}`,
      metadata: getBlogPostMetadata(post),
      appHtml: renderBlogPostPage(post),
      lastmod: getDateOnly(post._creationTime),
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  for (const route of routes) {
    const withHead = buildHead(template, route.pathname, route.metadata);
    const finalHtml = withHead.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${route.appHtml}</div>`,
    );

    await writeRoute(route.pathname, finalHtml);
  }

  await writeSitemap(routes);
}

main().catch((error) => {
  console.error("Failed to prerender public routes", error);
  process.exit(1);
});
