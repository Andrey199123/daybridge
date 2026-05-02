import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Download, Eye, Edit3, Save, Plus, Trash2, 
  ClipboardList, MapPin, Award, Sparkles, ChevronDown,
  Check, X, Loader2, Briefcase
} from "lucide-react";
import { toast } from "sonner";

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

type ResumeIntent = "internship" | "college" | "summer_program" | "general";
type ResumeTemplate = "professional" | "minimalist" | "creative";

const INTENTS: { value: ResumeIntent; label: string; description: string }[] = [
  { value: "internship", label: "Care Handoff", description: "Emphasizes routines and support context" },
  { value: "college", label: "Appointment Summary", description: "Highlights visit prep and follow-up notes" },
  { value: "summer_program", label: "Family Update", description: "Balanced overview for care circles" },
  { value: "general", label: "General Summary", description: "Well-rounded care summary" },
];

const TEMPLATES: { value: ResumeTemplate; label: string; style: string }[] = [
  { value: "professional", label: "Professional", style: "Clean and traditional" },
  { value: "minimalist", label: "Minimalist", style: "Simple and modern" },
  { value: "creative", label: "Creative", style: "Bold and unique" },
];

export function ResumePage() {
  const [selectedIntent, setSelectedIntent] = useState<ResumeIntent>("general");
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>("professional");
  const [includeEmail, setIncludeEmail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDataCollectionModal, setShowDataCollectionModal] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const [resumeData, setResumeData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Programs and Awards data
  const [programs, setPrograms] = useState<Program[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  
  // Form states for programs
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editProgramIndex, setEditProgramIndex] = useState<number | null>(null);
  const [programFormData, setProgramFormData] = useState<Program>({
    title: "",
    organization: "",
    role: "",
    monthYear: "",
    description: "",
  });
  
  // Form states for awards
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [editAwardIndex, setEditAwardIndex] = useState<number | null>(null);
  const [awardFormData, setAwardFormData] = useState<Award>({
    title: "",
    issuer: "",
    monthYear: "",
    description: "",
  });
  
  const resumeRef = useRef<HTMLDivElement>(null);

  const cachedResume = useQuery(api.resume.getCachedResume, {
    intent: selectedIntent,
    template: selectedTemplate,
    includeEmail,
  });
  const resumeDataQuery = useQuery(api.resume.getResumeData);
  const generateResume = useAction(api.resume.generateResume);
  const savedResumes = useQuery(api.resume.getSavedResumes);
  const saveResume = useMutation(api.resume.saveResume);
  const deleteResume = useMutation(api.resume.deleteResume);

  // Program form handlers
  const openProgramForm = (index?: number) => {
    if (index !== undefined) {
      setProgramFormData(programs[index]);
      setEditProgramIndex(index);
    } else {
      setProgramFormData({ title: "", organization: "", role: "", monthYear: "", description: "" });
      setEditProgramIndex(null);
    }
    setShowProgramForm(true);
  };

  const closeProgramForm = () => {
    setShowProgramForm(false);
    setEditProgramIndex(null);
    setProgramFormData({ title: "", organization: "", role: "", monthYear: "", description: "" });
  };

  const saveProgram = () => {
    if (!programFormData.title || !programFormData.organization || !programFormData.monthYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editProgramIndex !== null) {
      const updated = [...programs];
      updated[editProgramIndex] = programFormData;
      setPrograms(updated);
    } else {
      setPrograms([...programs, programFormData]);
    }
    closeProgramForm();
  };

  const removeProgram = (index: number) => {
    setPrograms(programs.filter((_, i) => i !== index));
  };

  // Award form handlers
  const openAwardForm = (index?: number) => {
    if (index !== undefined) {
      setAwardFormData(awards[index]);
      setEditAwardIndex(index);
    } else {
      setAwardFormData({ title: "", issuer: "", monthYear: "", description: "" });
      setEditAwardIndex(null);
    }
    setShowAwardForm(true);
  };

  const closeAwardForm = () => {
    setShowAwardForm(false);
    setEditAwardIndex(null);
    setAwardFormData({ title: "", issuer: "", monthYear: "", description: "" });
  };

  const saveAward = () => {
    if (!awardFormData.title || !awardFormData.issuer || !awardFormData.monthYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editAwardIndex !== null) {
      const updated = [...awards];
      updated[editAwardIndex] = awardFormData;
      setAwards(updated);
    } else {
      setAwards([...awards, awardFormData]);
    }
    closeAwardForm();
  };

  const removeAward = (index: number) => {
    setAwards(awards.filter((_, i) => i !== index));
  };

  // Generate resume function
  const handleGenerateResume = async () => {
    // Check if user has any programs or awards in their profile or locally
    const hasProfileData = (resumeDataQuery?.profile?.programs?.length ?? 0) > 0 || 
                          (resumeDataQuery?.profile?.awards?.length ?? 0) > 0;
    const hasLocalData = programs.length > 0 || awards.length > 0;
    
    // If no data at all, show the modal to collect it
    if (!hasProfileData && !hasLocalData) {
      setShowDataCollectionModal(true);
      return;
    }
    
    // Otherwise, generate the resume
    setIsGenerating(true);
    try {
      const result = await generateResume({
        intent: selectedIntent,
        template: selectedTemplate,
        includeEmail,
        programs: programs.length > 0 ? programs : undefined,
        awards: awards.length > 0 ? awards : undefined,
      });
      if (result) {
        setResumeData(result);
        setEditedSections(null);
        toast.success("Care summary generated!");
      } else {
        toast.error("Failed to generate care summary - no data returned");
      }
    } catch (error: any) {
      console.error("Failed to generate care summary:", error);
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      toast.error(`Failed to generate care summary: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load cached resume when available
  useEffect(() => {
    if (cachedResume) {
      setResumeData(cachedResume);
      setEditedSections(null);
    }
  }, [cachedResume]);

  const sections = editedSections || resumeData?.sections;

  const handleSave = async () => {
    if (!sections || !resumeName.trim()) return;
    
    try {
      await saveResume({
        name: resumeName,
        intent: selectedIntent,
        template: selectedTemplate,
        sections,
      });
      toast.success("Care summary saved!");
      setShowSaveModal(false);
      setResumeName("");
    } catch (error) {
      toast.error("Failed to save care summary");
    }
  };

  const handleDelete = async (resumeId: any) => {
    try {
      await deleteResume({ resumeId });
      toast.success("Care summary deleted");
    } catch (error) {
      toast.error("Failed to delete care summary");
    }
  };

  const handleLoadSaved = (resume: any) => {
    setResumeData({
      intent: resume.intent,
      template: resume.template,
      sections: resume.sections,
      generatedAt: resume.createdAt,
    });
    setSelectedIntent(resume.intent as ResumeIntent);
    setSelectedTemplate(resume.template as ResumeTemplate);
    setEditedSections(null);
    toast.success(`Loaded "${resume.name}"`);
  };

  const handleExportPDF = () => {
    if (!resumeRef.current) return;
    window.print();
    toast.success("Opening print dialog...");
  };

  const updateSection = (section: string, value: any) => {
    setEditedSections((prev: any) => ({
      ...(prev || sections),
      [section]: value,
    }));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] bg-clip-text text-transparent flex items-center gap-3">
            <FileText className="w-8 h-8 text-[var(--accent-cyan)]" />
            Care Summary
          </h1>
          <p className="text-white/60 mt-2">
            A plain-language handoff of care plans, strengths, and support moments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Intent Selection */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[var(--accent-cyan)]" />
                Summary Purpose
              </h3>
              <div className="space-y-2">
                {INTENTS.map((intent) => (
                  <button
                    key={intent.value}
                    onClick={() => setSelectedIntent(intent.value)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedIntent === intent.value
                        ? "bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/50"
                        : "bg-white/5 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{intent.label}</span>
                      {selectedIntent === intent.value && (
                        <Check className="w-4 h-4 text-[var(--accent-cyan)]" />
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-1">{intent.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Template Selection */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--accent-violet)]" />
                Template Style
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.value}
                    onClick={() => setSelectedTemplate(template.value)}
                    className={`p-3 rounded-lg transition-all text-center ${
                      selectedTemplate === template.value
                        ? "bg-[var(--accent-violet)]/20 border border-[var(--accent-violet)]/50"
                        : "bg-white/5 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{template.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Options */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Options</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmail}
                  onChange={(e) => setIncludeEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <span className="text-white/80">Include email address</span>
              </label>
            </motion.div>

            {/* Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                {isEditing ? "Stop Editing" : "Edit Content"}
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Summary
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30 text-[var(--accent-violet)] rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </motion.div>

            {/* Saved Summaries */}
            {savedResumes && savedResumes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Saved Summaries</h3>
                <div className="space-y-2">
                  {savedResumes.map((resume) => (
                    <div
                      key={resume._id}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => handleLoadSaved(resume)}>
                        <p className="text-white font-medium">{resume.name}</p>
                        <p className="text-xs text-white/50">{resume.intent} • {resume.template}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLoadSaved(resume)}
                          className="p-2 hover:bg-[var(--accent-cyan)]/20 rounded-lg transition-colors"
                          title="Load summary"
                        >
                          <Eye className="w-4 h-4 text-[var(--accent-cyan)]" />
                        </button>
                        <button
                          onClick={() => handleDelete(resume._id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete summary"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Summary Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div 
              id="resume-preview"
              ref={resumeRef}
              className={`bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none ${
                selectedTemplate === "minimalist" ? "font-light" : 
                selectedTemplate === "creative" ? "font-sans" : "font-serif"
              }`}
              style={{
                ...(selectedTemplate === "creative" && {
                  background: "linear-gradient(to bottom right, #ffffff, #f8f9ff)"
                }),
                ...(selectedTemplate === "minimalist" && {
                  background: "#ffffff",
                  border: "1px solid #e5e7eb"
                })
              }}
            >
              {isGenerating ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-xl border border-purple-500/20">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)] mb-4" />
                  <p className="text-white/60 text-sm">Generating your care summary with AI...</p>
                </div>
              ) : !sections ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-xl border border-purple-500/20">
                  <div className="mb-8 p-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 shadow-lg shadow-purple-500/50">
                    <FileText className="w-16 h-16 text-white" />
                  </div>
                  <button
                    onClick={() => handleGenerateResume()}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Care Summary with AI
                  </button>
                </div>
              ) : (
                <div className={`p-8 space-y-6 ${
                  selectedTemplate === "minimalist" ? "space-y-4" : 
                  selectedTemplate === "creative" ? "space-y-8" : "space-y-6"
                }`}>
                  {/* Header - always first */}
                  <div className={`pb-4 ${
                    selectedTemplate === "minimalist" ? "text-left border-b border-gray-300" :
                    selectedTemplate === "creative" 
                      ? "text-center pb-6 border-b-4 border-[#6C63FF]" 
                      : "text-center border-b-2 border-gray-300"
                  }`}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={sections.header.name}
                        onChange={(e) => updateSection("header", { ...sections.header, name: e.target.value })}
                        className="text-3xl font-bold text-center w-full bg-yellow-100 px-2 py-1 rounded"
                      />
                    ) : (
                      <h1 className={`font-bold ${
                        selectedTemplate === "minimalist" ? "text-2xl text-gray-900" :
                        selectedTemplate === "creative" ? "text-4xl text-[#6C63FF]" : 
                        "text-3xl text-gray-900"
                      }`}>
                        {sections.header.name}
                      </h1>
                    )}
                    <div className={`flex items-center gap-4 mt-2 text-sm text-gray-600 ${
                      selectedTemplate === "minimalist" ? "justify-start" : "justify-center"
                    }`}>
                      {sections.header.location && <span>{sections.header.location}</span>}
                      {sections.header.email && <span>{sections.header.email}</span>}
                      {sections.header.school && <span>{sections.header.school}</span>}
                      {sections.header.grade && <span>{sections.header.grade}</span>}
                    </div>
                  </div>

                  {/* Render sections dynamically in the order they appear in the sections object */}
                  {Object.keys(sections).filter(key => key !== 'header').map((sectionKey) => {
                    const sectionData = sections[sectionKey];
                    if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return null;

                    // Education Section
                    if (sectionKey === 'education') {
                      return (
                        <div key={sectionKey}>
                          <h2 className={`font-bold mb-3 flex items-center gap-2 ${
                            selectedTemplate === "minimalist" ? "text-base uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-2" :
                            selectedTemplate === "creative" ? "text-2xl text-[#6C63FF]" : 
                            "text-lg text-gray-800"
                          }`}>
                            {selectedTemplate !== "minimalist" && <MapPin className="w-5 h-5" />}
                            Daily Context
                          </h2>
                          {sectionData.map((edu: any, i: number) => (
                            <div key={i} className="mb-2">
                              <p className="font-semibold">{edu.school}</p>
                              <p className="text-sm text-gray-600">
                                {edu.location} {edu.grade && `• ${edu.grade}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Experience Section
                    if (sectionKey === 'experience') {
                      return (
                        <div key={sectionKey}>
                          <h2 className={`font-bold mb-3 flex items-center gap-2 ${
                            selectedTemplate === "minimalist" ? "text-base uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-2" :
                            selectedTemplate === "creative" ? "text-2xl text-[#6C63FF]" : 
                            "text-lg text-gray-800"
                          }`}>
                            {selectedTemplate !== "minimalist" && <ClipboardList className="w-5 h-5" />}
                            Care Plans & Routines
                          </h2>
                          {sectionData.map((exp: any, i: number) => (
                            <div key={i} className="mb-4">
                              <div className="flex justify-between items-start">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={exp.title}
                                    onChange={(e) => {
                                      const newExperience = [...sectionData];
                                      newExperience[i] = { ...exp, title: e.target.value };
                                      updateSection('experience', newExperience);
                                    }}
                                    className="font-semibold bg-yellow-100 px-2 py-1 rounded flex-1 mr-2"
                                  />
                                ) : (
                                  <p className="font-semibold">{exp.title}</p>
                                )}
                                {exp.date && <span className="text-sm text-gray-500">{exp.date}</span>}
                              </div>
                              <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                                {exp.bullets.map((bullet: string, j: number) => (
                                  <li key={j}>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={bullet}
                                        onChange={(e) => {
                                          const newExperience = [...sectionData];
                                          const newBullets = [...exp.bullets];
                                          newBullets[j] = e.target.value;
                                          newExperience[i] = { ...exp, bullets: newBullets };
                                          updateSection('experience', newExperience);
                                        }}
                                        className="bg-yellow-100 px-2 py-1 rounded w-full"
                                      />
                                    ) : (
                                      bullet
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Skills Section
                    if (sectionKey === 'skills') {
                      return (
                        <div key={sectionKey}>
                          <h2 className={`font-bold mb-3 flex items-center gap-2 ${
                            selectedTemplate === "minimalist" ? "text-base uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-2" :
                            selectedTemplate === "creative" ? "text-2xl text-[#6C63FF]" : 
                            "text-lg text-gray-800"
                          }`}>
                            {selectedTemplate !== "minimalist" && <Sparkles className="w-5 h-5" />}
                            Strengths
                          </h2>
                          {isEditing ? (
                            <textarea
                              value={sectionData.join(', ')}
                              onChange={(e) => {
                                const newSkills = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                updateSection('skills', newSkills);
                              }}
                              className="w-full bg-yellow-100 px-3 py-2 rounded text-sm"
                              rows={3}
                              placeholder="Enter skills separated by commas"
                            />
                          ) : (
                            <div className={`flex flex-wrap gap-2 ${
                              selectedTemplate === "minimalist" ? "gap-1" : "gap-2"
                            }`}>
                              {sectionData.map((skill: string, i: number) => (
                                <span 
                                  key={i}
                                  className={`px-3 py-1 rounded-full text-sm ${
                                    selectedTemplate === "minimalist"
                                      ? "bg-gray-200 text-gray-800 px-2 py-0.5 text-xs"
                                      : selectedTemplate === "creative"
                                      ? "bg-gradient-to-r from-[#6C63FF]/20 to-[#00E0FF]/20 text-[#6C63FF] border border-[#6C63FF]/30"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Achievements Section
                    if (sectionKey === 'achievements') {
                      return (
                        <div key={sectionKey}>
                          <h2 className={`font-bold mb-3 flex items-center gap-2 ${
                            selectedTemplate === "minimalist" ? "text-base uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-2" :
                            selectedTemplate === "creative" ? "text-2xl text-[#6C63FF]" : 
                            "text-lg text-gray-800"
                          }`}>
                            {selectedTemplate !== "minimalist" && <Award className="w-5 h-5" />}
                            Recognitions & Notes
                          </h2>
                          {sectionData.map((award: any, i: number) => (
                            <div key={i} className="mb-2">
                              <div className="flex justify-between">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={award.title}
                                    onChange={(e) => {
                                      const newAchievements = [...sectionData];
                                      newAchievements[i] = { ...award, title: e.target.value };
                                      updateSection('achievements', newAchievements);
                                    }}
                                    className="font-medium bg-yellow-100 px-2 py-1 rounded flex-1 mr-2"
                                  />
                                ) : (
                                  <p className="font-medium">{award.title}</p>
                                )}
                                {award.date && <span className="text-sm text-gray-500">{award.date}</span>}
                              </div>
                              {award.issuer && (
                                isEditing ? (
                                  <input
                                    type="text"
                                    value={award.issuer}
                                    onChange={(e) => {
                                      const newAchievements = [...sectionData];
                                      newAchievements[i] = { ...award, issuer: e.target.value };
                                      updateSection('achievements', newAchievements);
                                    }}
                                    className="text-sm text-gray-600 bg-yellow-100 px-2 py-1 rounded w-full mt-1"
                                  />
                                ) : (
                                  <p className="text-sm text-gray-600">{award.issuer}</p>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Activities Section
                    if (sectionKey === 'activities') {
                      return (
                        <div key={sectionKey}>
                          <h2 className={`font-bold mb-3 ${
                            selectedTemplate === "minimalist" ? "text-base uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-2" :
                            selectedTemplate === "creative" ? "text-2xl text-[#6C63FF]" : 
                            "text-lg text-gray-800"
                          }`}>
                            Community Support
                          </h2>
                          {sectionData.map((activity: any, i: number) => (
                            <div key={i} className="mb-2">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={activity.title}
                                    onChange={(e) => {
                                      const newActivities = [...sectionData];
                                      newActivities[i] = { ...activity, title: e.target.value };
                                      updateSection('activities', newActivities);
                                    }}
                                    className="font-medium bg-yellow-100 px-2 py-1 rounded w-full"
                                    placeholder="Activity title"
                                  />
                                  {activity.role && (
                                    <input
                                      type="text"
                                      value={activity.role}
                                      onChange={(e) => {
                                        const newActivities = [...sectionData];
                                        newActivities[i] = { ...activity, role: e.target.value };
                                        updateSection('activities', newActivities);
                                      }}
                                      className="text-sm bg-yellow-100 px-2 py-1 rounded w-full"
                                      placeholder="Role"
                                    />
                                  )}
                                  {activity.description && (
                                    <textarea
                                      value={activity.description}
                                      onChange={(e) => {
                                        const newActivities = [...sectionData];
                                        newActivities[i] = { ...activity, description: e.target.value };
                                        updateSection('activities', newActivities);
                                      }}
                                      className="text-sm bg-yellow-100 px-2 py-1 rounded w-full"
                                      rows={2}
                                      placeholder="Description"
                                    />
                                  )}
                                </div>
                              ) : (
                                <>
                                  <p className="font-medium">
                                    {activity.title}
                                    {activity.role && <span className="font-normal text-gray-600"> — {activity.role}</span>}
                                  </p>
                                  {activity.description && (
                                    <p className="text-sm text-gray-600">{activity.description}</p>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>

            {/* Empty State */}
            {sections && sections.experience?.length === 0 && sections.skills?.length === 0 && (
              <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-xl text-center">
                <p className="text-white/60">
                  Complete care plans and quick routines to automatically populate your summary with useful support details.
                </p>
              </div>
            )}

            {/* Regenerate Button */}
            {sections && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  onClick={handleGenerateResume}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate with AI
                    </>
                  )}
                </button>
                <p className="text-xs text-white/40">
                  Regenerate if you've completed new care plans or updated your profile
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Data Collection Modal - Programs and Awards */}
      <AnimatePresence>
        {showDataCollectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDataCollectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--bg-space-900)] border border-white/10 rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Enhance Your Care Summary</h3>
                <p className="text-white/60">
                  Add support programs, community groups, and helpful contacts. You can skip this if you prefer.
                </p>
              </div>

              {/* Programs Section */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-[var(--star)] mb-2">Programs & Helpful Contacts</h4>
                <p className="text-[var(--star)]/60 mb-4">
                  Add any programs, services, or community groups involved in support.
                </p>

                {programs.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {programs.map((program, index) => (
                      <ProgramCard
                        key={index}
                        program={program}
                        index={index}
                        onEdit={openProgramForm}
                        onRemove={removeProgram}
                      />
                    ))}
                  </div>
                )}

                {!showProgramForm && (
                  <button
                    onClick={() => openProgramForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                  >
                    <Plus size={20} />
                    Add Program
                  </button>
                )}

                {showProgramForm && (
                  <div className="p-4 bg-[var(--bg-space-800)] border border-[var(--border-color)] rounded-lg space-y-3">
                    <h4 className="text-lg font-semibold text-[var(--star)]">
                      {editProgramIndex !== null ? "Edit Program" : "Add Program"}
                    </h4>

                    <input
                      type="text"
                      value={programFormData.title}
                      onChange={(e) => setProgramFormData({ ...programFormData, title: e.target.value })}
                      placeholder="Title *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <input
                      type="text"
                      value={programFormData.organization}
                      onChange={(e) => setProgramFormData({ ...programFormData, organization: e.target.value })}
                      placeholder="Organization/Contact *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <input
                      type="text"
                      value={programFormData.role || ""}
                      onChange={(e) => setProgramFormData({ ...programFormData, role: e.target.value })}
                      placeholder="Role/Result (optional)"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <input
                      type="text"
                      value={programFormData.monthYear}
                      onChange={(e) => setProgramFormData({ ...programFormData, monthYear: e.target.value })}
                      placeholder="Month/Year (e.g., Jan 2023) *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <textarea
                      value={programFormData.description || ""}
                      onChange={(e) => setProgramFormData({ ...programFormData, description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none resize-none"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={saveProgram}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={closeProgramForm}
                        className="px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)]/70 rounded hover:bg-[var(--bg-space-600)] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Awards Section */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-[var(--star)] mb-2">Recognitions & Notes</h4>
                <p className="text-[var(--star)]/60 mb-4">
                  Add any notes, recognitions, or preferences helpers should know.
                </p>

                {awards.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {awards.map((award, index) => (
                      <AwardCard
                        key={index}
                        award={award}
                        index={index}
                        onEdit={openAwardForm}
                        onRemove={removeAward}
                      />
                    ))}
                  </div>
                )}

                {!showAwardForm && (
                  <button
                    onClick={() => openAwardForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                  >
                    <Plus size={20} />
                    Add Award
                  </button>
                )}

                {showAwardForm && (
                  <div className="p-4 bg-[var(--bg-space-800)] border border-[var(--border-color)] rounded-lg space-y-3">
                    <h4 className="text-lg font-semibold text-[var(--star)]">
                      {editAwardIndex !== null ? "Edit Award" : "Add Award"}
                    </h4>

                    <input
                      type="text"
                      value={awardFormData.title}
                      onChange={(e) => setAwardFormData({ ...awardFormData, title: e.target.value })}
                      placeholder="Title *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <input
                      type="text"
                      value={awardFormData.issuer}
                      onChange={(e) => setAwardFormData({ ...awardFormData, issuer: e.target.value })}
                      placeholder="Issuer *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <input
                      type="text"
                      value={awardFormData.monthYear}
                      onChange={(e) => setAwardFormData({ ...awardFormData, monthYear: e.target.value })}
                      placeholder="Month/Year (e.g., Jan 2023) *"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none"
                    />

                    <textarea
                      value={awardFormData.description || ""}
                      onChange={(e) => setAwardFormData({ ...awardFormData, description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 outline-none resize-none"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={saveAward}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={closeAwardForm}
                        className="px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)]/70 rounded hover:bg-[var(--bg-space-600)] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowDataCollectionModal(false);
                    // Generate without any data (user chose to skip)
                    setIsGenerating(true);
                    generateResume({
                      intent: selectedIntent,
                      template: selectedTemplate,
                      includeEmail,
                      programs: programs.length > 0 ? programs : undefined,
                      awards: awards.length > 0 ? awards : undefined,
                    }).then((result) => {
                      if (result) {
                        setResumeData(result);
                        setEditedSections(null);
                        toast.success("Care summary generated!");
                      } else {
                        toast.error("Failed to generate care summary - no data returned");
                      }
                    }).catch((error) => {
                      console.error("Failed to generate care summary:", error);
                      const errorMessage = error?.message || error?.toString() || "Unknown error";
                      toast.error(`Failed to generate care summary: ${errorMessage}`);
                    }).finally(() => {
                      setIsGenerating(false);
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-white"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => {
                    setShowDataCollectionModal(false);
                    // Generate with the data they added
                    setIsGenerating(true);
                    generateResume({
                      intent: selectedIntent,
                      template: selectedTemplate,
                      includeEmail,
                      programs: programs.length > 0 ? programs : undefined,
                      awards: awards.length > 0 ? awards : undefined,
                    }).then((result) => {
                      if (result) {
                        setResumeData(result);
                        setEditedSections(null);
                        toast.success("Care summary generated!");
                      } else {
                        toast.error("Failed to generate care summary - no data returned");
                      }
                    }).catch((error) => {
                      console.error("Failed to generate care summary:", error);
                      const errorMessage = error?.message || error?.toString() || "Unknown error";
                      toast.error(`Failed to generate care summary: ${errorMessage}`);
                    }).finally(() => {
                      setIsGenerating(false);
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] hover:opacity-90 text-white font-medium rounded-lg transition-all"
                >
                  Continue to Generate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Save Care Summary</h3>
              <input
                type="text"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                placeholder="Summary name..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!resumeName.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          /* Hide browser print headers and footers */
          @page {
            margin-top: 0.5in;
            margin-bottom: 0.5in;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Hide navigation and header */
          nav,
          header,
          .top-bar,
          [role="navigation"],
          [class*="nav"],
          [class*="header"],
          [class*="menu"] {
            display: none !important;
          }
          
          /* Hide floating elements like chat buttons */
          [class*="fixed"],
          [class*="sticky"],
          [style*="position: fixed"],
          [style*="position: sticky"],
          button[class*="fixed"],
          button[class*="bottom"],
          button[class*="right"],
          .fixed,
          .sticky {
            display: none !important;
          }
          
          /* Hide everything except resume */
          body > div:not(:has(#resume-preview)) {
            display: none !important;
          }
          
          /* Show only the resume container */
          .max-w-7xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .grid {
            display: block !important;
          }
          
          .lg\\:col-span-1 {
            display: none !important;
          }
          
          .lg\\:col-span-2 {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #resume-preview {
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            page-break-inside: avoid;
          }
          
          /* Hide edit mode highlights */
          .bg-yellow-100 {
            background: transparent !important;
          }
          
          /* Hide regenerate button and empty state */
          .mt-6.flex.flex-col.items-center,
          .mt-6.p-6.bg-white\\/5 {
            display: none !important;
          }
          
          /* Ensure only resume content is visible */
          .min-h-screen {
            min-height: auto !important;
          }
          
          .p-6 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

// Program Card Component
function ProgramCard({ program, index, onEdit, onRemove }: { 
  program: Program; 
  index: number; 
  onEdit: (index: number) => void; 
  onRemove: (index: number) => void;
}) {
  return (
    <div className="p-4 bg-[var(--bg-space-700)] border border-[var(--border-color)] rounded-lg">
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
            onClick={() => onEdit(index)}
            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded transition-all"
            aria-label={`Edit ${program.title}`}
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-all"
            aria-label={`Remove ${program.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Award Card Component
function AwardCard({ award, index, onEdit, onRemove }: { 
  award: Award; 
  index: number; 
  onEdit: (index: number) => void; 
  onRemove: (index: number) => void;
}) {
  return (
    <div className="p-4 bg-[var(--bg-space-700)] border border-[var(--border-color)] rounded-lg">
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
            onClick={() => onEdit(index)}
            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded transition-all"
            aria-label={`Edit ${award.title}`}
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-all"
            aria-label={`Remove ${award.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
