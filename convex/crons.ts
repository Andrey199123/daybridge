import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// Run every Sunday at 9am PST
crons.cron("weeklySummary", "0 16 * * 0", internal.users.sendWeeklySummaryEmails);

// Run on the first day of every month at 9am PST
crons.cron("monthlySummary", "0 16 1 * *", internal.users.sendMonthlySummaryEmails);

// Run on the first day of every year at 9am PST
crons.cron("yearlySummary", "0 16 1 1 *", internal.users.sendYearlySummaryEmails);

// Check Daily.co usage every day at 9am PST
crons.cron("dailyUsageCheck", "0 16 * * *", api.audioCalls.fetchDailyUsage);

export default crons;
