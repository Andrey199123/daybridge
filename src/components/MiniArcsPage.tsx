import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Sparkles, Clock, Target, Search, Filter, 
  ChevronRight, BookOpen, Zap, Star, Play,
  CheckCircle2, ExternalLink, X, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MiniArcsService, MiniArcTemplate, UserMiniArc } from "../services/MiniArcsService";
import { Id } from "../../convex/_generated/dataModel";

const TAG_COLORS: Record<string, string> = {
  "Productivity": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Life Skills": "bg-green-500/20 text-green-300 border-green-500/30",
  "Digital Tools": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Writing": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Career Skills": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Communication": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Design": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Personal Branding": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Finance": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "College Prep": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Entrepreneurship": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "Tech Skills": "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

export function MiniArcsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MiniArcTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"explore" | "active" | "completed">("explore");
  const [completedMiniArc, setCompletedMiniArc] = useState<UserMiniArc | null>(null);

  const recommended = MiniArcsService.useGetRecommended();
  const allTemplates = MiniArcsService.useListTemplates();
  const activeMiniArcs = MiniArcsService.useGetUserMiniArcs("active");
  const completedMiniArcs = MiniArcsService.useGetUserMiniArcs("completed");
  const searchResults = MiniArcsService.useSearchMiniArcs(searchQuery);

  const startMiniArc = MiniArcsService.useStartMiniArc();
  const completeTask = MiniArcsService.useCompleteTask();
  const skipSuggestions = MiniArcsService.useSkipGoalSuggestions();
  const convertToGoal = MiniArcsService.useConvertToGoal();
  const initializeTemplates = useMutation(api.miniArcs.initializeTemplates);

  // Auto-initialize templates if none exist
  useEffect(() => {
    if (allTemplates && allTemplates.length === 0) {
      initializeTemplates({});
    }
  }, [allTemplates, initializeTemplates]);

  // Get all unique tags
  const allTags = Array.from(
    new Set(allTemplates?.flatMap((t) => t.tags) || [])
  ).sort();

  // Filter templates based on search and tag
  const displayTemplates = searchQuery
    ? searchResults
    : selectedTag
    ? allTemplates?.filter((t) => t.tags.includes(selectedTag))
    : allTemplates;

  const handleStartMiniArc = async (templateId: Id<"miniArcTemplates">) => {
    await startMiniArc({ templateId });
    setSelectedTemplate(null);
    setActiveTab("active");
  };

  const handleCompleteTask = async (userMiniArcId: Id<"userMiniArcs">, taskIndex: number) => {
    const result = await completeTask({ userMiniArcId, taskIndex });
    
    // Show reward feedback (could add a toast here)
    if (result.xpEarned > 0 || result.coinsEarned > 0) {
      console.log(`Earned ${result.xpEarned} care points and ${result.coinsEarned} coins!`);
    }
    
    if (result.isComplete) {
      const miniArc = activeMiniArcs?.find((m) => m._id === userMiniArcId);
      if (miniArc) {
        setCompletedMiniArc(miniArc);
      }
    }
  };

  const handleConvertToGoal = async (userMiniArcId: Id<"userMiniArcs">, goalIndex: number) => {
    await convertToGoal({ userMiniArcId, goalIndex });
    setCompletedMiniArc(null);
  };

  const handleSkipSuggestions = async (userMiniArcId: Id<"userMiniArcs">) => {
    await skipSuggestions({ userMiniArcId });
    setCompletedMiniArc(null);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold">Quick Routines</h1>
          </div>
          <p className="text-white/60">
            Quick 1-3 week guided journeys to build skills and explore new areas
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "explore", label: "Explore", icon: Search },
            { id: "active", label: "Active", icon: Play, count: activeMiniArcs?.length },
            { id: "completed", label: "Completed", icon: CheckCircle2, count: completedMiniArcs?.length },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id as any)}
              className={activeTab === tab.id ? "bg-violet-600 hover:bg-violet-700" : ""}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge className="ml-2 bg-white/20">{tab.count}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Explore Tab */}
        {activeTab === "explore" && (
          <>
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search Quick Routines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
            </div>

            {/* Tag Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                size="sm"
                variant={selectedTag === null ? "default" : "ghost"}
                onClick={() => setSelectedTag(null)}
                className={selectedTag === null ? "bg-violet-600" : ""}
              >
                All
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant={selectedTag === tag ? "default" : "ghost"}
                  onClick={() => setSelectedTag(tag)}
                  className={selectedTag === tag ? "bg-violet-600" : ""}
                >
                  {tag}
                </Button>
              ))}
            </div>

            {/* Recommended Section */}
            {!searchQuery && !selectedTag && recommended && recommended.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Recommended For You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommended.slice(0, 3).map((template) => (
                    <MiniArcCard
                      key={template._id}
                      template={template}
                      onSelect={() => setSelectedTemplate(template)}
                      isRecommended
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Quick Routines */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" />
                {searchQuery ? "Search Results" : selectedTag ? `${selectedTag} Quick Routines` : "All Quick Routines"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayTemplates?.map((template) => (
                  <MiniArcCard
                    key={template._id}
                    template={template}
                    onSelect={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
              {displayTemplates?.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  No Quick Routines found
                </div>
              )}
            </div>
          </>
        )}

        {/* Active Tab */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {activeMiniArcs?.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 mb-4">No active Quick Routines</p>
                <Button onClick={() => setActiveTab("explore")} className="bg-violet-600">
                  Explore Quick Routines
                </Button>
              </div>
            ) : (
              activeMiniArcs?.map((miniArc) => (
                <ActiveMiniArcCard
                  key={miniArc._id}
                  miniArc={miniArc}
                  onCompleteTask={(taskIndex) => handleCompleteTask(miniArc._id, taskIndex)}
                />
              ))
            )}
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === "completed" && (
          <div className="space-y-4">
            {completedMiniArcs?.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No completed Quick Routines yet</p>
              </div>
            ) : (
              completedMiniArcs?.map((miniArc) => (
                <CompletedMiniArcCard key={miniArc._id} miniArc={miniArc} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateDetailModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onStart={() => handleStartMiniArc(selectedTemplate._id)}
          />
        )}
      </AnimatePresence>

      {/* Completion Modal with Care Plan Suggestions */}
      <AnimatePresence>
        {completedMiniArc && completedMiniArc.template && (
          <CompletionModal
            miniArc={completedMiniArc}
            onConvertToGoal={(index) => handleConvertToGoal(completedMiniArc._id, index)}
            onSkip={() => handleSkipSuggestions(completedMiniArc._id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Routine Card Component
function MiniArcCard({
  template,
  onSelect,
  isRecommended,
}: {
  template: MiniArcTemplate;
  onSelect: () => void;
  isRecommended?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="glass-panel rounded-xl p-5 cursor-pointer border border-white/10 hover:border-violet-500/50 transition-colors"
    >
      {isRecommended && (
        <Badge className="mb-3 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Star className="w-3 h-3 mr-1" /> Recommended
        </Badge>
      )}
      <h3 className="font-semibold text-lg mb-2">{template.title}</h3>
      <p className="text-white/60 text-sm mb-4 line-clamp-2">{template.summary}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {template.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            className={TAG_COLORS[tag] || "bg-white/10 text-white/70"}
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-white/50">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {template.estimatedWeeks} week{template.estimatedWeeks > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4" />
          {template.skills.length} skills
        </div>
      </div>
    </motion.div>
  );
}

// Active Quick Routine Card
function ActiveMiniArcCard({
  miniArc,
  onCompleteTask,
}: {
  miniArc: UserMiniArc;
  onCompleteTask: (taskIndex: number) => void;
}) {
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const template = miniArc.template;
  if (!template) return null;

  const progress = (miniArc.completedTasks.length / template.weeklyTasks.length) * 100;
  const daysSinceStart = Math.floor((Date.now() - miniArc.startedAt) / (1000 * 60 * 60 * 24));
  const isStuck = daysSinceStart > 7 && progress < 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-6 border border-violet-500/30"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{template.title}</h3>
          <p className="text-white/60 text-sm">
            Started {new Date(miniArc.startedAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className="bg-violet-500/20 text-violet-300">
          {Math.round(progress)}% Complete
        </Badge>
      </div>

      <Progress value={progress} className="h-2 mb-4" />

      {/* Stuck? Helper */}
      {isStuck && !showStuckHelp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300">Feeling stuck?</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowStuckHelp(true)}
              className="text-amber-400 hover:text-amber-300"
            >
              Get tips
            </Button>
          </div>
        </motion.div>
      )}

      {showStuckHelp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg"
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-violet-300">Tips to get unstuck:</h4>
            <Button size="sm" variant="ghost" onClick={() => setShowStuckHelp(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ul className="text-sm text-white/70 space-y-2">
            <li>• Start with just 5 minutes - momentum builds from small actions</li>
            <li>• Skip to an easier task if the current one feels overwhelming</li>
            <li>• Check the resources linked to each task for guidance</li>
            <li>• Break the task into even smaller steps</li>
            <li>• It's okay to take a different approach than suggested</li>
          </ul>
        </motion.div>
      )}

      <div className="space-y-3">
        {template.weeklyTasks.map((task, index) => {
          const isCompleted = miniArc.completedTasks.includes(index);
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isCompleted ? "bg-green-500/10" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <button
                onClick={() => !isCompleted && onCompleteTask(index)}
                disabled={isCompleted}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCompleted
                    ? "bg-green-500 border-green-500"
                    : "border-white/30 hover:border-violet-500"
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Week {task.week}</span>
                  <span className={isCompleted ? "line-through text-white/40" : ""}>
                    {task.title}
                  </span>
                </div>
                <p className="text-sm text-white/50 mt-1">{task.description}</p>
                {task.resources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.resources.map((resource, rIndex) => (
                      <a
                        key={rIndex}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {resource.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Completed Quick Routine Card
function CompletedMiniArcCard({ miniArc }: { miniArc: UserMiniArc }) {
  const template = miniArc.template;
  if (!template) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-6 border border-green-500/30"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            {template.title}
          </h3>
          <p className="text-white/60 text-sm">
            Completed {miniArc.completedAt ? new Date(miniArc.completedAt).toLocaleDateString() : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-sm text-white/50">Skills earned:</span>
        {template.skills.map((skill) => (
          <Badge key={skill} className="bg-green-500/20 text-green-300">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="text-sm text-white/50">
        <Target className="w-4 h-4 inline mr-1" />
        Deliverable: {template.deliverable}
      </div>
    </motion.div>
  );
}

// Template Detail Modal
function TemplateDetailModal({
  template,
  onClose,
  onStart,
}: {
  template: MiniArcTemplate;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a2e] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{template.title}</h2>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} className={TAG_COLORS[tag] || "bg-white/10"}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-white/70 mb-6">{template.summary}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4">
              <Clock className="w-5 h-5 text-violet-400 mb-2" />
              <div className="text-sm text-white/50">Duration</div>
              <div className="font-semibold">{template.estimatedWeeks} weeks</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <Target className="w-5 h-5 text-green-400 mb-2" />
              <div className="text-sm text-white/50">Deliverable</div>
              <div className="font-semibold text-sm">{template.deliverable}</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Skills You'll Gain
            </h3>
            <div className="flex flex-wrap gap-2">
              {template.skills.map((skill) => (
                <Badge key={skill} className="bg-yellow-500/20 text-yellow-300">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Weekly Tasks</h3>
            <div className="space-y-3">
              {template.weeklyTasks.map((task, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-violet-500/20 text-violet-300">
                      Week {task.week}
                    </Badge>
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <p className="text-sm text-white/60">{task.description}</p>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onStart} className="w-full bg-violet-600 hover:bg-violet-700">
            <Play className="w-4 h-4 mr-2" />
            Start This Quick Routine
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Completion Modal with Care Plan Suggestions
function CompletionModal({
  miniArc,
  onConvertToGoal,
  onSkip,
}: {
  miniArc: UserMiniArc;
  onConvertToGoal: (index: number) => void;
  onSkip: () => void;
}) {
  const template = miniArc.template;
  if (!template) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1a1a2e] rounded-2xl max-w-lg w-full p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Quick Routine Complete</h2>
          <p className="text-white/60">
            You've completed "{template.title}" and earned new skills!
          </p>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {template.skills.map((skill) => (
              <Badge key={skill} className="bg-green-500/20 text-green-300">
                +{skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-center">Ready for a bigger challenge?</h3>
          <p className="text-sm text-white/60 text-center mb-4">
            Based on your Quick Routine, here are some care plans you might want to pursue:
          </p>
          <div className="space-y-3">
            {template.suggestedGoals.map((goal, index) => (
              <button
                key={index}
                onClick={() => onConvertToGoal(index)}
                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium group-hover:text-violet-400 transition-colors">
                      {goal.title}
                    </div>
                    <div className="text-sm text-white/50">{goal.description}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-violet-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button variant="ghost" onClick={onSkip} className="w-full">
          Skip for now
        </Button>
      </motion.div>
    </motion.div>
  );
}
