/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as adaptiveEngine from "../adaptiveEngine.js";
import type * as adminActions from "../adminActions.js";
import type * as ai from "../ai.js";
import type * as aiChatHistory from "../aiChatHistory.js";
import type * as apiUsage from "../apiUsage.js";
import type * as arcConnect from "../arcConnect.js";
import type * as audioCalls from "../audioCalls.js";
import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as availabilityActions from "../availabilityActions.js";
import type * as calendar from "../calendar.js";
import type * as categoryPolicy from "../categoryPolicy.js";
import type * as crons from "../crons.js";
import type * as emailTracking from "../emailTracking.js";
import type * as feedback from "../feedback.js";
import type * as feedbackMutations from "../feedbackMutations.js";
import type * as files from "../files.js";
import type * as goalBreakdownEngine from "../goalBreakdownEngine.js";
import type * as goalValidator from "../goalValidator.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as initShop from "../initShop.js";
import type * as matchRequests from "../matchRequests.js";
import type * as messages from "../messages.js";
import type * as milestones from "../milestones.js";
import type * as miniArcs from "../miniArcs.js";
import type * as notifications from "../notifications.js";
import type * as passwordReset from "../passwordReset.js";
import type * as passwordResetActions from "../passwordResetActions.js";
import type * as posts from "../posts.js";
import type * as presence from "../presence.js";
import type * as rateLimitDb from "../rateLimitDb.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as resume from "../resume.js";
import type * as shop from "../shop.js";
import type * as skillsTracker from "../skillsTracker.js";
import type * as streaks from "../streaks.js";
import type * as tasks from "../tasks.js";
import type * as unsubscribe from "../unsubscribe.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  adaptiveEngine: typeof adaptiveEngine;
  adminActions: typeof adminActions;
  ai: typeof ai;
  aiChatHistory: typeof aiChatHistory;
  apiUsage: typeof apiUsage;
  arcConnect: typeof arcConnect;
  audioCalls: typeof audioCalls;
  auth: typeof auth;
  availability: typeof availability;
  availabilityActions: typeof availabilityActions;
  calendar: typeof calendar;
  categoryPolicy: typeof categoryPolicy;
  crons: typeof crons;
  emailTracking: typeof emailTracking;
  feedback: typeof feedback;
  feedbackMutations: typeof feedbackMutations;
  files: typeof files;
  goalBreakdownEngine: typeof goalBreakdownEngine;
  goalValidator: typeof goalValidator;
  goals: typeof goals;
  http: typeof http;
  initShop: typeof initShop;
  matchRequests: typeof matchRequests;
  messages: typeof messages;
  milestones: typeof milestones;
  miniArcs: typeof miniArcs;
  notifications: typeof notifications;
  passwordReset: typeof passwordReset;
  passwordResetActions: typeof passwordResetActions;
  posts: typeof posts;
  presence: typeof presence;
  rateLimitDb: typeof rateLimitDb;
  rateLimiter: typeof rateLimiter;
  resume: typeof resume;
  shop: typeof shop;
  skillsTracker: typeof skillsTracker;
  streaks: typeof streaks;
  tasks: typeof tasks;
  unsubscribe: typeof unsubscribe;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
