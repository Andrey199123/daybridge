import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

const CATEGORIES = [
  "All", "Academic", "Career", "Skill", "Passion Projects", 
  "Entrepreneurial", "Creative", "Personal Growth", "Financial"
];

interface GoalFinderModalProps {
  onClose: () => void;
  onOpenCreateGoalModal: () => void;
}

export function GoalFinderModal({
  onClose,
  onOpenCreateGoalModal,
}: GoalFinderModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  
  const templates = useQuery(api.goals.getGoalTemplates, {
    category: selectedCategory === "All" ? undefined : selectedCategory
  });
  
  const createGoalWithAI = useAction(api.goals.createGoalWithAI);

  const handleSelectTemplate = async (template: any) => {
    setLoading(true);
    
    try {
      await createGoalWithAI({
        title: template.title,
        description: template.description,
        category: template.category,
        priority: "medium",
      });
      toast.success("Goal created from template!");
      onClose();
    } catch (error) {
      toast.error("Failed to create goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">🔍 Goal Finder</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenCreateGoalModal}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              ✨ Create New Goal
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-gray-300 mb-6">
          Discover goals that match your interests and aspirations. Click on any goal to add it to your list!
        </p>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-blue-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((template) => (
            <div
              key={template._id}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-all cursor-pointer"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-white text-sm leading-tight">
                  {template.title}
                </h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  template.difficulty === "beginner" ? "bg-green-500/20 text-green-400" :
                  template.difficulty === "intermediate" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {template.difficulty}
                </div>
              </div>
              
              <p className="text-gray-300 text-xs mb-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{template.category}</span>
                <span>~{template.estimatedWeeks} weeks</span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-600">
                <p className="text-xs text-gray-400 mb-2">Sample tasks:</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  {template.suggestedTasks.slice(0, 2).map((task, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span className="line-clamp-1">{task}</span>
                    </li>
                  ))}
                  {template.suggestedTasks.length > 2 && (
                    <li className="text-gray-500">+{template.suggestedTasks.length - 2} more...</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {templates?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">No templates found</h3>
            <p className="text-gray-400">Try selecting a different category.</p>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-white">Creating goal...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
