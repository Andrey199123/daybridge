import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Edit, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  MessageSquare,
  Calendar,
  GraduationCap
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getViewportSize } from "../../lib/browser";

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onOpenCalendarExport: () => void;
  onReplayTutorial: () => void; // New prop for replaying tutorial
  triggerRef: React.RefObject<HTMLElement>;
}

export function ProfileMenu({
  isOpen,
  onClose,
  onOpenProfile,
  onOpenSettings,
  onOpenFeedback,
  onOpenCalendarExport,
  onReplayTutorial,
  triggerRef,
}: ProfileMenuProps) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const menuItems = [
    {
      icon: User,
      label: "View Profile",
      action: () => {
        onOpenProfile();
        onClose();
      },
    },
    {
      icon: Edit,
      label: "Edit Profile",
      action: () => {
        onOpenProfile();
        onClose();
      },
    },
    {
      icon: Settings,
      label: "Account Settings",
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      icon: GraduationCap,
      label: "Replay Tutorial",
      action: () => {
        onReplayTutorial();
        onClose();
      },
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      action: () => {
        navigate("/help");
        onClose();
      },
    },
    {
      icon: MessageSquare,
      label: "Send Feedback",
      action: () => {
        onOpenFeedback();
        onClose();
      },
    },
    {
      icon: Calendar,
      label: "Export Calendar",
      action: () => {
        onOpenCalendarExport();
        onClose();
      },
    },
    {
      icon: LogOut,
      label: "Sign Out",
      action: async () => {
        try {
          await signOut();
          toast.success("Signed out successfully");
          navigate("/auth");
          onClose();
        } catch (error) {
          toast.error("Failed to sign out");
        }
      },
      destructive: true,
    },
  ];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        menuItems[focusedIndex].action();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, menuItems, onClose, triggerRef]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Add listener after a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Calculate position based on trigger
  const getMenuPosition = () => {
    if (!triggerRef.current) return { top: 0, right: 0 };
    const rect = triggerRef.current.getBoundingClientRect();
    const viewport = getViewportSize({ width: 1280, height: 720 });
    return {
      top: rect.bottom + 4, // Reduced gap to minimize hover issues
      right: viewport.width - rect.right,
    };
  };

  const position = getMenuPosition();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[60] min-w-[220px]"
          style={{
            top: `${position.top}px`,
            right: `${position.right}px`,
          }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="profile-menu"
        >
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isFocused = index === focusedIndex;

              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left transition-all
                    ${isFocused ? "bg-white/10" : ""}
                    ${item.destructive ? "text-red-400 hover:bg-red-500/10" : "text-[var(--star)] hover:bg-white/5"}
                    ${index === 0 ? "" : "border-t border-white/5"}
                  `}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  aria-label={item.label}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {!item.destructive && (
                    <ChevronRight className="w-3 h-3 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
