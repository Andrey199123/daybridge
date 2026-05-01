import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Sparkles, CheckCircle } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MarkdownText } from "../MarkdownText";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ArcNavigatorProps {
  tasks?: any[];
  userId?: Id<"users">;
}

export function ArcNavigator({ tasks = [], userId }: ArcNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chat = useAction(api.ai.chat);

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];
  
  // Filter tasks by status
  const todayTasks = tasks.filter(t => t.scheduledDate === today);
  const completedToday = todayTasks.filter(t => t.completed).length;
  
  // Calculate overdue tasks (scheduled before today and not completed)
  const overdueTasks = tasks.filter(t => {
    if (!t.scheduledDate || t.completed) return false;
    return t.scheduledDate < today;
  });

  // Generate initial greeting based on today's schedule AND overdue tasks
  useEffect(() => {
    if (messages.length === 0) {
      let greeting = "";
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      
      // Priority 1: Mention overdue tasks if any exist
      if (overdueTasks.length > 0) {
        greeting = `${timeGreeting}! You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} that need${overdueTasks.length === 1 ? 's' : ''} attention. `;
        
        // Also mention today's tasks if any
        if (todayTasks.length > 0) {
          if (completedToday === todayTasks.length) {
            greeting += `Great job completing all ${todayTasks.length} tasks for today. Let's tackle those overdue items.`;
          } else {
            greeting += `Plus ${todayTasks.length - completedToday} task${todayTasks.length - completedToday !== 1 ? 's' : ''} remaining today. What would you like to focus on?`;
          }
        } else {
          greeting += `Would you like to reschedule them?`;
        }
      }
      // Priority 2: Today's tasks status
      else if (todayTasks.length === 0) {
        greeting = `${timeGreeting}! You have no tasks scheduled for today. Would you like to plan a routine, appointment, or check-in?`;
      } else if (completedToday === todayTasks.length) {
        greeting = `${timeGreeting}! All ${todayTasks.length} tasks for today are complete. How are you feeling?`;
      } else {
        greeting = `${timeGreeting}! You have ${todayTasks.length - completedToday} task${todayTasks.length - completedToday !== 1 ? 's' : ''} remaining today. How can I help?`;
      }
      
      setMessages([{
        id: "initial",
        text: greeting,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [todayTasks.length, completedToday, overdueTasks.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (userId) {
        // Build conversation history for AI
        const conversationHistory = messages.map(m => ({
          role: m.isUser ? "user" : "assistant",
          content: m.text
        }));
        conversationHistory.push({ role: "user", content: inputValue });

        const result = await chat({
          messages: conversationHistory,
          userId: userId,
        });

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: result.response,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
        // Fallback if no userId
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble connecting right now. Please try again in a moment.",
          isUser: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error("DayBridge guide error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I ran into an issue. Let me try again in a moment.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Orb */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            className="fixed bottom-8 right-8 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.button
              onClick={() => setIsExpanded(true)}
              className="arc-orb-button relative w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center shadow-2xl cursor-pointer group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              data-tutorial="chat-button"
            >
              <div className="arc-pulse-ring absolute inset-0 rounded-full border-2 border-[var(--accent-cyan)]" />
              <MessageCircle className="w-7 h-7 text-white relative z-10" />
              {(todayTasks.length > 0 && completedToday < todayTasks.length) || overdueTasks.length > 0 ? (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--propulsion)] rounded-full border-2 border-[var(--bg-space-900)] z-20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {overdueTasks.length + (todayTasks.length - completedToday)}
                  </span>
                </div>
              ) : null}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Chat */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
            />

            <motion.div
              className="fixed bottom-8 right-8 w-96 h-[600px] z-50 glass-panel rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(13, 27, 61, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), inset 0 0 80px rgba(0, 224, 255, 0.05)'
              }}
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 backdrop-blur-xl bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center relative">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">DayBridge Guide</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-[var(--success)]"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-xs text-white/60">Online</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="hover:bg-white/10 text-white/70 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={msg.isUser ? 'flex justify-end' : ''}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-xl ${
                        msg.isUser
                          ? 'bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] text-white'
                          : 'bg-white/5 border border-white/10 text-white/90'
                      }`}
                    >
                      {msg.isUser ? (
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      ) : (
                        <MarkdownText content={msg.text} className="text-sm leading-relaxed" />
                      )}
                      <p className="text-xs opacity-50 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl max-w-[85%]">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Today's Tasks Summary */}
                {todayTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[var(--accent-cyan)]" />
                      Today's Plan ({completedToday}/{todayTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {todayTasks.slice(0, 5).map((task, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm text-white/80"
                        >
                          <div className={`w-4 h-4 rounded border ${
                            task.completed
                              ? 'bg-[var(--success)] border-[var(--success)]'
                              : 'border-white/30'
                          } flex items-center justify-center`}>
                            {task.completed && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className={task.completed ? 'line-through text-white/50' : ''}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                      {todayTasks.length > 5 && (
                        <p className="text-xs text-white/50">+{todayTasks.length - 5} more</p>
                      )}
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 backdrop-blur-xl bg-white/5">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Chat with DayBridge..."
                    disabled={isLoading}
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] hover:opacity-90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
