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
    
    // Reset shake animation after it completes
    setTimeout(() => {
      setIsShaking(false);
    }, 500);
    
    // Hide overlay after a delay
    setTimeout(() => {
      setShowOverlay(false);
    }, 2500);
  }, [isPro, isShaking]);

  if (isPro) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`pro-feature-gate relative ${className}`}
      onClickCapture={handleInteraction}
      onTouchStartCapture={handleInteraction}
    >
      {/* The content with reduced opacity to indicate it's a pro feature */}
      <div className={`opacity-60 ${isShaking ? "pro-shake" : ""}`}>
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div 
        className={`absolute inset-0 rounded-lg bg-muted/90 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
      
      {/* CSS for the shake animation - starts slow, quick jitter in middle, slows down */}
      <style>{`
        @keyframes pro-shake {
          0% { transform: translateX(0); }
          /* Slow start */
          8% { transform: translateX(-1px); }
          16% { transform: translateX(1px); }
          /* Quick jitter in the middle */
          24% { transform: translateX(-2px); }
          32% { transform: translateX(2.5px); }
          40% { transform: translateX(-3px); }
          48% { transform: translateX(3px); }
          56% { transform: translateX(-3px); }
          64% { transform: translateX(2.5px); }
          /* Slow down at the end */
          72% { transform: translateX(-2px); }
          80% { transform: translateX(1.5px); }
          88% { transform: translateX(-1px); }
          94% { transform: translateX(0.5px); }
          100% { transform: translateX(0); }
        }
        
        .pro-shake {
          animation: pro-shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
