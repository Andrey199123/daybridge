import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Camera, Edit2, Save, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { US_STATES } from "../../lib/usStates";

interface ProfileViewProps {
  onClose: () => void;
}

export function ProfileView({ onClose }: ProfileViewProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    currentUser?.profile?.pictureUrl
      ? { storageId: currentUser.profile.pictureUrl as Id<"_storage"> }
      : "skip"
  );

  // Form state
  const [formData, setFormData] = useState({
    name: currentUser?.profile?.name || "",
    bio: currentUser?.profile?.bio || "",
    city: currentUser?.profile?.city || "",
    state: currentUser?.profile?.state || "",
    birthday: currentUser?.profile?.birthday || "",
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateProfile({ pictureUrl: storageId });
      toast.success("Profile picture updated");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        // bio: formData.bio.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state || undefined,
        birthday: formData.birthday || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: currentUser?.profile?.name || "",
      bio: currentUser?.profile?.bio || "",
      city: currentUser?.profile?.city || "",
      state: currentUser?.profile?.state || "",
      birthday: currentUser?.profile?.birthday || "",
    });
    setIsEditing(false);
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const getRankBadge = (xp: number) => {
    if (xp < 1000) return { label: "Cadet", icon: "🎯", color: "from-blue-500 to-cyan-500" };
    if (xp < 5000) return { label: "Explorer", icon: "🔭", color: "from-purple-500 to-pink-500" };
    if (xp < 15000) return { label: "Commander", icon: "⚡", color: "from-orange-500 to-red-500" };
    return { label: "Architect", icon: "👑", color: "from-yellow-500 to-amber-500" };
  };

  const rank = getRankBadge(currentUser.profile?.points || 0);
  const joinDate = new Date(currentUser.profile?._creationTime || Date.now()).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long" }
  );

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${rank.color} p-1`}>
            <div className="w-full h-full rounded-full bg-[var(--bg-space-800)] flex items-center justify-center overflow-hidden">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-[var(--star)]">
                  {currentUser.profile?.name?.[0] || "?"}
                </span>
              )}
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            aria-label="Change profile picture"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Rank Badge */}
        <div className={`mt-4 px-4 py-2 rounded-full bg-gradient-to-r ${rank.color} text-white font-semibold text-sm flex items-center gap-2`}>
          <span>{rank.icon}</span>
          <span>{rank.label}</span>
        </div>
      </div>

      {/* Profile Info */}
      <div className="space-y-4">
        {!isEditing ? (
          <>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[var(--star)]">
                {currentUser.profile?.name}
              </h3>
              <p className="text-[var(--star)]/60 text-sm mt-1">{currentUser.email}</p>
              <p className="text-[var(--star)]/40 text-xs mt-1">
                Joined {joinDate}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 bg-[var(--bg-space-800)] rounded-xl p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--star)]">
                  {currentUser.profile?.points || 0}
                </p>
                <p className="text-xs text-[var(--star)]/60">XP Points</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-2xl font-bold text-[var(--star)]">
                  {currentUser.profile?.currentStreak || 0}
                </p>
                <p className="text-xs text-[var(--star)]/60">Streak</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--star)]">
                  {currentUser.profile?.totalGoalsCompleted || 0}
                </p>
                <p className="text-xs text-[var(--star)]/60">Goals</p>
              </div>
            </div>

            {/* Additional Info */}
            {(currentUser.profile?.city || currentUser.profile?.birthday) && (
              <div className="bg-[var(--bg-space-800)] rounded-xl p-4 space-y-2">
                {currentUser.profile?.city && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--star)]/60">Location</span>
                    <span className="text-[var(--star)]">
                      {currentUser.profile.city}
                      {currentUser.profile.state && `, ${currentUser.profile.state}`}
                    </span>
                  </div>
                )}
                {currentUser.profile?.birthday && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--star)]/60">Birthday</span>
                    <span className="text-[var(--star)]">
                      {(() => {
                        // Parse YYYY-MM-DD without timezone conversion
                        const [year, month, day] = currentUser.profile.birthday.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US');
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </>
        ) : (
          <>
            {/* Edit Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Enter your city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                  State (optional)
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                  Birthday (optional)
                </label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  lang="en-US"
                  className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-[var(--bg-space-700)] text-[var(--star)] rounded-lg hover:bg-[var(--bg-space-600)] transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

