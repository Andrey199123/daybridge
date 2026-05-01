import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useParams } from "react-router-dom";
import { Id } from "../convex/_generated/dataModel";
import { usePageMetadata } from "./components/RouteMetadataManager";

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function BlogPostPage() {
  const { postId } = useParams<{ postId: Id<"posts"> }>();
  const post = useQuery(api.posts.getPost, { id: postId! });
  const excerpt = post ? stripHtml(post.content).slice(0, 160) : undefined;

  usePageMetadata(
    post
      ? {
          title: `${post.title} | DayBridge Blog`,
          description:
            excerpt ||
            "Read DayBridge updates and guidance for senior daily support and care coordination.",
          canonicalPath: `/blog/${post._id}`,
          imageUrl: post.imageUrl,
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
            description:
              excerpt ||
              "Read DayBridge updates and guidance for senior daily support and care coordination.",
          },
        }
      : undefined,
  );

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt={post.title}
            decoding="async"
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-muted-foreground mb-8">By {post.author}</p>
        <div
          className="prose dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}
