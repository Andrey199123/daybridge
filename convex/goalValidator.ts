/**
 * Goal Validator + SMART Clarification Engine
 * 
 * This module provides deterministic validation logic for goal creation.
 * It checks SMART completeness and generates the next best clarification question.
 * 
 * NO SCORING - only qualitative readiness + issues + next question.
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export type ValidationSeverity = "blocking" | "warning";
export type SMARTLetter = "S" | "M" | "A" | "R" | "T";
export type Readiness = "needs_intake" | "needs_smart" | "ready_for_planning";

export interface GoalDraft {
  // Initial intake fields
  goalText?: string;
  outcomes?: string; // What they hope to achieve
  motivation?: string; // Why they care
  finishBy?: string; // ISO date string
  importance?: "low" | "medium" | "high";
  category?: string;
  
  // SMART clarification fields
  successDefinition?: string; // What counts as success
  progressMetric?: string; // How to track progress
  blockers?: string; // Potential obstacles
  
  // Conversation history
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ValidationIssue {
  letter: SMARTLetter;
  code: string;
  severity: ValidationSeverity;
  message: string;
  suggestedFix?: string;
  followUpQuestion?: string;
}

export interface ValidationResult {
  readiness: Readiness;
  issues: ValidationIssue[];
  nextQuestion: string | null;
  rewriteSuggestions: string[];
  summary: {
    hasGoalText: boolean;
    hasFinishBy: boolean;
    hasImportance: boolean;
    hasCategory: boolean;
    hasSuccessDefinition: boolean;
    hasProgressMetric: boolean;
    hasMotivation: boolean;
  };
}

export interface Question {
  id: string;
  text: string;
  type: "text" | "date" | "select" | "multiselect";
  options?: string[];
  placeholder?: string;
  examples?: string[];
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validates a goal draft and returns issues + next question
 */
export function validateGoal(draft: GoalDraft): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rewriteSuggestions: string[] = [];
  
  // Check what we have
  const summary = {
    hasGoalText: !!draft.goalText && draft.goalText.trim().length > 0,
    hasFinishBy: !!draft.finishBy,
    hasImportance: !!draft.importance,
    hasCategory: !!draft.category,
    hasSuccessDefinition: !!draft.successDefinition && draft.successDefinition.trim().length > 0,
    hasProgressMetric: !!draft.progressMetric && draft.progressMetric.trim().length > 0,
    hasMotivation: !!draft.motivation && draft.motivation.trim().length > 0,
  };
  
  // Determine readiness
  let readiness: Readiness = "ready_for_planning";
  
  // Phase 1: Check intake fields
  if (!summary.hasGoalText || !summary.hasFinishBy || !summary.hasImportance || !summary.hasCategory) {
    readiness = "needs_intake";
  }
  // Phase 2: Check SMART fields
  else if (!summary.hasSuccessDefinition || !summary.hasProgressMetric) {
    readiness = "needs_smart";
  }
  
  // Run SMART validation
  if (summary.hasGoalText) {
    validateSpecific(draft.goalText!, issues, rewriteSuggestions);
  }
  
  if (summary.hasSuccessDefinition) {
    validateMeasurable(draft.successDefinition!, issues);
  } else if (summary.hasGoalText) {
    issues.push({
      letter: "M",
      code: "M_MISSING",
      severity: "blocking",
      message: "No success criteria defined",
      followUpQuestion: "What would count as 'success' for this goal?",
    });
  }
  
  if (summary.hasFinishBy) {
    validateTimeBound(draft.finishBy!, draft.goalText || "", issues);
  }
  
  if (summary.hasGoalText && summary.hasFinishBy) {
    validateAchievable(draft, issues);
  }
  
  if (!summary.hasMotivation && summary.hasGoalText) {
    issues.push({
      letter: "R",
      code: "R_MISSING",
      severity: "warning",
      message: "Motivation unclear",
      followUpQuestion: "Why do you care about this goal?",
    });
  }
  
  // Get next question
  const nextQuestion = getNextQuestion(draft, issues, summary);
  
  return {
    readiness,
    issues,
    nextQuestion,
    rewriteSuggestions,
    summary,
  };
}

/**
 * Validate Specific: Check for vague verbs and missing scope
 */
function validateSpecific(goalText: string, issues: ValidationIssue[], rewriteSuggestions: string[]) {
  const lower = goalText.toLowerCase();
  
  // Vague verbs
  const vagueVerbs = ["improve", "get better", "learn", "work on", "study", "practice", "explore", "understand"];
  const hasVagueVerb = vagueVerbs.some(verb => lower.includes(verb));
  
  if (hasVagueVerb) {
    issues.push({
      letter: "S",
      code: "S_VAGUE_VERB",
      severity: "blocking",
      message: "Goal uses vague language - needs more specificity",
      suggestedFix: "Replace vague verbs with concrete actions and outcomes",
      followUpQuestion: "What specific outcome or deliverable would show you've achieved this?",
    });
    
    // Generate rewrite suggestions based on common patterns
    if (lower.includes("learn") && lower.includes("python")) {
      rewriteSuggestions.push("Build a web scraper that collects data from 5 websites");
      rewriteSuggestions.push("Complete 20 LeetCode problems in Python");
      rewriteSuggestions.push("Build a GPT wrapper API with authentication");
    } else if (lower.includes("learn") && lower.includes("guitar")) {
      rewriteSuggestions.push("Learn and perform 3 complete songs from memory");
      rewriteSuggestions.push("Master 10 essential guitar chords and 3 strumming patterns");
    } else if (lower.includes("improve") && lower.includes("writing")) {
      rewriteSuggestions.push("Write and publish 10 blog posts with 500+ words each");
      rewriteSuggestions.push("Complete a 50,000-word novel draft");
    }
  }
  
  // Too short
  if (goalText.length < 10) {
    issues.push({
      letter: "S",
      code: "S_TOO_SHORT",
      severity: "blocking",
      message: "Goal description is too brief",
      followUpQuestion: "Can you tell me more about what you want to achieve?",
    });
  }
  
  // Multiple goals
  const hasMultipleGoals = lower.includes(" and ") || lower.includes(" & ") || lower.includes(", ");
  if (hasMultipleGoals && goalText.split(/and|&|,/).length > 2) {
    issues.push({
      letter: "S",
      code: "S_MULTIPLE_GOALS",
      severity: "warning",
      message: "Appears to contain multiple goals",
      suggestedFix: "Focus on one goal at a time for better clarity",
      followUpQuestion: "Which of these goals is most important to you right now?",
    });
  }
}

/**
 * Validate Measurable: Check for metrics or observable outputs
 */
function validateMeasurable(successDefinition: string, issues: ValidationIssue[]) {
  const lower = successDefinition.toLowerCase();
  
  // Look for measurable indicators
  const hasNumber = /\d+/.test(successDefinition);
  const hasMetric = /\b(complete|finish|publish|build|create|write|learn|master)\b/.test(lower);
  const hasQuantifier = /\b(all|every|each|multiple|several)\b/.test(lower);
  
  if (!hasNumber && !hasMetric && !hasQuantifier) {
    issues.push({
      letter: "M",
      code: "M_NO_METRIC",
      severity: "blocking",
      message: "Success criteria lacks measurable indicators",
      suggestedFix: "Add specific numbers, counts, or observable outputs",
      followUpQuestion: "How many or how much would you need to complete?",
    });
  }
  
  // Too vague
  if (successDefinition.length < 15) {
    issues.push({
      letter: "M",
      code: "M_TOO_VAGUE",
      severity: "warning",
      message: "Success criteria is too brief",
      followUpQuestion: "Can you be more specific about what success looks like?",
    });
  }
}

/**
 * Validate Time-bound: Check date validity and realism
 */
function validateTimeBound(finishBy: string, goalText: string, issues: ValidationIssue[]) {
  const targetDate = new Date(finishBy);
  const now = new Date();
  
  // Past date
  if (targetDate < now) {
    issues.push({
      letter: "T",
      code: "T_PAST_DATE",
      severity: "blocking",
      message: "Target date is in the past",
      followUpQuestion: "When would you realistically like to complete this?",
    });
    return;
  }
  
  // Calculate days until deadline
  const daysUntil = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Too soon (less than 7 days for most goals)
  if (daysUntil < 7) {
    issues.push({
      letter: "T",
      code: "T_TOO_SOON",
      severity: "warning",
      message: "Timeline may be too aggressive",
      suggestedFix: "Consider extending the deadline for better success chances",
      followUpQuestion: "Is this deadline flexible, or is it fixed?",
    });
  }
  
  // Way too far (more than 2 years)
  if (daysUntil > 730) {
    issues.push({
      letter: "T",
      code: "T_TOO_FAR",
      severity: "warning",
      message: "Timeline is very long-term",
      suggestedFix: "Consider breaking into smaller milestones",
      followUpQuestion: "Would you like to set intermediate milestones?",
    });
  }
}

/**
 * Validate Achievable: Check for realistic scope given timeframe
 */
function validateAchievable(draft: GoalDraft, issues: ValidationIssue[]) {
  if (!draft.goalText || !draft.finishBy) return;
  
  const targetDate = new Date(draft.finishBy);
  const now = new Date();
  const daysUntil = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const lower = draft.goalText.toLowerCase();
  
  // Check for large scope with short timeline
  const largeScope = lower.includes("master") || lower.includes("expert") || lower.includes("fluent");
  const complexProject = lower.includes("app") || lower.includes("website") || lower.includes("business");
  
  if ((largeScope || complexProject) && daysUntil < 30) {
    issues.push({
      letter: "A",
      code: "A_SCOPE_TOO_LARGE",
      severity: "warning",
      message: "Goal scope may be too ambitious for the timeframe",
      suggestedFix: "Consider narrowing the scope or extending the deadline",
      followUpQuestion: "Is there a smaller version of this goal you could achieve first?",
    });
  }
  
  // Check for prerequisites
  const needsLearning = lower.includes("learn") || lower.includes("master");
  if (needsLearning && !draft.blockers) {
    issues.push({
      letter: "A",
      code: "A_MISSING_PREREQUISITES",
      severity: "warning",
      message: "May require learning or resources",
      followUpQuestion: "Do you have the skills/resources needed, or will you need to learn as you go?",
    });
  }
}

/**
 * Get the next best question to ask based on validation state
 */
function getNextQuestion(draft: GoalDraft, issues: ValidationIssue[], summary: any): string | null {
  // Priority 1: Missing required intake fields
  if (!summary.hasGoalText) {
    return "What goal are you looking to achieve? The more specific the better.";
  }
  
  if (!summary.hasFinishBy) {
    return "When do you want to finish this by?";
  }
  
  if (!summary.hasImportance) {
    return "How important is this to you right now: Low, Medium, or High?";
  }
  
  if (!summary.hasCategory) {
    return "What type of goal is this? (Academic, Career, Creative, Fitness, Personal, Social, or Other)";
  }
  
  // Priority 2: SMART clarification - blocking issues first
  const blockingIssues = issues.filter(i => i.severity === "blocking");
  if (blockingIssues.length > 0 && blockingIssues[0].followUpQuestion) {
    return blockingIssues[0].followUpQuestion;
  }
  
  // Priority 3: Missing SMART fields
  if (!summary.hasSuccessDefinition) {
    return "Let's make sure this goal is clear. What would count as 'success' for this goal?";
  }
  
  if (!summary.hasProgressMetric) {
    return "What's something you could track to see if you're making progress on this?";
  }
  
  // Priority 4: Optional but recommended
  if (!summary.hasMotivation) {
    return "Why do you care about this goal? What are you hoping to achieve through it?";
  }
  
  // Priority 5: Warning issues
  const warningIssues = issues.filter(i => i.severity === "warning");
  if (warningIssues.length > 0 && warningIssues[0].followUpQuestion) {
    return warningIssues[0].followUpQuestion;
  }
  
  // All done!
  return null;
}

/**
 * Extract structured data from user's natural language answer
 * This is a helper for the AI to populate the GoalDraft fields
 */
export function extractFieldFromAnswer(answer: string, questionId: string): Partial<GoalDraft> {
  const lower = answer.toLowerCase().trim();
  
  // Importance extraction
  if (questionId.includes("importance") || lower.includes("important")) {
    if (lower.includes("high") || lower.includes("very") || lower.includes("extremely")) {
      return { importance: "high" };
    }
    if (lower.includes("low") || lower.includes("not really") || lower.includes("somewhat")) {
      return { importance: "low" };
    }
    return { importance: "medium" };
  }
  
  // Category extraction
  if (questionId.includes("category") || questionId.includes("type")) {
    const categories = ["academic", "career", "creative", "fitness", "personal", "social"];
    for (const cat of categories) {
      if (lower.includes(cat)) {
        return { category: cat };
      }
    }
  }
  
  return {};
}
