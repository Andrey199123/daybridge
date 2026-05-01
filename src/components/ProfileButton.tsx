import { useState } from "react";
import { ProfileModal } from "./ProfileModal";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ProfileButtonProps {
  profilePictureUrl?: string | null;
}

export function ProfileButton({ profilePictureUrl }: ProfileButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)}>
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt="Profile"
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <User className="h-5 w-5" />
        )}
      </Button>
      <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
