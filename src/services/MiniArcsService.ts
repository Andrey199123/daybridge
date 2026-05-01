import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface MiniArcTemplate {
  _id: Id<"miniArcTemplates">;
  title: string;
  summary: string;
  tags: string[];
  deliverable: string;
  estimatedWeeks: number;
  skills: string[];
  weeklyTasks: {
    week: number;
    title: string;
    description: string;
    resources: {
      title: string;
      url: string;
      type: string;
    }[];
  }[];
  suggestedGoals: {
    title: string;
    description: string;
    category: string;
  }[];
  targetGrades?: string[];
  interestAreas: string[];
  // Added by recommendation query
  newSkillsCount?: number;
  recommendationScore?: number;
}

export interface UserMiniArc {
  _id: Id<"userMiniArcs">;
  userId: Id<"users">;
  templateId: Id<"miniArcTemplates">;
  status: string;
  startedAt: number;
  completedAt?: number;
  currentWeek: number;
  completedTasks: number[];
  skippedGoalSuggestions?: boolean;
  template?: MiniArcTemplate;
}

export const MiniArcsService = {
  // Get all templates
  useListTemplates: () => {
    return useQuery(api.miniArcs.listTemplates);
  },

  // Get recommended Mini-Arcs for user
  useGetRecommended: () => {
    return useQuery(api.miniArcs.getRecommended);
  },

  // Get single template
  useGetTemplate: (templateId: Id<"miniArcTemplates"> | undefined) => {
    return useQuery(
      api.miniArcs.getTemplate,
      templateId ? { templateId } : "skip"
    );
  },

  // Get user's Mini-Arcs
  useGetUserMiniArcs: (status?: string) => {
    return useQuery(api.miniArcs.getUserMiniArcs, { status });
  },

  // Search Mini-Arcs
  useSearchMiniArcs: (query: string) => {
    return useQuery(
      api.miniArcs.searchMiniArcs,
      query ? { query } : "skip"
    );
  },

  // Filter by tag
  useFilterByTag: (tag: string) => {
    return useQuery(
      api.miniArcs.filterByTag,
      tag ? { tag } : "skip"
    );
  },

  // Mutations
  useStartMiniArc: () => {
    return useMutation(api.miniArcs.startMiniArc);
  },

  useCompleteTask: () => {
    return useMutation(api.miniArcs.completeTask);
  },

  useSkipGoalSuggestions: () => {
    return useMutation(api.miniArcs.skipGoalSuggestions);
  },

  useConvertToGoal: () => {
    return useMutation(api.miniArcs.convertToGoal);
  },

  useAbandonMiniArc: () => {
    return useMutation(api.miniArcs.abandonMiniArc);
  },
};
