import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  PencilLine,
  Share2,
  Target,
  Trash2,
} from "lucide-react";
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { EditGoalModal } from "./EditGoalModal";
import { EditTaskModal } from "./EditTaskModal";
import { GoalCompletionCelebration } from "./GoalCompletionCelebration";
import { GoalCompletionForm } from "./GoalCompletionForm";
import { SchedulingModal } from "./SchedulingModal";
import { getWindowOrigin } from "../lib/browser";

interface GoalDetailProps {
  goalId: Id<"goals">;
  onBack: () => void;
}

interface CelebrationData {
  goalTitle: string;
  xpEarned: number;
}

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#29476f] bg-[#0d1a2c] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-[#3a5d8f] hover:bg-[#13223a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#6b9fff] bg-[#4f86f7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6394ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d] disabled:cursor-not-allowed disabled:opacity-50";
const destructiveButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#6c2b36] bg-[#311118] px-4 py-2.5 text-sm font-medium text-rose-100 transition-colors hover:bg-[#3d1520] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d]";

function MilestoneTasks({
  milestoneId,
  onGoalCompleted,
}: {
  milestoneId: Id<"milestones">;
  onGoalCompleted: (data: CelebrationData) => void;
}) {
  const tasks = useQuery(api.tasks.getTasksForMilestone, { milestoneId });
  const [editingTask, setEditingTask] = useState<Id<"tasks"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const toggleTask = useAction(api.goals.toggleTask);

  const handleTaskToggle = async (taskId: Id<"tasks">) => {
    try {
      const task = tasks?.find((item) => item._id === taskId);
      if (!task) {
        return;
      }

      const wasCompleted = task.completed;
      const result = await toggleTask({ taskId });

      if (result.goalCompleted && result.goalTitle) {
        onGoalCompleted({ goalTitle: result.goalTitle, xpEarned: result.xpEarned });
        return;
      }

      if (result.milestoneCompleted && !wasCompleted) {
        toast.success("Checkpoint completed.", {
          description: `+${result.xpEarned} XP earned`,
          duration: 4000,
        });
        return;
      }

      if (!wasCompleted && result.completed) {
        toast.success("Task completed.", {
          description: `${task.title} (+${result.xpEarned} XP)`,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await toggleTask({ taskId });
                toast.success("Task restored.");
              } catch (error) {
                console.error("Failed to undo task completion:", error);
                toast.error("Failed to undo task completion.");
              }
            },
          },
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update task.");
    }
  };

  const openEditModal = (task: { _id: Id<"tasks">; title: string }) => {
    setEditingTask(task._id);
    setEditingTitle(task.title);
  };

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const pendingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  const TaskItem = ({
    task,
    completed,
  }: {
    task: { _id: Id<"tasks">; title: string; completed: boolean };
    completed: boolean;
  }) => (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#223a5d] bg-[#0b1728] px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleTaskToggle(task._id)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff]/40 ${
            completed
              ? "border-emerald-400 bg-emerald-500 text-white"
              : "border-[#496890] bg-[#081423] text-transparent hover:border-[#6ea8ff]"
          }`}
          aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
        >
          <Check className="h-4 w-4" />
        </button>
        <span
          className={`text-sm leading-6 ${
            completed ? "text-slate-500 line-through" : "text-slate-100"
          }`}
        >
          {task.title}
        </span>
      </div>

      <button
        type="button"
        onClick={() => openEditModal(task)}
        className="text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
      >
        Edit
      </button>
    </div>
  );

  return (
    <div className="mt-6 grid gap-4">
      {pendingTasks.length > 0 && (
        <div className="rounded-[18px] border border-[#223a5d] bg-[#081423] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <h4 className="text-sm font-medium text-slate-200">Pending tasks</h4>
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <TaskItem key={task._id} task={task} completed={false} />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="rounded-[18px] border border-[#223a5d] bg-[#081423] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <h4 className="text-sm font-medium text-slate-200">Completed tasks</h4>
          </div>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskItem key={task._id} task={task} completed />
            ))}
          </div>
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          taskId={editingTask}
          currentTitle={editingTitle}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

export function GoalDetail({ goalId, onBack }: GoalDetailProps) {
  const goal = useQuery(api.goals.getGoalWithMilestones, { goalId });
  const generateTasks = useAction(api.milestones.generateTasksForMilestone);
  const generateMilestones = useAction(api.goals.generateMilestones);
  const deleteGoal = useMutation(api.goals.deleteGoal);
  const updateMilestoneDeadline = useMutation(api.milestones.updateMilestoneDeadline);
  const unscheduledTasks = useQuery(api.tasks.getUnscheduledTasksForGoal, { goalId });
  const scheduledTasks = useQuery(api.tasks.getScheduledTasksForGoal, { goalId });

  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [generatingTasksFor, setGeneratingTasksFor] = useState<Id<"milestones"> | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const handleGoalCompleted = (data: CelebrationData) => {
    setCelebrationData(data);
    setShowCompletionForm(true);
  };

  const handleFormComplete = () => {
    setShowCompletionForm(false);
  };

  const handleFormSkip = () => {
    setShowCompletionForm(false);
  };

  const handleUpdateDeadline = async (milestoneId: Id<"milestones">, newDeadline: string) => {
    try {
      await updateMilestoneDeadline({ milestoneId, newDeadline });
      toast.success("Checkpoint deadline updated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update checkpoint deadline.");
    }
  };

  const handleGenerateTasks = async (milestoneId: Id<"milestones">) => {
    setGeneratingTasksFor(milestoneId);
    try {
      await generateTasks({ milestoneId });
      toast.success("Weekly tasks generated.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate tasks.");
    } finally {
      setGeneratingTasksFor(null);
    }
  };

  const handleGenerateMilestones = async () => {
    try {
      await generateMilestones({ goalId });
      toast.success("Checkpoints generated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate checkpoints.");
    }
  };

  const handleDeleteGoal = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this care plan and all of its checkpoints and tasks?",
      )
    ) {
      try {
        await deleteGoal({ goalId });
        toast.success("Care plan deleted.");
        onBack();
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete care plan.");
      }
    }
  };

  if (!goal) {
    return (
      <div className="mx-auto max-w-3xl py-14">
        <div className="rounded-[24px] border border-[#223a5d] bg-[#081423] px-8 py-12 text-center shadow-[0_24px_80px_rgba(2,8,18,0.45)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#35547c] bg-[#0d1c31]">
            <Target className="h-7 w-7 text-blue-200" />
          </div>
          <h3 className="mt-6 text-2xl font-semibold text-white">Care plan not found</h3>
          <p className="mt-3 text-base leading-7 text-slate-400">
            This care plan could not be loaded. Head back to the dashboard and choose another plan.
          </p>
          <button type="button" onClick={onBack} className={`${secondaryButtonClass} mt-8`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const shareUrl = `${getWindowOrigin()}/goal/${goal._id}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button type="button" onClick={onBack} className={secondaryButtonClass}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareOptions((current) => !current)}
              className={secondaryButtonClass}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {showShareOptions && (
              <div className="absolute right-0 top-full z-20 mt-3 rounded-[16px] border border-[#223a5d] bg-[#081423] p-3 shadow-[0_18px_50px_rgba(2,8,18,0.45)]">
                <div className="flex gap-3">
                  <TwitterShareButton url={shareUrl} title={goal.title}>
                    <TwitterIcon size={32} round />
                  </TwitterShareButton>
                  <FacebookShareButton url={shareUrl} quote={goal.title}>
                    <FacebookIcon size={32} round />
                  </FacebookShareButton>
                  <LinkedinShareButton url={shareUrl} title={goal.title}>
                    <LinkedinIcon size={32} round />
                  </LinkedinShareButton>
                </div>
              </div>
            )}
          </div>

          {unscheduledTasks && unscheduledTasks.length > 0 && (
            <button type="button" onClick={() => setShowSchedulingModal(true)} className={primaryButtonClass}>
              <CalendarDays className="h-4 w-4" />
              Schedule tasks ({unscheduledTasks.length})
            </button>
          )}

          {scheduledTasks && scheduledTasks.length > 0 && (
            <button type="button" onClick={() => setShowSchedulingModal(true)} className={secondaryButtonClass}>
              <Clock3 className="h-4 w-4" />
              Update schedule
            </button>
          )}

          <button type="button" onClick={() => setIsEditGoalModalOpen(true)} className={secondaryButtonClass}>
            <PencilLine className="h-4 w-4" />
            Edit plan
          </button>

          <button type="button" onClick={handleDeleteGoal} className={destructiveButtonClass}>
            <Trash2 className="h-4 w-4" />
            Delete plan
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#223a5d] bg-[#081423] p-8 shadow-[0_24px_80px_rgba(2,8,18,0.4)]">
        <p className="text-sm font-medium text-blue-100/72">Care plan detail</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
          {goal.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
          {goal.description}
        </p>
      </div>

      <div>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100/70">Checkpoints</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Break the plan into something executable.</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            Each checkpoint should be concrete enough for the senior or caregiver to act on.
          </p>
        </div>

        {goal.milestones.length === 0 && (
          <div className="rounded-[24px] border border-[#223a5d] bg-[#081423] px-8 py-12 text-center shadow-[0_24px_80px_rgba(2,8,18,0.35)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] border border-[#35547c] bg-[#0d1c31]">
              <Target className="h-7 w-7 text-blue-200" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-white">No checkpoints yet</h3>
            <p className="mt-3 text-base leading-7 text-slate-400">
              Break this care plan into meaningful checkpoints so DayBridge can build the weekly plan around them.
            </p>
            <button type="button" onClick={handleGenerateMilestones} className={`${primaryButtonClass} mt-8`}>
              Generate checkpoints
            </button>
          </div>
        )}

        <div className="space-y-5">
          {goal.milestones.map((milestone, index) => {
            const isPreviousMilestoneCompleted =
              index === 0 || goal.milestones[index - 1].tasksGenerated;

            return (
              <div
                key={milestone._id}
                className="rounded-[24px] border border-[#223a5d] bg-[#081423] p-6 shadow-[0_18px_50px_rgba(2,8,18,0.3)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-[12px] border border-[#35547c] bg-[#0d1c31] px-3 py-1.5 text-sm font-medium text-blue-200">
                        Checkpoint {index + 1}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-[12px] border border-[#29476f] bg-[#0d1a2c] px-3 py-1.5 text-sm text-slate-300">
                        <CalendarDays className="h-4 w-4 text-blue-200" />
                        <span>Deadline</span>
                        <input
                          type="date"
                          value={milestone.deadline}
                          onChange={(event) =>
                            handleUpdateDeadline(milestone._id, event.target.value)
                          }
                          lang="en-US"
                          className="rounded-[8px] bg-transparent px-1 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff]/40"
                        />
                      </div>
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold text-white">{milestone.title}</h3>

                    {milestone.skills && milestone.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {milestone.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-[999px] border border-[#35547c] bg-[#0d1c31] px-3 py-1.5 text-xs font-medium text-slate-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-[190px] flex-col items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenerateTasks(milestone._id)}
                      disabled={
                        milestone.tasksGenerated ||
                        !isPreviousMilestoneCompleted ||
                        generatingTasksFor === milestone._id
                      }
                      className={primaryButtonClass}
                    >
                      {generatingTasksFor === milestone._id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : milestone.tasksGenerated ? (
                        "Tasks ready"
                      ) : (
                        "Generate tasks"
                      )}
                    </button>

                    {!milestone.tasksGenerated && !isPreviousMilestoneCompleted && (
                      <p className="text-sm leading-6 text-slate-500">
                        Finish setting up the previous checkpoint first.
                      </p>
                    )}
                  </div>
                </div>

                <MilestoneTasks
                  milestoneId={milestone._id}
                  onGoalCompleted={handleGoalCompleted}
                />
              </div>
            );
          })}
        </div>
      </div>

      {isEditGoalModalOpen && (
        <EditGoalModal
          goalId={goalId}
          currentTitle={goal.title}
          currentDescription={goal.description}
          onClose={() => setIsEditGoalModalOpen(false)}
        />
      )}

      {showSchedulingModal && (
        <SchedulingModal
          goalId={goalId}
          onClose={() => setShowSchedulingModal(false)}
          isRescheduling={Boolean(scheduledTasks && scheduledTasks.length > 0)}
        />
      )}

      {showCompletionForm && celebrationData && (
        <GoalCompletionForm
          goalId={goalId}
          goalTitle={celebrationData.goalTitle}
          onComplete={handleFormComplete}
          onSkip={handleFormSkip}
        />
      )}

      {celebrationData && !showCompletionForm && (
        <GoalCompletionCelebration
          goalTitle={celebrationData.goalTitle}
          xpEarned={celebrationData.xpEarned}
          onClose={() => {
            setCelebrationData(null);
            onBack();
          }}
        />
      )}
    </div>
  );
}
