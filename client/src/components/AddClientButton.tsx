import { useState } from "react";
import "./CreateInvoiceButton.css";

interface AddClientButtonProps {
  onClick: () => void;
  className?: string;
}

export function AddClientButton({ onClick, className = "" }: AddClientButtonProps) {
  const [isBouncing, setIsBouncing] = useState(false);

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
    onClick();
  };

  return (
    <button
      className={`create-btn ${isBouncing ? "bounce" : ""} ${className}`}
      onClick={handleClick}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      data-testid="button-add-client"
    >
      <span className="btn-content">
        <span className="plus">＋</span>
        <span className="label">Add Client</span>
      </span>
      <span className="shine"></span>
    </button>
  );
}


