import { useState, useEffect } from "react";
import "./SendInvoiceButton.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SendInvoiceButtonProps {
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  disabledReason?: string;
}

export function SendInvoiceButton({ onClick, disabled, className = "", disabledReason }: SendInvoiceButtonProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const handleClick = async () => {
    if (state !== "idle" || disabled) return;
    
    setState("sending");
    
    try {
      await onClick();
      setState("sent");
      
      // Reset after showing "Sent" for 2 seconds
      setTimeout(() => {
        setState("idle");
      }, 2000);
    } catch (error) {
      setState("idle");
    }
  };

  const button = (
    <button
      className={`send-btn ${state} ${className} ${disabled && disabledReason ? 'cursor-not-allowed' : ''}`}
      onClick={handleClick}
      disabled={disabled || state !== "idle"}
      data-testid="button-send-invoice"
    >
      <span className="btn-content">
        <span className="icon-wrapper">
          {/* Paper Plane Icon */}
          <svg 
            className="plane-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          
          {/* Checkmark Icon */}
          <svg 
            className="check-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17L4 12" />
          </svg>
        </span>
        
        <span className="label">
          <span className="text-idle">Send Invoice</span>
          <span className="text-sending">
            Sending
            <span className="dots">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </span>
          </span>
          <span className="text-sent">Sent!</span>
        </span>
      </span>
      
      {/* Shimmer effect */}
      <span className="shine"></span>
      
      {/* Success ripple */}
      <span className="success-ripple"></span>
    </button>
  );

  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

