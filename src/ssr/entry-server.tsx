import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../App";
import { ThemeProvider } from "../components/ThemeProvider";
import { resolveRouteMetadata } from "../components/RouteMetadataManager";
export {
  getBlogPageMetadata,
  getBlogPostMetadata,
  renderBlogIndexPage,
  renderBlogPostPage,
  type PrerenderBlogPost,
} from "./blogStatic";

export function render(url: string) {
  return renderToString(
    <ThemeProvider defaultTheme="dark" storageKey="arc-theme">
      <MemoryRouter initialEntries={[url]}>
        <AppShell />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

export function getStaticMetadata(url: string) {
  return resolveRouteMetadata(url);
}
