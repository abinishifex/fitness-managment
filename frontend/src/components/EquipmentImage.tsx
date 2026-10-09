/**
 * EquipmentImage
 *
 * Renders /equipment/<value>.webp inside a fixed-size square backdrop.
 * If the image file does not exist (404) or fails to load for any reason,
 * onError swaps in the EquipmentIcon SVG so the card always has a visual.
 *
 * The backdrop uses existing Tailwind design-system tokens only — no hex values.
 * The `selected` prop adds a lime tint (signal-volt at low opacity) so dark
 * equipment stays legible while still communicating the active state.
 */

'use client';

import { useState } from 'react';
import EquipmentIcon from './EquipmentIcon';

interface EquipmentImageProps {
  /** Equipment value as stored in the DB, e.g. "cable_machine". */
  value: string;
  /** Alt text — the card label already names it, so pass '' here. */
  alt?: string;
  /** Whether this card is currently selected; drives backdrop tint. */
  selected?: boolean;
}

export default function EquipmentImage({ value, alt = '', selected = false }: EquipmentImageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // backdrop: surface-container-highest when unselected, signal-volt-glow when selected
  // (signal-volt-glow = #D4FF001A — 10 % lime tint — already defined in tailwind.config.ts)
  const backdropClass = [
    'w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden',
    'transition-colors',
    selected ? 'bg-signal-volt-glow' : 'bg-surface-container-highest',
  ].join(' ');

  if (imgFailed) {
    return (
      <div className={backdropClass} aria-hidden="true">
        <EquipmentIcon value={value} className="w-7 h-7 shrink-0" />
      </div>
    );
  }

  return (
    <div className={backdropClass} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/equipment/${value}.webp`}
        alt={alt}
        width={48}
        height={48}
        loading="lazy"
        className="w-full h-full object-contain"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}
