import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Briefcase, BookOpen, Code, Palette, Users, Target } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const categoryIcons: Record<string, React.ElementType> = {
  academic: BookOpen,
  career: Briefcase,
  creative: Palette,
  entrepreneurial: Code,
  'personal-growth': Users,
};

const categoryColors: Record<string, string> = {
  academic: 'var(--category-academic)',
  career: 'var(--category-career)',
  creative: 'var(--category-creative)',
  entrepreneurial: 'var(--category-entrepreneurial)',
  'personal-growth': 'var(--category-personal-growth)',
};

export function SkillsPage() {
  const skillsData = useQuery(api.skillsTracker.getUserSkills);
  const experiences = useQuery(api.skillsTracker.getUserExperiences);
  const summary = useQuery(api.skillsTracker.getSkillsSummary);

  const skills = skillsData?.skills || [];
  const totalCount = skillsData?.totalCount || 0;

  if (skills.length === 0 && (!experiences || experiences.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="glass-panel rounded-2xl p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Strengths & Support</h2>
          
          <p className="text-lg text-white/70 mb-8 max-w-md mx-auto">
            Complete care plans and tasks to build a clear picture of what support is working.
          </p>
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
          <Sparkles className="w-8 h-8 text-[var(--accent-cyan)]" />
          <div>
            <h1 className="text-3xl font-bold text-white">Strengths & Support</h1>
            <p className="text-white/60">
              {skills.length} support strength{skills.length !== 1 ? 's' : ''} tracked · {experiences?.length || 0} care moment{(experiences?.length || 0) !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      {summary?.topSkills && summary.topSkills.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--accent-cyan)]" />
            Top Strengths
          </h2>
          <div className="flex flex-wrap gap-3">
            {summary.topSkills.map((item: { skill: string; count: number }, index: number) => (
              <motion.div
                key={item.skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[var(--accent-violet)]/20 to-[var(--accent-cyan)]/20 border border-white/10"
              >
                <span className="text-white font-medium">{item.skill}</span>
                <span className="text-white/50 ml-2 text-sm">×{item.count}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Skills by Category */}
      {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--accent-violet)]" />
            Strengths by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summary.byCategory).map(([category, categorySkills]: [string, any], index: number) => {
              const IconComponent = categoryIcons[category] || BookOpen;
              const color = categoryColors[category] || 'var(--accent-cyan)';
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <IconComponent className="w-5 h-5" style={{ color }} />
                    <h3 className="text-white font-medium capitalize">{category.replace('-', ' ')}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(categorySkills as string[]).map((skill: string) => (
                      <span
                        key={skill}
                        className="px-2 py-1 text-xs rounded-md bg-white/10 text-white/80"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Skills with Sources */}
      {skills.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">All Strengths ({skills.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skillData: any, index: number) => (
              <motion.div
                key={skillData.skill}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="glass-panel rounded-xl p-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium">{skillData.skill}</h3>
                  <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                    ×{skillData.count}
                  </span>
                </div>
                <div className="space-y-1">
                  {skillData.sources.slice(0, 2).map((source: any, i: number) => (
                    <p key={i} className="text-xs text-white/50 truncate">
                      {source.type === 'milestone' ? 'Checkpoint' : 'Done'}: {source.title}
                    </p>
                  ))}
                  {skillData.sources.length > 2 && (
                    <p className="text-xs text-white/40">+{skillData.sources.length - 2} more</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Experiences */}
      {experiences && experiences.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[var(--warning)]" />
            Care Moments ({experiences.length})
          </h2>
          <div className="space-y-4">
            {experiences.map((exp: any, index: number) => (
              <motion.div
                key={exp._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel rounded-xl border border-white/10 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{exp.title}</h3>
                    <p className="text-sm text-white/50 capitalize">{exp.type.replace('_', ' ')} · {exp.category}</p>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(exp.completedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-white/70 mt-2 line-clamp-2">{exp.description}</p>
                {exp.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {exp.skills.slice(0, 5).map((skill: string) => (
                      <span key={skill} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">
                        {skill}
                      </span>
                    ))}
                    {exp.skills.length > 5 && (
                      <span className="text-xs text-white/40">+{exp.skills.length - 5}</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
