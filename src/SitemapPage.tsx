import { Link } from "react-router-dom";

export function SitemapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Sitemap</h1>
      <div className="max-w-md mx-auto">
        <ul className="space-y-4">
          <li>
            <Link to="/" className="text-lg hover:underline">
              Home
            </Link>
          </li>
          <li>
            <Link to="/blog" className="text-lg hover:underline">
              Blog
            </Link>
          </li>
          <li>
            <Link to="/contact" className="text-lg hover:underline">
              Contact Us
            </Link>
          </li>
          <li>
            <Link to="/help" className="text-lg hover:underline">
              Help
            </Link>
          </li>
          <li>
            <Link to="/status" className="text-lg hover:underline">
              Status
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="text-lg hover:underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="/terms" className="text-lg hover:underline">
              Terms of Service
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
