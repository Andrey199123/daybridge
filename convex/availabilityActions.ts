"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Helper function to call Cohere API
async function callCohereForScheduling(prompt: string): Promise<string> {
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

export const scheduleGoals = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: args.userId });

    if (!userProfile || !userProfile.availability) {
      return;
    }

    const activeGoals = await ctx.runQuery(internal.goals.getActiveGoals, { userId: userProfile.userId });

    if (activeGoals.length === 0) {
      return;
    }
  },
});

export const scheduleTasksForGoal = internalAction({
  args: { 
    userId: v.string(),
    goalId: v.id("goals"),
    isRescheduling: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    console.log(`=== scheduleTasksForGoal called for goal ${args.goalId} ===`);
    
    const userProfile = await ctx.runQuery(internal.users.getInternalUserProfile, { userId: args.userId });

    if (!userProfile || !userProfile.availability) {
      console.log("No user profile or availability found, skipping scheduling");
      return;
    }

    // Get the specific goal
    const goal: Doc<"goals"> | null = await ctx.runQuery(internal.goals.getInternalGoal, { goalId: args.goalId });
    if (!goal || goal.status === "completed") {
      console.log("Goal not found or completed, skipping scheduling");
      return;
    }

    const goalDeadline = goal.targetDate || null;
    console.log(`Goal: "${goal.title}" | Deadline: ${goalDeadline || 'none'}`);

    // If rescheduling, clear existing scheduled tasks first
    if (args.isRescheduling) {
      const existingScheduledTasks = await ctx.runQuery(internal.tasks.getInternalScheduledTasksForGoal, { goalId: args.goalId });
      console.log(`Rescheduling: clearing ${existingScheduledTasks.length} existing scheduled tasks`);
      for (const task of existingScheduledTasks) {
        await ctx.runMutation(internal.tasks.internalUpdateTask, {
          taskId: task._id,
          scheduledDate: undefined,
          scheduledTime: undefined,
        });
      }
    }

    // Get ALL scheduled tasks for this user (across all goals) to avoid conflicts
    const allUserTasks: Doc<"tasks">[] = await ctx.runQuery(internal.tasks.getInternalAllUserTasks, { userId: goal.userId });
    const existingScheduledTasks = allUserTasks.filter(t => t.scheduledDate && t.scheduledTime);

    // Get unscheduled tasks for this goal
    const unscheduledTasks: Doc<"tasks">[] = await ctx.runQuery(internal.tasks.getInternalUnscheduledTasksForGoal, { goalId: args.goalId });
    
    console.log(`Found ${unscheduledTasks.length} unscheduled tasks to schedule`);
    console.log(`Found ${existingScheduledTasks.length} existing scheduled tasks across all goals`);
    
    if (unscheduledTasks.length === 0) {
      console.log("No unscheduled tasks found, skipping scheduling");
      return;
    }

    // Get milestones for deadline context (use internal query since we're in an action without auth)
    const milestones: Doc<"milestones">[] = await ctx.runQuery(internal.milestones.getInternalMilestonesForGoal, { goalId: args.goalId });
    const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
    
    console.log(`=== MILESTONES (${sortedMilestones.length} total) ===`);
    
    // Build milestone deadline map with proper boundaries
    const currentDate = new Date().toISOString().split('T')[0];
    const milestoneDeadlines: { [key: string]: { deadline: string, startDate: string, title: string, order: number } } = {};
    
    for (let i = 0; i < sortedMilestones.length; i++) {
      const m = sortedMilestones[i];
      const prevM = i > 0 ? sortedMilestones[i - 1] : null;
      const isLastMilestone = i === sortedMilestones.length - 1;
      
      // Start date logic:
      // - If previous milestone has tasks generated, use its deadline as start date
      // - Otherwise (user is skipping ahead), use TODAY as start date
      let startDate = currentDate;
      if (prevM && prevM.tasksGenerated) {
        startDate = prevM.deadline || currentDate;
      }
      
      // End date: this milestone's deadline, or goal deadline for last milestone
      let deadline = m.deadline;
      if (!deadline && isLastMilestone && goalDeadline) {
        deadline = goalDeadline;
      }
      if (!deadline) {
        // Fallback: 4 weeks from start date
        const [y, mo, d] = startDate.split('-').map(Number);
        const fallbackDate = new Date(y, mo - 1, d);
        fallbackDate.setDate(fallbackDate.getDate() + 28);
        deadline = `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getDate()).padStart(2, '0')}`;
        console.log(`  WARNING: Milestone "${m.title}" has no deadline, using fallback: ${deadline}`);
      }
      
      milestoneDeadlines[m._id] = { deadline, startDate, title: m.title, order: m.order };
      
      console.log(`  Milestone ${i+1}: "${m.title}" | ID: ${m._id}`);
      console.log(`    -> Start: ${startDate} | Deadline: ${deadline} | PrevTasksGenerated: ${prevM?.tasksGenerated ?? 'N/A'}`);
    }

    // Log each task and its milestone
    console.log(`=== UNSCHEDULED TASKS ===`);
    for (const task of unscheduledTasks) {
      if (task.milestoneId) {
        const bounds = milestoneDeadlines[task.milestoneId];
        if (bounds) {
          console.log(`  Task: "${task.title.substring(0, 50)}..."`);
          console.log(`    -> MilestoneID: ${task.milestoneId} | Range: ${bounds.startDate} to ${bounds.deadline}`);
        } else {
          console.log(`  Task: "${task.title.substring(0, 50)}..." | MilestoneID: ${task.milestoneId} | ERROR: Not in map!`);
        }
      } else {
        console.log(`  Task: "${task.title.substring(0, 50)}..." | NO MILESTONE`);
      }
    }

    // Parse user availability - extract user statements from conversation
    const availabilityText = userProfile.availability || '';
    console.log(`=== PARSING AVAILABILITY ===`);
    console.log(`Raw availability string: "${availabilityText.substring(0, 200)}..."`);
    
    // Extract user statements from conversation format
    const availLower = availabilityText.toLowerCase();
    const userStatements = availLower.split(/user:|assistant:|arc:/i);
    const userAvailability = userStatements.length > 1 
        ? userStatements.filter((_: string, i: number) => i % 2 === 1).join(' ')
        : availLower;
    
    console.log(`User availability text: "${userAvailability.substring(0, 100)}..."`);
    
    const availableDays: number[] = [];
    
    // Check for specific day mentions first (most specific)
    const hasTuesday = userAvailability.includes('tuesday');
    const hasThursday = userAvailability.includes('thursday');
    const hasMonday = userAvailability.includes('monday');
    const hasWednesday = userAvailability.includes('wednesday');
    const hasFriday = userAvailability.includes('friday');
    const hasSaturday = userAvailability.includes('saturday');
    const hasSunday = userAvailability.includes('sunday');
    const hasWeekend = userAvailability.includes('weekend');
    
    // If specific days are mentioned, use those
    if (hasTuesday) { console.log('  -> Found tuesday'); availableDays.push(2); }
    if (hasThursday) { console.log('  -> Found thursday'); availableDays.push(4); }
    if (hasMonday) { console.log('  -> Found monday'); availableDays.push(1); }
    if (hasWednesday) { console.log('  -> Found wednesday'); availableDays.push(3); }
    if (hasFriday) { console.log('  -> Found friday'); availableDays.push(5); }
    if (hasSaturday) { console.log('  -> Found saturday'); availableDays.push(6); }
    if (hasSunday) { console.log('  -> Found sunday'); availableDays.push(0); }
    
    // If weekend is mentioned and no specific weekend days, add both
    if (hasWeekend && !hasSaturday && !hasSunday) {
        console.log('  -> Found weekend keyword, adding Sat/Sun');
        availableDays.push(0, 6);
    }
    
    // Check for "weekends only" pattern - but only if no specific weekdays were mentioned
    const weekendsOnly = hasWeekend && 
                         !hasTuesday && !hasThursday && !hasMonday && !hasWednesday && !hasFriday &&
                         (userAvailability.includes('only') || 
                          userAvailability.includes('not available weekday'));
    
    // If weekdays mentioned generically and not "weekends only", add all weekdays (don't check if array is empty)
    if (userAvailability.includes('weekday') && !weekendsOnly) {
        if (!userAvailability.includes('not')) {
            console.log('  -> Found weekday keyword, adding Mon-Fri');
            // Add weekdays if not already present
            [1, 2, 3, 4, 5].forEach(day => {
                if (!availableDays.includes(day)) {
                    availableDays.push(day);
                }
            });
        }
    }
    
    // Only use all days as fallback if we couldn't parse anything
    if (availableDays.length === 0) {
      console.log('  -> No days parsed, defaulting to all days');
      availableDays.push(0, 1, 2, 3, 4, 5, 6);
    }
    
    const uniqueAvailableDays = [...new Set(availableDays)].sort((a, b) => a - b);
    console.log(`Final available days: ${uniqueAvailableDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`);
    console.log(`===========================`);

    // Helper to get available dates in a range
    const getAvailableDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
      const dates: string[] = [];
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      
      const current = new Date(start);
      current.setDate(current.getDate() + 1); // Start day after
      
      while (current <= end) {
        if (uniqueAvailableDays.includes(current.getDay())) {
          const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
          dates.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    // Build task list with available dates
    const taskListForPrompt = unscheduledTasks.map((t, i) => {
      let startDate = currentDate;
      let deadline = goalDeadline || '2026-12-31';
      let milestoneName = 'none';
      
      // Debug: log each task's milestoneId
      console.log(`Task ${i+1}: "${t.title.substring(0,30)}..." | milestoneId: ${t.milestoneId || 'UNDEFINED'}`);
      
      if (t.milestoneId) {
        const bounds = milestoneDeadlines[t.milestoneId];
        if (bounds) {
          startDate = bounds.startDate;
          deadline = bounds.deadline;
          milestoneName = bounds.title;
          console.log(`  -> Found bounds: ${startDate} to ${deadline}`);
        } else {
          console.log(`  -> ERROR: milestoneId ${t.milestoneId} not found in milestoneDeadlines map!`);
          console.log(`  -> Available milestone IDs: ${Object.keys(milestoneDeadlines).join(', ')}`);
        }
      }
      
      const availableDates = getAvailableDatesInRange(startDate, deadline);
      
      if (availableDates.length === 0) {
        return `${i + 1}. "${t.title}"\n   - Milestone: "${milestoneName}"\n   - ERROR: No dates in ${startDate} to ${deadline}`;
      }
      
      const datesPreview = availableDates.length > 8 
        ? `${availableDates.slice(0, 4).join(', ')} ... ${availableDates.slice(-2).join(', ')} (${availableDates.length} dates)`
        : availableDates.join(', ');
      
      return `${i + 1}. "${t.title}"\n   - Milestone: "${milestoneName}"\n   - ALLOWED DATES: ${datesPreview}\n   - First: ${availableDates[0]} | Last: ${availableDates[availableDates.length - 1]}`;
    }).join('\n\n');

    console.log('=== PROMPT TASK LIST ===');
    console.log(taskListForPrompt);
    console.log('========================');

    const tasksPerDate = new Map<string, number>();
    for (const task of existingScheduledTasks) {
      if (task.scheduledDate) {
        tasksPerDate.set(task.scheduledDate, (tasksPerDate.get(task.scheduledDate) || 0) + 1);
      }
    }

    const existingScheduleStr = existingScheduledTasks.length > 0 
      ? existingScheduledTasks.slice(0, 20).map(t => `- ${t.scheduledDate} ${t.scheduledTime}: "${t.title.substring(0, 30)}..."`).join('\n')
      : 'No existing scheduled tasks.';
    
    const prompt = `Schedule these ${unscheduledTasks.length} tasks.

=== USER AVAILABILITY ===
${userProfile.availability}

=== EXISTING SCHEDULE ===
${existingScheduleStr}

=== TASKS TO SCHEDULE ===
${taskListForPrompt}

=== RULES ===
1. **ONLY USE DATES FROM THE "ALLOWED DATES" LIST** for each task.
2. Times between 09:00 and 20:00.
3. Spread tasks across different dates.

=== DURATIONS ===
- Practice tests = 180-240 min
- Study sessions = 45-90 min  
- Reviews = 30-45 min
- Quick tasks = 15-30 min

=== RESPONSE ===
Return ONLY JSON array:
[{"title": "exact title", "scheduledDate": "YYYY-MM-DD", "scheduledTime": "HH:MM", "durationMinutes": number}]`;

    console.log(`Calling Groq to schedule ${unscheduledTasks.length} tasks`);
    
    try {
      const rawResponse = await callCohereForScheduling(prompt);
      console.log(`Groq response: ${rawResponse.substring(0, 500)}...`);
      
      const cleanedResponse = rawResponse.replace(/```json\n?|```\n?/g, '').trim();
      const scheduledTasks = JSON.parse(cleanedResponse);
      
      console.log(`Parsed ${scheduledTasks.length} scheduled tasks`);
      
      let scheduledCount = 0;
      
      for (const scheduledTask of scheduledTasks) {
        const dbTask = unscheduledTasks.find(t => t.title === scheduledTask.title);
        
        if (!dbTask) {
          console.warn(`Task not found: "${scheduledTask.title}"`);
          continue;
        }
        
        if (!scheduledTask.scheduledDate || !scheduledTask.scheduledTime) {
          console.warn(`Missing date/time: "${scheduledTask.title}"`);
          continue;
        }
        
        let startDate = currentDate;
        let deadline = goalDeadline || '2026-12-31';
        
        if (dbTask.milestoneId && milestoneDeadlines[dbTask.milestoneId]) {
          const bounds = milestoneDeadlines[dbTask.milestoneId];
          startDate = bounds.startDate;
          deadline = bounds.deadline;
        }
        
        let dateWarning = '';
        if (scheduledTask.scheduledDate <= startDate) {
          dateWarning = ` [WRONG: before ${startDate}]`;
        } else if (scheduledTask.scheduledDate > deadline) {
          dateWarning = ` [WRONG: after ${deadline}]`;
        }
        
        let duration = scheduledTask.durationMinutes || 45;
        const titleLower = scheduledTask.title.toLowerCase();
        if (!scheduledTask.durationMinutes) {
          if (titleLower.includes('full') && titleLower.includes('practice test')) duration = 210;
          else if (titleLower.includes('practice test')) duration = 60;
          else if (titleLower.includes('review') || titleLower.includes('analyze')) duration = 45;
        }
        
        const currentCount = tasksPerDate.get(scheduledTask.scheduledDate) || 0;
        const countInfo = currentCount > 0 ? ` [${currentCount + 1} on day]` : '';
        
        console.log(`Scheduling: "${dbTask.title.substring(0, 50)}..." -> ${scheduledTask.scheduledDate} ${scheduledTask.scheduledTime} (${duration}m)${dateWarning}${countInfo}`);
        
        await ctx.runMutation(internal.tasks.internalUpdateTask, {
          taskId: dbTask._id,
          scheduledDate: scheduledTask.scheduledDate,
          scheduledTime: scheduledTask.scheduledTime,
          durationMinutes: duration,
        });
        
        tasksPerDate.set(scheduledTask.scheduledDate, currentCount + 1);
        scheduledCount++;
      }
      
      console.log(`Successfully scheduled ${scheduledCount} of ${unscheduledTasks.length} tasks`);
      
    } catch (error: any) {
      console.error("Error scheduling tasks:", error.message);
    }
  },
});
