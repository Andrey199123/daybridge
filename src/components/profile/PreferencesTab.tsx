import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Zap, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "../ThemeProvider";

export function PreferencesTab() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updateUserPreferences);
  
  const { theme, setTheme } = useTheme();
  const [motionPreference, setMotionPreference] = useState<"standard" | "reduced">("standard");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences from user profile
  useEffect(() => {
    if (currentUser?.profile?.preferences) {
      const prefs = currentUser.profile.preferences;
      if (prefs.theme) setTheme(prefs.theme as "light" | "dark" | "system");
      if (prefs.motion) setMotionPreference(prefs.motion as "standard" | "reduced");
      if (typeof prefs.sound === "boolean") setSoundEnabled(prefs.sound);
    }
  }, [currentUser]);

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    await savePreference("theme", newTheme);
  };

  const handleMotionChange = async (newMotion: "standard" | "reduced") => {
    setMotionPreference(newMotion);
    
    // Apply reduced motion
    if (newMotion === "reduced") {
      document.documentElement.style.setProperty("--motion-reduce", "1");
    } else {
      document.documentElement.style.setProperty("--motion-reduce", "0");
    }
    
    await savePreference("motion", newMotion);
  };

  const handleSoundChange = async (enabled: boolean) => {
    setSoundEnabled(enabled);
    await savePreference("sound", enabled);
  };

  const savePreference = async (key: string, value: any) => {
    setIsSaving(true);
    try {
      await updatePreferences({
        [key]: value,
      });
      toast.success("Preference saved");
    } catch (error) {
      console.error("Error saving preference:", error);
      toast.error("Failed to save preference");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Preference */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-[var(--star)] mb-3">Theme</h3>
        <p className="text-[var(--star)]/60 text-sm mb-4">
          Choose how Arc looks for you
        </p>

        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            icon={Monitor}
            label="System"
            description="Auto"
            active={theme === "system"}
            onClick={() => handleThemeChange("system")}
            disabled={isSaving}
          />
          <ThemeOption
            icon={Sun}
            label="Light"
            description="Always light"
            active={theme === "light"}
            onClick={() => handleThemeChange("light")}
            disabled={isSaving}
          />
          <ThemeOption
            icon={Moon}
            label="Dark"
            description="Always dark"
            active={theme === "dark"}
            onClick={() => handleThemeChange("dark")}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Motion Preference */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-[var(--star)]/60" />
          <h3 className="text-lg font-semibold text-[var(--star)]">Motion</h3>
        </div>
        <p className="text-[var(--star)]/60 text-sm mb-4">
          Control animation and motion effects
        </p>

        <div className="grid grid-cols-2 gap-3">
          <MotionOption
            label="Standard"
            description="Full animations"
            active={motionPreference === "standard"}
            onClick={() => handleMotionChange("standard")}
            disabled={isSaving}
          />
          <MotionOption
            label="Reduced"
            description="Minimal motion"
            active={motionPreference === "reduced"}
            onClick={() => handleMotionChange("reduced")}
            disabled={isSaving}
          />
        </div>

        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-400">
            ℹ️ Reduced motion removes most animations for better accessibility and performance
          </p>
        </div>
      </div>

      {/* Sound Preference */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[var(--star)]/60" />
              ) : (
                <VolumeX className="w-5 h-5 text-[var(--star)]/60" />
              )}
              <h3 className="text-lg font-semibold text-[var(--star)]">Sound Effects</h3>
            </div>
            <p className="text-[var(--star)]/60 text-sm">
              Play sounds for actions and notifications (coming soon)
            </p>
          </div>

          <button
            onClick={() => handleSoundChange(!soundEnabled)}
            disabled={isSaving}
            className={`
              relative w-14 h-8 rounded-full transition-all
              ${soundEnabled ? "bg-gradient-to-r from-blue-500 to-purple-600" : "bg-[var(--bg-space-700)]"}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            role="switch"
            aria-checked={soundEnabled}
            aria-label="Toggle sound effects"
          >
            <div
              className={`
                absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform
                ${soundEnabled ? "translate-x-6" : "translate-x-0"}
              `}
            />
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4 border border-white/10">
        <p className="text-[var(--star)]/60 text-sm">
           <span className="font-semibold text-[var(--star)]">Tip:</span> Your preferences are saved automatically and will apply across all your devices.
        </p>
      </div>
    </div>
  );
}

function ThemeOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-4 rounded-lg text-center transition-all border
        ${
          active
            ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-blue-500/50 text-[var(--star)]"
            : "bg-[var(--bg-space-700)] border-transparent text-[var(--star)]/60 hover:text-[var(--star)] hover:bg-[var(--bg-space-600)]"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      role="radio"
      aria-checked={active}
    >
      <Icon className="w-6 h-6 mx-auto mb-2" />
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-70 mt-1">{description}</p>
    </button>
  );
}

function MotionOption({
  label,
  description,
  active,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-4 rounded-lg text-center transition-all border
        ${
          active
            ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-blue-500/50 text-[var(--star)]"
            : "bg-[var(--bg-space-700)] border-transparent text-[var(--star)]/60 hover:text-[var(--star)] hover:bg-[var(--bg-space-600)]"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      role="radio"
      aria-checked={active}
    >
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-xs opacity-70 mt-1">{description}</p>
    </button>
  );
}

