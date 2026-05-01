import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Confetti from 'react-confetti';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { getViewportSize, isBrowser } from '../lib/browser';

interface GoalCompletionCelebrationProps {
  goalTitle: string;
  xpEarned: number;
  onClose: () => void;
}

export function GoalCompletionCelebration({ goalTitle, xpEarned, onClose }: GoalCompletionCelebrationProps) {
  const [windowSize, setWindowSize] = useState(() => getViewportSize({ width: 1280, height: 720 }));
  const [isMounted, setIsMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleResize = () => {
      setWindowSize(getViewportSize({ width: 1280, height: 720 }));
    };
    window.addEventListener('resize', handleResize);
    
    // Animate content in
    setTimeout(() => setShowContent(true), 300);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMounted || !isBrowser()) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Confetti */}
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={true}
        numberOfPieces={300}
        gravity={0.1}
        colors={['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB', '#32CD32']}
      />
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border-2 border-yellow-500/50 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all duration-500 ${
          showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 blur-xl" />
        
        {/* Trophy icon */}
        <div className="relative flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-full">
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
            <Star className="absolute -bottom-1 -left-2 w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>
        
        {/* Title */}
        <div className="relative text-center mb-6">
          <h2 className="text-3xl font-bold text-yellow-300 mb-2">
            Care Plan Completed
          </h2>
          <p className="text-gray-300 text-lg">
            This support plan is complete:
          </p>
        </div>
        
        {/* Care plan title */}
        <div className="relative bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
          <p className="text-xl font-semibold text-white text-center">
            "{goalTitle}"
          </p>
        </div>
        
        {/* Care points earned */}
        <div className="relative flex justify-center mb-8">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full px-6 py-3">
            <span className="text-2xl font-bold text-green-400">
              +{xpEarned} care points
            </span>
          </div>
        </div>
        
        {/* Motivational message */}
        <p className="relative text-center text-gray-400 mb-6">
          A calmer day is real progress. Keep the next support step just as clear.
        </p>
        
        {/* Close button */}
        <div className="relative flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Continue 🚀
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
