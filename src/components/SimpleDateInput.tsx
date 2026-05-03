import React, { useState, useEffect } from 'react';

interface SimpleDateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function SimpleDateInput({ value, onChange, className = "", placeholder = "MM/DD/YYYY", id }: SimpleDateInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // Convert YYYY-MM-DD to MM/DD/YYYY for display
  useEffect(() => {
    if (value) {
      // Parse YYYY-MM-DD directly without Date object to avoid timezone issues
      const parts = value.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        setDisplayValue(`${month}/${day}/${year}`);
      }
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);

    // Try to parse MM/DD/YYYY (or MM/DD/YY) format.
    // People often type 2-digit years like "05/25/26"; normalize to ISO YYYY-MM-DD.
    const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const fullYear = year.length === 2 ? `20${year}` : year;
        const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        onChange(isoDate);
      }
    } else if (input === "") {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow numbers, slashes, backspace, delete, arrow keys
    if (!/[\d\/]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <input
      id={id}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      maxLength={10}
    />
  );
}
