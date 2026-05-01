import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const goals = useQuery(api.goals.searchGoals, { query });

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search care plans..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg"
      />
      {query && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-10">
          {goals?.map((goal) => (
            <Link
              key={goal._id}
              to={`/goal/${goal._id}`}
              className="block px-4 py-2 hover:bg-muted"
              onClick={() => setQuery("")}
            >
              {goal.title}
            </Link>
          ))}
          {goals?.length === 0 && (
            <p className="px-4 py-2 text-muted-foreground">No results found.</p>
          )}
        </div>
      )}
    </div>
  );
}
