import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const ADMIN_PASSWORD = "1A4EQJNQ0tEckHAfc4caM_5UVZAAXp1DaEmR4W9UFWercfOa2AeEatzT40dja5vX1PB4FA4SIxwLBDBPG";

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const users = useQuery(api.users.getAllUsers);
  const apiUsage = useQuery(api.apiUsage.getAllApiUsage);
  const chatHistory = useQuery(
    api.aiChatHistory?.getAdminUserChatHistory,
    selectedUser ? { userId: selectedUser as any } : "skip"
  );

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("adminAuthenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuthenticated", "true");
    } else {
      alert("Incorrect password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-space-900)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-space-800)] border border-[var(--border-nebula)] rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-[var(--star)] mb-6">Admin Access</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-space-700)] border border-[var(--border-nebula)] rounded-lg text-[var(--star)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]"
                placeholder="Enter admin password"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getUserApiUsage = (userId: string) => {
    if (!apiUsage) return null;
    return apiUsage.filter((usage: any) => usage.userId === userId);
  };

  const getTotalCalls = (userId: string) => {
    const usage = getUserApiUsage(userId);
    if (!usage || usage.length === 0) return 0;
    return usage.reduce((sum: number, day: any) => sum + (day.totalCalls || 0), 0);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-space-900)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--star)]">Admin Dashboard</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              sessionStorage.removeItem("adminAuthenticated");
            }}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-1 bg-[var(--bg-space-800)] border border-[var(--border-nebula)] rounded-lg p-6">
            <h2 className="text-xl font-bold text-[var(--star)] mb-4">
              Users ({users?.length || 0})
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {users?.map((user: any) => (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user._id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedUser === user._id
                      ? "bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]"
                      : "bg-[var(--bg-space-700)] hover:bg-[var(--bg-space-600)]"
                  }`}
                >
                  <div className="text-sm font-medium text-[var(--star)] truncate">
                    {user.email}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {getTotalCalls(user._id)} API calls
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Details */}
          <div className="lg:col-span-2 bg-[var(--bg-space-800)] border border-[var(--border-nebula)] rounded-lg p-6">
            {selectedUser ? (
              <>
                {(() => {
                  const user = users?.find((u: any) => u._id === selectedUser);
                  const userUsage = getUserApiUsage(selectedUser);
                  
                  if (!user) return null;

                  return (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-[var(--star)] mb-2">
                          {user.email}
                        </h2>
                        <div className="text-sm text-[var(--text-muted)]">
                          User ID: {user._id}
                        </div>
                      </div>

                      {/* User Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-space-700)] p-4 rounded-lg">
                          <div className="text-sm text-[var(--text-muted)]">Total API Calls</div>
                          <div className="text-2xl font-bold text-[var(--star)] mt-1">
                            {getTotalCalls(selectedUser)}
                          </div>
                        </div>
                        <div className="bg-[var(--bg-space-700)] p-4 rounded-lg">
                          <div className="text-sm text-[var(--text-muted)]">Days Active</div>
                          <div className="text-2xl font-bold text-[var(--star)] mt-1">
                            {userUsage?.length || 0}
                          </div>
                        </div>
                      </div>

                      {/* API Usage History */}
                      <div>
                        <h3 className="text-lg font-bold text-[var(--star)] mb-4">
                          API Usage History
                        </h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {userUsage && userUsage.length > 0 ? (
                            userUsage.map((usage: any) => (
                              <div
                                key={usage._id}
                                className="bg-[var(--bg-space-700)] p-4 rounded-lg"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-sm font-medium text-[var(--star)]">
                                    {new Date(usage.date).toLocaleDateString()}
                                  </div>
                                  <div className="text-sm text-[var(--accent-cyan)]">
                                    {usage.totalCalls} calls
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                                  {usage.smartGoalChat && (
                                    <div>Smart Goal Chat: {usage.smartGoalChat}</div>
                                  )}
                                  {usage.chat && (
                                    <div>Chat: {usage.chat}</div>
                                  )}
                                  {usage.generateTasks && (
                                    <div>Generate Tasks: {usage.generateTasks}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-[var(--text-muted)] py-8">
                              No API usage recorded for this user
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chat History */}
                      <div>
                        <h3 className="text-lg font-bold text-[var(--star)] mb-4">
                          AI Chat History ({chatHistory?.length || 0} conversations)
                        </h3>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                          {chatHistory && chatHistory.length > 0 ? (
                            chatHistory.map((chat: any) => (
                              <div
                                key={chat._id}
                                className="bg-[var(--bg-space-700)] p-4 rounded-lg space-y-3"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="text-xs text-[var(--text-muted)]">
                                    {new Date(chat.timestamp).toLocaleString()}
                                  </div>
                                  <div className="text-xs px-2 py-1 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded">
                                    {chat.endpoint}
                                  </div>
                                </div>
                                
                                {/* User Message */}
                                <div className="bg-[var(--bg-space-600)] p-3 rounded-lg">
                                  <div className="text-xs font-medium text-[var(--accent-cyan)] mb-1">
                                    User:
                                  </div>
                                  <div className="text-sm text-[var(--star)] whitespace-pre-wrap">
                                    {chat.userMessage}
                                  </div>
                                </div>
                                
                                {/* AI Response */}
                                <div className="bg-[var(--bg-space-600)] p-3 rounded-lg">
                                  <div className="text-xs font-medium text-[var(--accent-purple)] mb-1">
                                    AI:
                                  </div>
                                  <div className="text-sm text-[var(--star)] whitespace-pre-wrap">
                                    {chat.aiResponse}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-[var(--text-muted)] py-8">
                              No chat history recorded for this user yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
