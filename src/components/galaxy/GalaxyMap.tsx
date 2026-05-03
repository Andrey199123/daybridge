import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, AlertCircle, Clock, Filter, List, Globe, Zap, Award, Briefcase, Calendar } from "lucide-react";
import { matchesMediaQuery } from "../../lib/browser";

const categoryColors: Record<string, string> = {
  academic: "#1FA2FF",
  career: "#00D4FF",
  creative: "#8A7CFF",
  entrepreneurial: "#FFA735",
  personal_growth: "#FF4FD8"
};

const skillCategoryColors: Record<string, string> = {
  academic: "#1FA2FF",
  career: "#00D4FF",
  creative: "#8A7CFF",
  entrepreneurial: "#FFA735",
  personal_growth: "#FF4FD8",
  general: "#6B7280",
};

function generateThemeSafeColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hueRange = [180, 300];
  const hue = hueRange[0] + (Math.abs(hash) % (hueRange[1] - hueRange[0]));
  const saturation = 70 + (Math.abs(hash >> 8) % 20);
  const lightness = 55 + (Math.abs(hash >> 16) % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

interface Mission {
  id: string;
  name: string;
  category: string;
  percent_complete: number;
  priority?: string;
  deadline?: string;
  status: string;
  _creationTime?: number;
}

interface Milestone {
  id: string;
  mission_id: string;
  name: string;
  is_completed: boolean;
}

interface GalaxyData {
  joinDate: number;
  skillRings: Array<{
    category: string;
    skills: Array<{ name: string; strength: number; earnedAt: number }>;
    totalStrength: number;
  }>;
  experiences: Array<{
    id: string;
    type: string;
    title: string;
    category: string;
    completedAt: number;
  }>;
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    icon: string;
    unlockedAt: number;
  }>;
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    date: number;
  }>;
  stats: {
    totalGoalsCompleted: number;
    totalSkills: number;
    totalExperiences: number;
    currentStreak: number;
  };
  lastActivityDate: number;
  lowActivityCategories: string[];
  activityByMonth: Record<string, number>;
}

interface GalaxyMapProps {
  missions: Mission[];
  milestones?: Milestone[];
  onMissionSelect: (mission: Mission) => void;
  isLoading?: boolean;
  userName?: string;
  galaxyData?: GalaxyData | null;
}

interface PlanetLayout {
  x: number;
  y: number;
  size: number;
  ring: number;
}

type ViewMode = "explore" | "timeline";
type TimeFilter = "all" | "3m" | "6m" | "12m";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_PLANETS_PER_RING = 10;

function calculateSolarSystemLayout(
  planetCount: number,
  centerX: number,
  centerY: number,
  viewportWidth: number,
  viewportHeight: number
): PlanetLayout[] {
  if (planetCount === 0) return [];
  const maxRadius = Math.min(viewportWidth, viewportHeight) * 0.35;
  const minOrbitRadius = 100;
  const baseOrbitSpacing = 85;
  const ringCount = Math.ceil(planetCount / MAX_PLANETS_PER_RING);
  const orbitSpacing = ringCount > 4 
    ? Math.max(60, (maxRadius - minOrbitRadius) / ringCount)
    : baseOrbitSpacing;

  const layouts: PlanetLayout[] = [];
  let planetIndex = 0;

  for (let ring = 0; ring < ringCount && planetIndex < planetCount; ring++) {
    const ringRadius = minOrbitRadius + ring * orbitSpacing;
    const planetsInThisRing = Math.min(MAX_PLANETS_PER_RING, planetCount - planetIndex);

    for (let i = 0; i < planetsInThisRing; i++) {
      const angle = i * GOLDEN_ANGLE + ring * 0.3;
      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;
      const size = 45 + ring * 3;
      layouts.push({ x, y, size, ring });
      planetIndex++;
    }
  }
  return layouts;
}

// Animated starfield
function AnimatedStarfield({ width, height, enabled }: { width: number; height: number; enabled: boolean }) {
  const stars = useMemo(() => {
    const count = enabled ? 100 : 50;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      twinkleDelay: Math.random() * 5,
    }));
  }, [width, height, enabled]);

  return (
    <g>
      {stars.map((star) => (
        <circle key={star.id} cx={star.x} cy={star.y} r={star.size} fill="#F5F9FF" opacity={star.opacity}>
          {enabled && (
            <animate
              attributeName="opacity"
              values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`}
              dur={`${3 + Math.random() * 2}s`}
              begin={`${star.twinkleDelay}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}
    </g>
  );
}

// Central Sun
function CentralSun({ x, y, userName, animated, joinDate, isHovered }: { x: number; y: number; userName: string; animated: boolean; joinDate?: number; isHovered: boolean }) {
  const joinDateStr = joinDate ? new Date(joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
  
  return (
    <g>
      <defs>
        <radialGradient id="sun-gradient">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#FFA500" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#FF8C00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF6347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sun-core">
          <stop offset="0%" stopColor="#FFFACD" stopOpacity="1" />
          <stop offset="50%" stopColor="#FFD700" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFA500" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      {/* Large glow - no pointer events */}
      <circle cx={x} cy={y} r={110} fill="url(#sun-gradient)" opacity="0.5" pointerEvents="none">
        {animated && <animate attributeName="r" values="110;130;110" dur="4s" repeatCount="indefinite" />}
      </circle>
      {/* Medium glow - no pointer events */}
      <circle cx={x} cy={y} r={65} fill="#FFA500" opacity="0.6" pointerEvents="none" />
      {/* Core - this is the clickable area */}
      <circle cx={x} cy={y} r={45} fill="url(#sun-core)" />
      {/* Highlight */}
      <circle cx={x - 12} cy={y - 12} r={18} fill="white" opacity="0.7" pointerEvents="none" />
      
      {/* Only show text on hover */}
      {isHovered && (
        <>
          <text x={x} y={y + 75} textAnchor="middle" fill="white" fontSize="16" fontWeight="600" opacity="0.95" pointerEvents="none">
            {userName}
          </text>
          {joinDateStr && (
            <text x={x} y={y + 95} textAnchor="middle" fill="white" fontSize="10" opacity="0.5" pointerEvents="none">
              DayBridge began {joinDateStr}
            </text>
          )}
        </>
      )}
    </g>
  );
}

// Skill Evolution Ring
function SkillRing({ 
  cx, cy, radius, category, skills, totalStrength, isHighlighted, onHover, animated 
}: { 
  cx: number; cy: number; radius: number; category: string; 
  skills: Array<{ name: string; strength: number }>; totalStrength: number;
  isHighlighted: boolean; onHover: (category: string | null) => void; animated: boolean;
}) {
  const color = skillCategoryColors[category] || skillCategoryColors.general;
  const maxStrength = 20;
  const normalizedStrength = Math.min(totalStrength / maxStrength, 1);
  const strokeWidth = 2 + normalizedStrength * 6;
  const opacity = 0.3 + normalizedStrength * 0.5;

  return (
    <g 
      onMouseEnter={() => onHover(category)} 
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible larger hit area for better hover detection */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        pointerEvents="stroke"
      />
      
      {/* Visible ring */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? strokeWidth + 2 : strokeWidth}
        opacity={isHighlighted ? opacity + 0.3 : opacity}
        strokeDasharray={isHighlighted ? "none" : "4 8"}
        pointerEvents="none"
      >
        {animated && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${cx} ${cy}`}
            to={`360 ${cx} ${cy}`}
            dur={`${80 - totalStrength}s`}
            repeatCount="indefinite"
          />
        )}
      </circle>
      
      {/* Skill nodes on the ring */}
      {isHighlighted && skills.slice(0, 8).map((skill, i) => {
        const angle = (i / Math.min(skills.length, 8)) * Math.PI * 2 - Math.PI / 2;
        const sx = cx + Math.cos(angle) * radius;
        const sy = cy + Math.sin(angle) * radius;
        const nodeSize = 4 + skill.strength * 2;
        return (
          <g key={skill.name}>
            <circle cx={sx} cy={sy} r={nodeSize} fill={color} opacity="0.9" />
            <text x={sx} y={sy - nodeSize - 5} textAnchor="middle" fill="white" fontSize="9" opacity="0.8">
              {skill.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Experience Marker
function ExperienceMarker({ 
  x, y, experience, animated 
}: { 
  x: number; y: number; 
  experience: { type: string; title: string; category: string; completedAt: number };
  animated: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = categoryColors[experience.category] || "#6B7280";
  
  const iconMap: Record<string, string> = {
    internship_search: "",
    competition: "",
    learning: "",
    project: "",
    networking: "",
    application: "",
  };
  const icon = iconMap[experience.type] || "⭐";

  return (
    <g 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={x} cy={y} r={hovered ? 18 : 14} fill={color} opacity="0.3">
        {animated && <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x} cy={y} r={10} fill={color} opacity="0.8" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="12">{icon}</text>
      
      {hovered && (
        <foreignObject x={x - 80} y={y - 70} width="160" height="60" pointerEvents="none">
          <div className="bg-gray-900/95 border border-white/20 rounded-lg p-2 text-center">
            <p className="text-white text-xs font-medium truncate">{experience.title}</p>
            <p className="text-white/50 text-[10px]">
              {new Date(experience.completedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// Milestone Pin
function MilestonePin({ 
  x, y, milestone, animated 
}: { 
  x: number; y: number; 
  milestone: { type: string; title: string; date: number };
  animated: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  
  const typeColors: Record<string, string> = {
    goal_completed: "#00E0FF",
    achievement: "#FFD700",
  };
  const color = typeColors[milestone.type] || "#00E0FF";

  return (
    <g 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Pin glow */}
      <circle cx={x} cy={y} r={hovered ? 12 : 8} fill={color} opacity="0.3">
        {animated && <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />}
      </circle>
      {/* Pin body */}
      <circle cx={x} cy={y} r={6} fill={color} />
      <circle cx={x - 1} cy={y - 1} r={2} fill="white" opacity="0.6" />
      
      {hovered && (
        <foreignObject x={x - 80} y={y + 15} width="160" height="50" pointerEvents="none">
          <div className="bg-gray-900/95 border border-white/20 rounded-lg p-2 text-center">
            <p className="text-white text-xs font-medium truncate">{milestone.title}</p>
            <p className="text-white/50 text-[10px]">
              {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// Present Marker with dotted path forward
function PresentMarker({ x, y, animated }: { x: number; y: number; animated: boolean }) {
  return (
    <g>
      {/* Dotted path forward */}
      <path
        d={`M ${x} ${y} Q ${x + 60} ${y - 30} ${x + 120} ${y}`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="6 6"
        opacity="0.3"
      />
      <text x={x + 130} y={y + 5} fill="white" fontSize="10" opacity="0.4">Future</text>
      
      {/* Present marker */}
      <circle cx={x} cy={y} r={20} fill="#00E0FF" opacity="0.2">
        {animated && <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx={x} cy={y} r={12} fill="#00E0FF" opacity="0.6" />
      <circle cx={x} cy={y} r={6} fill="white" />
      <text x={x} y={y + 35} textAnchor="middle" fill="#00E0FF" fontSize="11" fontWeight="600">TODAY</text>
    </g>
  );
}

// Nudge Component
function Nudge({ message, type, onDismiss }: { message: string; type: "info" | "celebration"; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`absolute bottom-4 left-4 right-4 p-3 rounded-xl backdrop-blur-md border ${
        type === "celebration" 
          ? "bg-[#FFD700]/20 border-[#FFD700]/30" 
          : "bg-[#00E0FF]/20 border-[#00E0FF]/30"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {type === "celebration" ? (
            <span className="text-lg"></span>
          ) : (
            <Zap className="w-4 h-4 text-[#00E0FF]" />
          )}
          <p className="text-sm text-white">{message}</p>
        </div>
        <button onClick={onDismiss} className="text-white/50 hover:text-white text-xs">✕</button>
      </div>
    </motion.div>
  );
}

// Skill Ring Tooltip
function SkillRingTooltip({ 
  category, skills, totalStrength, x, y 
}: { 
  category: string; 
  skills: Array<{ name: string; strength: number }>; 
  totalStrength: number;
  x: number; y: number;
}) {
  const color = skillCategoryColors[category] || skillCategoryColors.general;
  
  return (
    <foreignObject x={x - 100} y={y - 120} width="200" height="110" pointerEvents="none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900/95 border border-white/20 rounded-xl p-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-white font-medium text-sm capitalize">{category.replace('_', ' ')}</span>
        </div>
        <div className="text-white/60 text-xs mb-2">
          Skill Strength: <span className="text-white font-medium">{totalStrength}</span> points
        </div>
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 5).map(s => (
            <span key={s.name} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/80">
              {s.name}
            </span>
          ))}
          {skills.length > 5 && (
            <span className="text-[10px] text-white/40">+{skills.length - 5} more</span>
          )}
        </div>
      </motion.div>
    </foreignObject>
  );
}

// Orbital path
function OrbitalPath({ cx, cy, radius, color, animated }: { cx: number; cy: number; radius: number; color: string; animated: boolean }) {
  const strokeColor = color.startsWith('#') ? `${color}33` : color.startsWith('hsl')
    ? color.replace('hsl(', 'hsla(').replace(')', ', 0.2)') : `rgba(255,255,255,0.2)`;
  
  return (
    <circle cx={cx} cy={cy} r={radius} fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="8 12" opacity="0.5">
      {animated && (
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="60s" repeatCount="indefinite" />
      )}
    </circle>
  );
}

// Planet component
function Planet({
  mission, position, onClick, isHovered, isFocused, milestones, showMoons, animated, isFiltered
}: {
  mission: Mission; position: PlanetLayout; onClick: () => void;
  isHovered: boolean; isFocused: boolean; milestones: Milestone[];
  showMoons: boolean; animated: boolean; isFiltered: boolean;
}) {
  const color = mission.category && categoryColors[mission.category] 
    ? categoryColors[mission.category] : generateThemeSafeColor(mission.id);
  const size = position.size;
  const isCompleted = mission.status === "completed";
  const missionMilestones = milestones.filter(m => m.mission_id === mission.id);

  return (
    <g style={{ cursor: "pointer", opacity: isFiltered ? 0.3 : 1 }}>
      {/* Larger invisible hit area for better hover detection */}
      <circle 
        cx={position.x} 
        cy={position.y} 
        r={size + 25} 
        fill="transparent" 
        onClick={onClick}
        style={{ pointerEvents: 'all' }}
      />
      
      {/* Visual elements with pointer-events none so they don't interfere */}
      <circle cx={position.x} cy={position.y} r={size + 20} fill={color} opacity={isHovered || isFocused ? 0.25 : 0.12} style={{ filter: "blur(15px)", pointerEvents: 'none' }} />
      <circle cx={position.x} cy={position.y} r={size + 6} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" style={{ pointerEvents: 'none' }} />
      <circle
        cx={position.x} cy={position.y} r={size + 6} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${(mission.percent_complete / 100) * (2 * Math.PI * (size + 6))} ${2 * Math.PI * (size + 6)}`}
        strokeLinecap="round" transform={`rotate(-90 ${position.x} ${position.y})`} opacity="0.9"
        style={{ pointerEvents: 'none' }}
      />
      <circle cx={position.x} cy={position.y} r={size} fill={color} opacity={isCompleted ? 0.6 : 0.95} style={{ pointerEvents: 'none' }} />
      <defs>
        <radialGradient id={`inner-${mission.id}`}>
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="70%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={position.x - size * 0.25} cy={position.y - size * 0.25} r={size * 0.7} fill={`url(#inner-${mission.id})`} pointerEvents="none" />
      {isCompleted && (
        <text x={position.x} y={position.y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.6} fill="white" pointerEvents="none" fontWeight="bold">✓</text>
      )}
    </g>
  );
}

// Timeline View Component
function TimelineView({ 
  missions, galaxyData, onMissionSelect, timeFilter 
}: { 
  missions: Mission[]; galaxyData: GalaxyData | null; 
  onMissionSelect: (mission: Mission) => void; timeFilter: TimeFilter;
}) {
  const allEvents = useMemo(() => {
    const events: Array<{ date: number; type: string; title: string; data?: any }> = [];
    
    // Add join date
    if (galaxyData?.joinDate) {
      events.push({ date: galaxyData.joinDate, type: "join", title: "Your DayBridge Began" });
    }
    
    // Add milestones from galaxyData
    galaxyData?.milestones.forEach(m => {
      events.push({ date: m.date, type: m.type, title: m.title, data: m });
    });
    
    // Add experiences
    galaxyData?.experiences.forEach(e => {
      events.push({ date: e.completedAt, type: "experience", title: e.title, data: e });
    });
    
    // Filter by time
    const now = Date.now();
    const filterMs = timeFilter === "3m" ? 90 * 24 * 60 * 60 * 1000
      : timeFilter === "6m" ? 180 * 24 * 60 * 60 * 1000
      : timeFilter === "12m" ? 365 * 24 * 60 * 60 * 1000 : Infinity;
    
    return events
      .filter(e => timeFilter === "all" || (now - e.date) <= filterMs)
      .sort((a, b) => a.date - b.date);
  }, [galaxyData, timeFilter]);

  const typeIcons: Record<string, string> = {
    join: "Start",
    goal_completed: "Done",
    achievement: "Win",
    experience: "Care",
  };

  const typeColors: Record<string, string> = {
    join: "#FFD700",
    goal_completed: "#00E0FF",
    achievement: "#FFD700",
    experience: "#00D4FF",
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FFD700] via-[#00E0FF] to-[#8A7CFF]" />
        
        {/* Events */}
        <div className="space-y-6">
          {allEvents.map((event, i) => (
            <motion.div
              key={`${event.type}-${event.date}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-14"
            >
              {/* Node */}
              <div 
                className="absolute left-4 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ backgroundColor: typeColors[event.type] || "#6B7280" }}
              >
                {typeIcons[event.type] || "•"}
              </div>
              
              {/* Content */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                <p className="text-white font-medium text-sm">{event.title}</p>
                <p className="text-white/50 text-xs mt-1">
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric', year: 'numeric' 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
          
          {/* Present marker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative pl-14"
          >
            <div className="absolute left-4 w-5 h-5 rounded-full bg-[#00E0FF] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
            <div className="text-[#00E0FF] font-semibold text-sm">Today</div>
            
            {/* Future path */}
            <div className="mt-4 pl-2 border-l-2 border-dashed border-white/20 ml-[-26px]">
              <p className="text-white/40 text-xs italic pl-8">Your journey continues...</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Main GalaxyMap Component
export function GalaxyMap({
  missions, milestones = [], onMissionSelect, isLoading = false, userName = "Guest", galaxyData
}: GalaxyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredMission, setHoveredMission] = useState<string | null>(null);
  const [focusedMission, setFocusedMission] = useState<string | null>(null);
  const [hoveredSun, setHoveredSun] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [showMoons, setShowMoons] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("explore");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [hoveredSkillRing, setHoveredSkillRing] = useState<string | null>(null);
  const [dismissedNudge, setDismissedNudge] = useState(false);
  
  const themeBackgroundGradient =
    "linear-gradient(135deg, var(--bg-space-900), var(--bg-space-800) 45%, var(--bg-space-900))";

  const prefersReducedMotion = matchesMediaQuery("(prefers-reduced-motion: reduce)");
  const animated = !prefersReducedMotion;

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (canvasRef.current) resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  const planetLayouts = useMemo(
    () => calculateSolarSystemLayout(missions.length, centerX, centerY, dimensions.width, dimensions.height),
    [missions.length, centerX, centerY, dimensions.width, dimensions.height]
  );

  const orbitRadii = useMemo(() => {
    const radii = new Set<number>();
    planetLayouts.forEach((layout) => {
      const radius = Math.sqrt(Math.pow(layout.x - centerX, 2) + Math.pow(layout.y - centerY, 2));
      radii.add(Math.round(radius));
    });
    return Array.from(radii).sort((a, b) => a - b);
  }, [planetLayouts, centerX, centerY]);

  // Calculate skill ring radii (outer orbits)
  const skillRingRadii = useMemo(() => {
    if (!galaxyData?.skillRings.length) return [];
    const maxOrbit = orbitRadii.length > 0 ? Math.max(...orbitRadii) : 100;
    const baseRadius = maxOrbit + 60;
    return galaxyData.skillRings.map((ring, i) => ({
      ...ring,
      radius: baseRadius + i * 40,
    }));
  }, [galaxyData?.skillRings, orbitRadii]);

  // Calculate experience marker positions
  const experiencePositions = useMemo(() => {
    if (!galaxyData?.experiences.length) return [];
    const maxRadius = skillRingRadii.length > 0 
      ? skillRingRadii[skillRingRadii.length - 1].radius + 30
      : (orbitRadii.length > 0 ? Math.max(...orbitRadii) : 100) + 80;
    
    return galaxyData.experiences.slice(0, 6).map((exp, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return {
        ...exp,
        x: centerX + Math.cos(angle) * maxRadius,
        y: centerY + Math.sin(angle) * maxRadius,
      };
    });
  }, [galaxyData?.experiences, skillRingRadii, orbitRadii, centerX, centerY]);

  // Calculate milestone pin positions along a spiral path
  const milestonePinPositions = useMemo(() => {
    if (!galaxyData?.milestones.length) return [];
    const pins = galaxyData.milestones.slice(0, 10);
    return pins.map((m, i) => {
      const t = i / pins.length;
      const spiralRadius = 80 + t * 150;
      const angle = t * Math.PI * 3 - Math.PI;
      return {
        ...m,
        x: centerX + Math.cos(angle) * spiralRadius,
        y: centerY + Math.sin(angle) * spiralRadius,
      };
    });
  }, [galaxyData?.milestones, centerX, centerY]);

  // Nudge message
  const nudgeMessage = useMemo(() => {
    if (!galaxyData || dismissedNudge) return null;
    
    if (galaxyData.stats.totalGoalsCompleted >= 3 && galaxyData.stats.totalGoalsCompleted % 3 === 0) {
      return { message: `You have completed ${galaxyData.stats.totalGoalsCompleted} care plans. Check your progress.`, type: "celebration" as const };
    }
    
    if (galaxyData.lowActivityCategories.length > 0) {
      const cat = galaxyData.lowActivityCategories[0].replace('_', ' ');
      return { message: `You have not updated ${cat} for a while. Want to add a reminder or care plan?`, type: "info" as const };
    }
    
    return null;
  }, [galaxyData, dismissedNudge]);

  // Filter missions by skill category
  const filteredMissionIds = useMemo(() => {
    if (!skillFilter || !galaxyData) return new Set<string>();
    const skillsInCategory = galaxyData.skillRings.find(r => r.category === skillFilter)?.skills.map(s => s.name) || [];
    // For now, just dim missions not in the category
    return new Set(missions.filter(m => m.category !== skillFilter).map(m => m.id));
  }, [skillFilter, galaxyData, missions]);

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-8 h-[700px] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: themeBackgroundGradient }} />
        <div className="relative text-center z-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="w-10 h-10 text-[var(--accent-cyan)] mx-auto mb-4" />
          </motion.div>
          <p className="text-sm text-white/70">Loading your care plans...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="rounded-2xl overflow-hidden relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      style={{
        background: themeBackgroundGradient
      }}
    >
      {/* Header with controls */}
      <div className="p-4 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--accent-cyan)]" />
              Your Day Map
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              {missions.length} care plan{missions.length !== 1 ? "s" : ""} active
              {galaxyData && ` • ${galaxyData.stats.totalSkills} skills • ${galaxyData.stats.totalExperiences} experiences`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("explore")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === "explore" ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]" : "text-white/60 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Explore
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === "timeline" ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]" : "text-white/60 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Timeline
              </button>
            </div>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="all">All Time</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>

            {/* Skill Filter */}
            {galaxyData && galaxyData.skillRings.length > 0 && (
              <select
                value={skillFilter || ""}
                onChange={(e) => setSkillFilter(e.target.value || null)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Skills</option>
                {galaxyData.skillRings.map(ring => (
                  <option key={ring.category} value={ring.category}>
                    {ring.category.replace('_', ' ')} ({ring.skills.length})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Galaxy Canvas or Timeline */}
      <div ref={canvasRef} className="h-[700px] relative overflow-hidden w-full">
        {viewMode === "timeline" ? (
          <TimelineView 
            missions={missions} 
            galaxyData={galaxyData || null} 
            onMissionSelect={onMissionSelect}
            timeFilter={timeFilter}
          />
        ) : (
          <>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="relative w-full h-full"
              style={{ zIndex: 1 }}
            >
              <AnimatedStarfield width={dimensions.width} height={dimensions.height} enabled={animated} />

              {/* Planets - render FIRST (very back layer) */}
              <AnimatePresence mode="popLayout">
                {/* Active goals first (bottom layer) */}
                {missions.filter(m => m.status !== "completed").map((mission, index) => {
                  const originalIndex = missions.findIndex(m => m.id === mission.id);
                  const layout = planetLayouts[originalIndex];
                  if (!layout) return null;

                  return (
                    <motion.g
                      key={mission.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      onMouseEnter={() => setHoveredMission(mission.id)}
                      onMouseLeave={() => setHoveredMission(null)}
                    >
                      <Planet
                        mission={mission}
                        position={layout}
                        onClick={() => onMissionSelect(mission)}
                        isHovered={hoveredMission === mission.id}
                        isFocused={focusedMission === mission.id}
                        milestones={milestones}
                        showMoons={showMoons}
                        animated={animated}
                        isFiltered={filteredMissionIds.has(mission.id)}
                      />
                    </motion.g>
                  );
                })}
                
                {/* Completed goals second (top layer) */}
                {missions.filter(m => m.status === "completed").map((mission, index) => {
                  const originalIndex = missions.findIndex(m => m.id === mission.id);
                  const layout = planetLayouts[originalIndex];
                  if (!layout) return null;

                  return (
                    <motion.g
                      key={mission.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      onMouseEnter={() => setHoveredMission(mission.id)}
                      onMouseLeave={() => setHoveredMission(null)}
                    >
                      <Planet
                        mission={mission}
                        position={layout}
                        onClick={() => onMissionSelect(mission)}
                        isHovered={hoveredMission === mission.id}
                        isFocused={focusedMission === mission.id}
                        milestones={milestones}
                        showMoons={showMoons}
                        animated={animated}
                        isFiltered={filteredMissionIds.has(mission.id)}
                      />
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Orbital paths */}
              {orbitRadii.map((radius) => (
                <OrbitalPath key={radius} cx={centerX} cy={centerY} radius={radius} color="rgba(255,255,255,0.1)" animated={animated} />
              ))}

              {/* Skill Evolution Rings */}
              {skillRingRadii.map((ring) => (
                <SkillRing
                  key={ring.category}
                  cx={centerX}
                  cy={centerY}
                  radius={ring.radius}
                  category={ring.category}
                  skills={ring.skills}
                  totalStrength={ring.totalStrength}
                  isHighlighted={hoveredSkillRing === ring.category || skillFilter === ring.category}
                  onHover={setHoveredSkillRing}
                  animated={animated}
                />
              ))}

              {/* Skill Ring Tooltip */}
              {hoveredSkillRing && skillRingRadii.find(r => r.category === hoveredSkillRing) && (
                <SkillRingTooltip
                  category={hoveredSkillRing}
                  skills={skillRingRadii.find(r => r.category === hoveredSkillRing)!.skills}
                  totalStrength={skillRingRadii.find(r => r.category === hoveredSkillRing)!.totalStrength}
                  x={centerX}
                  y={centerY - (skillRingRadii.find(r => r.category === hoveredSkillRing)?.radius || 0) - 20}
                />
              )}

              {/* Experience Markers */}
              {experiencePositions.map((exp) => (
                <ExperienceMarker key={exp.id} x={exp.x} y={exp.y} experience={exp} animated={animated} />
              ))}

              {/* Milestone Pins */}
              {milestonePinPositions.map((pin) => (
                <MilestonePin key={pin.id} x={pin.x} y={pin.y} milestone={pin} animated={animated} />
              ))}

              {/* Central Sun - rendered after planets so it's on top */}
              <g
                onMouseEnter={() => setHoveredSun(true)}
                onMouseLeave={() => setHoveredSun(false)}
                style={{ cursor: 'pointer' }}
              >
                <CentralSun x={centerX} y={centerY} userName={userName} animated={animated} joinDate={galaxyData?.joinDate} isHovered={hoveredSun} />
              </g>

              {/* Present Marker */}
              <PresentMarker 
                x={dimensions.width - 100} 
                y={dimensions.height - 60} 
                animated={animated} 
              />
            </svg>
            
            {/* Tooltips overlay - rendered outside SVG so they appear on top */}
            <AnimatePresence>
              {hoveredMission && missions.find(m => m.id === hoveredMission) && (() => {
                const mission = missions.find(m => m.id === hoveredMission)!;
                const index = missions.findIndex(m => m.id === hoveredMission);
                const layout = planetLayouts[index];
                if (!layout) return null;
                
                const color = mission.category && categoryColors[mission.category] 
                  ? categoryColors[mission.category] : generateThemeSafeColor(mission.id);
                
                // Convert SVG coordinates to percentage
                const leftPercent = (layout.x / dimensions.width) * 100;
                const topPercent = ((layout.y - layout.size - 100) / dimensions.height) * 100;
                
                return (
                  <motion.div
                    key={`tooltip-${mission.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute glass-panel rounded-xl p-3 text-center backdrop-blur-md pointer-events-none"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: 'translateX(-50%)',
                      background: "rgba(20, 40, 80, 0.95)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      width: '240px',
                      zIndex: 10000,
                      position: 'absolute'
                    }}
                  >
                    <div className="font-semibold text-white text-sm leading-tight mb-2">{mission.name}</div>
                    <div className="inline-block px-2 py-1 rounded-full text-[10px] font-medium mb-2"
                      style={{ backgroundColor: `${color}30`, color: color }}>
                      {mission.category.replace("_", " ")}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${mission.percent_complete}%`, background: `linear-gradient(90deg, ${color}, #00E0FF)` }} />
                      </div>
                      <span className="text-xs font-medium text-[var(--accent-cyan)]">{mission.percent_complete}%</span>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </>
        )}

        {/* Nudge */}
        <AnimatePresence>
          {nudgeMessage && (
            <Nudge 
              message={nudgeMessage.message} 
              type={nudgeMessage.type} 
              onDismiss={() => setDismissedNudge(true)} 
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
