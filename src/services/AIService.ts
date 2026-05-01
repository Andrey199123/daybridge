import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export class AIService {
  // Actions
  static useSMARTGoalChat() {
    return useAction(api.ai.smartGoalChat);
  }

  static useValidateSMARTGoal() {
    return useAction(api.ai.validateSMARTGoal);
  }

  static useGenerateTasksForGoal() {
    return useAction(api.ai.generateTasksForGoal);
  }

  static useGenerateMilestonesForGoal() {
    return useAction(api.goalBreakdownEngine.generateMilestonesForGoal);
  }

  static useGenerateWeeklyTasksForMilestone() {
    return useAction(api.goalBreakdownEngine.generateWeeklyTasksForMilestone);
  }
}

