"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
// TODO: Potentially refactor to use a shared AI service
async function callCohere(prompt: string): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY environment variable is not set");
  }

  const response = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'command-a-03-2025',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    })
  });

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
}

export const generateMilestonesForGoal = action({
  args: {
    goalId: v.id("goals"),
    goalTitle: v.string(),
    goalDescription: v.string(),
    category: v.string(),
    targetDate: v.optional(v.string()),
    userId: v.optional(v.string()), // Add userId to get availability
  },
  handler: async (ctx, args): Promise<any[] | null> => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    
    // Get user availability if userId provided
    let userAvailability = '';
    let availableDays: number[] = [0, 1, 2, 3, 4, 5, 6]; // Default to all days
    
    if (args.userId) {
      const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: args.userId });
      if (userProfile?.availability) {
        userAvailability = userProfile.availability;
        const availLower = userAvailability.toLowerCase();
        
        // Parse availability to get available days
        availableDays = [];
        const weekendsOnly = availLower.includes('weekend') && 
                           (availLower.includes('only') || 
                            availLower.includes('not available weekday') ||
                            availLower.includes("not available on weekday"));
        
        if (availLower.includes('weekend') || availLower.includes('weekends')) {
          availableDays.push(0, 6); // Sunday, Saturday
        }
        if (availLower.includes('saturday') && !availableDays.includes(6)) availableDays.push(6);
        if (availLower.includes('sunday') && !availableDays.includes(0)) availableDays.push(0);
        
        if (!weekendsOnly) {
          if (availLower.includes('weekday') || availLower.includes('weekdays')) {
            if (!availLower.includes('not')) {
              availableDays.push(1, 2, 3, 4, 5);
            }
          }
          if (availLower.includes('monday')) availableDays.push(1);
          if (availLower.includes('tuesday')) availableDays.push(2);
          if (availLower.includes('wednesday')) availableDays.push(3);
          if (availLower.includes('thursday')) availableDays.push(4);
          if (availLower.includes('friday')) availableDays.push(5);
        }
        
        if (availableDays.length === 0) {
          availableDays = [0, 1, 2, 3, 4, 5, 6];
        }
        availableDays = [...new Set(availableDays)];
        console.log(`User availability: "${userAvailability}" -> Days: ${availableDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`);
      }
    }
    
    // Helper to adjust a date to the nearest available day (going backward)
    const adjustToAvailableDay = (dateStr: string): string => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Try up to 7 days backward to find an available day
      for (let i = 0; i < 7; i++) {
        if (availableDays.includes(date.getDay())) {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        date.setDate(date.getDate() - 1);
      }
      // If no available day found, return original
      return dateStr;
    };
    
    // Parse and validate the target date if provided
    let goalDeadline = null;
    let goalDeadlineFormatted = "Not specified";
    
    if (args.targetDate) {
      try {
        // Handle MM/DD/YY format (like 11/3/25)
        if (args.targetDate.includes('/')) {
          const parts = args.targetDate.split('/');
          if (parts.length === 3) {
            let month = parts[0].padStart(2, '0');
            let day = parts[1].padStart(2, '0');
            let year = parts[2];
            
            // Convert 2-digit year to 4-digit year
            if (year.length === 2) {
              const currentYear = new Date().getFullYear();
              const currentCentury = Math.floor(currentYear / 100) * 100;
              year = String(currentCentury + parseInt(year));
              
              // If the year is in the past, assume next century
              if (parseInt(year) < currentYear) {
                year = String(currentCentury + 100 + parseInt(year));
              }
            }
            
            goalDeadline = new Date(`${year}-${month}-${day}`);
            goalDeadlineFormatted = goalDeadline.toISOString().split('T')[0];
          }
        } else {
          // Handle YYYY-MM-DD format
          goalDeadline = new Date(args.targetDate);
          goalDeadlineFormatted = args.targetDate;
        }
        
        // Validate that the goal deadline is in the future
        const today = new Date(currentDate);
        if (goalDeadline && goalDeadline <= today) {
          console.error(`Goal deadline ${goalDeadlineFormatted} is not in the future. Using default timeframe.`);
          goalDeadline = null;
          goalDeadlineFormatted = "Not specified";
        }
      } catch (error) {
        console.error(`Error parsing target date ${args.targetDate}:`, error);
        goalDeadline = null;
        goalDeadlineFormatted = "Not specified";
      }
    }
    
    // Calculate weeks available for milestone planning
    let weeksAvailable = 8; // Default
    if (goalDeadline) {
      const today = new Date(currentDate);
      const diffTime = goalDeadline.getTime() - today.getTime();
      weeksAvailable = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    }
    
    // Determine optimal number of milestones based on available time
    // Each milestone needs at least 2 weeks, so max milestones = weeksAvailable / 2
    let recommendedMilestones = Math.min(5, Math.max(2, Math.floor(weeksAvailable / 2)));
    if (weeksAvailable < 4) recommendedMilestones = 2;
    else if (weeksAvailable < 8) recommendedMilestones = 3;
    else if (weeksAvailable < 12) recommendedMilestones = 4;
    else recommendedMilestones = 5;
    
    console.log(`Goal has ${weeksAvailable} weeks available, recommending ${recommendedMilestones} milestones`);
    
    const prompt = `
You are an AI assistant specializing in daily support planning for older adults living independently and their care circles.
Your task is to break down a larger care plan into key checkpoints.

**CRITICAL DATE CONSTRAINTS - FOLLOW THESE EXACTLY:**
- TODAY'S DATE IS: ${currentDate}
- GOAL DEADLINE IS: ${goalDeadlineFormatted}
- WEEKS AVAILABLE: ${weeksAvailable} weeks
- ALL milestone deadlines MUST be AFTER ${currentDate}
- ALL milestone deadlines MUST be BEFORE ${goalDeadlineFormatted} (if specified)
- NO milestone can have a deadline on or after the goal deadline
- NO milestone can have a deadline before or on ${currentDate}
- Use ONLY YYYY-MM-DD format for all dates

Care plan: ${args.goalTitle}
Description: ${args.goalDescription}
Category: ${args.category}
Target Deadline: ${goalDeadlineFormatted}

**MILESTONE SPACING RULES - CRITICAL:**
1. **MINIMUM 2 WEEKS BETWEEN MILESTONES:** Each milestone deadline must be AT LEAST 14 days after the previous milestone's deadline (or today for the first milestone).
2. **NUMBER OF MILESTONES:** Based on ${weeksAvailable} weeks available, create exactly ${recommendedMilestones} milestones.
   - 4-6 weeks = 2 milestones
   - 6-10 weeks = 3 milestones  
   - 10-16 weeks = 4 milestones
   - 16+ weeks = 5 milestones
3. **EVEN SPACING:** Divide the available time evenly. With ${weeksAvailable} weeks and ${recommendedMilestones} milestones, each milestone period should be approximately ${Math.floor(weeksAvailable / recommendedMilestones)} weeks.
4. **FINAL MILESTONE:** Must be at least 3-5 days BEFORE the goal deadline.

**EXAMPLE CALCULATION:**
- Today: ${currentDate}
- Goal deadline: ${goalDeadlineFormatted}
- Weeks available: ${weeksAvailable}
- Milestones to create: ${recommendedMilestones}
- Approximate spacing: ${Math.floor(weeksAvailable / recommendedMilestones)} weeks per milestone

**WRONG (milestones too close):**
- Milestone 1: 2025-01-15
- Milestone 2: 2025-01-20 ❌ (only 5 days apart!)
- Milestone 3: 2025-01-25 ❌ (only 5 days apart!)

**CORRECT (milestones properly spaced):**
- Milestone 1: 2025-02-01
- Milestone 2: 2025-02-15 ✓ (14 days apart)
- Milestone 3: 2025-03-01 ✓ (14 days apart)

Instructions:
1. Generate exactly ${recommendedMilestones} distinct, sequential checkpoints that build upon each other
2. For each checkpoint, define a clear, concise title
3. **CRITICAL: Space milestones AT LEAST 2 weeks (14 days) apart**
4. For each checkpoint, identify 2-3 support skills the senior or caregiver will use
5. Return the output as a JSON array of objects with "title", "deadline", and "skills" properties
6. Do not provide diagnosis, treatment, medication dosage, or medical advice

**VALIDATION CHECKLIST:**
- ✓ All dates are in YYYY-MM-DD format
- ✓ All dates are AFTER ${currentDate}
- ✓ All dates are BEFORE ${goalDeadlineFormatted} (if specified)
- ✓ Milestones are in chronological order
- ✓ Each milestone is AT LEAST 14 days after the previous one
- ✓ Final milestone leaves 3-5 days buffer before goal deadline
- ✓ Exactly ${recommendedMilestones} milestones are created

Example Response:
[
  {
    "title": "Gather Appointment Details and Documents",
    "deadline": "2025-10-15",
    "skills": ["Preparation", "Organization", "Communication"]
  },
  {
    "title": "Confirm Ride and Care Circle Coverage",
    "deadline": "2025-10-29",
    "skills": ["Coordination", "Planning", "Follow-through"]
  },
  {
    "title": "Complete Visit and Share Follow-up Notes",
    "deadline": "2025-11-01",
    "skills": ["Self-advocacy", "Communication", "Record keeping"]
  }
]

Return ONLY the JSON array. Do not include any other text, formatting, or markdown.

**FINAL VALIDATION: Every milestone deadline MUST be between ${currentDate} and ${goalDeadlineFormatted}. If any date falls outside this range, the milestone will be rejected.**`;

    try {
      const rawResponse = await callCohere(prompt);
      // Clean the response by removing markdown backticks and "json" identifier
      const cleanedResponse = rawResponse.replace(/```json\n|```/g, '').trim();
      const milestones = JSON.parse(cleanedResponse);
      
      console.log(`Processing ${milestones.length} milestones for goal: ${args.goalTitle}`);
      console.log(`Current date: ${currentDate}`);
      console.log(`Goal deadline: ${goalDeadlineFormatted}`);
      
      let validMilestoneCount = 0;
      let lastMilestoneDeadline: Date | null = null;
      const MIN_DAYS_BETWEEN_MILESTONES = 14; // 2 weeks minimum
      
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        
        console.log(`Processing milestone ${i + 1}: "${milestone.title}" with deadline: ${milestone.deadline}`);
        
        // Validate milestone deadline
        if (milestone.deadline) {
          const [year, month, day] = milestone.deadline.split('-').map(Number);
          const milestoneDate = new Date(year, month - 1, day);
          const today = new Date(currentDate);
          today.setHours(0, 0, 0, 0);
          
          // Check if milestone is in the past
          if (milestoneDate <= today) {
            console.error(`REJECTED: Milestone "${milestone.title}" has a past/current deadline (${milestone.deadline}). Today is ${currentDate}. Skipping this milestone.`);
            continue;
          }
          
          // Check if milestone is after goal deadline (if goal deadline exists)
          if (goalDeadline) {
            const goalDeadlineDate = new Date(goalDeadlineFormatted);
            goalDeadlineDate.setHours(0, 0, 0, 0);
            
            if (milestoneDate >= goalDeadlineDate) {
              console.error(`REJECTED: Milestone "${milestone.title}" has deadline (${milestone.deadline}) on or after goal deadline (${goalDeadlineFormatted}). Skipping this milestone.`);
              continue;
            }
          }
          
          // Check minimum spacing from previous milestone (or from today for first milestone)
          const referenceDate = lastMilestoneDeadline || today;
          const daysDiff = Math.floor((milestoneDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff < MIN_DAYS_BETWEEN_MILESTONES) {
            // Adjust the deadline to be at least 2 weeks from reference
            const adjustedDate = new Date(referenceDate);
            adjustedDate.setDate(adjustedDate.getDate() + MIN_DAYS_BETWEEN_MILESTONES);
            
            // Make sure adjusted date is still before goal deadline
            if (goalDeadline && adjustedDate >= goalDeadline) {
              console.error(`REJECTED: Milestone "${milestone.title}" is only ${daysDiff} days from previous, and adjusting would exceed goal deadline. Skipping.`);
              continue;
            }
            
            const adjustedDateStr = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getDate()).padStart(2, '0')}`;
            console.log(`ADJUSTED: Milestone "${milestone.title}" was only ${daysDiff} days from previous. Moved from ${milestone.deadline} to ${adjustedDateStr} (minimum 14 days spacing)`);
            milestone.deadline = adjustedDateStr;
          }
          
          console.log(`ACCEPTED: Milestone "${milestone.title}" has valid deadline (${milestone.deadline})`);
          
          // Update last milestone deadline for next iteration
          const [adjYear, adjMonth, adjDay] = milestone.deadline.split('-').map(Number);
          lastMilestoneDeadline = new Date(adjYear, adjMonth - 1, adjDay);
        } else {
          console.log(`Milestone "${milestone.title}" has no deadline specified`);
        }
        
        // Adjust milestone deadline to fall on an available day
        let adjustedDeadline = milestone.deadline;
        if (milestone.deadline && args.userId) {
          const originalDeadline = milestone.deadline;
          adjustedDeadline = adjustToAvailableDay(milestone.deadline);
          if (adjustedDeadline !== originalDeadline) {
            console.log(`Adjusted milestone deadline from ${originalDeadline} to ${adjustedDeadline} (to match available day)`);
          }
        }
        
        await ctx.runMutation(api.milestones.createMilestone, {
          goalId: args.goalId,
          title: milestone.title,
          deadline: adjustedDeadline,
          skills: milestone.skills,
          order: validMilestoneCount, // Use validMilestoneCount for proper ordering
        });
        
        validMilestoneCount++;
      }

      console.log(`Successfully created ${validMilestoneCount} out of ${milestones.length} milestones`);
      
      // If no valid milestones were created, log an error but don't fail completely
      if (validMilestoneCount === 0) {
        console.error(`No valid milestones could be created for goal "${args.goalTitle}". All milestones had invalid deadlines.`);
      }

      return milestones;
    } catch (error: any) {
      console.error("Error generating milestones:", error.message);
      // Handle potential JSON parsing errors or API failures gracefully
      // For now, we'll just log the error and not create any milestones
      return null;
    }
  },
});

export const generateWeeklyTasksForMilestone = action({
    args: {
        goalId: v.id("goals"),
        milestoneId: v.id("milestones"),
        milestoneTitle: v.string(),
        milestoneDeadline: v.optional(v.string()),
        goalTitle: v.string(),
        previousMilestonesContext: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any[] | null> => {
        // Get user's skill profile for adaptive personalization
        const goal = await ctx.runQuery(api.goals.getGoal, { goalId: args.goalId });
        let skillContext = "";
        
        if (goal) {
            const skillProfile = await ctx.runQuery(internal.adaptiveEngine.getInternalUserSkillProfile, { 
                userId: goal.userId 
            });
            
            if (skillProfile && skillProfile.acquiredSkills.length > 0) {
                const advancedSkills = Object.entries(skillProfile.skillProficiency)
                    .filter(([_, count]) => (count as number) >= 3)
                    .map(([skill]) => skill);
                
                const beginnerSkills = Object.entries(skillProfile.skillProficiency)
                    .filter(([_, count]) => (count as number) === 1)
                    .map(([skill]) => skill);
                
                skillContext = `
**ADAPTIVE PERSONALIZATION - USER'S SKILL PROFILE:**
- Skills the user has ALREADY MASTERED (skip foundational tasks for these): ${advancedSkills.length > 0 ? advancedSkills.join(", ") : "None yet"}
- Skills the user is STILL LEARNING (include practice tasks): ${beginnerSkills.length > 0 ? beginnerSkills.join(", ") : "None yet"}
- All acquired skills: ${skillProfile.acquiredSkills.join(", ")}

**ADAPTATION RULES:**
1. If the milestone requires skills the user has already mastered, SKIP foundational/introductory tasks and go straight to application.
2. If the milestone requires skills the user lacks, ADD a foundational learning task before the main work.
3. Prioritize tasks that build on the user's existing strengths while addressing skill gaps.
`;
            }
        }

        const prompt = `
You are an AI assistant for an older adult and their care circle. Your task is to break down a checkpoint into a list of specific, actionable tasks for the upcoming week.

Care plan: ${args.goalTitle}
Checkpoint: ${args.milestoneTitle}
Checkpoint Deadline: ${args.milestoneDeadline || "Not specified"}
${args.previousMilestonesContext ? `\nHere are the tasks from previous milestones that have already been planned:\n${args.previousMilestonesContext}` : ""}
${skillContext}

Instructions:
1.  Create a list of 3-5 specific, actionable tasks that the senior or a caregiver can complete in one week to make progress on this checkpoint.
2.  The tasks should be small, clear, and focused on the "next action" principle.
3.  Ensure the tasks are appropriate for an older adult's daily routine and lower-friction support.
4.  **Crucially, do not repeat or create tasks that overlap with the tasks from previous milestones listed above.**
5.  For each task, identify 1-2 support skills the person or caregiver will use.
6.  **IMPORTANT: Adapt task difficulty based on the user's skill profile above. Skip basics for mastered skills, add learning tasks for new skills.**
7.  Do not provide diagnosis, treatment, medication dosage, or medical advice.
8.  Return the output as a JSON array of objects with "title" and "skills" properties.

Example Response:
[
  {"title": "Place insurance card and medication list in the appointment folder.", "skills": ["Preparation", "Organization"]},
  {"title": "Confirm pickup time with the ride service.", "skills": ["Communication", "Coordination"]},
  {"title": "Ask one care-circle member to check in after the visit.", "skills": ["Support planning", "Follow-through"]}
]

Return ONLY the JSON array. Do not include any other text, formatting, or markdown.`;

        try {
            const rawResponse = await callCohere(prompt);
            // Clean the response by removing markdown backticks and "json" identifier
            const cleanedResponse = rawResponse.replace(/```json\n|```/g, '').trim();
            const tasksData = JSON.parse(cleanedResponse);

            // Get the current highest order number for tasks in this goal
            const existingTasks = await ctx.runQuery(api.tasks.getTasksForGoal, { goalId: args.goalId });
            const maxOrder = existingTasks.reduce((max: number, task: Doc<"tasks">) => Math.max(max, task.order), -1);

            // Handle both old format (array of strings) and new format (array of objects)
            const tasks = tasksData.map((t: any) => typeof t === 'string' ? { title: t, skills: [] } : t);

            for (let i = 0; i < tasks.length; i++) {
                await ctx.runMutation(api.tasks.createTaskWithDetails, {
                    goalId: args.goalId,
                    milestoneId: args.milestoneId,
                    title: tasks[i].title,
                    order: maxOrder + 1 + i,
                    skills: tasks[i].skills || [],
                });
            }

            console.log(`Created ${tasks.length} tasks, now marking milestone ${args.milestoneId} as tasksGenerated`);
            await ctx.runMutation(api.milestones.markTasksAsGenerated, { milestoneId: args.milestoneId });
            console.log(`Milestone ${args.milestoneId} marked as tasksGenerated`);

            // Always try to auto-schedule tasks if user has availability set
            if (goal) {
                // Get user profile to check if availability is stored
                const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: goal.userId });
                if (userProfile && userProfile.availability) {
                    console.log(`Auto-scheduling ${tasks.length} tasks for goal "${goal.title}" - user has availability set`);
                    // Add a small delay to ensure tasks are committed to the database
                    await ctx.scheduler.runAfter(1000, internal.availabilityActions.scheduleTasksForGoal, {
                        userId: goal.userId,
                        goalId: args.goalId
                    });
                } else {
                    console.log(`Skipping auto-schedule for goal "${goal.title}" - user has no availability set`);
                }
            }

            return tasks;
        } catch (error: any) {
            console.error("Error generating weekly tasks:", error.message);
            throw new Error(`Failed to generate tasks: ${error.message}`);
        }
    },
});
