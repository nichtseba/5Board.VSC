import { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function CustomSelect({ value, onChange, options, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const dropdownContent = dropdownRef.current;
      // Measure the actual width needed for all options
      dropdownContent.style.width = 'auto';
      // Use next frame to get proper measurements
      requestAnimationFrame(() => {
        const contentWidth = dropdownContent.scrollWidth;
        const minWidth = buttonRef.current?.offsetWidth ?? 0;
        dropdownContent.style.width = `${Math.max(contentWidth, minWidth)}px`;
      });
    }
  }, [isOpen]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || value;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-between focus-visible:outline-none"
      >
        <span>{selectedLabel}</span>
        <span className="ml-2 flex items-center justify-center w-4 h-4">
          {isOpen ? (
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.77 12.79a1 1 0 01-1.41-1.41L10 9.41 6.64 12.77a1 1 0 11-1.41-1.41l4.24-4.24a1 1 0 011.41 0l4.24 4.24a1 1 0 010 1.41z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a1 1 0 011.41 0L10 10.59l3.36-3.36a1 1 0 111.41 1.41l-4.24 4.24a1 1 0 01-1.41 0L5.23 8.62a1 1 0 010-1.41z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[999] opacity-100"
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-sm transition-colors whitespace-nowrap focus-visible:outline-none ${
                value === option.value
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
