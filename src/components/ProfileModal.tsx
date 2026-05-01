import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { useRef, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { Camera, Edit, LogOut, Settings, Trash2, X } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const startOnboarding = useMutation(api.users.startOnboarding);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteUser = useMutation(api.users.deleteUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const profilePictureUrl = useQuery(
    api.users.getProfilePictureUrl,
    currentUser?.profile?.pictureUrl
      ? { storageId: currentUser.profile.pictureUrl as Id<"_storage"> }
      : "skip"
  );

  if (!isOpen) {
    return null;
  }

  const handleEditProfile = async () => {
    await startOnboarding();
    onClose();
  };

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
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser();
      onClose();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 animate-in fade-in-50">
      <div className="bg-card text-foreground rounded-2xl w-full max-w-sm p-6 shadow-2xl m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {currentUser ? (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center ring-4 ring-primary/20">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-5xl font-bold text-muted-foreground">
                    {currentUser.profile?.name?.[0]}
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Change profile picture"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>

            <h3 className="text-xl font-semibold">{currentUser.profile?.name}</h3>
            <p className="text-muted-foreground text-sm">{currentUser.email}</p>

            <div className="flex gap-4 my-6 bg-background p-3 rounded-lg w-full justify-around">
              <div className="text-center">
                <p className="font-bold text-xl">{currentUser.profile?.currentStreak ?? 0}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-xl">{currentUser.profile?.longestStreak ?? 0}</p>
                <p className="text-xs text-muted-foreground">Longest Streak</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-xl">{currentUser.profile?.points ?? 0}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>

            <div className="w-full space-y-2">
              <Button onClick={handleEditProfile} className="w-full justify-start gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Link to="/settings" onClick={onClose} className="w-full">
                <Button variant="secondary" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount}>
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
