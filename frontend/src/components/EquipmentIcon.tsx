/**
 * EquipmentIcon — inline SVG icons for each equipment value.
 *
 * stroke="currentColor" so the icon inherits color from its parent,
 * giving muted / lime-selected behavior for free via Tailwind classes on the card.
 *
 * Keys match the `equipment` array in onboarding/page.tsx exactly.
 * Unknown values fall back to a generic box icon so new backend values never crash.
 */

import React from 'react';

interface IconProps {
  className?: string;
}

/* ─── individual icons ─────────────────────────────────────────────────────── */

// none → a circle with a diagonal slash
const NoneIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" />
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke="currentColor" />
  </svg>
);

// bodyweight → stick figure (head + torso + arms raised + legs)
const BodyweightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="4.5" r="2" stroke="currentColor" />
    {/* torso */}
    <line x1="12" y1="6.5" x2="12" y2="14" stroke="currentColor" />
    {/* arms raised */}
    <line x1="12" y1="9" x2="7" y2="6.5" stroke="currentColor" />
    <line x1="12" y1="9" x2="17" y2="6.5" stroke="currentColor" />
    {/* legs */}
    <line x1="12" y1="14" x2="9" y2="20" stroke="currentColor" />
    <line x1="12" y1="14" x2="15" y2="20" stroke="currentColor" />
  </svg>
);

// dumbbell → two circles joined by a handle
const DumbbellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* left weight */}
    <rect x="2" y="9" width="4" height="6" rx="1" stroke="currentColor" />
    {/* right weight */}
    <rect x="18" y="9" width="4" height="6" rx="1" stroke="currentColor" />
    {/* handle */}
    <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" />
    {/* collar lines */}
    <line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" />
    <line x1="16" y1="10" x2="16" y2="14" stroke="currentColor" />
  </svg>
);

// barbell → long bar with large plates on each end
const BarbellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* bar */}
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" />
    {/* left plate */}
    <rect x="2" y="7" width="3" height="10" rx="0.5" stroke="currentColor" />
    {/* right plate */}
    <rect x="19" y="7" width="3" height="10" rx="0.5" stroke="currentColor" />
    {/* collar lines */}
    <line x1="7" y1="10" x2="7" y2="14" stroke="currentColor" />
    <line x1="17" y1="10" x2="17" y2="14" stroke="currentColor" />
  </svg>
);

// machine → rectangular frame with a seat and weight stack
const MachineIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* frame */}
    <rect x="3" y="3" width="18" height="16" rx="1" stroke="currentColor" />
    {/* seat */}
    <line x1="7" y1="19" x2="17" y2="19" stroke="currentColor" />
    {/* weight stack indicator (three horizontal lines inside) */}
    <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" />
    <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" />
    <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" />
  </svg>
);

// cable_machine → pulley wheel at top + cable going diagonally down + handle at bottom
const CableMachineIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* vertical tower */}
    <rect x="3" y="2" width="5" height="20" rx="1" stroke="currentColor" />
    {/* pulley wheel at top */}
    <circle cx="5.5" cy="5" r="2" stroke="currentColor" />
    {/* cable from pulley to handle */}
    <line x1="7" y1="5" x2="20" y2="19" stroke="currentColor" />
    {/* D-handle at the end */}
    <path d="M18 17 Q22 18 22 20 Q22 22 18 21" stroke="currentColor" />
  </svg>
);

// resistance_bands → wavy horizontal band
const ResistanceBandsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* anchor loop left */}
    <circle cx="3" cy="12" r="2" stroke="currentColor" />
    {/* anchor loop right */}
    <circle cx="21" cy="12" r="2" stroke="currentColor" />
    {/* band — wavy path between anchors */}
    <path d="M5 12 C7 8, 9 16, 12 12 S17 8, 19 12" stroke="currentColor" />
  </svg>
);

// kettlebell → round bell with handle on top
const KettlebellIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* bell body */}
    <circle cx="12" cy="15" r="7" stroke="currentColor" />
    {/* handle arch */}
    <path d="M8 9 Q8 4 12 4 Q16 4 16 9" stroke="currentColor" />
    {/* handle bar */}
    <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" />
  </svg>
);

// bench → flat padded surface on two legs
const BenchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* bench top (pad) */}
    <rect x="2" y="9" width="20" height="4" rx="1" stroke="currentColor" />
    {/* left leg */}
    <line x1="5" y1="13" x2="5" y2="20" stroke="currentColor" />
    {/* right leg */}
    <line x1="19" y1="13" x2="19" y2="20" stroke="currentColor" />
    {/* foot crossbar left */}
    <line x1="3" y1="20" x2="7" y2="20" stroke="currentColor" />
    {/* foot crossbar right */}
    <line x1="17" y1="20" x2="21" y2="20" stroke="currentColor" />
  </svg>
);

// pull_up_bar → horizontal bar with grip marks mounted on two uprights
const PullUpBarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {/* horizontal bar */}
    <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" />
    {/* left upright */}
    <line x1="3" y1="6" x2="3" y2="2" stroke="currentColor" />
    {/* right upright */}
    <line x1="21" y1="6" x2="21" y2="2" stroke="currentColor" />
    {/* stick figure hanging */}
    {/* head */}
    <circle cx="12" cy="9.5" r="1.5" stroke="currentColor" />
    {/* arms up gripping bar */}
    <line x1="9" y1="6" x2="11" y2="9" stroke="currentColor" />
    <line x1="15" y1="6" x2="13" y2="9" stroke="currentColor" />
    {/* torso */}
    <line x1="12" y1="11" x2="12" y2="16" stroke="currentColor" />
    {/* legs */}
    <line x1="12" y1="16" x2="10" y2="21" stroke="currentColor" />
    <line x1="12" y1="16" x2="14" y2="21" stroke="currentColor" />
  </svg>
);

// generic fallback → simple box with a question mark
const FallbackIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" stroke="currentColor" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" />
  </svg>
);

/* ─── icon map ─────────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  none:             NoneIcon,
  bodyweight:       BodyweightIcon,
  dumbbell:         DumbbellIcon,
  barbell:          BarbellIcon,
  machine:          MachineIcon,
  cable_machine:    CableMachineIcon,
  resistance_bands: ResistanceBandsIcon,
  kettlebell:       KettlebellIcon,
  bench:            BenchIcon,
  pull_up_bar:      PullUpBarIcon,
};

/* ─── public component ──────────────────────────────────────────────────────── */

interface EquipmentIconProps {
  /** Must match one of the equipment values used in onboarding (e.g. "cable_machine"). */
  value: string;
  className?: string;
}

export default function EquipmentIcon({ value, className = 'w-8 h-8' }: EquipmentIconProps) {
  const Icon = ICON_MAP[value] ?? FallbackIcon;
  return <Icon className={className} />;
}
