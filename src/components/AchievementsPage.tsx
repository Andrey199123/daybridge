import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Zap, Target, Flame, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const iconMap: Record<string, React.ElementType> = {
  award: Award,
  star: Star,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  flame: Flame,
};

const colorMap: Record<string, string> = {
  award: 'var(--accent-cyan)',
  star: 'var(--accent-violet)',
  zap: 'var(--warning)',
  target: 'var(--accent-cyan)',
  trophy: 'var(--warning)',
  flame: '#ff6b35',
};

export function AchievementsPage() {
  const navigate = useNavigate();
  const achievements = useQuery(api.achievements.getUserAchievements) || [];
  const completedGoals = useQuery(api.goals.getUserGoals, { status: "completed" }) || [];

  const hasContent = achievements.length > 0 || completedGoals.length > 0;

  if (!hasContent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        <div className="glass-panel rounded-2xl p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Milestones
          </h2>
          
          <p className="text-lg text-white/70 mb-8 max-w-md mx-auto">
            No milestones yet. Complete your first care plan to start building a record of support.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Button
              onClick={() => navigate('/')}
              className="arc-primary-gradient text-white font-semibold border-0 px-6"
            >
              <Target className="w-4 h-4 mr-2" />
              View Care Plans
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">
              Available Milestones
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel rounded-lg p-4 opacity-50">
                <Award className="w-8 h-8 text-[var(--accent-cyan)] mx-auto mb-2" />
                <p className="text-xs text-white/60">First Care Plan</p>
              </div>
              <div className="glass-panel rounded-lg p-4 opacity-50">
                <Star className="w-8 h-8 text-[var(--accent-violet)] mx-auto mb-2" />
                <p className="text-xs text-white/60">7-Day Streak</p>
              </div>
              <div className="glass-panel rounded-lg p-4 opacity-50">
                <Zap className="w-8 h-8 text-[var(--warning)] mx-auto mb-2" />
                <p className="text-xs text-white/60">100 Tasks</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Trophy className="w-8 h-8 text-[var(--accent-cyan)]" />
          <div>
            <h1 className="text-3xl font-bold text-white">Milestones</h1>
            <p className="text-white/60">
              {completedGoals.length} care plan{completedGoals.length !== 1 ? 's' : ''} completed
              {achievements.length > 0 && ` · ${achievements.length} badge${achievements.length !== 1 ? 's' : ''} earned`}
            </p>
          </div>
        </div>
      </div>

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Completed Care Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((goal, index) => (
              <motion.div
                key={goal._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel rounded-xl p-4 border border-green-500/20 bg-green-500/5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{goal.title}</h3>
                    <p className="text-sm text-white/50 truncate">{goal.description}</p>
                    {goal.completedAt && (
                      <p className="text-xs text-green-400/70 mt-1">
                        Completed {new Date(goal.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badges Section */}
      {achievements.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--accent-cyan)]" />
            Badges Earned
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => {
              const IconComponent = iconMap[achievement.icon] || Award;
              const iconColor = colorMap[achievement.icon] || 'var(--accent-cyan)';
              
              return (
                <motion.div
                  key={achievement._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel rounded-xl p-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <IconComponent className="w-6 h-6" style={{ color: iconColor }} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{achievement.title}</h3>
                      <p className="text-xs text-white/50">{achievement.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
