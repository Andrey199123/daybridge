import { useState, useEffect, useRef } from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateInput({ value, onChange, placeholder = "MM/DD/YYYY", className = "" }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Convert YYYY-MM-DD to MM/DD/YYYY for display
  const formatForDisplay = (isoDate: string): string => {
    if (!isoDate) return "";
    // Parse the date in UTC to avoid timezone issues
    const [year, month, day] = isoDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
    
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
  };

  // Convert MM/DD/YYYY to YYYY-MM-DD for storage (timezone-safe)
  const parseFromDisplay = (displayDate: string): string => {
    if (!displayDate) return "";
    
    // Remove any non-numeric characters except slashes
    const cleaned = displayDate.replace(/[^\d\/]/g, '');
    
    // Check if it matches MM/DD/YYYY pattern
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return "";
    
    const [, month, day, year] = match;
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    
    // Validate the date
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return "";
    }
    
    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (date.getUTCMonth() !== monthNum - 1 || date.getUTCDate() !== dayNum) {
      return "";
    }
    
    // Return in YYYY-MM-DD format
    return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
    // Update calendar date to show the selected date
    if (value) {
      setCalendarDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Auto-format as user types
    let formatted = inputValue.replace(/[^\d\/]/g, '');
    
    // Add slashes automatically
    if (formatted.length >= 2 && !formatted.includes('/')) {
      formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
    }
    if (formatted.length >= 5 && formatted.split('/').length === 2) {
      const parts = formatted.split('/');
      if (parts[1].length >= 2) {
        formatted = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2);
      }
    }
    
    setDisplayValue(formatted);
    
    // Validate and convert to ISO format
    const isoDate = parseFromDisplay(formatted);
    const valid = !formatted || isoDate !== "";
    setIsValid(valid);
    
    if (valid && isoDate) {
      onChange(isoDate);
    } else if (!formatted) {
      onChange("");
    }
  };

  const handleBlur = () => {
    // On blur, ensure the date is properly formatted
    const isoDate = parseFromDisplay(displayValue);
    if (isoDate) {
      setDisplayValue(formatForDisplay(isoDate));
      onChange(isoDate);
      setIsValid(true);
    } else if (displayValue) {
      setIsValid(false);
    }
  };

  const handleCalendarDateSelect = (year: number, month: number, day: number) => {
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDisplayValue(formatForDisplay(isoDate));
    onChange(isoDate);
    setIsValid(true);
    setShowCalendar(false);
  };

  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = value && new Date(value + 'T00:00:00').getDate() === day && 
                        new Date(value + 'T00:00:00').getMonth() === month &&
                        new Date(value + 'T00:00:00').getFullYear() === year;
      
      days.push(
        <button
          key={day}
          onClick={() => handleCalendarDateSelect(year, month + 1, day)}
          className={`p-2 text-sm hover:bg-blue-100 rounded ${
            isSelected ? 'bg-blue-500 text-white' : 'text-gray-700'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  return (
    <div className="relative">
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setShowCalendar(true)}
          placeholder={placeholder}
          className={`${className} ${!isValid ? 'border-red-500' : ''} flex-1`}
          maxLength={10}
        />
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="px-3 py-2 border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-r-md"
        >
          📅
        </button>
      </div>
      
      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 min-w-[280px]"
        >
          {/* Month/Year Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              type="button"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <div className="font-semibold">
              {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {generateCalendarDays()}
          </div>
        </div>
      )}
    </div>
  );
}
