import React from 'react';
import { ItemRarity, StationeryCategory } from '../types/shop';

interface StationeryArtProps {
  itemId?: string;
  category: StationeryCategory;
  rarity: ItemRarity;
  className?: string;
}

const PALETTE: Record<ItemRarity, { primary: string; secondary: string; highlight: string }> = {
  transcendent: { primary: '#06B6D4', secondary: '#F59E0B', highlight: '#E0F2FE' },
  mythic: { primary: '#C026D3', secondary: '#7C3AED', highlight: '#FDE047' },
  legendary: { primary: '#D97706', secondary: '#F59E0B', highlight: '#FEF08A' },
  epic: { primary: '#7C3AED', secondary: '#A78BFA', highlight: '#EDE9FE' },
  rare: { primary: '#0284C7', secondary: '#38BDF8', highlight: '#E0F2FE' },
  common: { primary: '#475569', secondary: '#94A3B8', highlight: '#F1F5F9' },
  trash: { primary: '#57534E', secondary: '#A8A29E', highlight: '#E7E5E4' },
};

export const StationeryArt: React.FC<StationeryArtProps> = ({
  itemId,
  category,
  rarity,
  className = 'h-16 w-16',
}) => {
  const p = PALETTE[rarity];

  // Transcendent Smart Glasses bespoke holographic artwork
  if (itemId === 'transcendent-smart-glasses') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="sg-frame" x1="8" y1="24" x2="72" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#E879F9" />
          </linearGradient>
          <linearGradient id="sg-lens" x1="12" y1="28" x2="36" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Outer holographic aura */}
        <circle cx="40" cy="40" r="32" stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 3" />
        {/* Temples / Arms */}
        <path d="M10 34L17 24H23" stroke="url(#sg-frame)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 34L63 24H57" stroke="url(#sg-frame)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* Left & Right HUD Lenses */}
        <path d="M10 34H34L32 48C31 51 28 52 24 52H15C12 52 10 49 10 46V34Z" fill="url(#sg-lens)" stroke="url(#sg-frame)" strokeWidth="2.4" />
        <path d="M46 34H70V46C70 49 68 52 65 52H56C52 52 49 51 48 48L46 34Z" fill="url(#sg-lens)" stroke="url(#sg-frame)" strokeWidth="2.4" />
        {/* Bridge */}
        <path d="M34 36C37 33 43 33 46 36" stroke="url(#sg-frame)" strokeWidth="2.6" strokeLinecap="round" />
        {/* Holographic HUD lines inside lenses */}
        <line x1="15" y1="40" x2="27" y2="40" stroke="#FEF08A" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="15" y1="44" x2="23" y2="44" stroke="#E0F2FE" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="58" cy="42" r="4" stroke="#FEF08A" strokeWidth="1.4" />
        <circle cx="58" cy="42" r="1.5" fill="#FDE047" />
        {/* Side emitter nodes */}
        <circle cx="11" cy="34" r="2.2" fill="#FDE047" />
        <circle cx="69" cy="34" r="2.2" fill="#FDE047" />
      </svg>
    );
  }

  // Special celestial golden quill artwork for 성좌의 황금 깃펜
  if (itemId === 'mythic-celestial-quill') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="celestial-gold" x1="15" y1="10" x2="65" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {/* Constellation halo stars */}
        <circle cx="20" cy="22" r="2" fill="#FDE047" />
        <circle cx="58" cy="18" r="1.8" fill="#E879F9" />
        <circle cx="62" cy="54" r="2" fill="#FDE047" />
        <path d="M20 22L58 18L62 54" stroke="#FDE047" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
        {/* Feather plume */}
        <path
          d="M57 12C45 14 33 24 27 40L32 45L29 48L34 51C48 45 58 31 57 12Z"
          fill="url(#celestial-gold)"
        />
        <path
          d="M55 14C44 21 36 33 30 48"
          stroke="#FFFBEB"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Golden Nib */}
        <path d="M29 48L18 65L26 60L34 51L29 48Z" fill="#FEF08A" stroke="#B45309" strokeWidth="1.2" />
        <circle cx="42" cy="30" r="2.5" fill="#FFFBEB" />
      </svg>
    );
  }

  // Funny / unusable Common items custom SVGs
  if (itemId === 'common-eraser-crumbs') {
    // 지우개 똥
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <path
          d="M20 50C17 44 23 39 29 42C33 36 42 36 46 41C53 38 61 43 58 50C62 56 54 62 47 59C42 63 33 62 29 58C22 60 17 55 20 50Z"
          fill="#CBD5E1"
          stroke="#64748B"
          strokeWidth="2"
        />
        <circle cx="31" cy="49" r="2" fill="#94A3B8" />
        <circle cx="44" cy="48" r="2.5" fill="#94A3B8" />
        <path d="M24 30C27 26 32 28 30 33" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M49 27C53 25 56 29 52 33" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="60" cy="36" r="2.2" fill="#94A3B8" />
      </svg>
    );
  }

  if (itemId === 'common-empty-lead-case') {
    // 다 쓴 샤프통 (completely empty transparent tube)
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <rect x="29" y="14" width="22" height="52" rx="4" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.2" />
        <rect x="27" y="12" width="26" height="10" rx="2" fill="#475569" />
        <rect x="33" y="29" width="14" height="24" rx="2" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x="40" y="45" textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="bold">0</text>
      </svg>
    );
  }

  if (itemId === 'common-bent-sharp') {
    // 끝이 꺾인 샤프
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-28 40 40)">
          <rect x="33" y="12" width="14" height="38" rx="3" fill="#64748B" />
          <path d="M33 50L38 61H42L47 50H33Z" fill="#CBD5E1" />
          {/* Bent needle tip */}
          <path d="M40 61L40 66L51 70" stroke="#334155" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="47" y="16" width="3" height="15" rx="1.5" fill="#CBD5E1" />
        </g>
      </svg>
    );
  }

  if (itemId === 'common-crooked-ruler') {
    // 눈금이 맞지 않는 자
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-18 40 40)">
          <path
            d="M12 31C26 27 52 35 68 30V49C52 53 26 46 12 50V31Z"
            fill="#E2E8F0"
            stroke="#64748B"
            strokeWidth="2.2"
          />
          {/* Irregular crooked tick marks */}
          <line x1="19" y1="31" x2="19" y2="39" stroke="#475569" strokeWidth="1.8" />
          <line x1="25" y1="30" x2="27" y2="37" stroke="#475569" strokeWidth="1.8" />
          <line x1="39" y1="31" x2="39" y2="41" stroke="#475569" strokeWidth="1.8" />
          <line x1="44" y1="32" x2="42" y2="38" stroke="#475569" strokeWidth="1.8" />
          <line x1="58" y1="31" x2="58" y2="40" stroke="#475569" strokeWidth="1.8" />
        </g>
      </svg>
    );
  }

  if (itemId === 'common-leaking-marker') {
    // 잉크가 새는 컴싸
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-25 40 40)">
          <rect x="33" y="14" width="14" height="38" rx="3" fill="#1E293B" />
          <rect x="35" y="23" width="10" height="16" rx="1.5" fill="#E2E8F0" />
          <path d="M36 52H44L42 60H38L36 52Z" fill="#0F172A" />
        </g>
        {/* Dripping black ink puddle */}
        <circle cx="52" cy="61" r="4.5" fill="#0F172A" />
        <circle cx="44" cy="67" r="3" fill="#0F172A" />
        <path d="M51 54C54 56 54 60 52 62" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (itemId === 'trash-empty-whiteout') {
    // 다 써버린 화이트 (empty correction tape dispenser with snapped ribbon)
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-14 40 40)">
          <rect
            x="16"
            y="24"
            width="42"
            height="30"
            rx="12"
            fill="#F5F5F4"
            stroke="#57534E"
            strokeWidth="2.2"
          />
          {/* Empty clear tape spool */}
          <circle cx="32" cy="39" r="9" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.8" />
          <circle cx="32" cy="39" r="3.5" fill="#A8A29E" />
          <circle cx="48" cy="39" r="6" fill="#E7E5E4" stroke="#78716C" strokeWidth="1.5" strokeDasharray="2 2" />
          {/* Nozzle */}
          <path d="M56 35L67 39L56 44V35Z" fill="#78716C" />
          {/* Snapped hanging empty ribbon */}
          <path
            d="M66 39C70 43 65 48 69 53"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 2"
          />
        </g>
        <text x="27" y="21" fill="#78716C" fontSize="9" fontWeight="bold">EMPTY</text>
      </svg>
    );
  }

  if (itemId === 'trash-broken-yeowonjun-glasses') {
    // 부서진 여원준의 안경 (cracked left lens, taped bridge, missing/bent right arm)
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-7 40 42)">
          {/* Left arm (bent) */}
          <path d="M11 36L17 24L22 25" stroke="#44403C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Broken short stump for right arm */}
          <path d="M69 38L64 31" stroke="#44403C" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 2" />
          {/* Left lens (shattered) */}
          <rect x="11" y="34" width="24" height="16" rx="4" fill="#E2E8F0" fillOpacity="0.8" stroke="#292524" strokeWidth="2.3" />
          {/* Shatter cracks */}
          <path d="M18 35L24 42L14 48M24 42L33 45M24 42L27 35" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
          {/* Right lens (tilted/cracked) */}
          <rect x="45" y="36" width="24" height="16" rx="4" fill="#CBD5E1" fillOpacity="0.65" stroke="#292524" strokeWidth="2.3" />
          <path d="M53 37L49 51" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" />
          {/* Taped bridge */}
          <path d="M35 41H45" stroke="#292524" strokeWidth="2.4" />
          <rect x="35" y="36" width="10" height="11" rx="1.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" transform="rotate(8 40 41)" />
        </g>
      </svg>
    );
  }

  if (category === 'pencil') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-35 40 40)">
          <rect x="33" y="14" width="14" height="42" rx="3" fill={p.primary} />
          <rect x="35" y="14" width="4" height="42" fill={p.secondary} opacity="0.7" />
          <rect x="32.5" y="42" width="15" height="12" rx="1.5" fill={p.highlight} />
          <path d="M34 45H46M34 48H46M34 51H46" stroke={p.primary} strokeWidth="1.2" opacity="0.7" />
          <path d="M33 56L40 69L47 56H33Z" fill="#CBD5E1" />
          <line x1="40" y1="68" x2="40" y2="73" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <rect x="36" y="7" width="8" height="7" rx="1.5" fill={p.highlight} />
          <rect x="47" y="18" width="3" height="16" rx="1.5" fill={p.highlight} />
        </g>
      </svg>
    );
  }

  if (category === 'eraser') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-12 40 40)">
          <rect x="18" y="20" width="44" height="42" rx="7" fill="#F8FAFC" stroke={p.primary} strokeWidth="2.5" />
          <rect x="17" y="34" width="46" height="24" rx="4" fill={p.primary} />
          <rect x="21" y="38" width="38" height="4" rx="2" fill={p.highlight} opacity="0.85" />
          <circle cx="40" cy="49" r="4" fill={p.secondary} />
        </g>
      </svg>
    );
  }

  if (category === 'pen') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-35 40 40)">
          <rect x="34" y="10" width="12" height="36" rx="4" fill={p.primary} />
          <rect x="33" y="42" width="14" height="4" rx="1" fill={p.highlight} />
          <path d="M35 46L33 60L40 69L47 60L45 46H35Z" fill={p.highlight} stroke={p.secondary} strokeWidth="1.5" />
          <line x1="40" y1="54" x2="40" y2="69" stroke={p.primary} strokeWidth="1.5" />
          <circle cx="40" cy="54" r="2" fill={p.primary} />
        </g>
      </svg>
    );
  }

  if (category === 'highlighter') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <g transform="rotate(-25 40 40)">
          <rect x="30" y="18" width="20" height="38" rx="4" fill={p.secondary} />
          <rect x="30" y="18" width="8" height="38" rx="2" fill={p.primary} />
          <rect x="32" y="11" width="16" height="7" rx="2" fill={p.highlight} />
          <path d="M35 56H45L43 65L37 62V56Z" fill={p.highlight} />
        </g>
      </svg>
    );
  }

  if (category === 'notebook') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        <rect x="19" y="13" width="44" height="54" rx="6" fill={p.primary} />
        <rect x="24" y="13" width="39" height="54" rx="4" fill={p.secondary} />
        <rect x="19" y="13" width="7" height="54" rx="3" fill={p.highlight} opacity="0.9" />
        <rect x="32" y="24" width="23" height="14" rx="3" fill="#FFFFFF" opacity="0.92" />
        <line x1="36" y1="29" x2="51" y2="29" stroke={p.primary} strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="33" x2="47" y2="33" stroke={p.secondary} strokeWidth="2" strokeLinecap="round" />
        <path d="M49 67V74L52 71.5L55 74V67H49Z" fill={p.highlight} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <rect x="16" y="18" width="48" height="44" rx="10" fill={p.primary} />
      <rect x="22" y="24" width="36" height="22" rx="5" fill={p.highlight} />
      <circle cx="40" cy="35" r="7" stroke={p.primary} strokeWidth="2.5" />
      <path d="M40 31V35L43 37" stroke={p.primary} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="54" r="3" fill={p.secondary} />
      <circle cx="40" cy="54" r="3" fill={p.highlight} />
      <circle cx="50" cy="54" r="3" fill={p.secondary} />
    </svg>
  );
};
