import { action, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

// Helper to format date for ICS (YYYYMMDD or YYYYMMDDTHHMMSSZ)
function formatIcsDate(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Helper to escape special characters in ICS
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Helper to fold long lines (ICS spec requires max 75 chars per line)
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  
  const lines: string[] = [];
  let currentLine = line.substring(0, 75);
  let remaining = line.substring(75);
  
  lines.push(currentLine);
  
  while (remaining.length > 0) {
    const chunk = remaining.substring(0, 74); // 74 because we add a space
    lines.push(' ' + chunk);
    remaining = remaining.substring(74);
  }
  
  return lines.join('\r\n');
}

// Generate ICS file with all calendar events
export const generateIcsFile = action({
  args: {
    includeGoals: v.optional(v.boolean()),
    includeTasks: v.optional(v.boolean()),
    includeMilestones: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const includeGoals = args.includeGoals !== false;
    const includeTasks = args.includeTasks !== false;
    const includeMilestones = args.includeMilestones !== false;

    const goals = await ctx.runQuery(internal.goals.getAllUserGoals, { userId: userId });

    let events: string[] = [];

    // Add goals with target dates
    if (includeGoals) {
      for (const goal of goals) {
        if (goal.targetDate) {
          const targetDate = new Date(goal.targetDate);
          const eventLines = [
            "BEGIN:VEVENT",
            `UID:care-plan-${goal._id}@daybridge.app`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART;VALUE=DATE:${formatIcsDate(targetDate, true)}`,
            `DTEND;VALUE=DATE:${formatIcsDate(new Date(targetDate.getTime() + 86400000), true)}`,
            `SUMMARY:${escapeIcs(goal.title)}`,
            `DESCRIPTION:Care plan: ${escapeIcs(goal.description)}\\nCategory: ${goal.category}\\nStatus: ${goal.status}`,
            `CATEGORIES:DayBridge Care Plans,${goal.category}`,
            goal.status === 'completed' ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
            "END:VEVENT"
          ];
          events.push(eventLines.join('\r\n'));
        }
      }
    }

    // Add tasks with scheduled dates
    if (includeTasks) {
      for (const goal of goals) {
        const tasks = await ctx.runQuery(api.tasks.getTasksForGoal, { goalId: goal._id });
        
        for (const task of tasks) {
          if (task.scheduledDate) {
            let startDateTime: Date;
            let endDateTime: Date;
            let isAllDay = true;

            if (task.scheduledTime) {
              // Has specific time
              const [hours, minutes] = task.scheduledTime.split(':').map(Number);
              startDateTime = new Date(task.scheduledDate);
              startDateTime.setHours(hours, minutes, 0, 0);
              
              const duration = task.durationMinutes || 60;
              endDateTime = new Date(startDateTime.getTime() + duration * 60000);
              isAllDay = false;
            } else {
              // All day event
              startDateTime = new Date(task.scheduledDate);
              endDateTime = new Date(startDateTime.getTime() + 86400000);
            }

            const eventLines = [
              "BEGIN:VEVENT",
              `UID:task-${task._id}@daybridge.app`,
              `DTSTAMP:${formatIcsDate(new Date())}`,
            ];

            if (isAllDay) {
              eventLines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startDateTime, true)}`);
              eventLines.push(`DTEND;VALUE=DATE:${formatIcsDate(endDateTime, true)}`);
            } else {
              eventLines.push(`DTSTART:${formatIcsDate(startDateTime)}`);
              eventLines.push(`DTEND:${formatIcsDate(endDateTime)}`);
            }

            eventLines.push(
              `SUMMARY:${task.completed ? 'Done: ' : ''}${escapeIcs(task.title)}`,
              `DESCRIPTION:Task for: ${escapeIcs(goal.title)}${task.description ? '\\n' + escapeIcs(task.description) : ''}`,
              `CATEGORIES:DayBridge Tasks`,
              task.completed ? 'STATUS:COMPLETED' : 'STATUS:NEEDS-ACTION',
              "END:VEVENT"
            );
            
            events.push(eventLines.join('\r\n'));
          }
        }
      }
    }

    // Add milestones with deadlines
    if (includeMilestones) {
      for (const goal of goals) {
        const milestones = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId: goal._id });
        
        for (const milestone of milestones) {
          if (milestone.deadline) {
            const deadlineDate = new Date(milestone.deadline);
            const eventLines = [
              "BEGIN:VEVENT",
              `UID:checkpoint-${milestone._id}@daybridge.app`,
              `DTSTAMP:${formatIcsDate(new Date())}`,
              `DTSTART;VALUE=DATE:${formatIcsDate(deadlineDate, true)}`,
              `DTEND;VALUE=DATE:${formatIcsDate(new Date(deadlineDate.getTime() + 86400000), true)}`,
              `SUMMARY:${escapeIcs(milestone.title)}`,
              `DESCRIPTION:Checkpoint for: ${escapeIcs(goal.title)}`,
              `CATEGORIES:DayBridge Checkpoints`,
              milestone.status === 'completed' ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
              "END:VEVENT"
            ];
            events.push(eventLines.join('\r\n'));
          }
        }
      }
    }

    // Build the ICS file with proper line endings
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DayBridge//Daily Support Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:DayBridge Daily Plan",
      "X-WR-TIMEZONE:UTC",
      "X-WR-CALDESC:Care plans, tasks, and checkpoints from DayBridge",
      ...events,
      "END:VCALENDAR"
    ];

    // Apply line folding and use proper CRLF line endings
    const icsContent = lines.map(line => foldLine(line)).join('\r\n') + '\r\n';

    return icsContent;
  },
});

// Get calendar preview data (for UI)
export const getCalendarPreview = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { goals: 0, tasks: 0, milestones: 0 };

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const goalsWithDates = goals.filter(g => g.targetDate).length;

    let tasksWithDates = 0;
    let milestonesWithDates = 0;

    for (const goal of goals) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      tasksWithDates += tasks.filter(t => t.scheduledDate).length;

      const milestones = await ctx.db
        .query("milestones")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      milestonesWithDates += milestones.filter(m => m.deadline).length;
    }

    return {
      goals: goalsWithDates,
      tasks: tasksWithDates,
      milestones: milestonesWithDates,
    };
  },
});
