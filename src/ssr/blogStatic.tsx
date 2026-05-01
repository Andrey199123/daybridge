import { renderToStaticMarkup } from "react-dom/server";
import type { PageMetadata } from "../components/RouteMetadataManager";

export type PrerenderBlogPost = {
  _id: string;
  _creationTime: number;
  title: string;
  content: string;
  author: string;
  imageUrl?: string | null;
};

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildExcerpt(content: string, maxLength = 160) {
  const plainText = stripHtml(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatPublishDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getBlogPageMetadata(posts: PrerenderBlogPost[]): PageMetadata {
  return {
    title: "DayBridge Blog | Senior Daily Support and Care Planning",
    description:
      "Read DayBridge updates and practical guidance for seniors and care circles coordinating daily support.",
    canonicalPath: "/blog",
    type: "website",
    schema: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "DayBridge Blog",
      url: "https://daybridge.app/blog",
      blogPost: posts.slice(0, 10).map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        author: {
          "@type": "Person",
          name: post.author,
        },
        url: `https://daybridge.app/blog/${post._id}`,
        datePublished: new Date(post._creationTime).toISOString(),
        dateModified: new Date(post._creationTime).toISOString(),
        description:
          buildExcerpt(post.content) ||
          "Read DayBridge updates and practical guidance for seniors and care circles coordinating daily support.",
      })),
    },
  };
}

export function getBlogPostMetadata(post: PrerenderBlogPost): PageMetadata {
  const excerpt =
    buildExcerpt(post.content) ||
    "Read DayBridge updates and guidance for seniors and care circles coordinating daily support.";

  return {
    title: `${post.title} | DayBridge Blog`,
    description: excerpt,
    canonicalPath: `/blog/${post._id}`,
    imageUrl: post.imageUrl || undefined,
    type: "article",
    schema: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      author: {
        "@type": "Person",
        name: post.author,
      },
      image: post.imageUrl ? [post.imageUrl] : undefined,
      url: `https://daybridge.app/blog/${post._id}`,
      datePublished: new Date(post._creationTime).toISOString(),
      dateModified: new Date(post._creationTime).toISOString(),
      description: excerpt,
    },
  };
}

export function renderBlogIndexPage(posts: PrerenderBlogPost[]) {
  return renderToStaticMarkup(
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 text-center text-4xl font-bold text-white">DayBridge Blog</h1>
        <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-7 text-slate-300">
          Product updates, launch notes, and practical guidance for seniors and care
          circles coordinating daily support.
        </p>

        {posts.length > 0 ? (
          <div className="grid gap-8">
            {posts.map((post) => (
              <a
                key={post._id}
                href={`/blog/${post._id}`}
                className="block rounded-xl border border-[#223a5d] bg-[#081423] p-6 transition-all hover:bg-[#0b1728]"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="mb-4 h-64 w-full rounded-lg object-cover"
                  />
                ) : null}

                <p className="text-sm font-medium text-blue-100/70">
                  {formatPublishDate(post._creationTime)}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{post.title}</h2>
                <p className="mt-2 text-sm text-slate-400">By {post.author}</p>
                <p className="mt-4 line-clamp-3 text-base leading-7 text-slate-300">
                  {buildExcerpt(post.content, 220)}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#223a5d] bg-[#081423] p-10 text-center">
            <h2 className="text-2xl font-semibold text-white">No posts yet</h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Arc updates and practical goal-planning guides will appear here as they are
              published.
            </p>
          </div>
        )}
      </div>
    </div>,
  );
}

export function renderBlogPostPage(post: PrerenderBlogPost) {
  return renderToStaticMarkup(
    <div className="container mx-auto px-4 py-8">
      <article className="mx-auto max-w-4xl">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.title}
            decoding="async"
            className="mb-8 h-96 w-full rounded-lg object-cover"
          />
        ) : null}

        <p className="text-sm font-medium text-blue-100/70">
          {formatPublishDate(post._creationTime)}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">{post.title}</h1>
        <p className="mb-8 mt-4 text-sm text-slate-400">By {post.author}</p>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>,
  );
}
