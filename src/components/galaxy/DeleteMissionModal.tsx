import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (removeFromTimeline: boolean) => Promise<void>;
  missionTitle: string;
  isDeleting?: boolean;
  error?: string | null;
}

export function DeleteMissionModal({
  isOpen,
  onClose,
  onConfirm,
  missionTitle,
  isDeleting = false,
  error = null,
}: DeleteMissionModalProps) {
  const [removeFromTimeline, setRemoveFromTimeline] = useState(true);

  const handleConfirm = async () => {
    await onConfirm(removeFromTimeline);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onClose();
    } else if (e.key === 'Enter' && !isDeleting) {
      handleConfirm();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={!isDeleting ? onClose : undefined}>
      <AlertDialogContent
        className="glass-panel border-white/10"
        onKeyDown={handleKeyDown}
        aria-label="Delete care plan confirmation"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Delete this care plan?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70 space-y-3">
            <p>
              This will permanently remove <span className="font-semibold text-white">"{missionTitle}"</span> and all associated checkpoints and tasks.
              <span className="block mt-2 text-red-400">This action cannot be undone.</span>
            </p>
            
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="remove-timeline"
                checked={removeFromTimeline}
                onCheckedChange={(checked) => setRemoveFromTimeline(checked === true)}
                disabled={isDeleting}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="remove-timeline"
                  className="text-sm text-white/80 cursor-pointer font-normal"
                >
                  Also remove scheduled items from Timeline/Calendar
                </Label>
                <p className="text-xs text-white/50 mt-1">
                  Uncheck to keep external calendar events
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">
                  <span className="font-semibold">Error:</span> {error}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
