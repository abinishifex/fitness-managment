'use client';

import { useEffect, useRef, useState, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelected?: number;
  placeholder?: string;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  maxSelected,
  placeholder = 'Select…',
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const panelId = useId();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        document.getElementById(triggerId)?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, triggerId]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      if (maxSelected !== undefined && selected.length >= maxSelected) return;
      onChange([...selected, value]);
    }
  }

  const reachedMax = maxSelected !== undefined && selected.length >= maxSelected;

  // Labels for selected values
  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="field" ref={containerRef} style={{ position: 'relative' }}>
      <label htmlFor={triggerId} style={{ color: 'var(--muted)', fontSize: 13 }}>
        {label}
        {maxSelected !== undefined && (
          <span style={{ marginLeft: 6, opacity: 0.6 }}>
            (up to {maxSelected})
          </span>
        )}
      </label>

      {/* Trigger button */}
      <button
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: 'var(--bg)',
          border: `1px solid ${open ? 'var(--volt)' : 'var(--line)'}`,
          padding: '13px',
          color: selected.length === 0 ? 'var(--muted)' : 'var(--text)',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          minHeight: 46,
          outline: 'none',
          font: 'inherit',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--volt)')}
        onBlur={(e) => {
          if (!open) e.currentTarget.style.borderColor = 'var(--line)';
        }}
      >
        {selectedLabels.length === 0 ? (
          <span style={{ opacity: 0.6 }}>{placeholder}</span>
        ) : (
          selectedLabels.map((lbl) => (
            <span
              key={lbl}
              className="tag"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {lbl}
              {/* Remove chip on click without opening dropdown */}
              <span
                role="button"
                aria-label={`Remove ${lbl}`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  const opt = options.find((o) => o.label === lbl);
                  if (opt) toggle(opt.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    const opt = options.find((o) => o.label === lbl);
                    if (opt) toggle(opt.value);
                  }
                }}
                style={{ cursor: 'pointer', lineHeight: 1, fontSize: 13, opacity: 0.75 }}
              >
                ×
              </span>
            </span>
          ))
        )}
        {/* Chevron */}
        <span
          aria-hidden="true"
          style={{
            marginLeft: 'auto',
            color: 'var(--muted)',
            fontSize: 10,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id={panelId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            zIndex: 50,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            const isDisabled = !isSelected && reachedMax;

            return (
              <label
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                  background: isSelected ? 'rgba(212,255,0,0.06)' : 'transparent',
                  color: 'var(--text)',
                  fontSize: 14,
                  borderBottom: '1px solid var(--line)',
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled)
                    (e.currentTarget as HTMLElement).style.background = isSelected
                      ? 'rgba(212,255,0,0.1)'
                      : 'var(--panel2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isSelected
                    ? 'rgba(212,255,0,0.06)'
                    : 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggle(opt.value)}
                  // Custom accent via inline style
                  style={{
                    accentColor: 'var(--volt)',
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  // Keyboard: Space on the label already toggles; prevent double-fire
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{opt.label}</span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    style={{ marginLeft: 'auto', color: 'var(--volt)', fontSize: 13 }}
                  >
                    ✓
                  </span>
                )}
              </label>
            );
          })}
          {reachedMax && (
            <div
              style={{
                padding: '9px 14px',
                color: 'var(--muted)',
                fontSize: 12,
                borderTop: '1px solid var(--line)',
                background: 'var(--panel)',
              }}
            >
              Max {maxSelected} selected — deselect one to change.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
