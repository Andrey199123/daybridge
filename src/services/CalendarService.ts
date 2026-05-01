import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "task" | "milestone" | "goal";
  goalId: Id<"goals">;
  milestoneId?: Id<"milestones">;
  taskId?: Id<"tasks">;
  completed: boolean;
}

export class CalendarService {
  // This service will handle calendar-related operations
  // For now, it's a placeholder that can be extended with calendar-specific functionality
  
  static useGetTasksForDateRange(startDate: string, endDate: string) {
    // This would need to be implemented in the backend
    // For now, we'll use the existing tasks queries
    return useQuery(api.tasks.getTodaysTasks);
  }

  static useUpdateTaskSchedule() {
    return useMutation(api.tasks.updateTask);
  }
}

