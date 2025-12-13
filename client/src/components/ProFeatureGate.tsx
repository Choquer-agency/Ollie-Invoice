import { useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowRight, Crown } from "lucide-react";

interface ProFeatureGateProps {
  children: React.ReactNode;
  isPro: boolean;
  className?: string;
}

/**
 * A wrapper that adds a jitter animation and upgrade overlay when 
 * a free user tries to interact with a pro feature.
 */
export function ProFeatureGate({ children, isPro, className = "" }: ProFeatureGateProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isPro) return;
    
    // Prevent the click from reaching the underlying elements
    e.preventDefault();
    e.stopPropagation();
    
    // Don't re-trigger if already shaking
    if (isShaking) return;
    
    // Trigger the shake animation
    setIsShaking(true);
    setShowOverlay(true);
    
    // Reset shake animation after it completes (shorter duration)
    setTimeout(() => {
      setIsShaking(false);
    }, 300);
  }, [isPro, isShaking]);

  const handleMouseEnter = useCallback(() => {
    if (!isPro) {
      setIsHovering(true);
    }
  }, [isPro]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    // Only hide overlay when not hovering
    if (!isShaking) {
      setShowOverlay(false);
    }
  }, [isShaking]);

  if (isPro) {
    return <div className={className}>{children}</div>;
  }

  // Show overlay if clicked OR hovering
  const overlayVisible = showOverlay || isHovering;

  return (
    <div 
      className={`pro-feature-gate relative ${isShaking ? "pro-shake" : ""} ${className}`}
      onClickCapture={handleInteraction}
      onTouchStartCapture={handleInteraction}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* The content with reduced opacity to indicate it's a pro feature */}
      <div className="opacity-60">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div 
        className={`absolute inset-0 rounded-lg bg-muted/90 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
          overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Link 
          href="/settings#subscription"
          className="flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all hover:scale-105 font-medium text-sm group"
        >
          <Crown className="h-4 w-4 text-amber-500" />
          <span>Upgrade to Pro</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      
      {/* CSS for the shake animation - shorter, snappier jitter */}
      <style>{`
        @keyframes pro-shake {
          0% { transform: translateX(0); }
          15% { transform: translateX(-2px); }
          30% { transform: translateX(2.5px); }
          45% { transform: translateX(-3px); }
          60% { transform: translateX(2.5px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(1px); }
          100% { transform: translateX(0); }
        }
        
        .pro-shake {
          animation: pro-shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
