import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Home, ClipboardList, Clock, BarChart3,
  Trophy, Pill, Car, Palette, HeartHandshake, Heart, Sparkles, Zap,
  FileText, Users, LayoutGrid
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const navItems = [
  { id: "galaxy", label: "Day Map", icon: Home },
  { id: "missions", label: "Care Plans", icon: ClipboardList },
  { id: "mini-arcs", label: "Quick Routines", icon: Zap },
  { id: "timeline", label: "Calendar", icon: Clock },
  { id: "leaderboard", label: "Care Signals", icon: BarChart3 },
  { id: "achievements", label: "Milestones", icon: Trophy },
  { id: "skills", label: "Strengths", icon: Sparkles },
  { id: "resume", label: "Care Summary", icon: FileText },
  { id: "connect", label: "Care Circle", icon: Users },
];

const categoryIcons = {
  academic: Pill,
  career: Car,
  creative: Palette,
  entrepreneurial: HeartHandshake,
  personal_growth: Heart
};

const categoryLabels = {
  academic: "Meds & visits",
  career: "Errands & rides",
  creative: "Connection",
  entrepreneurial: "Care circle",
  personal_growth: "Wellbeing"
};

const categoryColors = {
  academic: "var(--category-academic)",
  career: "var(--category-career)",
  creative: "var(--category-creative)",
  entrepreneurial: "var(--category-entrepreneurial)",
  personal_growth: "var(--category-personal-growth)"
};

import { useNavigate } from 'react-router-dom';

interface LeftNavigationProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  missions: any[];
  selectedCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
}

export function LeftNavigation({ activeNav, setActiveNav, missions, selectedCategory, onCategorySelect }: LeftNavigationProps) {
  const navigate = useNavigate();
  const pendingRequests = useQuery(api.matchRequests.getPendingRequests);
  const pendingCount = pendingRequests?.length || 0;
  
  const categoryCounts = missions.reduce((acc, mission) => {
    acc[mission.category] = (acc[mission.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <aside className="w-60 border-r border-white/10 glass-panel min-h-screen sticky top-20 self-start hidden md:block">
      <div className="p-4 space-y-6">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  switch(item.id) {
                    case 'galaxy':
                      navigate('/dashboard');
                      break;
                    case 'missions':
                      navigate('/missions');
                      break;
                    case 'mini-arcs':
                      navigate('/mini-arcs');
                      break;
                    case 'timeline':
                      navigate('/timeline');
                      break;
                    case 'leaderboard':
                      navigate('/leaderboard');
                      break;
                    case 'achievements':
                      navigate('/achievements');
                      break;
                    case 'skills':
                      navigate('/skills');
                      break;
                    case 'resume':
                      navigate('/resume');
                      break;
                    case 'connect':
                      navigate('/connect');
                      break;
                    default:
                      navigate('/dashboard');
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all relative ${
                  isActive 
                    ? "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]" 
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                aria-current={isActive ? "page" : undefined}
                aria-label={`${item.label}, navigation link`}
                data-tutorial={`nav-${item.id}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-cyan)] rounded-r"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                {item.id === 'connect' && pendingCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {pendingCount}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 mb-3">
            Categories
          </h3>
          <div className="space-y-1">
            {/* All Categories Option */}
            <motion.button
              onClick={() => {
                if (onCategorySelect) {
                  onCategorySelect(null);
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === null 
                  ? 'bg-white/10' 
                  : 'hover:bg-white/5'
              }`}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid 
                  className="w-4 h-4" 
                  style={{ color: 'var(--accent-cyan)' }}
                />
                <span className={`text-sm ${selectedCategory === null ? 'text-white' : 'text-white/70'}`}>
                  All
                </span>
              </div>
              <span className={`text-xs ${selectedCategory === null ? 'text-white/80' : 'text-white/40'}`}>
                {missions.length}
              </span>
            </motion.button>

            {Object.entries(categoryIcons).map(([category, Icon]) => {
              const isSelected = selectedCategory === category;
              return (
                <motion.button
                  key={category}
                  onClick={() => {
                    if (onCategorySelect) {
                      // Toggle: if already selected, deselect; otherwise select
                      onCategorySelect(isSelected ? null : category);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'
                  }`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <Icon 
                      className="w-4 h-4" 
                      style={{ color: categoryColors[category] }}
                    />
                    <span className={`text-sm ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {categoryLabels[category] || category.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-white/40'}`}>
                    {categoryCounts[category] || 0}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
