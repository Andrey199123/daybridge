import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export class SchedulingService {
  static useSaveAvailability() {
    return useMutation(api.availability.saveAvailability);
  }

  static useScheduleTasksForGoal() {
    return useAction(api.availability.scheduleTasksForGoal);
  }
}