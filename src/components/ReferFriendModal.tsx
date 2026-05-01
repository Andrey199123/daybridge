import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ReferFriendModalProps {
  onClose: () => void;
}

export function ReferFriendModal({ onClose }: ReferFriendModalProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const referFriend = useAction(api.users.referFriend);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await referFriend({ email });
      toast.success("Referral sent!");
      setEmail("");
      onClose();
    } catch (error) {
      toast.error("Failed to send referral.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-background text-foreground rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-muted-foreground hover:text-foreground font-bold text-lg"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4">Refer a Friend</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Friend's Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {submitting ? "Sending..." : "Send Referral"}
          </button>
        </form>
      </div>
    </div>
  );
}
