/**
 * Category Policy - Centralized allowlist
 * 
 * DayBridge supports routine reminders and coordination only. We do NOT allow:
 * - Fitness / body transformation goals
 * - Therapy or mental-health treatment plans
 * - Medical advice, diagnosis, treatment decisions, or dosage changes
 * 
 * This keeps the platform focused on daily support rather than clinical advice.
 */

export const ALLOWED_CATEGORIES = [
  "academic",
  "career",
  "creative",
  "entrepreneurial",
  "personal-growth"
] as const;

export type AllowedCategory = typeof ALLOWED_CATEGORIES[number];

// Disallowed category keywords for detection in free text
export const DISALLOWED_KEYWORDS = [
  // Fitness/Body transformation
  "workout", "gym", "fitness", "exercise", "weight", "muscle", "cardio", "running", "marathon",
  "bodybuilding", "crossfit", "yoga poses", "diet plan", "lose weight", "gain weight", "abs", "biceps",
  "strength training", "athletic performance", "sports training", "body transformation",
  
  // Therapy/Mental Health (note: general wellbeing/mindfulness is OK in personal-growth)
  "therapy", "therapist", "counseling", "counsellor", "depression treatment", "anxiety disorder", 
  "ptsd", "trauma treatment", "psychiatric", "mental illness", "bipolar", "medication adjustment",
  "psychologist", "mental health professional",
  
  // Medical advice and clinical treatment decisions
  "diagnosis", "diagnose", "medical treatment", "surgery", "medical condition",
  "change dosage", "increase dosage", "decrease dosage", "stop taking", "start taking",
  "injury rehab", "physical therapy", "chronic pain treatment", "treat symptoms",
  "disease treatment", "medical procedure"
] as const;

/**
 * Check if a category value is in the allowlist
 */
export function isAllowedCategory(category: string): category is AllowedCategory {
  return ALLOWED_CATEGORIES.includes(category as AllowedCategory);
}

/**
 * Check if text contains disallowed category intent
 */
export function detectDisallowedIntent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DISALLOWED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Validate category or throw an error
 */
export function validateCategory(category: string): asserts category is AllowedCategory {
  if (!isAllowedCategory(category)) {
    throw new Error(
      `Invalid category "${category}". Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}`
    );
  }
}
