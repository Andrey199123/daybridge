import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Bell } from "lucide-react";

export function Notifications() {
  const notifications = useQuery(api.notifications.getNotifications);

  return (
    <div className="relative">
      <button className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-muted">
        <Bell size={20} />
      </button>
      {notifications && notifications.length > 0 && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full"></div>
      )}
    </div>
  );
}
