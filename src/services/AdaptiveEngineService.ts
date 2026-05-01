import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const AdaptiveEngineService = {
  // Get user's skill profile
  useGetSkillProfile: () => {
    return useQuery(api.adaptiveEngine.getUserSkillProfile);
  },

  // Get check-in status for a goal
  useGetCheckInStatus: (goalId: Id<"goals"> | undefined) => {
    return useQuery(
      api.adaptiveEngine.getCheckInStatus,
      goalId ? { goalId } : "skip"
    );
  },

  // Get goals needing check-in
  useGetGoalsNeedingCheckIn: () => {
    return useQuery(api.adaptiveEngine.getGoalsNeedingCheckIn);
  },

  // Mutations
  useAddBufferWeeks: () => {
    return useMutation(api.adaptiveEngine.addBufferWeeks);
  },

  useShiftGoalDeadline: () => {
    return useMutation(api.adaptiveEngine.shiftGoalDeadline);
  },

  useSkipTask: () => {
    return useMutation(api.adaptiveEngine.skipTask);
  },

  useRescheduleTask: () => {
    return useMutation(api.adaptiveEngine.rescheduleTask);
  },

  useAdjustGoalPace: () => {
    return useMutation(api.adaptiveEngine.adjustGoalPace);
  },
};
