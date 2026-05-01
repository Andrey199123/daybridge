export { GoalsService } from './GoalsService';
export { TasksService } from './TasksService';
export { MilestonesService } from './MilestonesService';
export { UserMetaService } from './UserMetaService';
export { AIService } from './AIService';
export { CalendarService } from './CalendarService';
export { SchedulingService } from './SchedulingService';
export { MiniArcsService } from './MiniArcsService';
export { AdaptiveEngineService } from './AdaptiveEngineService';

export type { Goal, Task, Milestone } from './GoalsService';
export type { TaskWithGoalInfo } from './TasksService';
export type { UserProfile, User, ProgressReport } from './UserMetaService';
export type { CalendarEvent } from './CalendarService';
export type { MiniArcTemplate, UserMiniArc } from './MiniArcsService';

// Re-export Id type from Convex for convenience
export type { Id } from '../../convex/_generated/dataModel';

