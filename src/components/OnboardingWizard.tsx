import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Edit2, Trash2, ChevronDown } from "lucide-react";
import {
  US_STATES,
  GRADES,
  GENDER_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  INTEREST_SUGGESTIONS,
} from "../lib/usStates";
import { getSuggestedInterests, INTEREST_GRAPH } from "../lib/interestGraph";

type Program = {
  title: string;
  organization: string;
  role?: string;
  monthYear: string;
  description?: string;
};

type Award = {
  title: string;
  issuer: string;
  monthYear: string;
  description?: string;
};

type OnboardingData = {
  name: string;
  interests: string[];
  skills: string[];
  programs: Program[];
  awards: Award[];
  grade: string;
  birthday: string;
  city: string;
  state: string;
  schoolName: string;
  schoolCity: string;
  schoolState: string;
  gender?: string;
  raceEthnicity: string[];
};

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const saveProgress = useMutation(api.users.saveOnboardingProgress);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  // Initialize step from saved progress or start at 0
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTraveling, setIsTraveling] = useState(false); // For space travel effect
  const [travelDirection, setTravelDirection] = useState<'forward' | 'backward'>('forward');
  const [editingFromReview, setEditingFromReview] = useState(false); // Track if editing from review step

  // Form data
  const [data, setData] = useState<OnboardingData>({
    name: "",
    interests: [],
    skills: [],
    programs: [],
    awards: [],
    grade: "",
    birthday: "",
    city: "",
    state: "",
    schoolName: "",
    schoolCity: "",
    schoolState: "",
    gender: undefined,
    raceEthnicity: [],
  });

  // Temporary input states
  const [interestInput, setInterestInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  // Load saved progress
  useEffect(() => {
    if (currentUser?.profile && !currentUser.profile.completedOnboarding) {
      const profile = currentUser.profile;
      setData({
        name: profile.name || "",
        interests: profile.interests || [],
        skills: profile.skills || [],
        programs: profile.programs || [],
        awards: profile.awards || [],
        grade: (typeof profile.grade === "string" ? profile.grade : "") || "",
        birthday: profile.birthday || "",
        city: profile.city || "",
        state: profile.state || "",
        schoolName: profile.schoolName || "",
        schoolCity: profile.schoolCity || "",
        schoolState: profile.schoolState || "",
        gender: profile.gender,
        raceEthnicity: profile.raceEthnicity || [],
      });
      setCurrentStep(profile.onboardingStep || 0);
    }
  }, [currentUser]);

  // Autosave function (only called on step changes, not data changes)
  const handleAutoSave = useCallback(async (currentData: OnboardingData = data) => {
    try {
      await saveProgress({
        step: currentStep,
        data: {
          name: currentData.name.trim() || undefined, // Include name in autosave
          interests: currentData.interests.length > 0 ? currentData.interests : undefined,
          skills: currentData.skills.length > 0 ? currentData.skills : undefined,
          programs: currentData.programs.length > 0 ? currentData.programs : undefined,
          awards: currentData.awards.length > 0 ? currentData.awards : undefined,
          grade: currentData.grade || undefined,
          birthday: currentData.birthday || undefined,
          city: currentData.city || undefined,
          state: currentData.state || undefined,
          schoolName: currentData.schoolName || undefined,
          schoolCity: currentData.schoolCity || undefined,
          schoolState: currentData.schoolState || undefined,
          gender: currentData.gender,
          raceEthnicity: currentData.raceEthnicity.length > 0 ? currentData.raceEthnicity : undefined,
        },
      });
    } catch (error) {
      console.error("Autosave failed:", error);
    }
  }, [currentStep, saveProgress]); // Removed 'data' dependency

  // Auto-save when moving between steps (not on data changes to avoid interference)
  useEffect(() => {
    if (currentStep > 0) {
      handleAutoSave(data);
    }
  }, [currentStep, handleAutoSave]); // Note: 'data' is not in dependency array, passed as parameter

  const totalSteps = 8; // Removed motivation step

  const nextStep = () => {
    // If editing from review, go back to review step (step 7) instead of next step
    if (editingFromReview) {
      setTravelDirection('forward');
      setIsTraveling(true);
      
      setTimeout(() => {
        setCurrentStep(7); // Go back to review
        setEditingFromReview(false);
        setIsTraveling(false);
      }, 800);
      return;
    }
    
    if (currentStep < totalSteps - 1) {
      // Set forward travel direction
      setTravelDirection('forward');
      setIsTraveling(true);
      
      // Wait for travel animation to complete (800ms to match animation)
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsTraveling(false);
      }, 800);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      // Set backward travel direction
      setTravelDirection('backward');
      setIsTraveling(true);
      
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTraveling(false);
      }, 800);
    }
  };

  const handleSaveAndExit = async () => {
    await handleAutoSave(data);
    toast.success("Progress saved! You can resume anytime.");
    onComplete(); // Exit onboarding and go to dashboard
  };

  const handleComplete = async () => {
    // Only require a name. Every other step is optional since the UI supports skipping.
    if (!data.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({
        name: data.name.trim(),
        interests: data.interests.length > 0 ? data.interests : undefined,
        motivationLevel: "medium", // Default value since we removed the step
        skills: data.skills.length > 0 ? data.skills : undefined,
        programs: data.programs.length > 0 ? data.programs : undefined,
        awards: data.awards.length > 0 ? data.awards : undefined,
        grade: data.grade || undefined,
        birthday: data.birthday || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        schoolName: data.schoolName || undefined,
        schoolCity: data.schoolCity || undefined,
        schoolState: data.schoolState || undefined,
        gender: data.gender,
        raceEthnicity: data.raceEthnicity.length > 0 ? data.raceEthnicity : undefined,
      });
      toast.success("Welcome to DayBridge. Let's set up your day.");
      onComplete();
    } catch (error) {
      console.error("Onboarding completion failed:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !data.interests.includes(trimmed)) {
      setData({ ...data, interests: [...data.interests, trimmed] });
      setInterestInput("");
    }
  };

  const removeInterest = (interest: string) => {
    setData({ ...data, interests: data.interests.filter((i) => i !== interest) });
  };

  const addSuggestion = (suggestion: string) => {
    if (!data.interests.includes(suggestion)) {
      setData({ ...data, interests: [...data.interests, suggestion] });
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !data.skills.includes(trimmed)) {
      setData({ ...data, skills: [...data.skills, trimmed] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setData({ ...data, skills: data.skills.filter((s) => s !== skill) });
  };

  const toggleRaceEthnicity = (option: string) => {
    if (option === "Prefer not to say") {
      setData({ ...data, raceEthnicity: ["Prefer not to say"] });
    } else {
      const filtered = data.raceEthnicity.filter((r) => r !== "Prefer not to say");
      if (filtered.includes(option)) {
        setData({ ...data, raceEthnicity: filtered.filter((r) => r !== option) });
      } else {
        setData({ ...data, raceEthnicity: [...filtered, option] });
      }
    }
  };

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  const stepTitles: Array<string> = [
    "Name",
    "Daily Priorities",
    "Support Strengths",
    "Daily Rhythm & Birthday",
    "Home Location",
    "Care Circle",
    "Optional Background",
    "Review & Complete",
  ];

  // Memoize star positions so they don't regenerate on every render
  const starPositions = useMemo(() => {
    const generateStars = (count: number) => 
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 2,
      }));

    return {
      small: generateStars(80),
      medium: generateStars(40),
      large: generateStars(20),
      particles: generateStars(30).map(star => ({
        ...star,
        duration: 8 + Math.random() * 6,
        delay: Math.random() * 10,
      })),
    };
  }, []); // Empty dependency array - only generate once

  return (
    <div className="min-h-screen bg-[var(--bg-space-900)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Galaxy Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient nebula clouds */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-[var(--accent-violet)]/20 via-[var(--accent-violet)]/5 to-transparent rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-[var(--accent-cyan)]/20 via-[var(--accent-cyan)]/5 to-transparent rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-purple-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '12s', animationDelay: '4s' }} />
        
        {/* The Looping Star Container */}
        <motion.div 
          className="absolute flex w-[200%] h-full"
          animate={isTraveling ? {
            x: travelDirection === 'forward' ? ["0%", "-50%"] : ["-50%", "0%"]
          } : {}}
          transition={{
            duration: 0.8,
            ease: "easeInOut"
          }}
        >
          {/* Two identical star panels for seamless looping */}
          {[0, 1].map((panelIndex) => (
            <div key={panelIndex} className="relative w-1/2 h-full">
              {/* Small Stars */}
              {starPositions.small.map((star, i) => (
                <motion.div
                  key={`s-${panelIndex}-${i}`}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                  }}
                />
              ))}
              
              {/* Medium Cyan Stars */}
              {starPositions.medium.map((star, i) => (
                <motion.div
                  key={`m-${panelIndex}-${i}`}
                  className="absolute w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    boxShadow: '0 0 4px rgba(0, 224, 255, 0.8)',
                  }}
                  animate={{
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                  }}
                />
              ))}

              {/* Large Violet Glowing Stars with Warp Effect */}
              {starPositions.large.map((star, i) => (
                <motion.div
                  key={`l-${panelIndex}-${i}`}
                  className="absolute w-2 h-2 bg-[var(--accent-violet)] rounded-full"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    boxShadow: '0 0 8px rgba(108, 99, 255, 0.9), 0 0 16px rgba(108, 99, 255, 0.5)',
                  }}
                  animate={isTraveling ? {
                    scaleX: [1, 10, 1],
                    opacity: [1, 0.5, 1]
                  } : {
                    opacity: [0.5, 1, 0.5],
                    scaleX: 1,
                  }}
                  transition={isTraveling ? { 
                    duration: 0.8 
                  } : { 
                    duration: star.duration, 
                    repeat: Infinity,
                    delay: star.delay,
                  }}
                />
              ))}
              
              {/* Floating Particles */}
              {starPositions.particles.map((star, i) => (
                <motion.div
                  key={`p-${panelIndex}-${i}`}
                  className="absolute w-0.5 h-0.5 bg-[var(--accent-cyan)]/60 rounded-full"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                  }}
                  animate={{
                    y: [-10, 10],
                    x: [-5, 5],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: star.duration,
                    repeat: Infinity,
                    delay: star.delay,
                  }}
                />
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-[var(--accent-cyan)]">
              DayBridge Setup
            </h2>
            <span className="text-sm text-[var(--star)]/70 font-medium">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <div className="relative h-2.5 bg-[var(--bg-space-800)] rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full arc-primary-gradient shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                boxShadow: "0 0 20px rgba(0, 224, 255, 0.4), 0 0 40px rgba(108, 99, 255, 0.2)"
              }}
            />
          </div>
          <p className="text-xs text-[var(--accent-cyan)]/80 mt-2 font-medium uppercase tracking-wider">
            {stepTitles[currentStep]}
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          className="glass-panel rounded-2xl p-8 md:p-10 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Cosmic corner accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--accent-cyan)]/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[var(--accent-violet)]/10 to-transparent rounded-tr-full pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step 0: Name */}
              {currentStep === 0 && <StepName data={data} setData={setData} />}

              {/* Step 1: Interests */}
              {currentStep === 1 && (
                <StepInterests
                  data={data}
                  interestInput={interestInput}
                  setInterestInput={setInterestInput}
                  addInterest={addInterest}
                  removeInterest={removeInterest}
                  addSuggestion={addSuggestion}
                />
              )}

              {/* Step 2: Skills (was Step 3) */}
              {currentStep === 2 && (
                <StepSkills
                  data={data}
                  skillInput={skillInput}
                  setSkillInput={setSkillInput}
                  addSkill={addSkill}
                  removeSkill={removeSkill}
                />
              )}

              {/* Step 3: Grade & Birthday (was Step 4) */}
              {currentStep === 3 && <StepGradeBirthday data={data} setData={setData} />}

              {/* Step 4: Home Location (was Step 5) */}
              {currentStep === 4 && <StepHomeLocation data={data} setData={setData} />}

              {/* Step 5: School Info (was Step 6) */}
              {currentStep === 5 && <StepSchool data={data} setData={setData} />}

              {/* Step 6: Demographics (was Step 7) */}
              {currentStep === 6 && (
                <StepDemographics
                  data={data}
                  setData={setData}
                  toggleRaceEthnicity={toggleRaceEthnicity}
                />
              )}

              {/* Step 7: Review (was Step 8) */}
              {currentStep === 7 && <StepReview data={data} setCurrentStep={setCurrentStep} setEditingFromReview={setEditingFromReview} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 gap-4 pt-6 border-t border-white/10">
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-5 py-2.5 bg-[var(--bg-space-800)] text-[var(--star)] rounded-lg hover:bg-[var(--bg-space-700)] transition-all font-medium border border-white/10 hover:border-[var(--accent-cyan)]/30"
                  aria-label="Go back to previous step"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleSaveAndExit}
                className="px-5 py-2.5 bg-[var(--bg-space-800)] text-[var(--star)]/60 rounded-lg hover:bg-[var(--bg-space-700)] hover:text-[var(--star)]/90 transition-all text-sm border border-white/5"
                aria-label="Save progress and exit"
              >
                Save & Exit
              </button>
            </div>

            {currentStep < totalSteps - 1 ? (
              <div className="flex gap-3">
                <button
                  onClick={nextStep}
                  className="px-5 py-2.5 bg-[var(--bg-space-800)] text-[var(--star)]/60 rounded-lg hover:bg-[var(--bg-space-700)] hover:text-[var(--star)]/90 transition-all text-sm border border-white/5"
                  aria-label="Skip this step"
                >
                  Skip
                </button>
                <button
                  onClick={nextStep}
                  className="px-6 py-2.5 arc-primary-gradient text-white rounded-lg font-semibold transition-all"
                  aria-label={editingFromReview ? "Save and return to review" : "Continue to next step"}
                >
                  {editingFromReview ? "Save & Return →" : "Next →"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-6 py-2.5 arc-primary-gradient text-white rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label="Complete onboarding"
              >
                {isSubmitting ? "Saving..." : "Open DayBridge →"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Individual Step Components
function StepName({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-3xl font-bold text-[var(--star)] mb-2">Welcome to DayBridge</h3>
        <p className="text-[var(--star)]/70">Let's start with the person this daily board supports.</p>
      </div>
      <input
        type="text"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        placeholder="Enter your full name"
        className="w-full px-5 py-4 bg-[var(--bg-space-800)] border border-white/10 rounded-xl text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--accent-cyan)]/20 outline-none transition-all text-lg"
        aria-label="Your full name"
        autoFocus
      />
    </div>
  );
}

function StepInterests({
  data,
  interestInput,
  setInterestInput,
  addInterest,
  removeInterest,
  addSuggestion,
}: {
  data: OnboardingData;
  interestInput: string;
  setInterestInput: (value: string) => void;
  addInterest: () => void;
  removeInterest: (interest: string) => void;
  addSuggestion: (suggestion: string) => void;
}) {
  // Get dynamic suggestions based on selected interests
  const selectedIds = data.interests.map(interest => {
    // Try to find matching ID in graph
    const entry = Object.entries(INTEREST_GRAPH).find(
      ([_, node]) => node.label.toLowerCase() === interest.toLowerCase()
    );
    return entry ? entry[0] : null;
  }).filter(Boolean) as string[];

  // Always show initial 8 interests
  const initialInterests = getSuggestedInterests([]);
  
  // Get all related interests from selected ones (accumulate, don't replace)
  const relatedInterestsMap = new Map<string, typeof INTEREST_GRAPH[string]>();
  selectedIds.forEach(selectedId => {
    const interest = INTEREST_GRAPH[selectedId];
    if (interest) {
      interest.related.forEach(relatedId => {
        const relatedInterest = INTEREST_GRAPH[relatedId];
        if (relatedInterest && 
            !selectedIds.includes(relatedId) && 
            !data.interests.some(i => i.toLowerCase() === relatedInterest.label.toLowerCase())) {
          relatedInterestsMap.set(relatedId, relatedInterest);
        }
      });
    }
  });
  
  const relatedInterests = Array.from(relatedInterestsMap.values());
  
  // Combine all interests to show
  const allSuggestions = [...initialInterests, ...relatedInterests];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-3xl font-bold text-[var(--star)] mb-2">Daily Priorities</h3>
        <p className="text-[var(--star)]/70">
          Choose the routines, reminders, and support areas that matter most.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={interestInput}
          onChange={(e) => setInterestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addInterest();
            }
          }}
          placeholder="Type a priority..."
          className="flex-1 px-5 py-3.5 bg-[var(--bg-space-800)] border border-white/10 rounded-xl text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--accent-cyan)]/20 outline-none transition-all"
          aria-label="Enter an interest"
        />
        <button
          onClick={addInterest}
          className="px-5 py-3.5 arc-primary-gradient text-white rounded-xl font-medium transition-all hover:scale-[1.02]"
          aria-label="Add interest"
        >
          Add
        </button>
      </div>

      {/* All Interest Suggestions */}
      <div className="flex flex-wrap gap-2">
        {allSuggestions.map((interest) => (
          <motion.button
            key={interest.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => addSuggestion(interest.label)}
            disabled={data.interests.some(i => i.toLowerCase() === interest.label.toLowerCase())}
            className="px-4 py-2 text-sm bg-[var(--bg-space-800)] text-[var(--star)]/80 rounded-lg border border-white/10 hover:border-[var(--accent-cyan)]/50 hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-space-700)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-[var(--star)]/80 disabled:hover:bg-[var(--bg-space-800)]"
            aria-label={`Add ${interest.label} as a daily priority`}
          >
            {interest.label}
          </motion.button>
        ))}
      </div>

      {/* Added Interests */}
      {data.interests.length > 0 && (
        <div>
          <p className="text-sm text-[var(--star)]/70 mb-3 font-medium">
            Selected priorities ({data.interests.length}):
          </p>
          <div className="flex flex-wrap gap-2.5">
            {data.interests.map((interest) => (
              <motion.div
                key={interest}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-cyan)]/20 to-[var(--accent-violet)]/20 border border-[var(--accent-cyan)]/30 text-[var(--star)] rounded-lg backdrop-blur-sm"
              >
                <span className="text-sm font-medium">{interest}</span>
                <button
                  onClick={() => removeInterest(interest)}
                  className="text-[var(--star)]/60 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${interest}`}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepSkills({
  data,
  skillInput,
  setSkillInput,
  addSkill,
  removeSkill,
}: {
  data: OnboardingData;
  skillInput: string;
  setSkillInput: (value: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-3xl font-bold text-[var(--star)] mb-2">Current Capabilities</h3>
        <p className="text-[var(--star)]/70">
          What strengths or supports are already in place? Add as many as you like.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="Type a support strength..."
          className="flex-1 px-5 py-3.5 bg-[var(--bg-space-800)] border border-white/10 rounded-xl text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--accent-cyan)]/20 outline-none transition-all"
          aria-label="Enter a support strength"
        />
        <button
          onClick={addSkill}
          className="px-5 py-3.5 arc-primary-gradient text-white rounded-xl font-medium transition-all hover:scale-[1.02]"
          aria-label="Add support strength"
        >
          Add
        </button>
      </div>

      {/* Added Skills */}
      {data.skills.length > 0 && (
        <div>
          <p className="text-sm text-[var(--star)]/70 mb-3 font-medium">
            Support strengths ({data.skills.length}):
          </p>
          <div className="flex flex-wrap gap-2.5">
            {data.skills.map((skill) => (
              <div
                key={skill}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-cyan)]/20 to-[var(--accent-violet)]/20 border border-[var(--accent-cyan)]/30 text-[var(--star)] rounded-lg backdrop-blur-sm"
              >
                <span className="text-sm font-medium">{skill}</span>
                <button
                  onClick={() => removeSkill(skill)}
                  className="text-[var(--star)]/60 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepPrograms({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Program>({
    title: "",
    organization: "",
    role: "",
    monthYear: "",
    description: "",
  });

  const openForm = (index?: number) => {
    if (index !== undefined) {
      setFormData(data.programs[index]);
      setEditIndex(index);
    } else {
      setFormData({ title: "", organization: "", role: "", monthYear: "", description: "" });
      setEditIndex(null);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditIndex(null);
    setFormData({ title: "", organization: "", role: "", monthYear: "", description: "" });
  };

  const saveProgram = () => {
    if (!formData.title || !formData.organization || !formData.monthYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editIndex !== null) {
      const updated = [...data.programs];
      updated[editIndex] = formData;
      setData({ ...data, programs: updated });
    } else {
      setData({ ...data, programs: [...data.programs, formData] });
    }
    closeForm();
  };

  const removeProgram = (index: number) => {
    setData({ ...data, programs: data.programs.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">
        Programs, Courses & Clubs
      </h3>
      <p className="text-[var(--star)]/60">
        Add any programs, courses, or clubs you've participated in. This step is optional.
      </p>

      {/* List of Programs */}
      {data.programs.length > 0 && (
        <div className="space-y-2">
          {data.programs.map((program, index) => (
            <div
              key={index}
              className="p-4 bg-[var(--bg-space-700)] border border-[var(--border-color)] rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--star)]">{program.title}</h4>
                  <p className="text-sm text-[var(--star)]/60">
                    {program.organization} {program.role && `• ${program.role}`}
                  </p>
                  <p className="text-xs text-[var(--star)]/50">{program.monthYear}</p>
                  {program.description && (
                    <p className="text-sm text-[var(--star)]/70 mt-2">{program.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(index)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                    aria-label={`Edit ${program.title}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => removeProgram(index)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-all"
                    aria-label={`Remove ${program.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
          aria-label="Add a program"
        >
          <Plus size={20} />
          Add Program
        </button>
      )}

      {/* Form Panel */}
      {showForm && (
        <div className="p-4 bg-[var(--bg-space-800)] border border-[var(--border-color)] rounded-lg space-y-3">
          <h4 className="text-lg font-semibold text-[var(--star)]">
            {editIndex !== null ? "Edit Program" : "Add Program"}
          </h4>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Title *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Program title"
          />

          <input
            type="text"
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            placeholder="Care circle or organization *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Care circle or organization"
          />

          <input
            type="text"
            value={formData.role || ""}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="Role/Result (optional)"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Role or result"
          />

          <input
            type="text"
            value={formData.monthYear}
            onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
            placeholder="Month/Year (e.g., Jan 2023) *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Month and year"
          />

          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none resize-none"
            aria-label="Program description"
          />

          <div className="flex gap-2">
            <button
              onClick={saveProgram}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
            >
              Save
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)]/70 rounded hover:bg-[var(--bg-space-600)] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepAwards({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Award>({
    title: "",
    issuer: "",
    monthYear: "",
    description: "",
  });

  const openForm = (index?: number) => {
    if (index !== undefined) {
      setFormData(data.awards[index]);
      setEditIndex(index);
    } else {
      setFormData({ title: "", issuer: "", monthYear: "", description: "" });
      setEditIndex(null);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditIndex(null);
    setFormData({ title: "", issuer: "", monthYear: "", description: "" });
  };

  const saveAward = () => {
    if (!formData.title || !formData.issuer || !formData.monthYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editIndex !== null) {
      const updated = [...data.awards];
      updated[editIndex] = formData;
      setData({ ...data, awards: updated });
    } else {
      setData({ ...data, awards: [...data.awards, formData] });
    }
    closeForm();
  };

  const removeAward = (index: number) => {
    setData({ ...data, awards: data.awards.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Awards & Recognitions</h3>
      <p className="text-[var(--star)]/60">
        Add any awards or recognitions you've received. This step is optional.
      </p>

      {/* List of Awards */}
      {data.awards.length > 0 && (
        <div className="space-y-2">
          {data.awards.map((award, index) => (
            <div
              key={index}
              className="p-4 bg-[var(--bg-space-700)] border border-[var(--border-color)] rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--star)]">{award.title}</h4>
                  <p className="text-sm text-[var(--star)]/60">{award.issuer}</p>
                  <p className="text-xs text-[var(--star)]/50">{award.monthYear}</p>
                  {award.description && (
                    <p className="text-sm text-[var(--star)]/70 mt-2">{award.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(index)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                    aria-label={`Edit ${award.title}`}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => removeAward(index)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-all"
                    aria-label={`Remove ${award.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
          aria-label="Add an award"
        >
          <Plus size={20} />
          Add Award
        </button>
      )}

      {/* Form Panel */}
      {showForm && (
        <div className="p-4 bg-[var(--bg-space-800)] border border-[var(--border-color)] rounded-lg space-y-3">
          <h4 className="text-lg font-semibold text-[var(--star)]">
            {editIndex !== null ? "Edit Award" : "Add Award"}
          </h4>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Title *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Award title"
          />

          <input
            type="text"
            value={formData.issuer}
            onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
            placeholder="Issuer *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Award issuer"
          />

          <input
            type="text"
            value={formData.monthYear}
            onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
            placeholder="Month/Year (e.g., Jan 2023) *"
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
            aria-label="Month and year"
          />

          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none resize-none"
            aria-label="Award description"
          />

          <div className="flex gap-2">
            <button
              onClick={saveAward}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
            >
              Save
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)]/70 rounded hover:bg-[var(--bg-space-600)] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepGradeBirthday({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  // Use local state for individual fields
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize from existing data only once
  useEffect(() => {
    if (data.birthday && !initialized) {
      // Parse YYYY-MM-DD directly without Date object to avoid timezone issues
      const parts = data.birthday.split('-');
      if (parts.length === 3) {
        setSelectedYear(parts[0]);
        setSelectedMonth(parts[1]);
        setSelectedDay(parts[2]);
      }
      setInitialized(true);
    } else if (!data.birthday && !initialized) {
      setInitialized(true);
    }
  }, [data.birthday, initialized]);

  // Update birthday when all fields are selected (without data dependency to avoid loops)
  useEffect(() => {
    if (selectedMonth && selectedDay && selectedYear && initialized) {
      const dateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      setData(prevData => ({ ...prevData, birthday: dateString }));
    }
  }, [selectedMonth, selectedDay, selectedYear, initialized, setData]);

  // Generate options
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return { value: day, label: day };
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => {
    const year = currentYear - i;
    return { value: String(year), label: String(year) };
  });

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Daily Rhythm & Birthday</h3>
      <p className="text-[var(--star)]/60">Tell us when the day usually works best.</p>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Daily rhythm
        </label>
        <select
          value={data.grade}
          onChange={(e) => setData({ ...data, grade: e.target.value })}
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Select your daily rhythm"
        >
          <option value="">Select daily rhythm...</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Birthday
        </label>
        <div className="grid grid-cols-3 gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => {
              console.log('Month selected:', e.target.value);
              setSelectedMonth(e.target.value);
            }}
            className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
            aria-label="Select birth month"
            style={{ 
              backgroundColor: '#1f2937',
              borderColor: '#4b5563',
              color: 'white',
              zIndex: 10
            }}
          >
            <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Month</option>
            {months.map((m) => (
              <option 
                key={m.value} 
                value={m.value}
                style={{ backgroundColor: '#1f2937', color: 'white' }}
              >
                {m.label}
              </option>
            ))}
          </select>
          
          <select
            value={selectedDay}
            onChange={(e) => {
              console.log('Day selected:', e.target.value);
              setSelectedDay(e.target.value);
            }}
            className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
            aria-label="Select birth day"
            style={{ 
              backgroundColor: '#1f2937',
              borderColor: '#4b5563',
              color: 'white',
              zIndex: 10
            }}
          >
            <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Day</option>
            {days.map((d) => (
              <option 
                key={d.value} 
                value={d.value}
                style={{ backgroundColor: '#1f2937', color: 'white' }}
              >
                {d.label}
              </option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => {
              console.log('Year selected:', e.target.value);
              setSelectedYear(e.target.value);
            }}
            className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
            aria-label="Select birth year"
            style={{ 
              backgroundColor: '#1f2937',
              borderColor: '#4b5563',
              color: 'white',
              zIndex: 10
            }}
          >
            <option value="" style={{ backgroundColor: '#1f2937', color: 'white' }}>Year</option>
            {years.map((y) => (
              <option 
                key={y.value} 
                value={y.value}
                style={{ backgroundColor: '#1f2937', color: 'white' }}
              >
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepHomeLocation({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Home Location</h3>
      <p className="text-[var(--star)]/60">Where do you call home?</p>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">City</label>
        <input
          type="text"
          value={data.city}
          onChange={(e) => setData({ ...data, city: e.target.value })}
          placeholder="Enter your city"
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Enter your home city"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">State</label>
        <select
          value={data.state}
          onChange={(e) => setData({ ...data, state: e.target.value })}
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Select your home state"
        >
          <option value="">Select state...</option>
          {US_STATES.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepSchool({
  data,
  setData,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Care Circle</h3>
      <p className="text-[var(--star)]/60">Tell us who helps keep the day on track.</p>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Care Circle Name
        </label>
        <input
          type="text"
          value={data.schoolName}
          onChange={(e) => setData({ ...data, schoolName: e.target.value })}
          placeholder="Family, neighbors, aide, or care team"
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Enter your care circle name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Care Circle City
        </label>
        <input
          type="text"
          value={data.schoolCity}
          onChange={(e) => setData({ ...data, schoolCity: e.target.value })}
          placeholder="Enter care circle city"
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Enter your care circle city"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Care Circle State
        </label>
        <select
          value={data.schoolState}
          onChange={(e) => setData({ ...data, schoolState: e.target.value })}
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Select your care circle state"
        >
          <option value="">Select state...</option>
          {US_STATES.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StepDemographics({
  data,
  setData,
  toggleRaceEthnicity,
}: {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
  toggleRaceEthnicity: (option: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Optional Background</h3>
      <p className="text-[var(--star)]/60">
        This information is optional and helps us personalize your experience. All fields can be
        skipped.
      </p>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">Gender</label>
        <select
          value={data.gender || ""}
          onChange={(e) => setData({ ...data, gender: e.target.value || undefined })}
          className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          aria-label="Select your gender (optional)"
        >
          <option value="">Select gender...</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Race/Ethnicity */}
      <div>
        <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
          Race/Ethnicity (select all that apply)
        </label>
        <div className="space-y-2">
          {RACE_ETHNICITY_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-space-700)] rounded-lg hover:bg-[var(--bg-space-600)] cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={data.raceEthnicity.includes(option)}
                onChange={() => toggleRaceEthnicity(option)}
                className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--input-bg)] text-blue-500 focus:ring-2 focus:ring-blue-500/20"
                aria-label={option}
              />
              <span className="text-[var(--star)]">{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepReview({
  data,
  setCurrentStep,
  setEditingFromReview,
}: {
  data: OnboardingData;
  setCurrentStep: (step: number) => void;
  setEditingFromReview: (editing: boolean) => void;
}) {
  const handleEdit = (step: number) => {
    setEditingFromReview(true);
    setCurrentStep(step);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[var(--star)]">Review Your Profile</h3>
      <p className="text-[var(--star)]/60">
        Review your information below. Click on any section to edit.
      </p>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        <ReviewItem
          label="Name"
          value={data.name}
          onEdit={() => handleEdit(0)}
        />
        <ReviewItem
          label="Daily Priorities"
          value={data.interests.join(", ")}
          onEdit={() => handleEdit(1)}
        />
        <ReviewItem
          label="Support Strengths"
          value={data.skills.join(", ")}
          onEdit={() => handleEdit(2)}
        />
        <ReviewItem
          label="Daily Rhythm"
          value={data.grade}
          onEdit={() => handleEdit(3)}
        />
        <ReviewItem
          label="Birthday"
          value={data.birthday ? (() => {
            // Parse YYYY-MM-DD without timezone conversion
            const [year, month, day] = data.birthday.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          })() : ''}
          onEdit={() => handleEdit(3)}
        />
        <ReviewItem
          label="Home Location"
          value={
            data.city && data.state
              ? `${data.city}, ${data.state}`
              : data.city || data.state || "Not set"
          }
          onEdit={() => handleEdit(4)}
        />
        <ReviewItem
          label="Care Circle"
          value={
            data.schoolName || data.schoolCity || data.schoolState
              ? [data.schoolName, data.schoolCity, data.schoolState]
                  .filter(Boolean)
                  .join(", ")
              : "Not set"
          }
          onEdit={() => handleEdit(5)}
        />
        {data.gender && (
          <ReviewItem
            label="Gender"
            value={data.gender}
            onEdit={() => handleEdit(6)}
          />
        )}
        {data.raceEthnicity.length > 0 && (
          <ReviewItem
            label="Race/Ethnicity"
            value={data.raceEthnicity.join(", ")}
            onEdit={() => handleEdit(6)}
          />
        )}
      </div>
    </div>
  );
}

function ReviewItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between p-3 bg-[var(--bg-space-700)] border border-[var(--border-color)] rounded-lg">
      <div>
        <p className="text-xs text-[var(--star)]/60">{label}</p>
        <p className="text-sm text-[var(--star)] mt-1">{value || "Not set"}</p>
      </div>
      <button
        onClick={onEdit}
        className="px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-all"
        aria-label={`Edit ${label}`}
      >
        Edit
      </button>
    </div>
  );
}
