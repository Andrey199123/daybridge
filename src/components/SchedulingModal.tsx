import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { X, Calendar, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownText } from './MarkdownText';
import { useNavigate } from 'react-router-dom';

interface SchedulingModalProps {
  goalId: Id<"goals">;
  onClose: () => void;
  isRescheduling?: boolean;
}

export function SchedulingModal({ goalId, onClose, isRescheduling = false }: SchedulingModalProps) {
  const [step, setStep] = useState<"intro" | "chat" | "complete">("intro");
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isRescheduling
        ? 'I see you want to update your availability. What changes would you like to make to your schedule? (e.g., "I can now work on weekends too", "I need to change from weekdays after 5pm to weekdays after 6pm")'
        : 'Hello! I need to know your availability so I can spread out your tasks realistically across your calendar. When are you generally available to work on your goals? (e.g., "weekdays after 5pm", "weekends", "Mon, Wed, Fri from 9am to 12pm")',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const saveAvailability = useMutation(api.availability.saveAvailability);
  const chat = useAction(api.ai.chat);
  const currentUser = useQuery(api.users.getCurrentUser);
  const goal = useQuery(api.goals.getGoal, { goalId });
  const unscheduledTasks = useQuery(api.tasks.getUnscheduledTasksForGoal, { goalId });
  const markAvailabilityChatCompleted = useMutation(api.goals.markAvailabilityChatCompleted);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (initialMessage?: string) => {
    const content = initialMessage || userInput.trim();
    if (content === '' || isSaving || !currentUser) return;

    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setUserInput('');
    setIsSaving(true);

    try {
      // Use the AI chat to process the availability and schedule tasks
      const responsePayload = await chat({ 
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        userId: currentUser.id, 
        goalId 
      });

      const botMessage = { role: 'assistant', content: responsePayload.response };
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      if (responsePayload.isComplete) {
        // Save the availability conversation and trigger scheduling
        const availabilityText = updatedMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        await saveAvailability({ 
          availability: availabilityText, 
          goalId,
          isRescheduling: isRescheduling
        });
        
        // Mark availability chat as completed
        await markAvailabilityChatCompleted({ goalId });
        
        // Show completion step
        setStep("complete");
        
        toast.success("Tasks scheduled successfully!");
      }

    } catch (error) {
      console.error('Error in AI chat:', error);
      const errorMessage = { role: 'assistant', content: 'Sorry, I had trouble processing your availability. Please try again.' };
      setMessages([...newMessages, errorMessage]);
      toast.error("Failed to schedule tasks. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    toast.info("You can schedule your tasks later from the goal details or timeline.");
    onClose();
  };

  const handleViewCalendar = () => {
    onClose();
    navigate('/timeline');
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[var(--accent-cyan)]" />
            <h2 className="text-xl font-semibold text-[var(--star)]">
              {isRescheduling ? "Update Schedule" : "Schedule Your Tasks"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "intro" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center shadow-lg shadow-black/20">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--star)] mb-2">
                  {isRescheduling ? "Update Your Availability" : "Let's Schedule Your Tasks"}
                </h3>
                <p className="text-[var(--star)]/70 mb-4">
                  {isRescheduling 
                    ? `Update your availability to reschedule your tasks.`
                    : `You have ${unscheduledTasks?.length || 0} tasks ready to be scheduled. I'll chat with you about your availability and create a personalized schedule.`
                  }
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setStep("chat")}
                  className="px-6 py-3 bg-[var(--accent-cyan)] text-[var(--bg-space-900)] rounded-lg font-semibold hover:brightness-95 transition-all shadow-lg shadow-black/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/30"
                >
                  {isRescheduling ? "Update Availability" : "Start Scheduling"}
                </button>
                {!isRescheduling && (
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 bg-white/5 border border-white/10 text-[var(--star)]/80 rounded-lg font-semibold hover:bg-white/10 hover:text-[var(--star)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    Schedule Later
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "chat" && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--star)] mb-2">
                  {isRescheduling ? "Update Your Availability" : "Tell Me Your Availability"}
                </h3>
                <p className="text-[var(--star)]/70 text-sm">
                  Share when you're available to work on your goals, and I'll create a schedule that works for you.
                </p>
              </div>
              
              <div className="bg-[var(--bg-space-900)]/30 border border-[var(--border-color)] rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`px-4 py-3 rounded-lg max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-[var(--accent-cyan)] text-[var(--bg-space-900)] font-semibold'
                            : 'bg-[var(--bg-space-800)]/60 text-[var(--star)]/90 border border-[var(--border-color)]'
                        }`}>
                        {message.role === 'user' ? (
                          message.content
                        ) : (
                          <MarkdownText content={message.content} />
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--accent-cyan)]/20 outline-none transition-all"
                  placeholder="Type your availability..."
                  disabled={isSaving}
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="px-6 py-3 bg-[var(--accent-cyan)] text-[var(--bg-space-900)] rounded-lg font-semibold hover:brightness-95 transition-all shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/30"
                  disabled={isSaving}>
                  {isSaving ? 'Thinking...' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] shadow-lg shadow-black/20">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--star)] mb-2">
                  Tasks Scheduled Successfully!
                </h3>
                <p className="text-[var(--star)]/70 mb-4">
                  Your tasks have been scheduled based on your availability. You can view and manage them in your timeline.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleViewCalendar}
                  className="px-6 py-3 bg-[var(--accent-cyan)] text-[var(--bg-space-900)] rounded-lg font-semibold hover:brightness-95 transition-all shadow-lg shadow-black/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/30"
                >
                  View Calendar
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-[var(--star)]/80 rounded-lg font-semibold hover:bg-white/10 hover:text-[var(--star)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
