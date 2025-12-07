import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AnimatedSearch({ 
  value, 
  onChange, 
  placeholder = "Search invoices...",
  className 
}: AnimatedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand if there's a value
  useEffect(() => {
    if (value) {
      setIsExpanded(true);
    }
  }, [value]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle click outside to collapse (only if empty)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        !value
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClear = () => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (value) {
        onChange("");
      } else {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    }
  };

  const showExpanded = isExpanded || isHovered;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Search container with animation */}
      <div
        className={cn(
          "flex items-center rounded-full border border-transparent bg-transparent overflow-hidden transition-all duration-300 ease-out",
          showExpanded 
            ? "w-64 sm:w-72 border-border bg-card shadow-[0_1px_4px_rgba(0,0,0,0.04)]" 
            : "w-9 hover:bg-muted/50"
        )}
      >
        {/* Search icon button */}
        <button
          type="button"
          onClick={handleExpand}
          className={cn(
            "flex items-center justify-center shrink-0 transition-all duration-200",
            showExpanded 
              ? "w-10 h-9 pl-3 pr-1" 
              : "w-9 h-9 rounded-full hover-elevate"
          )}
          aria-label="Search"
        >
          <Search 
            className={cn(
              "h-4 w-4 transition-colors duration-200",
              showExpanded ? "text-muted-foreground" : "text-foreground"
            )} 
          />
        </button>

        {/* Input field - animates width */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            showExpanded ? "w-full opacity-100" : "w-0 opacity-0"
          )}
        >
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            placeholder={placeholder}
            className={cn(
              "w-full h-9 pr-2 bg-transparent text-sm outline-none",
              "placeholder:text-muted-foreground/60"
            )}
          />
        </div>

        {/* Clear button */}
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-all duration-200 ease-out",
            showExpanded && value ? "w-8 opacity-100" : "w-0 opacity-0"
          )}
        >
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center w-8 h-9 hover:bg-muted/50 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

    </div>
  );
}

