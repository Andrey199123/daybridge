import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useParams } from "react-router-dom";
import { Id } from "../convex/_generated/dataModel";

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: Id<"userProfiles"> }>();
  const user = useQuery(api.users.getUserProfile, { id: userId! });
  const goals = useQuery(api.goals.getUserGoals, {
    userId: userId!,
    status: "completed",
  });

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-8">
          <img
            src={user.profile.pictureUrl}
            alt={user.profile.name}
            className="w-32 h-32 rounded-full"
          />
          <div>
            <h1 className="text-4xl font-bold">{user.profile.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Completed Goals</h2>
          <div className="grid gap-4">
            {goals?.map((goal) => (
              <div key={goal._id} className="bg-card border rounded-xl p-4">
                <h3 className="font-semibold">{goal.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {goal.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
