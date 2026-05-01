/**
 * Interest Graph System
 * Defines relationships between daily support areas for onboarding suggestions.
 */

export interface InterestNode {
  id: string;
  label: string;
  related: string[];
}

export const INTEREST_GRAPH: Record<string, InterestNode> = {
  appointments: {
    id: "appointments",
    label: "Appointments",
    related: ["rides", "paperwork", "questions", "follow-up"],
  },
  rides: {
    id: "rides",
    label: "Rides",
    related: ["appointments", "errands", "care-circle", "weather"],
  },
  paperwork: {
    id: "paperwork",
    label: "Paperwork",
    related: ["appointments", "insurance-cards", "mail", "follow-up"],
  },
  questions: {
    id: "questions",
    label: "Questions to Ask",
    related: ["appointments", "follow-up", "care-circle"],
  },
  "follow-up": {
    id: "follow-up",
    label: "Follow-up Notes",
    related: ["appointments", "family-calls", "paperwork"],
  },
  "medication-reminders": {
    id: "medication-reminders",
    label: "Medication Reminders",
    related: ["morning-routine", "evening-routine", "refills", "care-circle"],
  },
  refills: {
    id: "refills",
    label: "Refill Reminders",
    related: ["medication-reminders", "appointments", "care-circle"],
  },
  "morning-routine": {
    id: "morning-routine",
    label: "Morning Routine",
    related: ["medication-reminders", "meals", "home-safety", "movement"],
  },
  "evening-routine": {
    id: "evening-routine",
    label: "Evening Routine",
    related: ["medication-reminders", "family-calls", "home-safety"],
  },
  meals: {
    id: "meals",
    label: "Meals",
    related: ["morning-routine", "shopping", "family-calls"],
  },
  shopping: {
    id: "shopping",
    label: "Shopping",
    related: ["meals", "errands", "rides", "care-circle"],
  },
  errands: {
    id: "errands",
    label: "Errands",
    related: ["rides", "shopping", "mail", "home-safety"],
  },
  mail: {
    id: "mail",
    label: "Mail",
    related: ["paperwork", "errands", "care-circle"],
  },
  "family-calls": {
    id: "family-calls",
    label: "Family Calls",
    related: ["care-circle", "follow-up", "hobbies", "evening-routine"],
  },
  "care-circle": {
    id: "care-circle",
    label: "Care Circle",
    related: ["family-calls", "rides", "medication-reminders", "appointments"],
  },
  hobbies: {
    id: "hobbies",
    label: "Hobbies",
    related: ["family-calls", "community", "movement"],
  },
  community: {
    id: "community",
    label: "Community Events",
    related: ["hobbies", "rides", "family-calls"],
  },
  "home-safety": {
    id: "home-safety",
    label: "Home Safety",
    related: ["morning-routine", "evening-routine", "errands", "care-circle"],
  },
  movement: {
    id: "movement",
    label: "Gentle Movement",
    related: ["morning-routine", "hobbies", "meals"],
  },
  weather: {
    id: "weather",
    label: "Weather Prep",
    related: ["rides", "appointments", "errands"],
  },
  "insurance-cards": {
    id: "insurance-cards",
    label: "Insurance Cards",
    related: ["paperwork", "appointments"],
  },
};

export const INITIAL_INTERESTS = [
  "appointments",
  "medication-reminders",
  "rides",
  "meals",
  "family-calls",
  "errands",
  "home-safety",
  "hobbies",
];

export function getRelatedInterests(interestId: string): InterestNode[] {
  const interest = INTEREST_GRAPH[interestId];
  if (!interest) return [];

  return interest.related
    .map((id) => INTEREST_GRAPH[id])
    .filter(Boolean);
}

export function getSuggestedInterests(selectedInterests: string[]): InterestNode[] {
  if (selectedInterests.length === 0) {
    return INITIAL_INTERESTS.map((id) => INTEREST_GRAPH[id]).filter(Boolean);
  }

  const relatedSet = new Set<string>();
  selectedInterests.forEach((selected) => {
    const interest = INTEREST_GRAPH[selected];
    if (interest) {
      interest.related.forEach((relatedId) => {
        if (!selectedInterests.includes(relatedId)) {
          relatedSet.add(relatedId);
        }
      });
    }
  });

  return Array.from(relatedSet)
    .map((id) => INTEREST_GRAPH[id])
    .filter(Boolean)
    .slice(0, 8);
}
