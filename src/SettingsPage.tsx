import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useTheme } from "./components/ThemeProvider";
import { DailyUsageDashboard } from "./components/DailyUsageDashboard";
import { ApiUsageStats } from "./components/ApiUsageStats";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const updateProfile = useMutation(api.users.updateProfile);
  const exportData = useAction(api.users.exportData);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.profile?.name || "");
      setEmail(currentUser.email || "");
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      await updateProfile({
        name,
        email,
        password,
        darkMode: theme === "dark",
      });
      toast.success("Settings updated!");
    } catch (error) {
      toast.error("Failed to update settings.");
    }
  };

  const handleDownloadData = async () => {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "arc_data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download data.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Settings</h1>
        
        {/* API Usage Stats */}
        <div className="mb-8">
          <ApiUsageStats />
        </div>
        
        {/* Daily.co Usage Dashboard */}
        <div className="mb-8">
          <DailyUsageDashboard />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="darkMode" className="text-sm font-medium">
              Dark Mode
            </label>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative inline-flex items-center h-6 rounded-full w-11"
            >
              <span
                className={`${
                  theme === "dark" ? "bg-primary" : "bg-gray-200"
                } absolute h-4 w-9 rounded-full transition-colors ease-in-out duration-200`}
              ></span>
              <span
                className={`${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                } absolute h-4 w-4 transform bg-white rounded-full transition-transform ease-in-out duration-200`}
              ></span>
            </button>
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Save Changes
          </button>
        </form>
        <div className="mt-8">
          <button
            onClick={handleDownloadData}
            className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-muted"
          >
            Download Your Data
          </button>
        </div>
      </div>
    </div>
  );
}
