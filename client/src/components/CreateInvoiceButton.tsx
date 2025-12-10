import { useState, useRef } from "react";
import { useLocation } from "wouter";
import "./CreateInvoiceButton.css";

interface CreateInvoiceButtonProps {
  className?: string;
}

export function CreateInvoiceButton({ className = "" }: CreateInvoiceButtonProps) {
  const [, navigate] = useLocation();
  const [isBouncing, setIsBouncing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseUp = () => {
    setIsBouncing(true);
    setTimeout(() => {
      setIsBouncing(false);
    }, 250);
  };

  const handleMouseLeave = () => {
    setIsBouncing(false);
  };

  const handleClick = () => {
    navigate("/invoices/new");
  };

  return (
    <button
      ref={buttonRef}
      className={`create-btn ${isBouncing ? "bounce" : ""} ${className}`}
      onClick={handleClick}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      data-testid="button-create-invoice-sidebar"
    >
      <span className="btn-content">
        <span className="plus">＋</span>
        <span className="label">Create Invoice</span>
      </span>
      <span className="shine"></span>
    </button>
  );
}


