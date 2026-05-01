import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Settings, Eye, EyeOff, Linkedin, Mail, Globe,
  X, Check, AlertTriangle, ChevronRight, Sparkles, Target,
  HeartHandshake, Loader2, UserX, Flag, Phone, MessageCircle, Send, Clock
} from "lucide-react";
import { toast } from "sonner";
import { CallButton } from "./AudioCall";
import { MessagingModal } from "./MessagingModal";
import { useLocation } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";

type ViewMode = "discover" | "mymatches" | "settings" | "requests";

export function ArcConnectPage() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("discover");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingUser, setMessagingUser] = useState<{ userId: Id<"users">; name: string } | null>(null);

  const myProfile = useQuery(api.arcConnect.getMyProfile);
  const matches = useQuery(api.arcConnect.getMatches);
  const acceptedMatches = useQuery(api.matchRequests.getAcceptedMatches);
  const currentUser = useQuery(api.users.getCurrentUser);
  const pendingRequests = useQuery(api.matchRequests.getPendingRequests);
  const myMatchCount = useQuery(api.matchRequests.getMyMatchCount);
  
  // Get online statuses for all matches
  const matchUserIds = matches?.map(m => m.userId) || [];
  const acceptedMatchUserIds = acceptedMatches?.map(m => m.userId) || [];
  const allUserIds = [...matchUserIds, ...acceptedMatchUserIds];
  const onlineStatuses = useQuery(
    api.presence.getOnlineStatuses,
    allUserIds.length > 0 ? { userIds: allUserIds } : "skip"
  );
  
  const setupProfile = useMutation(api.arcConnect.setupProfile);
  const updateProfile = useMutation(api.arcConnect.updateProfile);
  const skipMatch = useMutation(api.arcConnect.skipMatch);
  const blockUser = useMutation(api.arcConnect.blockUser);
  const updateUserEmail = useMutation(api.users.updateEmail);
  const updatePresence = useMutation(api.presence.updatePresence);
  const sendMatchRequest = useMutation(api.matchRequests.sendMatchRequest);
  const acceptMatchRequest = useMutation(api.matchRequests.acceptMatchRequest);
  const declineMatchRequest = useMutation(api.matchRequests.declineMatchRequest);

  const isEnabled = myProfile?.enabled;
  const userEmail = currentUser?.email;

  // Handle opening chat from notification
  useEffect(() => {
    const state = location.state as any;
    if (state?.openChat && state?.userId && state?.userName) {
      setMessagingUser({ userId: state.userId, name: state.userName });
      setShowMessaging(true);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Update presence every 2 minutes
  useEffect(() => {
    if (currentUser) {
      updatePresence();
      const interval = setInterval(() => {
        updatePresence();
      }, 2 * 60 * 1000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [currentUser, updatePresence]);

  // Setup form state
  const [setupForm, setSetupForm] = useState({
    visibility: "matches_only",
    shareEmail: false,
    shareLinkedIn: false,
    shareSocials: false,
    linkedInUrl: "",
    bio: "",
    lookingFor: [] as string[],
  });

  // Initialize email input with current email if available
  useEffect(() => {
    if (userEmail && showEmailPrompt) {
      setEmailInput(userEmail);
    }
  }, [userEmail, showEmailPrompt]);

  const handleSetup = async () => {
    try {
      await setupProfile({
        enabled: true,
        visibility: setupForm.visibility,
        shareEmail: setupForm.shareEmail,
        shareLinkedIn: setupForm.shareLinkedIn,
        shareSocials: setupForm.shareSocials,
        linkedInUrl: setupForm.linkedInUrl || undefined,
        bio: setupForm.bio || undefined,
        lookingFor: setupForm.lookingFor.length > 0 ? setupForm.lookingFor : undefined,
      });
      toast.success("Care Circle enabled!");
      setShowSetupModal(false);
    } catch (error) {
      toast.error("Failed to setup Care Circle");
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    try {
      await updateUserEmail({ email: emailInput });
      setShowEmailPrompt(false);
      setSetupForm(prev => ({ ...prev, shareEmail: true }));
      toast.success("Email saved! You can now share it with matches.");
    } catch (error) {
      toast.error("Failed to update email");
    }
  };

  const handleSkip = async (userId: any) => {
    try {
      await skipMatch({ targetUserId: userId });
      toast.success("Match skipped");
      setSelectedMatch(null);
    } catch (error) {
      toast.error("Failed to skip match");
    }
  };

  const handleBlock = async (userId: any) => {
    try {
      await blockUser({ targetUserId: userId });
      toast.success("User blocked");
      setSelectedMatch(null);
    } catch (error) {
      toast.error("Failed to block user");
    }
  };

  const handleSendMatchRequest = async (userId: Id<"users">) => {
    try {
      const result = await sendMatchRequest({ recipientId: userId });
      if (result.autoAccepted) {
        toast.success("Match request automatically accepted! You can now message each other.", {
          description: "No coins charged - they already sent you a request!"
        });
      } else {
        toast.success(`Match request sent!`, {
          description: "10 care points deducted"
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send match request");
    }
  };

  const handleAcceptRequest = async (requestId: Id<"matchRequests">) => {
    try {
      await acceptMatchRequest({ requestId });
      toast.success("Match request accepted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleDeclineRequest = async (requestId: Id<"matchRequests">) => {
    try {
      await declineMatchRequest({ requestId });
      toast.success("Match request declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request");
    }
  };

  const toggleLookingFor = (item: string) => {
    setSetupForm(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(item)
        ? prev.lookingFor.filter(i => i !== item)
        : [...prev.lookingFor, item],
    }));
  };

  const LOOKING_FOR_OPTIONS = [
    { value: "check_in_partner", label: "Check-in Partner" },
    { value: "ride_helper", label: "Ride Helper" },
    { value: "errand_helper", label: "Errand Helper" },
    { value: "routine_support", label: "Routine Support" },
    { value: "caregiver", label: "Caregiver" },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] bg-clip-text text-transparent flex items-center gap-3">
                <Users className="w-8 h-8 text-[var(--accent-cyan)]" />
                Care Circle
              </h1>
              <p className="text-white/60 mt-2">
                Connect with caregivers and helpers who share your support needs and interests
              </p>
            </div>
            {myMatchCount !== undefined && myMatchCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-xl">
                <Users className="w-5 h-5 text-[var(--accent-cyan)]" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{myMatchCount}</div>
                  <div className="text-xs text-white/60">Match{myMatchCount !== 1 ? 'es' : ''}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Not Enabled State */}
        {myProfile === null || !isEnabled ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Join Care Circle</h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Find caregivers and helpers with similar support needs, complementary skills, and shared interests. 
                Connect for check-ins, rides, errands, and routine support.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-xl">
                  <Target className="w-6 h-6 text-[var(--accent-cyan)] mx-auto mb-2" />
                  <p className="text-sm text-white/80">Match by Support Needs</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <Sparkles className="w-6 h-6 text-[var(--accent-violet)] mx-auto mb-2" />
                  <p className="text-sm text-white/80">Complementary Skills</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <HeartHandshake className="w-6 h-6 text-[var(--warning)] mx-auto mb-2" />
                  <p className="text-sm text-white/80">Compatible Support Role</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(true)}
                className="px-8 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setViewMode("discover")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "discover"
                    ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Discover
              </button>
              <button
                onClick={() => setViewMode("mymatches")}
                className={`px-4 py-2 rounded-lg transition-colors relative ${
                  viewMode === "mymatches"
                    ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                My Matches
                {myMatchCount && myMatchCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-xs font-bold rounded-full">
                    {myMatchCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode("requests")}
                className={`px-4 py-2 rounded-lg transition-colors relative ${
                  viewMode === "requests"
                    ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Send className="w-4 h-4 inline mr-2" />
                Requests
                {pendingRequests && pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode("settings")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "settings"
                    ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Settings
              </button>
            </div>

            {/* Discover View */}
            {viewMode === "discover" && (
              <MatchesView 
                matches={matches}
                onlineStatuses={onlineStatuses}
                onSelectMatch={setSelectedMatch}
                onSendRequest={handleSendMatchRequest}
              />
            )}

            {/* My Matches View */}
            {viewMode === "mymatches" && (
              <MyMatchesView 
                matches={acceptedMatches}
                onlineStatuses={onlineStatuses}
                onMessage={(userId, name) => {
                  setMessagingUser({ userId, name });
                  setShowMessaging(true);
                }}
              />
            )}

            {/* Requests View */}
            {viewMode === "requests" && (
              <RequestsView 
                requests={pendingRequests}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            )}

            {/* Settings View */}
            {viewMode === "settings" && (
              <SettingsPanel 
                profile={myProfile} 
                onUpdate={updateProfile}
                lookingForOptions={LOOKING_FOR_OPTIONS}
              />
            )}
          </>
        )}
      </div>

      {/* Match Detail Modal */}
      <AnimatePresence>
        {selectedMatch && <MatchDetailModal 
          match={selectedMatch}
          isOnline={onlineStatuses?.[selectedMatch.userId]}
          onClose={() => setSelectedMatch(null)}
          onMessage={(userId, name) => {
            setMessagingUser({ userId, name });
            setShowMessaging(true);
          }}
          onSkip={handleSkip}
          onBlock={handleBlock}
          onSendRequest={handleSendMatchRequest}
        />}
      </AnimatePresence>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-[9999] overflow-y-auto"
            onClick={() => setShowSetupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-lg mx-4 mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Setup Care Circle</h2>

              <div className="space-y-6">
                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={setupForm.visibility}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, visibility: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="public">Public - Anyone can see</option>
                    <option value="matches_only">Matches Only - Only matched users</option>
                  </select>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Short Bio (optional)
                  </label>
                  <textarea
                    value={setupForm.bio}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 resize-none"
                    rows={3}
                  />
                </div>

                {/* Looking For */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    What are you looking for?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LOOKING_FOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleLookingFor(option.value)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          setupForm.lookingFor.includes(option.value)
                            ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/50"
                            : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Sharing */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    Share Contact Info
                  </label>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setupForm.shareLinkedIn}
                            onChange={(e) => setSetupForm(prev => ({ ...prev, shareLinkedIn: e.target.checked }))}
                            className="w-4 h-4 rounded"
                          />
                          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                          <span className="text-white/80">Share LinkedIn</span>
                        </label>
                        {!setupForm.linkedInUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              toast.info("LinkedIn integration coming soon! For now, please enter your LinkedIn URL manually.");
                            }}
                            className="px-3 py-1.5 bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Linkedin className="w-3 h-3" />
                            Connect
                          </button>
                        )}
                      </div>
                      {setupForm.shareLinkedIn && (
                        <input
                          type="url"
                          value={setupForm.linkedInUrl}
                          onChange={(e) => setSetupForm(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 ml-7"
                        />
                      )}
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setupForm.shareEmail}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setShowEmailPrompt(true);
                            return;
                          }
                          setSetupForm(prev => ({ ...prev, shareEmail: checked }));
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <Mail className="w-4 h-4 text-white/60" />
                      <span className="text-white/80">Share Email</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetup}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Enable Care Circle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messaging Modal */}
      {messagingUser && (
        <MessagingModal
          isOpen={showMessaging}
          onClose={() => {
            setShowMessaging(false);
            setMessagingUser(null);
          }}
          otherUserId={messagingUser.userId}
          otherUserName={messagingUser.name}
        />
      )}

      {/* Email Prompt Modal */}
      <AnimatePresence>
        {showEmailPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
            onClick={() => setShowEmailPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[var(--accent-cyan)]/20 rounded-lg">
                  <Mail className="w-5 h-5 text-[var(--accent-cyan)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Email Required</h3>
                  <p className="text-sm text-white/60 mt-1">
                    Please provide your email address to share it with matches
                  </p>
                </div>
              </div>

              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailPrompt(false);
                    setSetupForm(prev => ({ ...prev, shareEmail: false }));
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailSubmit}
                  className="flex-1 px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black font-semibold rounded-lg transition-colors"
                >
                  Save Email
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Match Detail Modal Component
function MatchDetailModal({ match, isOnline, onClose, onMessage, onSkip, onBlock, onSendRequest }: any) {
  const matchStatus = useQuery(api.matchRequests.getMatchRequestStatus, { otherUserId: match.userId });
  const userMatchCount = useQuery(api.matchRequests.getMatchCount, { userId: match.userId });
  const [sending, setSending] = useState(false);
  const isMatched = matchStatus?.status === "accepted";

  const handleSendRequest = async () => {
    setSending(true);
    try {
      await onSendRequest(match.userId);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-[9999] overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-lg mx-4 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-white">{match.name}</h2>
              {isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-400/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">Online</span>
                </div>
              )}
            </div>
            <p className="text-white/50">
              {match.grade}{match.state && `, ${match.state}`}
            </p>
            {userMatchCount !== undefined && (
              <div className="flex items-center gap-1 mt-1 text-sm text-white/40">
                <Users className="w-4 h-4" />
                <span>{userMatchCount} match{userMatchCount !== 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {match.bio && (
          <p className="text-white/70 mb-4">{match.bio}</p>
        )}

        <div className="space-y-4 mb-6">
          {match.matchReasons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/50 mb-2">Why you matched</h4>
              <div className="flex flex-wrap gap-2">
                {match.matchReasons.map((reason: string, i: number) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-[var(--accent-violet)]/20 text-[var(--accent-violet)] rounded-full text-sm"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {match.lookingFor.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/50 mb-2">Current Support Needs</h4>
              <ul className="space-y-1">
                {match.lookingFor.map((goal: string, i: number) => (
                  <li key={i} className="text-white/80 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--accent-cyan)]" />
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {match.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/50 mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {match.skills.map((skill: string, i: number) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-white/10 text-white/70 rounded text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {match.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/50 mb-2">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {match.interests.map((interest: string, i: number) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rounded text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Options - Only show if matched */}
        {isMatched ? (
          <div className="flex flex-col gap-3 mb-4">
            {match.shareEmail && match.email && (
              <a
                href={`mailto:${match.email}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                {match.email}
              </a>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => onMessage(match.userId, match.name)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-cyan)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-5 h-5" />
                Message
              </button>
              
              <CallButton 
                targetUserId={match.userId} 
                targetName={match.name} 
              />
              
              {match.shareLinkedIn && match.linkedInUrl && (
                <a
                  href={match.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white rounded-lg transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            {matchStatus?.type === "sent" && matchStatus?.status === "pending" ? (
              <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-400/10 px-4 py-3 rounded-lg">
                <Clock className="w-5 h-5" />
                <span>Match request pending... Waiting for {match.name} to accept</span>
              </div>
            ) : matchStatus?.type === "sent" && matchStatus?.status === "declined" ? (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-lg">
                <X className="w-5 h-5" />
                <span>Your match request was declined</span>
              </div>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="flex items-center gap-1">
                      Send Request • 10 <img src="/coin-64.png" alt="care points" width={16} height={16} className="w-4 h-4" />
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/10">
          <button
            onClick={() => onSkip(match.userId)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-white/70"
          >
            <UserX className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={() => onBlock(match.userId)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400"
          >
            <Flag className="w-4 h-4" />
            Block
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Matches View Component
function MatchesView({ matches, onlineStatuses, onSelectMatch, onSendRequest }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {!matches ? (
        <div className="col-span-full flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : matches.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No matches found yet</p>
          <p className="text-white/40 text-sm mt-2">
            Complete more daily routines and care plans to improve your match potential
          </p>
        </div>
      ) : (
        matches.map((match: any) => (
          <MatchCard 
            key={match.id}
            match={match}
            isOnline={onlineStatuses?.[match.userId]}
            onSelect={onSelectMatch}
            onSendRequest={onSendRequest}
          />
        ))
      )}
    </div>
  );
}

// Match Card Component
function MatchCard({ match, isOnline, onSelect, onSendRequest }: any) {
  const matchStatus = useQuery(api.matchRequests.getMatchRequestStatus, { otherUserId: match.userId });
  const userMatchCount = useQuery(api.matchRequests.getMatchCount, { userId: match.userId });
  const [sending, setSending] = useState(false);

  const handleSendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSending(true);
    try {
      await onSendRequest(match.userId);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors cursor-pointer relative"
      onClick={() => onSelect(match)}
    >
      {/* Online Status Indicator */}
      {isOnline && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{match.name}</h3>
          <p className="text-sm text-white/50">
            {match.grade && `${match.grade}`}
            {match.state && `, ${match.state}`}
          </p>
          {userMatchCount !== undefined && (
            <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
              <Users className="w-3 h-3" />
              <span>{userMatchCount} match{userMatchCount !== 1 ? 'es' : ''}</span>
            </div>
          )}
        </div>
        <div className="px-2 py-1 bg-[var(--accent-cyan)]/20 rounded-full">
          <span className="text-xs text-[var(--accent-cyan)] font-medium">
            {match.matchScore}% match
          </span>
        </div>
      </div>
      
      {match.bio && (
        <p className="text-sm text-white/60 mb-3 line-clamp-2">{match.bio}</p>
      )}

      {match.matchReasons.length > 0 && (
        <div className="mb-3">
          {match.matchReasons.map((reason: string, i: number) => (
            <span 
              key={i}
              className="inline-block text-xs bg-[var(--accent-violet)]/20 text-[var(--accent-violet)] px-2 py-1 rounded-full mr-2 mb-1"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      {match.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {match.skills.slice(0, 3).map((skill: string, i: number) => (
            <span 
              key={i}
              className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded"
            >
              {skill}
            </span>
          ))}
          {match.skills.length > 3 && (
            <span className="text-xs text-white/40">
              +{match.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Contact Info Preview - Locked until matched */}
      <div className="flex items-center gap-3 mb-3 text-white/40">
        {match.shareEmail && (
          <div className="relative group">
            <div className="flex items-center gap-1.5 relative">
              <Mail className="w-4 h-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[1.5px] bg-white/40 rotate-[-20deg]" />
              </div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Match to view email
            </div>
          </div>
        )}
        {match.shareLinkedIn && (
          <div className="relative group">
            <div className="flex items-center gap-1.5 relative">
              <Linkedin className="w-4 h-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[1.5px] bg-white/40 rotate-[-20deg]" />
              </div>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Match to view LinkedIn
            </div>
          </div>
        )}
      </div>

      {/* Match Request Status */}
      {matchStatus?.status === "accepted" ? (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg w-fit">
          <Check className="w-3.5 h-3.5" />
          <span>Matched</span>
        </div>
      ) : matchStatus?.type === "sent" && matchStatus?.status === "pending" ? (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg w-fit">
          <Clock className="w-3.5 h-3.5" />
          <span>Pending...</span>
        </div>
      ) : matchStatus?.type === "sent" && matchStatus?.status === "declined" ? (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg w-fit">
          <X className="w-3.5 h-3.5" />
          <span>Declined</span>
        </div>
      ) : (
        <button
          onClick={handleSendRequest}
          disabled={sending}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-xs font-medium w-fit"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span className="flex items-center gap-1">
                10 <img src="/coin-64.png" alt="care points" width={14} height={14} className="w-3.5 h-3.5" />
              </span>
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

// Requests View Component
function RequestsView({ requests, onAccept, onDecline }: any) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {!requests ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <Send className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No pending match requests</p>
          <p className="text-white/40 text-sm mt-2">
            When someone sends you a match request, it will appear here
          </p>
        </div>
      ) : (
        requests.map((request: any) => (
          <motion.div
            key={request._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{request.senderName}</h3>
                <p className="text-sm text-white/50">
                  {request.senderGrade && `${request.senderGrade}`}
                  {request.senderState && `, ${request.senderState}`}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Sent {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onAccept(request._id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Check className="w-5 h-5" />
                Accept
              </button>
              <button
                onClick={() => onDecline(request._id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

// Settings Panel Component
function SettingsPanel({ 
  profile, 
  onUpdate,
  lookingForOptions 
}: { 
  profile: any; 
  onUpdate: any;
  lookingForOptions: { value: string; label: string }[];
}) {
  const [saving, setSaving] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateUserEmail = useMutation(api.users.updateEmail);
  const userEmail = currentUser?.email;
  
  const [form, setForm] = useState({
    enabled: profile?.enabled ?? true,
    visibility: profile?.visibility ?? "matches_only",
    shareEmail: profile?.shareEmail ?? false,
    shareLinkedIn: profile?.shareLinkedIn ?? false,
    linkedInUrl: profile?.linkedInUrl ?? "",
    bio: profile?.bio ?? "",
    lookingFor: profile?.lookingFor ?? [],
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(form);
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    try {
      await updateUserEmail({ email: emailInput });
      setShowEmailPrompt(false);
      setForm(prev => ({ ...prev, shareEmail: true }));
      toast.success("Email saved! You can now share it with matches.");
    } catch (error) {
      toast.error("Failed to update email");
    }
  };

  const toggleLookingFor = (item: string) => {
    setForm(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(item)
        ? prev.lookingFor.filter((i: string) => i !== item)
        : [...prev.lookingFor, item],
    }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Enable/Disable */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Care Circle Status</h3>
            <p className="text-sm text-white/50">Enable or disable your Care Circle profile</p>
          </div>
          <button
            onClick={() => setForm(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              form.enabled ? "bg-[var(--accent-cyan)]" : "bg-white/20"
            }`}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full"
              animate={{ left: form.enabled ? "calc(100% - 28px)" : "4px" }}
            />
          </button>
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Visibility</h3>
        <select
          value={form.visibility}
          onChange={(e) => setForm(prev => ({ ...prev, visibility: e.target.value }))}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
        >
          <option value="public">Public</option>
          <option value="matches_only">Matches Only</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Bio */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Bio</h3>
        <textarea
          value={form.bio}
          onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
          placeholder="Tell others about yourself..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 resize-none"
          rows={3}
        />
      </div>

      {/* Looking For */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Looking For</h3>
        <div className="flex flex-wrap gap-2">
          {lookingForOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleLookingFor(option.value)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                form.lookingFor.includes(option.value)
                  ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/50"
                  : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Sharing */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Contact Sharing</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.shareLinkedIn}
                  onChange={(e) => setForm(prev => ({ ...prev, shareLinkedIn: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                <span className="text-white/80">Share LinkedIn</span>
              </label>
              {!form.linkedInUrl && (
                <button
                  onClick={() => {
                    toast.info("LinkedIn integration coming soon! For now, please enter your LinkedIn URL manually.");
                  }}
                  className="px-3 py-1.5 bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  Connect LinkedIn
                </button>
              )}
            </div>
            {form.shareLinkedIn && (
              <input
                type="url"
                value={form.linkedInUrl}
                onChange={(e) => setForm(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            )}
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.shareEmail}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  setEmailInput(userEmail || "");
                  setShowEmailPrompt(true);
                  return;
                }
                setForm(prev => ({ ...prev, shareEmail: checked }));
              }}
              className="w-4 h-4 rounded"
            />
            <Mail className="w-4 h-4 text-white/60" />
            <span className="text-white/80">Share Email</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : (
          "Save Settings"
        )}
      </button>

      {/* Email Prompt Modal */}
      <AnimatePresence>
        {showEmailPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]"
            onClick={() => setShowEmailPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-[var(--accent-cyan)]/20 rounded-lg">
                  <Mail className="w-5 h-5 text-[var(--accent-cyan)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Email Required</h3>
                  <p className="text-sm text-white/60 mt-1">
                    Please provide your email address to share it with matches
                  </p>
                </div>
              </div>

              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailPrompt(false);
                    setForm(prev => ({ ...prev, shareEmail: false }));
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailSubmit}
                  className="flex-1 px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black font-semibold rounded-lg transition-colors"
                >
                  Save Email
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// My Matches View Component - Shows accepted matches
function MyMatchesView({ matches, onlineStatuses, onMessage }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {!matches ? (
        <div className="col-span-full flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : matches.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No matches yet</p>
          <p className="text-white/40 text-sm mt-2">
            Send match requests from the Discover tab to connect with caregivers and helpers
          </p>
        </div>
      ) : (
        matches.map((match: any) => (
          <AcceptedMatchCard 
            key={match.userId}
            match={match}
            isOnline={onlineStatuses?.[match.userId]}
            onMessage={onMessage}
          />
        ))
      )}
    </div>
  );
}

// Accepted Match Card Component
function AcceptedMatchCard({ match, isOnline, onMessage }: any) {
  const matchedDate = match.matchedAt ? new Date(match.matchedAt).toLocaleDateString() : 'Recently';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors relative"
    >
      {/* Online Status Indicator */}
      {isOnline && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{match.name}</h3>
          <p className="text-sm text-white/50">
            {match.grade && `${match.grade}`}
            {match.state && `, ${match.state}`}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
            <Check className="w-3 h-3" />
            <span>Matched {matchedDate}</span>
          </div>
        </div>
      </div>
      
      {match.bio && (
        <p className="text-sm text-white/60 mb-3 line-clamp-2">{match.bio}</p>
      )}

      {match.lookingFor && match.lookingFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {match.lookingFor.slice(0, 3).map((item: string) => (
            <span
              key={item}
              className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/60"
            >
              {item}
            </span>
          ))}
          {match.lookingFor.length > 3 && (
            <span className="px-2 py-1 bg-white/5 rounded-full text-xs text-white/60">
              +{match.lookingFor.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Contact Info */}
      <div className="flex flex-wrap gap-2 mb-3">
        {match.email && (
          <a
            href={`mailto:${match.email}`}
            className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="w-3 h-3" />
            Email
          </a>
        )}
        {match.linkedInUrl && (
          <a
            href={match.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-1 bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 rounded-lg text-xs text-[#0A66C2] hover:text-[#0A66C2] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Linkedin className="w-3 h-3" />
            LinkedIn
          </a>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onMessage(match.userId, match.name)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] rounded-lg transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Message</span>
        </button>
        <CallButton recipientId={match.userId} recipientName={match.name} />
      </div>
    </motion.div>
  );
}
