"use node";

import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Test mode flag - set to true to inject latency and errors
const TEST_SLOW_LLM = process.env.TEST_SLOW_LLM === "true";

// Helper function to call Cohere API
async function callCohere(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY environment variable is not set");
  }

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'command-r-08-2024', // Current available Cohere model
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Cohere API error response:", errorBody);
      throw new Error(`Cohere API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const generatedText = data.message?.content?.[0]?.text;
    
    if (!generatedText) {
      throw new Error("No response from Cohere API");
    }

    return generatedText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Cohere API request timed out after 45 seconds');
    }
    throw error;
  }
}

// Helper for chat completions with message history
async function callCohereChat(messages: Array<{role: string, content: string}>): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY environment variable is not set");
  }

  // Convert messages to Cohere format
  const cohereMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'command-r-08-2024',
        messages: cohereMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Cohere API error response:", errorBody);
      throw new Error(`Cohere API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const generatedText = data.message?.content?.[0]?.text;
    
    if (!generatedText) {
      throw new Error("No response from Cohere API");
    }

    return generatedText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Cohere API request timed out after 45 seconds');
    }
    throw error;
  }
}

export const generateTasksForGoal = action({
  args: {
    goalId: v.id("goals"),
    goalTitle: v.string(),
    goalDescription: v.string(),
    category: v.string(),
    milestoneId: v.optional(v.id("milestones")),
  },
  handler: async (ctx, args) => {
    const prompt = `You are an AI assistant helping older adults and care circles break down daily support plans into actionable tasks.

Care plan: ${args.goalTitle}
Description: ${args.goalDescription}
Category: ${args.category}

Please break this care plan down into 5-8 specific, actionable tasks that an older adult or caregiver can complete. Each task should be:
- Clear and specific
- Achievable in a real day-to-day independent living context
- Ordered logically (from first to last)
- Focused on concrete actions
- Careful not to provide diagnosis, treatment, medication dosage, or medical advice

Return ONLY a JSON array of task titles, like this:
["Task 1 title", "Task 2 title", "Task 3 title"]

Do not include any other text or formatting.`;

    try {
      const generatedText = await callCohere(prompt);
      
      console.log("=== TASK GENERATION DEBUG ===");
      console.log("Goal:", args.goalTitle);
      console.log("Milestone ID:", args.milestoneId || "None");
      console.log("Raw AI response:", generatedText);
      console.log("=============================");

      // Parse the JSON response
      let tasks: string[];
      try {
        // Clean the response text - remove markdown code blocks and extra formatting
        let cleanedText = generatedText.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find JSON array in the text
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }
        
        tasks = JSON.parse(cleanedText);
        
        // Ensure tasks is an array of strings
        if (!Array.isArray(tasks)) {
          throw new Error("Response is not an array");
        }
        
        // Clean up individual task strings
        tasks = tasks.map(task => {
          if (typeof task === 'string') {
            return task.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
          }
          return String(task);
        });
        
      } catch (parseError) {
        console.log("JSON parsing failed, using fallback. Raw response:", generatedText);
        
        // Fallback: extract tasks from text if JSON parsing fails
        const lines = generatedText.split('\n').filter((line: string) => line.trim());
        tasks = lines.slice(0, 8); // Take up to 8 tasks
        
        // Clean up the lines
        tasks = tasks.map(line => {
          // Remove common prefixes like "1.", "-", "*", etc.
          return line.replace(/^\d+\.\s*|^[-*]\s*|^["']\s*|["']\s*$/g, '').trim();
        }).filter(task => task.length > 0);
      }

      console.log("Parsed tasks:", tasks);
      console.log("Number of tasks:", tasks.length);

      // Create tasks in the database, assigning to milestone if provided
      for (let i = 0; i < tasks.length; i++) {
        await ctx.runMutation(api.tasks.createTaskWithDetails, {
          goalId: args.goalId,
          milestoneId: args.milestoneId,
          title: tasks[i],
          order: i,
        });
      }

      return tasks;
    } catch (error) {
      console.error("Error generating tasks:", error);
      
      // Fallback: create basic care-appropriate tasks
      const fallbackTasks = [
        "Write down today's key tasks and reminders",
        "Check and gather any needed supplies or documents",
        "Let a family member or helper know the plan",
        "Complete the main task or appointment",
        "Check in with care circle when done",
        "Note anything that needs follow-up tomorrow",
      ];

      for (let i = 0; i < fallbackTasks.length; i++) {
        await ctx.runMutation(api.tasks.createTaskWithDetails, {
          goalId: args.goalId,
          milestoneId: args.milestoneId,
          title: fallbackTasks[i],
          order: i,
        });
      }

      return fallbackTasks;
    }
  },
});

export const generateResume = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<string> => {
    const userGoals: any = await ctx.runQuery(api.goals.getUserGoals, { status: "completed" });
    const userProfile: any = await ctx.runQuery(api.users.getCurrentUser, {}); 
    const skillsSummary: any = await ctx.runQuery(api.skillsTracker.getSkillsSummary, {});
    const experiences: any = await ctx.runQuery(api.skillsTracker.getUserExperiences, {});

    if (!userProfile?.profile) {
      throw new Error("User profile not found");
    }

    const completedGoals: any[] = userGoals.filter((goal: any) => goal.status === "completed");
    
    // Format experiences by type
    const experiencesByType: Record<string, any[]> = {};
    for (const exp of experiences) {
      if (!experiencesByType[exp.type]) {
        experiencesByType[exp.type] = [];
      }
      experiencesByType[exp.type].push(exp);
    }
    
    const prompt: string = `Create a plain-language care summary for an older adult based on completed care plans, strengths, routines, and support context.

Person Information:
- Name: ${userProfile.profile.name}
- Daily rhythm: ${userProfile.profile.grade}
- Support priorities: ${userProfile.profile.interests.join(", ")}
- Community or support setting: ${userProfile.profile.schoolName || "Not specified"}
- Location: ${userProfile.profile.city ? `${userProfile.profile.city}, ${userProfile.profile.state}` : "Not specified"}

Strengths and support skills (by category):
${Object.entries(skillsSummary.byCategory || {}).map(([category, skills]: [string, any]) => 
  `- ${category}: ${(skills as string[]).join(", ")}`
).join("\n")}

Top strengths (most practiced):
${(skillsSummary.topSkills || []).map((s: any) => `- ${s.skill} (practiced ${s.count} times)`).join("\n")}

Completed routines and support experiences:
${experiences.map((exp: any) => `
- ${exp.title} (${exp.type})
  Category: ${exp.category}
  Description: ${exp.description}
  Skills Used: ${exp.skills.join(", ")}
  Completed: ${new Date(exp.completedAt).toLocaleDateString()}
`).join("")}

Completed care plans summary:
${completedGoals.map((goal: any) => `
- ${goal.title} (${goal.category})
  Description: ${goal.description}
  Tasks completed: ${goal.tasks?.filter((t: any) => t.completed).length || 0}
`).join("")}

Please create a well-formatted care summary that helps family members, aides, neighbors, or volunteers understand what support is working. Include sections for:
- Basic Contact Information (use placeholder info like [Email] and [Phone])
- Daily Support Summary
- Routines and Care Plans
- Strengths and Preferences
- Helpful Context for the Care Circle
- Follow-up Notes

Format it as clean, respectful text that could be copied into a family update or helper handoff. Use bullet points and clear section headers.`;

    try {
      const resume = await callCohere(prompt);
      return resume;
    } catch (error) {
      console.error("Error generating resume:", error);
      throw new Error("Failed to generate resume");
    }
  },
});

interface ChatResponse {
  response: string;
  isComplete: boolean;
  scheduledTasks: any[]; // You might want to define a more specific type for tasks
  goalId: string | null;
}

// Helper function to parse available days from availability string
function parseAvailableDays(availability: string): number[] {
    const availLower = availability.toLowerCase();
    const availableDays: number[] = [];
    
    // First, try to find the user's actual availability statement
    // Look for patterns like "user: I'm available on..." or "available on tuesday"
    const userStatements = availLower.split(/user:|assistant:|arc:/i);
    const userAvailability = userStatements.length > 1 
        ? userStatements.filter((_, i) => i % 2 === 1).join(' ') // Get user parts
        : availLower;
    
    console.log(`Parsing availability from: "${userAvailability.substring(0, 100)}..."`);
    
    // Check for specific day mentions first (most specific)
    const hasTuesday = userAvailability.includes('tuesday');
    const hasThursday = userAvailability.includes('thursday');
    const hasMonday = userAvailability.includes('monday');
    const hasWednesday = userAvailability.includes('wednesday');
    const hasFriday = userAvailability.includes('friday');
    const hasSaturday = userAvailability.includes('saturday');
    const hasSunday = userAvailability.includes('sunday');
    const hasWeekend = userAvailability.includes('weekend');
    const hasWeekday = userAvailability.includes('weekday');
    
    // Check for "weekends only" or "only weekends" pattern FIRST
    // This should take priority over individual day mentions
    const weekendsOnlyPattern = 
        (userAvailability.includes('only') && hasWeekend) ||
        (userAvailability.includes('weekend') && userAvailability.includes('not') && userAvailability.includes('weekday')) ||
        (userAvailability.includes('weekend') && !hasMonday && !hasTuesday && !hasWednesday && !hasThursday && !hasFriday);
    
    // Check if user explicitly says they're NOT available on weekdays
    const notAvailableWeekdays = 
        userAvailability.includes("not available") && 
        (userAvailability.includes("weekday") || 
         (userAvailability.includes("monday") || userAvailability.includes("tuesday") || 
          userAvailability.includes("wednesday") || userAvailability.includes("thursday") || 
          userAvailability.includes("friday")));
    
    // If weekends only pattern detected, return only weekend days
    if (weekendsOnlyPattern || (hasWeekend && notAvailableWeekdays)) {
        console.log('Detected "weekends only" pattern');
        return [0, 6]; // Sunday and Saturday only
    }
    
    // If specific days are mentioned, use those
    if (hasTuesday) availableDays.push(2);
    if (hasThursday) availableDays.push(4);
    if (hasMonday) availableDays.push(1);
    if (hasWednesday) availableDays.push(3);
    if (hasFriday) availableDays.push(5);
    if (hasSaturday) availableDays.push(6);
    if (hasSunday) availableDays.push(0);
    
    // If weekend is mentioned and no specific weekend days, add both
    if (hasWeekend && !hasSaturday && !hasSunday) {
        availableDays.push(0, 6);
    }
    
    // If weekdays mentioned generically, add all weekdays (don't check if array is empty)
    if (hasWeekday) {
        if (!userAvailability.includes('not')) {
            // Add weekdays if not already present
            [1, 2, 3, 4, 5].forEach(day => {
                if (!availableDays.includes(day)) {
                    availableDays.push(day);
                }
            });
        }
    }
    
    // Default to all days if nothing parsed
    if (availableDays.length === 0) {
        console.log('No specific days found, defaulting to all days');
        return [0, 1, 2, 3, 4, 5, 6];
    }
    
    const uniqueDays = [...new Set(availableDays)].sort((a, b) => a - b);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    console.log(`Parsed available days: ${uniqueDays.map(d => dayNames[d]).join(', ')}`);
    
    return uniqueDays;
}

// Helper function to validate and filter tasks to ensure max 2 per day, milestone deadline compliance, and availability
async function validateAndFilterTasks(ctx: any, tasks: any[], goalId: string, overrideAvailableDays?: number[], skipMilestoneBoundaryValidation?: boolean) {
    const validatedTasks = [];
    const tasksByDate = new Map<string, number>();
    
    console.log(`=== validateAndFilterTasks: Processing ${tasks.length} tasks for goal ${goalId} ===`);
    if (skipMilestoneBoundaryValidation) {
        console.log(`Milestone boundary validation SKIPPED (milestones are being shifted)`);
    }
    
    // Get existing scheduled tasks for this goal
    const existingTasks = await ctx.runQuery(internal.tasks.getInternalTasksForGoal, { goalId });
    const existingScheduled = existingTasks.filter((task: Doc<"tasks">) => task.scheduledDate && task.scheduledTime);
    
    console.log(`Found ${existingTasks.length} total tasks, ${existingScheduled.length} already scheduled`);
    
    // Get the goal to find the user
    const goal = await ctx.runQuery(internal.goals.getInternalGoal, { goalId });
    
    // Use override available days if provided, otherwise get from user profile
    let availableDays: number[] = overrideAvailableDays || [0, 1, 2, 3, 4, 5, 6]; // Default to all days
    if (!overrideAvailableDays && goal) {
        const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: goal.userId });
        if (userProfile?.availability) {
            availableDays = parseAvailableDays(userProfile.availability);
        }
    }
    console.log(`Available days for validation: ${availableDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`);
    
    // Get milestones for this goal to validate deadline boundaries (only if not skipping)
    let milestoneDeadlines = new Map<string, { deadline: string | null, startDate: string | null }>();
    if (!skipMilestoneBoundaryValidation) {
        const milestones: Doc<"milestones">[] = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId });
        const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
        
        // Create a map of milestone ID to deadline and previous milestone deadline
        for (let i = 0; i < sortedMilestones.length; i++) {
            const milestone = sortedMilestones[i];
            const prevMilestone = i > 0 ? sortedMilestones[i - 1] : null;
            milestoneDeadlines.set(milestone._id, {
                deadline: milestone.deadline || null,
                startDate: prevMilestone?.deadline || null // Tasks should start after previous milestone deadline
            });
        }
    }
    
    // Count existing tasks by date (only count tasks that are NOT being rescheduled)
    // We don't count existing scheduled tasks since they will be updated
    // tasksByDate starts empty - we only track NEW scheduling conflicts
    
    // Validate new tasks
    for (const task of tasks) {
        if (!task.scheduledDate) {
            console.log(`Task "${task.title}" has no scheduledDate, skipping`);
            continue;
        }
        
        // Find the existing task to get its milestoneId
        const existingTask = existingTasks.find((t: Doc<"tasks">) => t.title === task.title);
        
        if (!existingTask) {
            console.log(`Task "${task.title}" not found in database, skipping`);
            continue;
        }
        
        // Validate that the scheduled date is on an available day
        const [year, month, day] = task.scheduledDate.split('-').map(Number);
        const scheduledDateObj = new Date(year, month - 1, day);
        const dayOfWeek = scheduledDateObj.getDay();
        
        if (!availableDays.includes(dayOfWeek)) {
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
            console.warn(`Task "${task.title}" scheduled for ${task.scheduledDate} (${dayName}) but user is NOT available on ${dayName}. Skipping.`);
            continue; // Skip this task - user is not available on this day
        }
        
        // Validate milestone deadline boundaries (skip if milestones are being shifted)
        if (!skipMilestoneBoundaryValidation && existingTask?.milestoneId) {
            const milestoneBounds = milestoneDeadlines.get(existingTask.milestoneId);
            if (milestoneBounds) {
                const scheduledDate = new Date(task.scheduledDate);
                
                // Check if scheduled date is before milestone deadline
                if (milestoneBounds.deadline) {
                    const deadlineDate = new Date(milestoneBounds.deadline);
                    if (scheduledDate > deadlineDate) {
                        console.warn(`Task "${task.title}" scheduled for ${task.scheduledDate} is AFTER milestone deadline ${milestoneBounds.deadline}. Skipping.`);
                        continue; // Skip this task - it violates milestone deadline
                    }
                }
                
                // Check if scheduled date is after previous milestone deadline (for milestones 2+)
                if (milestoneBounds.startDate) {
                    const startDate = new Date(milestoneBounds.startDate);
                    if (scheduledDate <= startDate) {
                        console.warn(`Task "${task.title}" scheduled for ${task.scheduledDate} is BEFORE/ON previous milestone deadline ${milestoneBounds.startDate}. Skipping.`);
                        continue; // Skip this task - it should be scheduled after previous milestone
                    }
                }
            }
        }
        
        // Check max 2 tasks per day
        const currentCount = tasksByDate.get(task.scheduledDate) || 0;
        if (currentCount < 2) {
            validatedTasks.push(task);
            tasksByDate.set(task.scheduledDate, currentCount + 1);
            console.log(`Task "${task.title}" validated for ${task.scheduledDate} (${currentCount + 1}/2 tasks on this day)`);
        } else {
            console.warn(`Task "${task.title}" skipped - already 2 tasks on ${task.scheduledDate}`);
        }
    }
    
    console.log(`=== validateAndFilterTasks: ${validatedTasks.length} of ${tasks.length} tasks validated ===`);
    
    return validatedTasks;
}

interface SMARTValidationResult {
  isValid: boolean;
  feedback: string;
  suggestions?: {
    specific?: string;
    measurable?: string;
    achievable?: string;
    relevant?: string;
    timeBound?: string;
  };
  refinedGoal?: {
    title: string;
    description: string;
    category: string;
    priority: string;
    targetDate?: string;
  };
}

interface SMARTChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface SMARTChatResponse {
  response: string;
  smartSummary?: {
    specific?: string;
    measurable?: string;
    achievable?: string;
    relevant?: string;
    timeBound?: string;
    category?: string;
    priority?: string;
    deadline?: string;
  };
  isComplete: boolean;
  quickReplies?: string[];
  tokenCount?: number;
  turnId?: string;
  requestId?: string;
  duration?: number;
  errorKind?: string;
}

// Helper to inject test delays and errors
async function injectTestChaos(turnId: string): Promise<void> {
  if (!TEST_SLOW_LLM) return;
  
  // Random delay 5-15s
  const delay = 5000 + Math.random() * 10000;
  console.log(`[Test Mode] Turn ${turnId}: Injecting ${Math.round(delay)}ms delay`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Random 429 (20% chance)
  if (Math.random() < 0.2) {
    console.log(`[Test Mode] Turn ${turnId}: Injecting 429 rate limit error`);
    throw new Error("429: Rate limit exceeded (test mode)");
  }
}

// Health check endpoint
export const aiHealthCheck = action({
  args: {},
  handler: async (ctx): Promise<{ healthy: boolean; hasKey: boolean; message: string }> => {
    const apiKey = process.env.COHERE_API_KEY;
    const hasKey = !!apiKey && apiKey.length > 0;
    
    return {
      healthy: hasKey,
      hasKey,
      message: hasKey 
        ? "AI service is ready" 
        : "COHERE_API_KEY is missing or empty"
    };
  },
});

// Token estimation (rough)
function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

// Summarize old messages when token budget exceeded
async function summarizeHistory(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 3000
): Promise<Array<{ role: string; content: string }>> {
  const totalTokens = messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
  
  if (totalTokens <= maxTokens) {
    return messages;
  }
  
  console.log(`[Context Control] Token count ${totalTokens} exceeds ${maxTokens}, summarizing...`);
  
  // Keep last 3 messages, summarize the rest
  if (messages.length <= 3) {
    return messages;
  }
  
  const recentMessages = messages.slice(-3);
  const oldMessages = messages.slice(0, -3);
  
  const summary = {
    role: "user",
    content: `[Previous conversation summary: User and assistant discussed initial goal details through ${oldMessages.length} exchanges. Key points covered.]`
  };
  
  return [summary, ...recentMessages];
}

export const smartGoalChat = action({
  args: {
    messages: v.array(v.object({
      role: v.string(),
      content: v.string(),
    })),
    initialGoal: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      category: v.string(),
      priority: v.string(),
      targetDate: v.optional(v.string()),
    }),
    currentSlot: v.optional(v.string()), // "SPECIFIC", "MEASURABLE", "ACHIEVABLE", "RELEVANT", "TIME_BOUND"
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SMARTChatResponse> => {
    const startTime = Date.now();
    const requestId = args.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const turnId = `turn_${args.messages.length + 1}`;
    
    console.log(`[SMART ${requestId}] Turn ${turnId} | State: STARTED | Messages: ${args.messages.length}`);
    
    // Track API usage
    await ctx.runMutation(api.apiUsage.trackApiCall, {
      endpoint: "smartGoalChat",
    });
    
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      console.error(`[SMART ${requestId}] Turn ${turnId} | State: FAILED | Error: MISSING_API_KEY`);
      throw new Error("COHERE_API_KEY environment variable is not set");
    }

    // Rate limiting check using database-backed limiter (persists across action calls)
    const rateLimitResult = await ctx.runMutation(api.rateLimitDb.checkAndIncrement, { 
      identifier: "groq-api" 
    });
    if (!rateLimitResult.allowed) {
      console.error(`[SMART ${requestId}] Turn ${turnId} | State: FAILED | Error: RATE_LIMIT | Wait: ${rateLimitResult.waitSeconds}s`);
      return {
        response: `I'm taking a quick breather to avoid overwhelming the AI service. Please try again in ${rateLimitResult.waitSeconds} seconds.`,
        smartSummary: {
          specific: undefined,
          measurable: undefined,
          achievable: undefined,
          relevant: undefined,
          timeBound: undefined,
          category: args.initialGoal.category,
          priority: args.initialGoal.priority,
          deadline: undefined
        },
        isComplete: false,
        quickReplies: [`Wait ${rateLimitResult.waitSeconds}s and retry`],
        turnId,
        duration: Date.now() - startTime,
        errorKind: "RATE_LIMIT"
      };
    }
    
    console.log(`[SMART ${requestId}] Rate limit OK`);
    
    // Validate category is allowed (frontend should enforce, but double-check)
    const { ALLOWED_CATEGORIES } = await import("./categoryPolicy");
    if (!ALLOWED_CATEGORIES.includes(args.initialGoal.category as any)) {
      return {
        response: "I noticed this request might need medical advice. DayBridge can help with reminders and coordination, but it cannot diagnose, treat, or change medication instructions. Could you frame it as a daily routine or support task?",
        smartSummary: {
          specific: undefined,
          measurable: undefined,
          achievable: undefined,
          relevant: undefined,
          timeBound: undefined,
          category: args.initialGoal.category,
          priority: args.initialGoal.priority,
          deadline: undefined
        },
        isComplete: false,
        quickReplies: ["Make it a reminder", "Make it a support task"],
        turnId,
        duration: Date.now() - startTime,
        errorKind: "INVALID_CATEGORY"
      };
    }

    // Inject test chaos if enabled
    await injectTestChaos(turnId);

    const currentDate = new Date().toISOString().split('T')[0];
    
    // Context control: keep more history for proper conversation flow (increased from 1500 to 5000 tokens)
    const processedMessages = await summarizeHistory(args.messages, 5000);
    
    // Build full conversation context for better AI memory
    const conversationContext = processedMessages.length > 0 
      ? processedMessages.map(msg => `${msg.role === "user" ? "User" : "DayBridge"}: ${msg.content}`).join("\n")
      : "This is the start of our conversation.";
    
    // Extract information already gathered from conversation
    const extractedInfo = {
      specific: null as string | null,
      measurable: null as string | null,
      achievable: null as string | null,
      relevant: null as string | null,
      timeBound: null as string | null,
      deadline: null as string | null
    };
    
    // Check previous AI responses for smartSummary data
    const assistantMessages = processedMessages.filter(msg => msg.role === "assistant");
    if (assistantMessages.length > 0) {
      // Get the most recent smartSummary from the last assistant message
      // Note: The actual smartSummary is stored separately, not in message content
      // We need to track it from the args or reconstruct it
      // For now, we'll analyze the conversation to extract what's been discussed
    }
    
    // Analyze conversation to extract what we already know
    const userMessages = processedMessages.filter(msg => msg.role === "user");
    const fullUserText = userMessages.map(msg => msg.content).join(" ").toLowerCase();
    
    // Check if user has confirmed or agreed (indicates they're happy with current criterion)
    const hasAgreement = fullUserText.includes("yes") || fullUserText.includes("yeah") || 
                        fullUserText.includes("that's good") || fullUserText.includes("sounds good") ||
                        fullUserText.includes("ok") || fullUserText.includes("okay") || fullUserText.includes("good");
    
    // Count agreements and substantive responses
    const agreementCount = (fullUserText.match(/\b(yes|yeah|ok|okay|good|sounds good|all good|finish|done)\b/g) || []).length;
    
    // Check if user is trying to finish ("finish this goal", "all good now", "we're done")
    const wantsToFinish = fullUserText.includes("finish") || fullUserText.includes("all good") || 
                         fullUserText.includes("we're done") || fullUserText.includes("that's all");
    
    // Extract what's been discussed by checking message count and content richness
    const messageCount = userMessages.length;
    const hasSubstantiveContent = fullUserText.length > 50; // More than just "yes" or "ok"
    
    // Progressive criteria marking based on conversation depth
    // After 2+ user messages with substantive content, mark specific as addressed
    if (messageCount >= 2 && hasSubstantiveContent) {
      extractedInfo.specific = args.initialGoal.title;
    }
    
    // After 4+ messages or 2+ agreements, mark measurable as addressed
    if (messageCount >= 4 || agreementCount >= 2) {
      extractedInfo.measurable = "User provided measurement approach";
    }
    
    // After 6+ messages or 3+ agreements, mark achievable as addressed
    if (messageCount >= 6 || agreementCount >= 3) {
      extractedInfo.achievable = "User confirmed achievability";
    }
    
    // After 7+ messages or 4+ agreements, mark relevant as addressed
    if (messageCount >= 7 || agreementCount >= 4) {
      extractedInfo.relevant = "User confirmed relevance";
    }
    
    // If user wants to finish or has agreed 5+ times, mark everything complete
    if (wantsToFinish || agreementCount >= 5) {
      extractedInfo.specific = extractedInfo.specific || args.initialGoal.title;
      extractedInfo.measurable = extractedInfo.measurable || "Confirmed";
      extractedInfo.achievable = extractedInfo.achievable || "Confirmed";
      extractedInfo.relevant = extractedInfo.relevant || "Confirmed";
      extractedInfo.timeBound = extractedInfo.timeBound || "Confirmed";
    }
    
    // If user already provided a target date, mark it as extracted FIRST
    if (args.initialGoal.targetDate) {
      extractedInfo.timeBound = `Deadline: ${args.initialGoal.targetDate}`;
      extractedInfo.deadline = args.initialGoal.targetDate;
    }
    
    // Count how many SMART criteria have been addressed
    const addressedCriteria = Object.values(extractedInfo).filter(v => v !== null).length;
    const turnCount = processedMessages.filter(m => m.role === "user").length;
    
    // Determine which SMART criteria to focus on next
    const smartCriteria = [
      { name: "Specific", key: "specific", addressed: extractedInfo.specific !== null },
      { name: "Measurable", key: "measurable", addressed: extractedInfo.measurable !== null },
      { name: "Achievable", key: "achievable", addressed: extractedInfo.achievable !== null },
      { name: "Relevant", key: "relevant", addressed: extractedInfo.relevant !== null },
      { name: "Time-bound", key: "timeBound", addressed: extractedInfo.timeBound !== null }
    ];
    
    // Find next unaddressed criterion or default to first unaddressed
    const nextCriterion = smartCriteria.find(c => !c.addressed) || smartCriteria[0];
    
    // Log progress for debugging
    console.log(`[SMART ${requestId}] Progress check: Specific=${extractedInfo.specific ? 'YES' : 'NO'}, Measurable=${extractedInfo.measurable ? 'YES' : 'NO'}, Achievable=${extractedInfo.achievable ? 'YES' : 'NO'}, Relevant=${extractedInfo.relevant ? 'YES' : 'NO'}, Time-bound=${extractedInfo.timeBound ? 'YES' : 'NO'} | Addressed: ${addressedCriteria}/5 | Turn: ${turnCount} | Agreements: ${agreementCount}`);
    
    // Complete if: all criteria addressed OR user wants to finish OR 6+ messages OR 4+ agreements
    // Also complete if stuck on same criterion for 3+ turns
    const isComplete = addressedCriteria >= 5 || wantsToFinish || turnCount >= 6 || agreementCount >= 4;
    
    const contextualPrompt = `You are DayBridge, a friendly, concise coach helping an older adult or caregiver refine a daily support plan.

**CURRENT DATE:** ${currentDate} (Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})

CRITICAL CONTEXT: The user wants support for "${args.initialGoal.title}" in the ${args.initialGoal.category} category with ${args.initialGoal.priority} priority.

**ALLOWED CATEGORIES (use ONLY these):**
- academic: Medication reminders, appointments, visit prep, paperwork
- career: Errands, rides, shopping, pickup/dropoff coordination
- creative: Connection, hobbies, calls, community events
- entrepreneurial: Care circle coordination and shared support
- personal-growth: Meals, movement reminders, home routines, independence

**IMPORTANT: Do not provide diagnosis, treatment, medication dosage, or medical advice. Keep the plan to reminders, preparation, and communication.**

${args.initialGoal.targetDate ? `
**IMPORTANT - USER'S TARGET DATE:** The user has ALREADY set their target/deadline date to: ${args.initialGoal.targetDate} (${new Date(args.initialGoal.targetDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
DO NOT ask about or suggest a different deadline - USE THIS DATE. The Time-bound criterion is ALREADY SATISFIED.
` : '**No target date set yet** - you may need to ask about their deadline.'}

SMART CRITERIA ANALYSIS:
Based on our conversation, here's what we've learned:
- Specific (what exactly): ${extractedInfo.specific || "Not yet addressed"}
- Measurable (how to track): ${extractedInfo.measurable || "Not yet addressed"}  
- Achievable (resources/time): ${extractedInfo.achievable || "Not yet addressed"}
- Relevant (why important): ${extractedInfo.relevant || "Not yet addressed"}
- Time-bound (deadline): ${args.initialGoal.targetDate ? `ALREADY SET: ${args.initialGoal.targetDate}` : (extractedInfo.timeBound || "Not yet addressed")}

CURRENT FOCUS: ${isComplete ? "Wrapping up and finalizing the care plan" : `Getting more details about: ${nextCriterion.name}`}

CRITICAL BEHAVIOR RULES:
1. **NEVER ask the user to fix or change anything** - YOU handle all refinements automatically. If their title is too long, YOU create a shorter version. If something is unclear, YOU make reasonable assumptions and confirm.
2. **Be proactive, not reactive** - Don't say "Could you make it shorter?" Instead, say "Great! I'll call this 'Score 1560+ on SAT' - let's talk about how you'll get there."
3. **Perfect Memory**: Reference specific things the user has said. NEVER ask the same question twice.
4. **Build on Previous Answers**: If they already told you something, don't ask again.
5. **Move Forward Intelligently**: Accept reasonable answers and move to the next topic.
6. **Keep it conversational**: Be warm and encouraging, not robotic.
7. **BE CONCISE**: Keep responses to 2-3 sentences MAX. Don't over-explain.

TITLE HANDLING - YOU CREATE THE TITLE:
The "specific" field MUST be 25 characters or less. YOU automatically create a concise title from their input:
- "I need to prepare for my Thursday doctor appointment" → "Prep for appointment" (20 chars)
- "Help Dad remember morning pills and breakfast" → "Morning routine" (15 chars)
- "Coordinate a ride to the clinic and back" → "Clinic ride plan" (16 chars)

SPECIAL HANDLING:
- For medication: only create reminders to follow existing instructions; never change dosage or timing unless the user states it as an existing instruction.
- For appointments: include prep, ride, documents, questions, and follow-up notes.
- For "I don't know": Provide 2-3 specific suggestions based on the daily support need.

RESPONSE FORMAT:
{
  "response": "Your conversational response - acknowledge their LATEST answer, build on what they said, then ask about the next care-plan criterion",
  "smartSummary": {
    "specific": "YOUR concise title (max 25 chars) - create this from their input, don't leave null",
    "measurable": "Extract how they'll measure progress or null", 
    "achievable": "Extract their resources/time/plan or null",
    "relevant": "Extract why this matters to them or null",
    "timeBound": "Extract their timeline/deadline or null",
    "category": "${args.initialGoal.category}",
    "priority": "${args.initialGoal.priority}",
    "deadline": "${args.initialGoal.targetDate || 'null - only if user provided a new date in conversation'}"
  },
  "isComplete": ${isComplete},
  "quickReplies": []
}

**CRITICAL: The "category" field MUST be "${args.initialGoal.category}" - DO NOT change it!**

**CRITICAL REMINDER ABOUT DATES:**
- Today's date is: ${currentDate}
${args.initialGoal.targetDate ? `- The user ALREADY set their target date to: ${args.initialGoal.targetDate} - USE THIS in the deadline field, do NOT make up a different date!` : '- No target date was set, ask about their deadline if needed.'}

YOU MUST RESPOND WITH VALID JSON ONLY. NO MARKDOWN, NO EXTRA TEXT. JUST THE JSON OBJECT.
`;

    const contents = [
      {
        role: "user",
        parts: [{ text: contextualPrompt }]
      }
    ];

    try {
      console.log(`[SMART ${requestId}] Turn ${turnId} [${nextCriterion.name} ${turnCount + 1}] | State: SENDING | Model: gemma2-9b-it`);
      if (processedMessages.length > 0) {
        const userAnswers = processedMessages.filter(msg => msg.role === "user").map(msg => msg.content).join(" ");
        console.log(`[SMART ${requestId}] User answers: ${userAnswers.substring(0, 80)}...`);
      }
      
      // Fetch with timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for Cohere API (increased from 30s)
      
      // Build proper conversation history for Cohere v2 API
      const cohereMessages = [];
      
      if (processedMessages.length === 0) {
        // First turn: send full contextual prompt
        cohereMessages.push({ role: 'user', content: contextualPrompt });
      } else {
        // Subsequent turns: send conversation history + append condensed instructions to LAST user message
        const condensedInstructions = `

[SYSTEM REMINDER: You are DayBridge, a friendly coach helping refine "${args.initialGoal.title}" into a care plan.

Current focus: ${nextCriterion.name}
Progress: Specific=${extractedInfo.specific ? '✓' : 'pending'}, Measurable=${extractedInfo.measurable ? '✓' : 'pending'}, Achievable=${extractedInfo.achievable ? '✓' : 'pending'}, Relevant=${extractedInfo.relevant ? '✓' : 'pending'}, Time-bound=${extractedInfo.timeBound ? '✓ ALREADY SET' : 'pending'}
${args.initialGoal.targetDate ? `\n**IMPORTANT: Time-bound is ALREADY SATISFIED - deadline is ${args.initialGoal.targetDate}. DO NOT ask about deadlines!**` : ''}

CRITICAL BEHAVIOR:
1. ${addressedCriteria >= 4 ? 'WRAP UP - All criteria nearly complete. Summarize and set isComplete to true.' : `ASK QUESTIONS about ${nextCriterion.name} - Don't just summarize.`}
2. Build on what they JUST said above - acknowledge their answer${addressedCriteria < 4 ? `, then ask about ${nextCriterion.name}` : ''}.
3. ${addressedCriteria >= 4 ? 'Set isComplete to TRUE to finish.' : `ONE question at a time - focus on ${nextCriterion.name}.`}
4. Be conversational and warm - "Great. ${addressedCriteria >= 4 ? "Let's finalize this care plan..." : `Now let's talk about ${nextCriterion.name}...`}"
5. Create a concise title (max 25 chars) from their input.
6. KEEP RESPONSES SHORT - 2-3 sentences MAX. Don't over-explain.

YOU MUST RETURN VALID JSON IN THIS EXACT FORMAT (no markdown, no extra text):
{"response": "${addressedCriteria >= 4 ? 'Summarize the care plan and confirm completion' : `Acknowledge + ask about ${nextCriterion.name}`}", "smartSummary": {"specific": "max 25 chars", "measurable": "...", "achievable": "...", "relevant": "...", "timeBound": "${args.initialGoal.targetDate || '...'}", "category": "${args.initialGoal.category}", "priority": "${args.initialGoal.priority}", "deadline": "${args.initialGoal.targetDate || 'null'}"}, "isComplete": ${isComplete}, "quickReplies": []}

CRITICAL: The "category" field MUST be exactly "${args.initialGoal.category}" - DO NOT change it to anything else!
RESPOND ONLY WITH THE JSON OBJECT ABOVE. DO NOT ADD ANY OTHER TEXT.]`;
        
        for (let i = 0; i < processedMessages.length; i++) {
          const msg = processedMessages[i];
          let content = msg.content;
          
          // Append instructions to the LAST user message
          if (i === processedMessages.length - 1 && msg.role === 'user') {
            content = msg.content + condensedInstructions;
          }
          
          cohereMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: content
          });
        }
      }
      
      const requestBody: any = {
        model: 'command-r-08-2024',
        messages: cohereMessages,
        temperature: 0.5,
        max_tokens: 1024, // Reduced to encourage shorter, more focused responses
      };
      
      const response = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const httpStatus = response.status;
      console.log(`[SMART ${requestId}] Turn ${turnId} | State: RECEIVED | HTTP: ${httpStatus}`);

      if (!response.ok) {
        let errorKind = 'HTTP_ERROR';
        let errorMsg = `HTTP ${httpStatus}`;
        
        // Try to get the actual error message from the response
        try {
          const errorBody = await response.text();
          console.error(`[SMART ${requestId}] API Error Body: ${errorBody}`);
          errorMsg = `HTTP ${httpStatus}: ${errorBody.substring(0, 200)}`;
        } catch (e) {
          // Ignore if we can't read the body
        }
        
        if (httpStatus === 429) {
          errorKind = 'RATE_LIMIT';
          errorMsg = 'Rate limit exceeded';
          // Record the 429 to enforce backoff
          await ctx.runMutation(api.rateLimitDb.recordBackoff, { identifier: "cohere-api" });
        } else if (httpStatus === 401 || httpStatus === 403) {
          errorKind = 'AUTH_ERROR';
          errorMsg = 'Invalid API credentials';
        } else if (httpStatus >= 500) {
          errorKind = 'SERVER_ERROR';
          errorMsg = `Cohere server error ${httpStatus}`;
        }
        
        console.error(`[SMART ${requestId}] Turn ${turnId} | State: FAILED | Error: ${errorKind} | HTTP: ${httpStatus}`);
        throw new Error(`${errorKind}: ${errorMsg}`);
      }

      const data = await response.json();
      const generatedText = data.message?.content?.[0]?.text;
      
      if (!generatedText || generatedText.trim().length === 0) {
        console.error(`[SMART ${requestId}] Turn ${turnId} | State: FAILED | Error: EMPTY_RESPONSE | Data: ${JSON.stringify(data).substring(0, 200)}`);
        
        // Check for safety filters or other blocking
        const finishReason = data.finish_reason;
        if (finishReason === 'SAFETY' || finishReason === 'ERROR') {
          throw new Error(`CONTENT_BLOCKED: Response blocked due to ${finishReason} filters`);
        }
        
        // Return a fallback response to allow continuation
        return {
          response: `Could you rephrase that? I didn't quite catch your answer.`,
          smartSummary: {
            specific: extractedInfo.specific ? args.initialGoal.title : undefined,
            measurable: extractedInfo.measurable || undefined,
            achievable: extractedInfo.achievable || undefined,
            relevant: extractedInfo.relevant || undefined,
            timeBound: extractedInfo.timeBound || undefined,
            category: args.initialGoal.category,
            priority: args.initialGoal.priority,
            deadline: extractedInfo.deadline || undefined
          },
          isComplete: false,
          quickReplies: ["Try again", "Skip this"],
          requestId,
          turnId,
          duration: Date.now() - startTime,
          errorKind: 'EMPTY_RESPONSE'
        };
      }

      console.log(`[SMART ${requestId}] Turn ${turnId} | State: PARSING | Length: ${generatedText.length}`);

      // Parse JSON with better error handling
      let result: SMARTChatResponse;
      try {
        // Try multiple cleaning strategies
        let cleaned = generatedText.trim();
        
        // Remove markdown code blocks
        cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Find JSON object if wrapped in text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleaned = jsonMatch[0];
        }
        
        result = JSON.parse(cleaned);
        console.log(`[SMART ${requestId}] Turn ${turnId} | State: PARSED | Complete: ${result.isComplete}`);
        
        // Auto-truncate title if too long (AI should follow instructions, but just in case)
        if (result.smartSummary?.specific && result.smartSummary.specific.length > 25) {
          console.warn(`[SMART ${requestId}] AI generated title too long (${result.smartSummary.specific.length} chars), truncating: "${result.smartSummary.specific}"`);
          result.smartSummary.specific = result.smartSummary.specific.substring(0, 22) + "...";
        }
        
      } catch (parseError: any) {
        console.warn(`[SMART ${requestId}] Turn ${turnId} | State: PARSE_FAILED | Error: ${parseError.message} | Raw: ${generatedText.substring(0, 100)}`);
        
        // Enhanced fallback - extract what we can from the text
        const extractJSON = (text: string): Partial<SMARTChatResponse> => {
          const extracted: any = {
            response: text.substring(0, 200).trim(),
            smartSummary: {
              specific: extractedInfo.specific ? args.initialGoal.title : undefined,
              measurable: extractedInfo.measurable || undefined,
              achievable: extractedInfo.achievable || undefined,
              relevant: extractedInfo.relevant || undefined,
              timeBound: extractedInfo.timeBound || undefined,
              category: args.initialGoal.category,
              priority: args.initialGoal.priority,
              deadline: extractedInfo.deadline || undefined
            },
            isComplete: false,
            quickReplies: []
          };
          
          // Try to extract quoted response if present
          const quoteMatch = text.match(/"response"\s*:\s*"([^"]+)"/);
          if (quoteMatch) extracted.response = quoteMatch[1];
          
          return extracted;
        };
        
        result = extractJSON(generatedText) as SMARTChatResponse;
      }
      
      // Defensive validation and smart summary preservation
      result.response = result.response || "Could you provide more details about your goal?";
      result.smartSummary = result.smartSummary || {};
      result.isComplete = result.isComplete || false;
      result.quickReplies = result.quickReplies || [];
      
      // Always preserve initial values
      result.smartSummary.category = result.smartSummary.category || args.initialGoal.category;
      result.smartSummary.priority = result.smartSummary.priority || args.initialGoal.priority;
      
      // Preserve extracted information from conversation analysis
      if (!result.smartSummary.specific && extractedInfo.specific) {
        result.smartSummary.specific = args.initialGoal.title; // Use refined title if available
      }
      if (!result.smartSummary.measurable && extractedInfo.measurable) {
        result.smartSummary.measurable = extractedInfo.measurable;
      }
      if (!result.smartSummary.achievable && extractedInfo.achievable) {
        result.smartSummary.achievable = extractedInfo.achievable;
      }
      if (!result.smartSummary.relevant && extractedInfo.relevant) {
        result.smartSummary.relevant = extractedInfo.relevant;
      }
      if (!result.smartSummary.timeBound && extractedInfo.timeBound) {
        result.smartSummary.timeBound = extractedInfo.timeBound;
      }
      
      const duration = Date.now() - startTime;
      console.log(`[SMART ${requestId}] Turn ${turnId} | State: SUCCESS | Duration: ${duration}ms`);
      
      const successResponse = {
        ...result,
        requestId,
        turnId,
        duration,
        tokenCount: estimateTokenCount(generatedText)
      };
      
      // Note: Cannot save chat history for smartGoalChat as it doesn't have userId
      // Chat history is saved for smartGoalChatV2 and chat endpoints instead
      
      return successResponse;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || String(error);
      const errorName = error.name || '';
      
      // Classify error for better diagnostics
      let errorKind = 'UNKNOWN_ERROR';
      let userMessage = "I encountered an error. ";
      
      // Check for abort/timeout first
      if (errorName === 'AbortError' || errorMsg.includes('abort')) {
        errorKind = 'TIMEOUT';
        userMessage += "Request timed out. Let's try again.";
      } else if (errorMsg.includes('RATE_LIMIT') || errorMsg.includes('429')) {
        errorKind = 'RATE_LIMIT';
        userMessage += "Rate limit reached. Please wait a moment.";
      } else if (errorMsg.includes('AUTH_ERROR') || errorMsg.includes('401') || errorMsg.includes('403')) {
        errorKind = 'AUTH_ERROR';
        userMessage += "API key issue detected.";
      } else if (errorMsg.includes('SERVER_ERROR') || errorMsg.includes('5')) {
        errorKind = 'SERVER_ERROR';
        userMessage += "Server temporarily unavailable.";
      } else if (errorMsg.includes('EMPTY_RESPONSE') || errorMsg.includes('CONTENT_BLOCKED')) {
        errorKind = 'EMPTY_RESPONSE';
        userMessage += "Could you rephrase that?";
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        errorKind = 'NETWORK_ERROR';
        userMessage += "Network connection problem.";
      } else {
        userMessage += "Could you try that again?";
      }
      
      console.error(`[SMART ${requestId}] Turn ${turnId} | State: FAILED | Error: ${errorKind} | Duration: ${duration}ms | Name: ${errorName} | Message: ${errorMsg.substring(0, 100)}`);
      
      const errorResponse = {
        response: userMessage,
        smartSummary: {
          specific: extractedInfo.specific ? args.initialGoal.title : undefined,
          measurable: extractedInfo.measurable || undefined,
          achievable: extractedInfo.achievable || undefined,
          relevant: extractedInfo.relevant || undefined,
          timeBound: extractedInfo.timeBound || undefined,
          category: args.initialGoal.category,
          priority: args.initialGoal.priority,
          deadline: extractedInfo.deadline || undefined
        },
        isComplete: false,
        quickReplies: ["Try again", "Continue anyway"],
        requestId,
        turnId,
        duration,
        errorKind
      };
      
      // Note: Cannot save chat history for smartGoalChat as it doesn't have userId
      
      return errorResponse;
    }
  },
});

export const validateSMARTGoal = action({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    targetDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SMARTValidationResult> => {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error("COHERE_API_KEY environment variable is not set");
    }

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `You are an AI assistant helping older adults and care circles create clear daily support plans. Analyze the following plan and determine if it is specific, measurable, achievable, relevant, and time-bound.

Plan Information:
- Title: ${args.title}
- Description: ${args.description}
- Category: ${args.category}
- Priority: ${args.priority}
- Target Date: ${args.targetDate || "Not specified"}
- Current Date: ${currentDate}

SMART Criteria:
- Specific: Is the plan clear and well-defined?
- Measurable: Can progress be tracked with concrete metrics?
- Achievable: Is this realistic for an older adult or caregiver?
- Relevant: Does it align with the category and make sense for daily support?
- Time-bound: Is there a clear deadline? (Must be after ${currentDate})

Instructions:
1. Analyze the plan against each criterion
2. Provide constructive feedback
3. If the plan needs refinement, suggest improvements
4. Do not provide diagnosis, treatment, medication dosage, or medical advice
5. Normalize the category to one of: Academic, Career, Creative, Entrepreneurial, Personal Growth

Return your response as a JSON object with this structure:
{
  "isValid": boolean,
  "feedback": "A concise summary of your assessment (2-3 sentences)",
  "suggestions": {
    "specific": "suggestion if needed" or null,
    "measurable": "suggestion if needed" or null,
    "achievable": "suggestion if needed" or null,
    "relevant": "suggestion if needed" or null,
    "timeBound": "suggestion if needed" or null
  },
  "refinedGoal": {
    "title": "improved title if needed",
    "description": "improved description if needed",
    "category": "normalized category",
    "priority": "low/medium/high",
    "targetDate": "YYYY-MM-DD or null"
  }
}

Return ONLY the JSON object, no other text.`;

    try {
      const generatedText = await callCohere(prompt);

      // Parse the JSON response
      const cleanedResponse = generatedText.replace(/```json\n|```/g, '').trim();
      const result: SMARTValidationResult = JSON.parse(cleanedResponse);
      
      return result;
    } catch (error) {
      console.error("Error validating SMART goal:", error);
      // Return a basic validation result on error
      return {
        isValid: true, // Allow creation to proceed
        feedback: "Unable to validate with AI at this time. Your goal looks good to proceed!",
        refinedGoal: {
          title: args.title,
          description: args.description,
          category: args.category,
          priority: args.priority,
          targetDate: args.targetDate,
        }
      };
    }
  },
});

export const chat = action({
  args: {
    messages: v.array(v.object({
      role: v.string(),
      content: v.string(),
    })),
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args): Promise<ChatResponse> => {
    // Track API usage
    await ctx.runMutation(api.apiUsage.trackApiCall, {
      endpoint: "chat",
      userId: args.userId,
    });
    
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error("COHERE_API_KEY environment variable is not set");
    }

    // Get user profile to check saved availability
    const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: args.userId });
    let userAvailability = userProfile?.availability || "Not specified";
    
    // CRITICAL: Extract availability from the CURRENT conversation messages
    // The user tells us their availability in the chat, so we need to parse it from there
    const userMessages = args.messages.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length > 0) {
      // Combine all user messages to extract availability
      const conversationText = userMessages.join(' ').toLowerCase();
      console.log(`[ai:chat] Extracting availability from conversation: "${conversationText.substring(0, 200)}..."`);
      
      // Check if user mentioned specific availability in the conversation
      if (conversationText.includes('weekend') || 
          conversationText.includes('saturday') || 
          conversationText.includes('sunday') ||
          conversationText.includes('weekday') ||
          conversationText.includes('monday') ||
          conversationText.includes('tuesday') ||
          conversationText.includes('wednesday') ||
          conversationText.includes('thursday') ||
          conversationText.includes('friday') ||
          conversationText.includes('available') ||
          conversationText.includes('only on') ||
          conversationText.includes('after') ||
          conversationText.includes('before') ||
          conversationText.includes('morning') ||
          conversationText.includes('afternoon') ||
          conversationText.includes('evening')) {
        // Use the conversation text as the availability source
        userAvailability = conversationText;
        console.log(`[ai:chat] Using conversation-based availability: "${userAvailability.substring(0, 100)}..."`);
      }
    }
    
    console.log(`[ai:chat] Final user availability: "${userAvailability.substring(0, 100)}..."`);
    
    // Parse available days for explicit communication to AI
    const availableDays = parseAvailableDays(userAvailability);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDayNames = availableDays.map(d => dayNames[d]).join(', ');
    console.log(`[ai:chat] Parsed available days: ${availableDayNames}`);

    // If goalId is provided, work with that specific goal; otherwise work with all active goals
    let goalsToWorkWith: Doc<"goals">[];
    if (args.goalId) {
        const specificGoal = await ctx.runQuery(internal.goals.getInternalGoal, { goalId: args.goalId });
        goalsToWorkWith = specificGoal ? [specificGoal] : [];
    } else {
        goalsToWorkWith = await ctx.runQuery(internal.goals.getActiveGoals, { userId: args.userId });
    }

    const goalsWithTasks = await Promise.all(
        goalsToWorkWith.map(async (goal) => {
            const tasks: Doc<"tasks">[] = await ctx.runQuery(internal.tasks.getInternalTasksForGoal, { goalId: goal._id });
            const milestones: Doc<"milestones">[] = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId: goal._id });
            return { 
                ...goal, 
                tasks: tasks.map((t: Doc<"tasks">) => ({ 
                    title: t.title, 
                    description: t.description,
                    milestoneId: t.milestoneId
                })),
                milestones: milestones.map((m: Doc<"milestones">) => ({
                    title: m.title,
                    deadline: m.deadline,
                    order: m.order
                }))
            };
        })
    );

    const contents = args.messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

    // Get existing scheduled tasks to avoid conflicts
    const existingScheduledTasks = await Promise.all(
        goalsToWorkWith.map(async (goal) => {
            const tasks: Doc<"tasks">[] = await ctx.runQuery(internal.tasks.getInternalTasksForGoal, { goalId: goal._id });
            return tasks.filter(task => task.scheduledDate && task.scheduledTime);
        })
    );
    const allExistingScheduled = existingScheduledTasks.flat();
    
    // Calculate overdue tasks (scheduled before today and not completed)
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = allExistingScheduled.filter(task => {
        return task.scheduledDate && task.scheduledDate < today && !task.completed;
    });
    
    console.log(`[ai:chat] Found ${overdueTasks.length} overdue tasks out of ${allExistingScheduled.length} scheduled tasks`);
    if (overdueTasks.length > 0) {
        console.log(`[ai:chat] Overdue tasks:`, overdueTasks.map(t => `${t.title} (${t.scheduledDate})`));
    }

    // Add a system message to the beginning of the conversation
    const isRescheduling = args.goalId && goalsToWorkWith.length > 0 && goalsToWorkWith[0].availabilityChatCompleted === true;
    
    // Build milestone info with task associations for clearer scheduling
    const milestoneTaskMap = goalsWithTasks.map(goal => {
      const milestoneInfo = goal.milestones.map((m: any, idx: number) => {
        const milestoneTasks = goal.tasks.filter((t: any) => t.milestoneId === m._id || (!t.milestoneId && idx === 0));
        return {
          title: m.title,
          deadline: m.deadline,
          order: m.order,
          taskCount: milestoneTasks.length,
          tasks: milestoneTasks.map((t: any) => t.title)
        };
      });
      return { 
        goalTitle: goal.title, 
        targetDate: goal.targetDate, // Include goal target date
        milestones: milestoneInfo 
      };
    });
    
    // Build goal context string with target dates
    const goalContextString = goalsWithTasks.map(g => {
      const targetDateStr = g.targetDate ? ` (target: ${g.targetDate})` : '';
      return `${g.title}${targetDateStr}`;
    }).join(', ') || 'None';
    
    // Build overdue tasks context
    const overdueTasksString = overdueTasks.length > 0 
      ? overdueTasks.map(t => `${t.title} (was due ${t.scheduledDate})`).join(', ')
      : 'None';
    
    contents.unshift({
        role: "user",
        parts: [{ text: `You are DayBridge, a friendly AI assistant helping older adults and care circles coordinate daily support plans.

**YOUR PERSONALITY:**
- Warm, encouraging, and supportive like a helpful friend
- Speak naturally and conversationally
- Be concise - no long paragraphs

**WHEN TO USE JSON:**
Only respond with JSON when the user explicitly asks to schedule/reschedule tasks. For casual conversation, questions, or general chat, just respond normally as text.

**JSON FORMAT (only for scheduling):**
\`\`\`json
{
  "response": "Your message",
  "isComplete": true,
  "scheduledTasks": [{"title": "...", "scheduledDate": "YYYY-MM-DD", "scheduledTime": "HH:MM", "durationMinutes": N}]
}
\`\`\`

**SCHEDULING RULES (when applicable):**
- Only schedule on: ${availableDayNames}
- Max 2 tasks/day
- Longer preparation tasks = 45-60 min, quick reminders = 10-20 min, caregiver calls = 15-30 min
- IMPORTANT: Consider the care plan's target date when scheduling. Work backwards from the target date to ensure tasks are completed on time.
- Never provide diagnosis, treatment, medication dosage, or medical advice. Only coordinate reminders and existing instructions.

**CONTEXT:**
- User availability: ${userAvailability}
- Today: ${new Date().toISOString().split('T')[0]}
- Active care plans: ${goalContextString}
- Scheduled tasks: ${allExistingScheduled.length > 0 ? allExistingScheduled.map(t => `${t.title} on ${t.scheduledDate}`).join(', ') : 'None'}
- OVERDUE tasks (need attention!): ${overdueTasksString}
` }]
    });

    contents.unshift({
        role: "model",
        parts: [{ text: `Hey! How can I help you today?` }],
    });

    // Debug: Log what we're sending to the AI
    console.log("=== AI CHAT DEBUG ===");
    console.log("Current Date:", new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    console.log("Goals with Tasks:", JSON.stringify(goalsWithTasks, null, 2));
    console.log("Existing Scheduled Tasks:", allExistingScheduled.map(task => `- ${task.title} on ${task.scheduledDate} at ${task.scheduledTime}`));
    console.log("Overdue Tasks:", overdueTasks.map(task => `- ${task.title} (was due ${task.scheduledDate})`));
    console.log("Is Rescheduling:", isRescheduling);
    console.log("===================");

    // Filter out any empty messages and ensure valid structure
    const validContents = contents.filter(c => c.parts && c.parts.length > 0 && c.parts[0].text && c.parts[0].text.trim().length > 0);
    
    // Convert Gemini-style contents to Cohere messages format
    const cohereMessages = validContents.map(c => ({
      role: c.role === 'model' ? 'assistant' : 'user',
      content: c.parts[0].text
    }));
    
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'command-a-03-2025',
        messages: cohereMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[ai:chat] Cohere API error ${response.status}:`, errorBody);
      throw new Error(`Cohere API error: ${response.status} - ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const generatedText = data.message?.content?.[0]?.text;

    if (!generatedText) {
      throw new Error("No response from Cohere API");
    }
    
    // Debug: Log what the AI responded with
    console.log("=== AI RESPONSE DEBUG ===");
    console.log("AI Response Text:", generatedText);
    console.log("========================");

    try {
        let parsedResponse;
        // Regex to find a JSON object within ```json ... ```
        const jsonMatch = generatedText.match(/```json\s*({[\s\S]*?})\s*```/);

        if (jsonMatch && jsonMatch[1]) {
            try {
                parsedResponse = JSON.parse(jsonMatch[1]);
            } catch (e) {
                // ignore parsing error, will be handled below
            }
        }
        
        // If no markdown-wrapped JSON found, try to parse raw JSON directly
        if (!parsedResponse) {
            // Try to find a JSON object that starts with { and contains "response" and "isComplete"
            const rawJsonMatch = generatedText.match(/\{[\s\S]*"response"[\s\S]*"isComplete"[\s\S]*\}/);
            if (rawJsonMatch) {
                try {
                    parsedResponse = JSON.parse(rawJsonMatch[0]);
                    console.log("Parsed raw JSON response (no markdown wrapper)");
                } catch (e) {
                    // ignore parsing error
                }
            }
        }

        // If we have a valid parsed response object
        if (parsedResponse && typeof parsedResponse === 'object' && parsedResponse !== null && 'response' in parsedResponse && 'isComplete' in parsedResponse) {
            if (!('scheduledTasks' in parsedResponse) || !Array.isArray(parsedResponse.scheduledTasks)) {
                parsedResponse.scheduledTasks = [];
            }

            let goalId = null;
            
            // Check if AI is updating milestones (shifting them)
            const hasUpdatedMilestones = parsedResponse.updatedMilestones && Array.isArray(parsedResponse.updatedMilestones) && parsedResponse.updatedMilestones.length > 0;
            
            // Process milestone updates even if there are no scheduled tasks
            if (hasUpdatedMilestones && goalsToWorkWith.length > 0) {
                goalId = goalsToWorkWith[0]._id;
                
                console.log("=== MILESTONE SHIFTING ===");
                console.log("Updated milestones from AI:", parsedResponse.updatedMilestones);
                console.log("Available days for milestones:", availableDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', '));
                
                // Get existing milestones for this goal
                const existingMilestones: Doc<"milestones">[] = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId: goalId });
                
                for (const update of parsedResponse.updatedMilestones) {
                    // Find the milestone by title
                    const milestone = existingMilestones.find((m: Doc<"milestones">) => m.title === update.title);
                    if (milestone && update.newDeadline) {
                        // Validate and adjust milestone deadline to fall on an available day
                        let adjustedDeadline = update.newDeadline;
                        const [year, month, day] = update.newDeadline.split('-').map(Number);
                        const deadlineDate = new Date(year, month - 1, day);
                        const dayOfWeek = deadlineDate.getDay();
                        
                        if (!availableDays.includes(dayOfWeek)) {
                            // Find the nearest available day (prefer forward, then backward)
                            let foundDate = null;
                            for (let offset = 1; offset <= 7; offset++) {
                                // Try forward first
                                const forwardDate = new Date(deadlineDate);
                                forwardDate.setDate(forwardDate.getDate() + offset);
                                if (availableDays.includes(forwardDate.getDay())) {
                                    foundDate = forwardDate;
                                    break;
                                }
                                // Then try backward
                                const backwardDate = new Date(deadlineDate);
                                backwardDate.setDate(backwardDate.getDate() - offset);
                                if (availableDays.includes(backwardDate.getDay())) {
                                    foundDate = backwardDate;
                                    break;
                                }
                            }
                            if (foundDate) {
                                adjustedDeadline = foundDate.toISOString().split('T')[0];
                                const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek];
                                const newDayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][foundDate.getDay()];
                                console.log(`Milestone "${update.title}" deadline ${update.newDeadline} (${dayName}) adjusted to ${adjustedDeadline} (${newDayName}) to match availability`);
                            }
                        }
                        
                        console.log(`Updating milestone "${update.title}" deadline from ${milestone.deadline} to ${adjustedDeadline}`);
                        await ctx.runMutation(internal.milestones.internalUpdateMilestone, {
                            milestoneId: milestone._id,
                            deadline: adjustedDeadline,
                        });
                    } else {
                        console.warn(`Could not find milestone with title: ${update.title}`);
                    }
                }
                console.log("=========================");
            }
            
            // Process scheduled tasks if any
            if (parsedResponse.isComplete && parsedResponse.scheduledTasks.length > 0) {
                if (!goalId) {
                    goalId = goalsToWorkWith[0]._id;
                }
                
                // Validate and filter tasks - skip milestone boundary validation if milestones were shifted
                const validatedTasks = await validateAndFilterTasks(
                    ctx, 
                    parsedResponse.scheduledTasks, 
                    goalId, 
                    availableDays,
                    hasUpdatedMilestones // Skip milestone boundary validation if milestones were shifted
                );
                
                // Get ALL tasks for this goal (both scheduled and unscheduled)
                const allTasks = await ctx.runQuery(internal.tasks.getInternalTasksForGoal, { goalId: goalId });
                
                // Schedule existing tasks (both scheduled and unscheduled)
                console.log("=== TASK SCHEDULING DEBUG ===");
                console.log("Validated Tasks to Schedule:", validatedTasks);
                console.log("Available All Tasks:", allTasks.map(t => `${t.title} (scheduled: ${t.scheduledDate ? 'yes' : 'no'})`));
                console.log("=============================");
                
                for (const task of validatedTasks) {
                    // Find the corresponding existing task by title (regardless of scheduling status)
                    const existingTask = allTasks.find((t: any) => t.title === task.title);
                    if (existingTask) {
                        // Estimate duration based on task title if AI didn't provide one
                        let duration = task.durationMinutes;
                        if (!duration) {
                            const titleLower = task.title.toLowerCase();
                            if (titleLower.includes('full') && (titleLower.includes('practice test') || titleLower.includes('sat') || titleLower.includes('act') || titleLower.includes('exam'))) {
                                duration = 210; // 3.5 hours for full practice tests
                            } else if (titleLower.includes('practice test') || titleLower.includes('mock') || titleLower.includes('section')) {
                                duration = 60; // 1 hour for sections
                            } else if (titleLower.includes('essay') || titleLower.includes('write')) {
                                duration = 90; // 1.5 hours for writing
                            } else if (titleLower.includes('review') || titleLower.includes('analyze') || titleLower.includes('study')) {
                                duration = 45; // 45 min for review/study
                            } else if (titleLower.includes('vocabulary') || titleLower.includes('flashcard')) {
                                duration = 25; // 25 min for vocab
                            } else {
                                duration = 45; // Default 45 min
                            }
                            console.log(`AI didn't provide duration for "${task.title}", estimated: ${duration} min`);
                        }
                        
                        console.log(`Scheduling task "${task.title}" for ${task.scheduledDate} at ${task.scheduledTime} (${duration} min)`);
                        // Update existing task with new schedule and duration using internal mutation
                        await ctx.runMutation(internal.tasks.internalUpdateTask, {
                            taskId: existingTask._id,
                            scheduledDate: task.scheduledDate,
                            scheduledTime: task.scheduledTime,
                            durationMinutes: duration,
                        });
                    } else {
                        console.warn(`Could not find existing task with title: ${task.title}`);
                    }
                }
                
                // Update the response to reflect only the validated tasks
                parsedResponse.scheduledTasks = validatedTasks;
            }
            // Return the conversational part of the response, and the structured data
            const chatResponse = { response: parsedResponse.response, isComplete: parsedResponse.isComplete, scheduledTasks: parsedResponse.scheduledTasks, goalId };
            
            // Save chat history
            try {
              const lastUserMessage = args.messages.length > 0 ? args.messages[args.messages.length - 1].content : "No message";
              await ctx.runMutation(api.aiChatHistory.saveChatHistory, {
                userId: args.userId,
                endpoint: "chat",
                userMessage: lastUserMessage,
                aiResponse: parsedResponse.response,
                metadata: { isComplete: parsedResponse.isComplete, scheduledTasksCount: parsedResponse.scheduledTasks.length, goalId }
              });
            } catch (historyError) {
              console.error("Failed to save chat history:", historyError);
            }
            
            return chatResponse;
        } else {
            // If no valid JSON object is found, return the whole text as a conversational response.
            const textResponse = { response: generatedText, isComplete: false, scheduledTasks: [], goalId: null };
            
            // Save chat history
            try {
              const lastUserMessage = args.messages.length > 0 ? args.messages[args.messages.length - 1].content : "No message";
              await ctx.runMutation(api.aiChatHistory.saveChatHistory, {
                userId: args.userId,
                endpoint: "chat",
                userMessage: lastUserMessage,
                aiResponse: generatedText,
                metadata: { isComplete: false, goalId: null }
              });
            } catch (historyError) {
              console.error("Failed to save chat history:", historyError);
            }
            
            return textResponse;
        }
    } catch (error) {
        console.error("Error processing AI response:", error);
        // If any other error occurs, return the original text
        const errorResponse = { response: generatedText, isComplete: false, scheduledTasks: [], goalId: null };
        
        // Save chat history (error case)
        try {
          const lastUserMessage = args.messages.length > 0 ? args.messages[args.messages.length - 1].content : "No message";
          await ctx.runMutation(api.aiChatHistory.saveChatHistory, {
            userId: args.userId,
            endpoint: "chat",
            userMessage: lastUserMessage,
            aiResponse: generatedText,
            metadata: { error: String(error), goalId: null }
          });
        } catch (historyError) {
          console.error("Failed to save chat history:", historyError);
        }
        
        return errorResponse;
    }
  },
});

// ============================================================================
// SMART GOAL VALIDATOR WITH AI CHAT
// ============================================================================

import { validateGoal, type GoalDraft, type ValidationResult } from "./goalValidator";

interface SmartGoalChatArgs {
  requestId: string;
  turnId: string;
  userMessage: string;
  goalDraft: GoalDraft;
}

interface SmartGoalChatResponse {
  response: string;
  goalDraft: GoalDraft;
  validation: ValidationResult;
  isComplete: boolean;
  requestId: string;
  turnId: string;
  duration: number;
}

/**
 * SMART Goal Chat with Deterministic Validation
 * 
 * This uses a rule-based validation engine to determine what to ask next,
 * but uses AI (Cohere) to generate natural, conversational responses.
 */
export const smartGoalChatV2 = action({
  args: {
    requestId: v.string(),
    turnId: v.string(),
    userMessage: v.string(),
    goalDraft: v.object({
      goalText: v.optional(v.string()),
      outcomes: v.optional(v.string()),
      motivation: v.optional(v.string()),
      finishBy: v.optional(v.string()),
      importance: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
      category: v.optional(v.string()),
      successDefinition: v.optional(v.string()),
      progressMetric: v.optional(v.string()),
      blockers: v.optional(v.string()),
      conversationHistory: v.optional(v.array(v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }))),
    }),
  },
  handler: async (ctx, args): Promise<SmartGoalChatResponse> => {
    const startTime = Date.now();
    const { requestId, turnId, userMessage, goalDraft } = args;
    
    console.log(`[SMART V2 ${requestId}] Turn ${turnId} | State: STARTED`);
    
    // Rate limiting check
    const rateLimitResult = await ctx.runMutation(api.rateLimitDb.checkAndIncrement, {
      identifier: `smart-goal-${requestId}`,
    });
    
    if (!rateLimitResult.allowed) {
      throw new Error("RATE_LIMIT: Too many requests. Please wait a moment.");
    }
    
    console.log(`[SMART V2 ${requestId}] Rate limit OK`);
    
    // Update conversation history
    const conversationHistory = goalDraft.conversationHistory || [];
    conversationHistory.push({ role: "user", content: userMessage });
    
    // Run validation to get current state
    const validation = validateGoal(goalDraft);
    
    console.log(`[SMART V2 ${requestId}] Validation: ${validation.readiness} | Issues: ${validation.issues.length} | Next: ${validation.nextQuestion ? 'YES' : 'NO'}`);
    
    // Build AI prompt based on validation state
    const systemPrompt = buildSystemPrompt(validation, goalDraft);
    
    // Build conversation messages for AI
    const messages: Array<{role: string, content: string}> = [];
    
    // Add system prompt as first message
    messages.push({ role: "system", content: systemPrompt });
    
    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    
    console.log(`[SMART V2 ${requestId}] Calling AI with ${messages.length} messages`);
    
    // Call AI
    const aiResponse = await callCohereChat(messages);
    
    console.log(`[SMART V2 ${requestId}] AI response received: ${aiResponse.substring(0, 100)}...`);
    
    // Add AI response to history
    conversationHistory.push({ role: "assistant", content: aiResponse });
    
    // Update goal draft based on user's answer
    const updatedDraft = updateGoalDraft(goalDraft, userMessage, validation, conversationHistory);
    
    // Re-validate after update
    const finalValidation = validateGoal(updatedDraft);
    
    // Check if complete
    const isComplete = finalValidation.readiness === "ready_for_planning" && !finalValidation.nextQuestion;
    
    const duration = Date.now() - startTime;
    console.log(`[SMART V2 ${requestId}] Turn ${turnId} | State: SUCCESS | Duration: ${duration}ms | Complete: ${isComplete}`);
    
    const v2Response = {
      response: aiResponse,
      goalDraft: updatedDraft,
      validation: finalValidation,
      isComplete,
      requestId,
      turnId,
      duration,
    };
    
    // Note: Cannot save chat history for smartGoalChatV2 as it doesn't have userId in auth context
    // This endpoint is called from frontend without authentication
    
    return v2Response;
  },
});

/**
 * Build system prompt for AI based on validation state
 */
function buildSystemPrompt(validation: ValidationResult, draft: GoalDraft): string {
  const currentDate = new Date().toISOString().split('T')[0];
  
  let prompt = `You are DayBridge, a friendly and concise daily-support planning coach. Today is ${currentDate}.

CRITICAL INSTRUCTIONS:
1. You are helping the user create a clear care plan through a natural conversation.
2. Ask ONE question at a time - the question you should ask is provided below.
3. Be warm, encouraging, and conversational - not robotic.
4. Acknowledge what the user just said before asking the next question.
5. Keep responses SHORT (2-3 sentences max).
6. DO NOT ask about things the user has already provided.
7. Do not provide diagnosis, treatment, medication dosage, or medical advice. Focus on reminders, preparation, and communication.

CURRENT STATE:
- Readiness: ${validation.readiness}
- Has care-plan text: ${validation.summary.hasGoalText ? 'YES' : 'NO'}
- Has deadline: ${validation.summary.hasFinishBy ? 'YES' : 'NO'}
- Has success criteria: ${validation.summary.hasSuccessDefinition ? 'YES' : 'NO'}
- Has progress metric: ${validation.summary.hasProgressMetric ? 'YES' : 'NO'}

`;

  // Add validation issues if any
  if (validation.issues.length > 0) {
    prompt += `\nVALIDATION ISSUES:\n`;
    for (const issue of validation.issues) {
      prompt += `- ${issue.letter}: ${issue.message}\n`;
    }
  }
  
  // Add rewrite suggestions if any
  if (validation.rewriteSuggestions.length > 0) {
    prompt += `\nSUGGESTED REWRITES (offer these as options):\n`;
    for (const suggestion of validation.rewriteSuggestions) {
      prompt += `- "${suggestion}"\n`;
    }
  }
  
  // Add the next question to ask
  if (validation.nextQuestion) {
    prompt += `\nNEXT QUESTION TO ASK:\n"${validation.nextQuestion}"\n`;
    prompt += `\nYour response should:\n`;
    prompt += `1. Briefly acknowledge what they just said (1 sentence)\n`;
    prompt += `2. Ask the next question naturally\n`;
    prompt += `3. If there are rewrite suggestions, offer them as options\n`;
  } else {
    prompt += `\nALL QUESTIONS ANSWERED! \n`;
    prompt += `Summarize the care plan and ask: "Want to edit anything before we start planning it out?"\n`;
  }
  
  prompt += `\nEXAMPLES OF GOOD RESPONSES:\n`;
  prompt += `- "Good, that appointment prep sounds important. What would count as a smooth day for this plan?"\n`;
  prompt += `- "Nice, so the ride is the biggest moving part. What's something we can track to know it is handled?"\n`;
  prompt += `- "I love it! Here's what we've got: [summary]. Want to edit anything before we start planning it out?"\n`;
  
  return prompt;
}

/**
 * Update goal draft based on user's answer and validation state
 */
function updateGoalDraft(
  draft: GoalDraft,
  userMessage: string,
  validation: ValidationResult,
  conversationHistory: Array<{role: "user" | "assistant", content: string}>
): GoalDraft {
  const updated: GoalDraft = { ...draft, conversationHistory };
  const lower = userMessage.toLowerCase().trim();
  
  // Extract goal text if missing
  if (!validation.summary.hasGoalText && userMessage.length > 5) {
    updated.goalText = userMessage;
  }
  
  // Extract importance
  if (!validation.summary.hasImportance) {
    if (lower.includes("high") || lower.includes("very important") || lower.includes("extremely")) {
      updated.importance = "high";
    } else if (lower.includes("low") || lower.includes("not really") || lower.includes("not very")) {
      updated.importance = "low";
    } else if (lower.includes("medium") || lower.includes("somewhat") || lower.includes("moderately")) {
      updated.importance = "medium";
    }
  }
  
  // Extract category
  if (!validation.summary.hasCategory) {
    const categories = ["academic", "career", "creative", "fitness", "personal", "social"];
    for (const cat of categories) {
      if (lower.includes(cat)) {
        updated.category = cat;
        break;
      }
    }
    // Default to personal if mentioned but not specific
    if (!updated.category && userMessage.length > 3) {
      updated.category = "personal";
    }
  }
  
  // Extract date (look for date patterns)
  if (!validation.summary.hasFinishBy) {
    // Look for ISO dates or common date formats
    const dateMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      updated.finishBy = dateMatch[0];
    }
    // Look for relative dates like "in 3 months", "by june", etc.
    // For now, we'll rely on the frontend date picker
  }
  
  // Extract success definition
  if (!validation.summary.hasSuccessDefinition && validation.nextQuestion?.includes("success")) {
    updated.successDefinition = userMessage;
  }
  
  // Extract progress metric
  if (!validation.summary.hasProgressMetric && validation.nextQuestion?.includes("track") || validation.nextQuestion?.includes("progress")) {
    updated.progressMetric = userMessage;
  }
  
  // Extract motivation
  if (!validation.summary.hasMotivation && (validation.nextQuestion?.includes("why") || validation.nextQuestion?.includes("care"))) {
    updated.motivation = userMessage;
  }
  
  // Extract blockers
  if (!updated.blockers && (validation.nextQuestion?.includes("hard") || validation.nextQuestion?.includes("obstacles"))) {
    updated.blockers = userMessage;
  }
  
  return updated;
}
