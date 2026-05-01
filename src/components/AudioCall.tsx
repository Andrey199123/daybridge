import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import DailyIframe from "@daily-co/daily-js";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

// Incoming call notification component
export function IncomingCallNotification() {
  const pendingInvitations = useQuery(api.audioCalls.getPendingInvitations);
  const acceptCall = useMutation(api.audioCalls.acceptCall);
  const declineCall = useMutation(api.audioCalls.declineCall);
  const [joiningCall, setJoiningCall] = useState<string | null>(null);

  const handleAccept = async (invitationId: any) => {
    setJoiningCall(invitationId);
    try {
      const result = await acceptCall({ invitationId });
      // The AudioCallInterface will pick up the active call
    } catch (error) {
      toast.error("Failed to join call");
      setJoiningCall(null);
    }
  };

  const handleDecline = async (invitationId: any) => {
    try {
      await declineCall({ invitationId });
    } catch (error) {
      toast.error("Failed to decline call");
    }
  };

  if (!pendingInvitations || pendingInvitations.length === 0) return null;

  const invitation = pendingInvitations[0];

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999]"
    >
      <div className="bg-[var(--card-bg)] border border-[var(--accent-cyan)]/50 rounded-2xl p-6 shadow-2xl min-w-[300px]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center">
            <Phone className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <p className="text-white font-semibold">{invitation.callerName}</p>
            <p className="text-white/60 text-sm">Incoming audio call...</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => handleDecline(invitation._id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            Decline
          </button>
          <button
            onClick={() => handleAccept(invitation._id)}
            disabled={joiningCall === invitation._id}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors disabled:opacity-50"
          >
            {joiningCall === invitation._id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
            Accept
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}


// Outgoing call notification
export function OutgoingCallNotification() {
  const outgoingCall = useQuery(api.audioCalls.getOutgoingCall);
  const cancelCall = useMutation(api.audioCalls.cancelCall);

  const handleCancel = async () => {
    if (!outgoingCall) return;
    try {
      await cancelCall({ invitationId: outgoingCall._id });
    } catch (error) {
      toast.error("Failed to cancel call");
    }
  };

  if (!outgoingCall) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999]"
    >
      <div className="bg-[var(--card-bg)] border border-[var(--accent-cyan)]/50 rounded-2xl p-6 shadow-2xl min-w-[300px]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <div>
            <p className="text-white font-semibold">Calling {outgoingCall.receiverName}...</p>
            <p className="text-white/60 text-sm">Waiting for answer</p>
          </div>
        </div>
        
        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
          Cancel
        </button>
      </div>
    </motion.div>,
    document.body
  );
}

// Active call interface
export function ActiveCallInterface() {
  const activeCall = useQuery(api.audioCalls.getActiveCall);
  const endCall = useMutation(api.audioCalls.endCall);
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [participantCount, setParticipantCount] = useState(1);
  const [remoteAudioElements, setRemoteAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  // Join the call when we have an active call
  useEffect(() => {
    if (!activeCall || callFrame) return;

    const joinCall = async () => {
      try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create call object with manual subscription mode
        const frame = DailyIframe.createCallObject({
          subscribeToTracksAutomatically: false, // Disable auto-subscribe so we can control it
        });

        // Start camera BEFORE joining
        await frame.startCamera({
          audioSource: true,
          videoSource: false,
        });

        frame.on("joined-meeting", async () => {
          console.log("✅ Joined meeting successfully");
          setIsConnecting(false);
          toast.success("Call connected");
          
          // Log participants
          const participants = frame.participants();
          console.log("👥 Participants:", Object.keys(participants).length);
          Object.entries(participants).forEach(([id, p]: [string, any]) => {
            console.log(`  - ${p.local ? 'Local' : 'Remote'}: ${p.user_name || id}, audio: ${p.audio}`);
          });
          setParticipantCount(Object.keys(participants).length);
        });

        frame.on("participant-joined", async (event) => {
          console.log("👤 Participant joined:", event.participant.user_name || event.participant.user_id);
          console.log("   Audio enabled:", event.participant.audio);
          toast.success("Other person joined the call");
          
          // Subscribe to remote participant's audio with correct format
          try {
            await frame.updateParticipant(event.participant.session_id, {
              setSubscribedTracks: {
                audio: true,
                video: false,
                screenVideo: false,
                screenAudio: false,
              },
            });
            console.log("🔊 Subscribed to remote audio");
          } catch (err) {
            console.error("Failed to subscribe to remote audio:", err);
          }
          
          const participants = frame.participants();
          setParticipantCount(Object.keys(participants).length);
          console.log("👥 Total participants now:", Object.keys(participants).length);
        });

        frame.on("participant-updated", (event) => {
          if (!event.participant.local) {
            console.log("🔄 Remote participant updated:", {
              name: event.participant.user_name || event.participant.user_id,
              audio: event.participant.audio,
              audioTrack: event.participant.tracks?.audio?.state,
            });
          }
        });

        frame.on("participant-left", (event) => {
          console.log("👋 Participant left:", event.participant.user_name || event.participant.user_id);
          toast.info("Other person left the call");
          
          // Clean up audio element for this participant
          const sessionId = event.participant.session_id;
          const audioEl = remoteAudioElements.get(sessionId);
          if (audioEl) {
            audioEl.pause();
            audioEl.srcObject = null;
            remoteAudioElements.delete(sessionId);
            setRemoteAudioElements(new Map(remoteAudioElements));
          }
          
          const participants = frame.participants();
          setParticipantCount(Object.keys(participants).length);
        });

        frame.on("left-meeting", () => {
          console.log("📞 Left meeting");
          
          // Clean up all audio elements
          remoteAudioElements.forEach((audioEl) => {
            audioEl.pause();
            audioEl.srcObject = null;
          });
          setRemoteAudioElements(new Map());
          
          frame.destroy();
          setCallFrame(null);
        });

        frame.on("error", (error) => {
          console.error("Daily error:", error);
          if (error.errorMsg?.includes("payment-method") || error.errorMsg?.includes("account-missing")) {
            toast.error("Daily.co requires a payment method. Add one in your Daily.co dashboard.");
          } else {
            toast.error("Call error occurred");
          }
        });

        frame.on("track-started", (event) => {
          const participantType = event.participant?.local ? "local" : "remote";
          const participantName = event.participant?.user_name || event.participant?.user_id || participantType;
          console.log("🎵 Track started:", event.track.kind, "from", participantName, `(${participantType})`);
          console.log("   Track state:", event.track.readyState, "enabled:", event.track.enabled);
          
          // CRITICAL: Manually play remote audio tracks
          if (!event.participant?.local && event.track.kind === "audio") {
            const sessionId = event.participant.session_id;
            
            // Create or reuse audio element
            let audioEl = remoteAudioElements.get(sessionId);
            if (!audioEl) {
              audioEl = new Audio();
              audioEl.autoplay = true;
              remoteAudioElements.set(sessionId, audioEl);
              setRemoteAudioElements(new Map(remoteAudioElements));
            }
            
            // Set the audio track
            const stream = new MediaStream([event.track]);
            audioEl.srcObject = stream;
            
            audioEl.play()
              .then(() => {
                console.log("🔊 Playing remote audio successfully");
                toast.success("Audio connected!");
              })
              .catch((err) => {
                console.error("Failed to play remote audio:", err);
                toast.error("Failed to play audio. Click anywhere to enable audio.");
                
                // Try again on user interaction
                const playOnClick = () => {
                  audioEl?.play()
                    .then(() => {
                      console.log("🔊 Playing remote audio after user interaction");
                      document.removeEventListener('click', playOnClick);
                    })
                    .catch(console.error);
                };
                document.addEventListener('click', playOnClick, { once: true });
              });
          }
        });

        frame.on("track-stopped", (event) => {
          const participantType = event.participant?.local ? "local" : "remote";
          console.log("🔇 Track stopped:", event.track.kind, "from", participantType);
          
          // Clean up audio element if remote track stops
          if (!event.participant?.local && event.track.kind === "audio") {
            const sessionId = event.participant.session_id;
            const audioEl = remoteAudioElements.get(sessionId);
            if (audioEl) {
              audioEl.pause();
              audioEl.srcObject = null;
            }
          }
        });

        console.log("🔌 Joining Daily.co room...");
        const joinResult = await frame.join({
          url: activeCall.roomUrl,
          token: activeCall.token,
        });

        console.log("✅ Join result:", joinResult);
        setCallFrame(frame);
      } catch (err: any) {
        console.error("Failed to join call:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          toast.error("Microphone permission denied. Please allow microphone access.");
        } else if (err.errorMsg?.includes("payment-method") || err.errorMsg?.includes("account-missing")) {
          toast.error("Daily.co requires a payment method. Add one at dashboard.daily.co");
        } else {
          toast.error("Failed to join call: " + (err.message || "Unknown error"));
        }
      }
    };

    joinCall();

    return () => {
      if (callFrame) {
        callFrame.leave();
        callFrame.destroy();
      }
    };
  }, [activeCall?.roomUrl]);

  // Call duration timer
  useEffect(() => {
    if (!activeCall || isConnecting) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall, isConnecting]);

  const handleMuteToggle = () => {
    if (callFrame) {
      const newMutedState = !isMuted;
      callFrame.setLocalAudio(!newMutedState);
      setIsMuted(newMutedState);
      console.log(`🎤 Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
      toast.success(newMutedState ? "Microphone muted" : "Microphone unmuted");
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleEndCall = async () => {
    if (callFrame) {
      callFrame.leave();
    }
    if (activeCall) {
      try {
        await endCall({ invitationId: activeCall._id });
        toast.success("Call ended");
      } catch (error) {
        console.error("Failed to end call:", error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activeCall) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[9999]"
    >
      <div className="bg-[var(--card-bg)] border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[280px]">
        {/* Call status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {isConnecting ? "Connecting..." : participantCount > 1 ? "In Call" : "Waiting for other person..."}
              </p>
              <p className="text-white/60 text-xs">
                {isConnecting ? "Please wait" : formatDuration(callDuration)}
              </p>
            </div>
          </div>
          
          {/* Audio indicator */}
          {!isConnecting && participantCount > 1 && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-green-400 rounded-full"
                  animate={{
                    height: [8, 16, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={handleMuteToggle}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors ${
              isMuted
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={handleEndCall}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            End
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}

// Call button for ArcConnect matches
export function CallButton({ targetUserId, targetName }: { targetUserId: any; targetName: string }) {
  const createRoom = useAction(api.audioCalls.createRoom);
  const [isCalling, setIsCalling] = useState(false);

  const handleCall = async () => {
    setIsCalling(true);
    try {
      await createRoom({ targetUserId });
      toast.success(`Calling ${targetName}...`);
    } catch (error: any) {
      toast.error("Failed to start call", {
        description: error.message || "Please try again",
      });
      console.error(error);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <button
      onClick={handleCall}
      disabled={isCalling}
      title={`Call ${targetName} (Free)`}
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-500/20 hover:bg-green-500/30 text-green-400"
    >
      {isCalling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Phone className="w-4 h-4" />
      )}
      <span>Call</span>
    </button>
  );
}

// Main wrapper component to include in app
export function AudioCallProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <IncomingCallNotification />
      <OutgoingCallNotification />
      <ActiveCallInterface />
    </>
  );
}
