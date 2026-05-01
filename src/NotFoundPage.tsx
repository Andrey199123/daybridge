import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <p className="text-2xl font-semibold text-foreground mt-4">
        Page Not Found
      </p>
      <p className="text-muted-foreground mt-2">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Go to Home
      </Link>
    </div>
  );
}
