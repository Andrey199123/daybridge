import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Link } from "react-router-dom";
import { usePageMetadata } from "./components/RouteMetadataManager";

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function BlogPage() {
  const posts = useQuery(api.posts.getPosts);

  usePageMetadata({
    title: "DayBridge Blog | Senior Daily Support and Care Coordination",
    description:
      "Read DayBridge updates and practical guidance for senior daily support and care coordination.",
    canonicalPath: "/blog",
    schema: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "DayBridge Blog",
      url: "https://daybridge.app/blog",
      blogPost:
        posts?.slice(0, 10).map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          author: {
            "@type": "Person",
            name: post.author,
          },
          url: `https://daybridge.app/blog/${post._id}`,
        })) || [],
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Blog</h1>
      <div className="max-w-4xl mx-auto">
        {posts === undefined ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : posts.length > 0 ? (
          <div className="grid gap-8">
            {posts.map((post) => (
              <Link
                key={post._id}
                to={`/blog/${post._id}`}
                className="block bg-card border rounded-xl p-6 hover:bg-muted transition-all"
              >
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                )}
                <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
                <p className="text-muted-foreground mb-4">By {post.author}</p>
                <p className="line-clamp-3">{stripHtml(post.content)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#223a5d] bg-[#081423] p-10 text-center">
            <h2 className="text-2xl font-semibold text-white">No posts yet</h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              DayBridge updates and practical care-coordination guides will appear here as they are published.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
