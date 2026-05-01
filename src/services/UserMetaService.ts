import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export interface UserProfile {
  _id: Id<"userProfiles">;
  userId: string;
  name: string;
  grade: string | number | null;
  interests: string[];
  growthFocus?: string;
  bigGoal?: string;
  coreSkills?: string;
  motivationLevel?: string;
  completedOnboarding: boolean;
  currentStreak: number;
  longestStreak: number;
  totalGoalsCompleted: number;
  darkMode: boolean;
  coins?: number;
  pictureUrl?: string;
  points?: number;
  availability?: string;
}

export interface User {
  id: Id<"users">;
  email?: string;
  profile: UserProfile | null;
}

export interface ProgressReport {
  date: string;
  progress: number;
}

export class UserMetaService {
  // Queries
  static useGetCurrent() {
    return useQuery(api.users.getCurrentUser);
  }

  static useGetProfilePictureUrl(storageId: Id<"_storage">) {
    return useQuery(api.users.getProfilePictureUrl, { storageId });
  }

  static useGetProgressReport() {
    return useQuery(api.users.getProgressReport);
  }

  static useGetLeaderboard() {
    return useQuery(api.users.getLeaderboard);
  }

  static useExportData() {
    return useQuery(api.users.exportData);
  }

  // Mutations
  static useCreateProfile() {
    return useMutation(api.users.createProfile);
  }

  static useUpdateProfile() {
    return useMutation(api.users.updateProfile);
  }

  static useAddPoints() {
    return useMutation(api.users.addPoints);
  }

  static useUpdateStreak() {
    return useMutation(api.users.updateStreak);
  }

  static useIncrementGoalsCompleted() {
    return useMutation(api.users.incrementGoalsCompleted);
  }

  static useEnsureOnboardingCompleted() {
    return useMutation(api.users.ensureOnboardingCompleted);
  }

  static useStartOnboarding() {
    return useMutation(api.users.startOnboarding);
  }

  static useDeleteUser() {
    return useMutation(api.users.deleteUser);
  }

  // Actions
  static useReferFriend() {
    return useAction(api.users.referFriend);
  }
}

