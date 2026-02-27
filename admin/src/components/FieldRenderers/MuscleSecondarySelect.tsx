import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MuscleDropdownOption } from '../../utils/muscleDropdownGroups';

interface MuscleSecondarySelectProps {
  options: MuscleDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Custom dropdown for muscle children: depth 1 bold, depth >= 2 indented by (depth - 1) * 12px.
 * Renders the list in a portal so it is not clipped by tree containers (overflow-hidden).
 */
export default function MuscleSecondarySelect({
  options,
  onChange,
  className = '',
  placeholder = '+ secondary...',
}: MuscleSecondarySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 192) });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
    setDropdownRect(null);
  };

  const dropdownContent =
    isOpen &&
    options.length > 0 &&
    dropdownRect &&
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[9999] min-w-[12rem] max-h-60 overflow-auto rounded border border-gray-200 bg-white py-0.5 shadow-lg"
        role="listbox"
        style={{
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            disabled={opt.disabled}
            onClick={() => !opt.disabled && handleSelect(opt.value)}
            className={`w-full text-left px-2 py-1 text-[10px] focus:outline-none ${
              opt.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'hover:bg-red-50 focus:bg-red-50 ' + (opt.depth === 0 ? 'font-bold text-gray-900' : 'text-gray-700')
            }`}
            style={opt.depth != null && opt.depth >= 1 ? { paddingLeft: 8 + opt.depth * 12 } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={className || 'text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'}
      >
        {placeholder}
      </button>
      {dropdownContent}
    </>
  );
}
