import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles, X } from 'lucide-react';
import {
  GACHA_ITEMS,
  GACHA_POOL_ITEMS,
  MYTHIC_RELIC_IDS,
  RARITY_META,
  getRarityRank,
  isHighRarity,
  playCutsceneCue,
  playRareFanfare,
  playRouletteTick,
} from '../data/gachaItems';
import { GachaDrawResult, GachaItem } from '../types/shop';
import { StationeryArt } from './StationeryArt';

interface GachaCutsceneModalProps {
  results: GachaDrawResult[] | null;
  totalRefund: number;
  soundEnabled: boolean;
  onClose: () => void;
  onEquipItem: (itemId: string) => void;
  equippedItemId: string | null;
  initialStage?: 'roulette' | 'cutscene';
  previewMode?: boolean;
}

const CARD_WIDTH = 108;
const CARD_GAP = 10;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const STRIP_LENGTH = 36;
const WIN_INDEX = 27;
const ROULETTE_DURATION_MS = 3400;

function buildRouletteStrip(winningItem: GachaItem): GachaItem[] {
  const strip: GachaItem[] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    if (i === WIN_INDEX) {
      strip.push(winningItem);
    } else {
      const randomItem =
        GACHA_POOL_ITEMS[Math.floor(Math.random() * GACHA_POOL_ITEMS.length)];
      strip.push(randomItem);
    }
  }
  return strip;
}

const STAR_POSITIONS = [
  { left: '6%', top: '12%', size: 2, delay: 0.1 },
  { left: '14%', top: '34%', size: 1.5, delay: 0.5 },
  { left: '20%', top: '72%', size: 2.5, delay: 0.2 },
  { left: '29%', top: '18%', size: 1.5, delay: 0.8 },
  { left: '38%', top: '44%', size: 2, delay: 0.3 },
  { left: '46%', top: '10%', size: 2, delay: 0.4 },
  { left: '54%', top: '82%', size: 2, delay: 0.7 },
  { left: '63%', top: '16%', size: 2.5, delay: 0.3 },
  { left: '71%', top: '65%', size: 1.5, delay: 0.9 },
  { left: '79%', top: '26%', size: 2, delay: 0.2 },
  { left: '88%', top: '49%', size: 2.5, delay: 0.6 },
  { left: '94%', top: '19%', size: 2, delay: 0.4 },
  { left: '11%', top: '59%', size: 2, delay: 0.4 },
  { left: '36%', top: '69%', size: 1.5, delay: 0.1 },
  { left: '59%', top: '39%', size: 2, delay: 0.5 },
  { left: '84%', top: '80%', size: 2, delay: 0.3 },
  { left: '24%', top: '48%', size: 1.8, delay: 0.6 },
  { left: '68%', top: '86%', size: 2, delay: 0.2 },
];

// Real Libra constellation normalized coordinates (0..320 x 0..240)
const LIBRA_STARS = [
  { id: 'alpha', cx: 112, cy: 118, r: 5.2 }, // Zubenelgenubi
  { id: 'beta', cx: 165, cy: 64, r: 5.8 },   // Zubeneschamali (top peak)
  { id: 'gamma', cx: 222, cy: 108, r: 4.8 }, // Zubenelhakrabi
  { id: 'upsilon', cx: 238, cy: 156, r: 4.0 },
  { id: 'tau', cx: 252, cy: 194, r: 4.2 },
  { id: 'iota', cx: 146, cy: 174, r: 4.5 },
  { id: 'sigma', cx: 92, cy: 198, r: 4.8 },  // Brachium
];

// Single continuous path connecting Libra stars in one smooth stroke
const LIBRA_SINGLE_PATH =
  'M 92 198 L 146 174 L 112 118 L 165 64 L 222 108 L 238 156 L 252 194 M 112 118 L 222 108 L 146 174';

const ABSORBING_ORBS = [
  { sx: -210, sy: -140, color: '#FDE047', delay: 0.1 },
  { sx: 220, sy: -130, color: '#38BDF8', delay: 0.35 },
  { sx: -240, sy: 60, color: '#C084FC', delay: 0.6 },
  { sx: 230, sy: 80, color: '#34D399', delay: 0.85 },
  { sx: -140, sy: 170, color: '#FBBF24', delay: 1.1 },
  { sx: 150, sy: -180, color: '#60A5FA', delay: 1.35 },
  { sx: 0, sy: -210, color: '#F472B6', delay: 1.6 },
  { sx: 180, sy: 165, color: '#FDE047', delay: 1.85 },
  { sx: -185, sy: -50, color: '#7DD3FC', delay: 2.1 },
  { sx: 95, sy: 190, color: '#A78BFA', delay: 2.35 },
];

export const GachaCutsceneModal: React.FC<GachaCutsceneModalProps> = ({
  results,
  totalRefund,
  soundEnabled,
  onClose,
  onEquipItem,
  equippedItemId,
  initialStage = 'roulette',
  previewMode = false,
}) => {
  const featured = useMemo(() => {
    if (!results || results.length === 0) return null;
    return [...results].sort(
      (a, b) => getRarityRank(a.item.rarity) - getRarityRank(b.item.rarity)
    )[0];
  }, [results]);

  const hasHighRarity = featured ? isHighRarity(featured.item.rarity) : false;

  const [phase, setPhase] = useState<'roulette' | 'cutscene' | 'reveal'>('reveal');
  const [beat, setBeat] = useState<number>(0);
  const [rouletteSettled, setRouletteSettled] = useState(false);

  const rouletteStrip = useMemo(() => {
    if (!featured) return [];
    return buildRouletteStrip(featured.item);
  }, [featured]);

  const targetOffsetX = useMemo(() => {
    if (!featured) return 0;
    const jitter = Math.floor(Math.random() * 36) - 18;
    return -(WIN_INDEX * CARD_STEP + CARD_WIDTH / 2 + jitter);
  }, [featured]);

  const tickRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!results || !featured) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setPhase('reveal');
      if (hasHighRarity && soundEnabled) {
        playRareFanfare(featured.item.rarity);
      }
      return;
    }

    if (initialStage === 'cutscene' && hasHighRarity) {
      setBeat(0);
      setPhase('cutscene');
      return;
    }

    setRouletteSettled(false);
    setPhase('roulette');
  }, [featured, hasHighRarity, initialStage, results, soundEnabled]);

  // Roulette tick loop & stage handoff
  useEffect(() => {
    if (phase !== 'roulette' || !featured) return;

    setRouletteSettled(false);
    const startTime = performance.now();
    const startX = -CARD_WIDTH * 1.5;
    const distance = targetOffsetX - startX;
    let lastCardIdx = -1;

    const tickLoop = (now: number) => {
      const t = Math.min(1, (now - startTime) / ROULETTE_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3.6);
      const currentX = startX + distance * eased;
      const currentIdx = Math.floor(Math.abs(currentX) / CARD_STEP);

      if (currentIdx !== lastCardIdx && t < 0.99) {
        lastCardIdx = currentIdx;
        if (soundEnabled) {
          playRouletteTick();
        }
      }

      if (t < 1) {
        tickRafRef.current = requestAnimationFrame(tickLoop);
      }
    };

    tickRafRef.current = requestAnimationFrame(tickLoop);

    const settleTimer = window.setTimeout(() => {
      setRouletteSettled(true);
    }, ROULETTE_DURATION_MS);

    const nextTimer = window.setTimeout(() => {
      if (hasHighRarity) {
        setBeat(0);
        setPhase('cutscene');
      } else {
        setPhase('reveal');
      }
    }, ROULETTE_DURATION_MS + 900);

    return () => {
      if (tickRafRef.current !== null) cancelAnimationFrame(tickRafRef.current);
      window.clearTimeout(settleTimer);
      window.clearTimeout(nextTimer);
    };
  }, [featured, hasHighRarity, phase, soundEnabled, targetOffsetX]);

  // Slower, bespoke multi-beat cutscene choreography
  useEffect(() => {
    if (phase !== 'cutscene' || !featured) return;

    setBeat(0);
    const timers: number[] = [];
    const schedule = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    if (soundEnabled) playCutsceneCue('rumble');

    if (featured.item.rarity === 'transcendent') {
      // 7-beat Synthesis Cutscene: 4 Relics Spin & Converge -> Earth Zoom -> Storm/Rain/Lightning -> Quake/Crack -> Volcano -> Red->White Earth Explosion -> Smart Glasses
      schedule(4400, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(7800, () => {
        setBeat(2);
        if (soundEnabled) playCutsceneCue('rumble');
      });
      schedule(11400, () => {
        setBeat(3);
        if (soundEnabled) playCutsceneCue('rumble');
      });
      schedule(15000, () => {
        setBeat(4);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(18800, () => {
        setBeat(5);
        if (soundEnabled) playCutsceneCue('rumble');
      });
      schedule(23200, () => {
        setBeat(6);
        if (soundEnabled) playRareFanfare('transcendent');
      });
      schedule(31500, () => setPhase('reveal'));
    } else if (featured.item.rarity === 'legendary') {
      // Slower Unified Legendary Black + Golden Magic Circle
      schedule(2800, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(5000, () => {
        setBeat(2);
        if (soundEnabled) playRareFanfare('legendary');
      });
      schedule(11500, () => setPhase('reveal'));
    } else if (featured.item.id === 'mythic-celestial-quill') {
      // 6 slower beats: Doors -> Chanting Zoom -> Praying Zoom -> Full Cathedral -> Warm White Text -> Bright Altar Descent
      schedule(2900, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(6400, () => setBeat(2));
      schedule(9800, () => {
        setBeat(3);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(13200, () => {
        setBeat(4);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(16600, () => {
        setBeat(5);
        if (soundEnabled) playRareFanfare('mythic');
      });
      schedule(24500, () => setPhase('reveal'));
    } else if (featured.item.id === 'mythic-starlight-sharp') {
      // 5 slower beats: Meadow + Telescope + Meteors -> Space Zoom -> Libra Stars + Flash -> Single Line Connect -> Starry Reveal
      schedule(3800, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(7200, () => setBeat(2));
      schedule(10600, () => {
        setBeat(3);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(14200, () => {
        setBeat(4);
        if (soundEnabled) playRareFanfare('mythic');
      });
      schedule(21500, () => setPhase('reveal'));
    } else if (featured.item.id === 'mythic-akashic-eraser') {
      // 4 slower beats: Space Quote -> Huge Red Total Eclipse -> Star Zoom -> Detailed Giant Milky Way + Item
      schedule(3600, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(8200, () => {
        setBeat(2);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(11800, () => {
        setBeat(3);
        if (soundEnabled) playRareFanfare('mythic');
      });
      schedule(19500, () => setPhase('reveal'));
    } else {
      // mythic-eternal-grimoire: 5 slower beats: Chained Book + Blue Butterfly -> White Flash Shatter -> Pages Flipping + Light Absorb to White -> Gold/Blue Text -> Library Reveal
      schedule(4200, () => {
        setBeat(1);
        if (soundEnabled) playCutsceneCue('climax');
      });
      schedule(7200, () => {
        setBeat(2);
        if (soundEnabled) playCutsceneCue('chime');
      });
      schedule(12600, () => setBeat(3));
      schedule(16200, () => {
        setBeat(4);
        if (soundEnabled) playRareFanfare('mythic');
      });
      schedule(24000, () => setPhase('reveal'));
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [featured, phase, soundEnabled]);

  const mythicRelicItems = useMemo(
    () =>
      MYTHIC_RELIC_IDS.map((id) => GACHA_ITEMS.find((item) => item.id === id)).filter(
        (item): item is GachaItem => !!item
      ),
    []
  );

  if (!results || !featured) return null;

  const isTranscendent = featured.item.rarity === 'transcendent';
  const isMythic = featured.item.rarity === 'mythic';
  const featuredMeta = RARITY_META[featured.item.rarity];
  const itemId = featured.item.id;

  const handleSkipRoulette = () => {
    if (hasHighRarity) {
      setBeat(0);
      setPhase('cutscene');
    } else {
      setPhase('reveal');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* ============================================================ */}
        {/* STAGE 1: ROULETTE SPIN ANIMATION                             */}
        {/* ============================================================ */}
        {phase === 'roulette' && (
          <motion.div
            key="roulette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-slate-950/95 px-4 backdrop-blur-md"
          >
            <div className="mb-6 text-center">
              <p className="text-xs font-bold tracking-[0.22em] text-indigo-300 uppercase">
                STATIONERY GACHA ROULETTE
              </p>
              <h2 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                {results.length === 1
                  ? '문구 뽑기 룰렛 회전 중…'
                  : `${results.length}연속 대표 문구 추첨 중…`}
              </h2>
            </div>

            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 py-6 shadow-2xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-slate-950 to-transparent sm:w-24" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-slate-950 to-transparent sm:w-24" />

              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 -translate-x-1/2">
                <div className="mx-auto h-0 w-0 border-x-[8px] border-t-[10px] border-x-transparent border-t-amber-400" />
                <div className="mx-auto h-[calc(100%-20px)] w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                <div className="mx-auto h-0 w-0 border-x-[8px] border-b-[10px] border-x-transparent border-b-amber-400" />
              </div>

              <div className="relative h-36 w-full">
                <motion.div
                  initial={{ x: -CARD_WIDTH * 1.5 }}
                  animate={{ x: targetOffsetX }}
                  transition={{
                    duration: ROULETTE_DURATION_MS / 1000,
                    ease: [0.1, 0.88, 0.16, 1],
                  }}
                  style={{ left: '50%' }}
                  className="absolute top-0 bottom-0 flex items-center"
                >
                  {rouletteStrip.map((item, idx) => {
                    const meta = RARITY_META[item.rarity];
                    const isWinner = idx === WIN_INDEX && rouletteSettled;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        style={{ width: CARD_WIDTH, marginRight: CARD_GAP }}
                        className={`flex h-32 shrink-0 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-transform duration-300 ${
                          isWinner
                            ? `${meta.borderColor} ${meta.surfaceBg} scale-105 ring-2 ring-amber-400 shadow-lg`
                            : `${meta.borderColor} bg-slate-800/80`
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${meta.textColor}`}>
                          {meta.label}
                        </span>
                        <StationeryArt
                          itemId={item.id}
                          category={item.category}
                          rarity={item.rarity}
                          className="h-14 w-14"
                        />
                        <p className="w-full truncate text-[11px] font-semibold text-white">
                          {item.name}
                        </p>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            </div>

            <div className="mt-5 h-7 text-center">
              {rouletteSettled && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-bold ${
                    hasHighRarity ? 'text-amber-300' : 'text-slate-200'
                  }`}
                >
                  {hasHighRarity
                    ? `${featuredMeta.label} 등급 감지! 특별한 컷신이 시작됩니다…`
                    : `${featured.item.name} 당첨!`}
                </motion.p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSkipRoulette}
              className="mt-4 min-h-[44px] rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              건너뛰기
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2T: TRANSCENDENT SYNTHESIS CUTSCENE (SMART GLASSES)    */}
        {/* ============================================================ */}
        {phase === 'cutscene' && isTranscendent && (
          <motion.div
            key="transcendent-cutscene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#02030a] text-center select-none"
          >
            {/* Beat 0: 4 Mythic Relics Orbiting Slowly -> Faster -> Converging Center */}
            {beat === 0 && (
              <div className="relative flex h-full w-full flex-col items-center justify-center px-6">
                <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
                  <motion.div
                    initial={{ rotate: 0, scale: 1 }}
                    animate={{ rotate: 1080, scale: [1, 1.06, 0.08] }}
                    transition={{
                      rotate: { duration: 4.3, ease: [0.65, 0, 0.9, 1] },
                      scale: { duration: 4.3, times: [0, 0.65, 1], ease: 'easeInOut' },
                    }}
                    className="relative h-64 w-64"
                  >
                    {mythicRelicItems.map((relic, idx) => {
                      const posClasses = [
                        'top-0 left-1/2 -translate-x-1/2',
                        'right-0 top-1/2 -translate-y-1/2',
                        'bottom-0 left-1/2 -translate-x-1/2',
                        'left-0 top-1/2 -translate-y-1/2',
                      ][idx];
                      return (
                        <div key={relic.id} className={`absolute ${posClasses}`}>
                          <StationeryArt
                            itemId={relic.id}
                            category={relic.category}
                            rarity="mythic"
                            className="h-16 w-16 drop-shadow-[0_0_16px_rgba(232,121,249,0.85)]"
                          />
                        </div>
                      );
                    })}
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{ scale: [0.2, 0.6, 2.8], opacity: [0.2, 0.7, 1] }}
                    transition={{ duration: 4.3, ease: 'easeIn' }}
                    className="pointer-events-none absolute h-20 w-20 rounded-full bg-cyan-200/75 blur-xl"
                  />
                </div>
                <p className="mt-6 text-sm font-semibold tracking-widest text-cyan-200 sm:text-base">
                  네 개의 신화 성물이 점점 빠르게 회전하며 하나로 응축된다…
                </p>
              </div>
            )}

            {/* Beat 1: Earth in Space -> Zooming Into Earth */}
            {beat === 1 && (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#020515]">
                <motion.div
                  initial={{ scale: 0.55, opacity: 0 }}
                  animate={{ scale: [0.7, 1.3, 6.2], opacity: [0, 1, 1] }}
                  transition={{ duration: 3.3, ease: [0.35, 0, 0.85, 1] }}
                  className="relative flex h-64 w-64 items-center justify-center"
                >
                  <svg viewBox="0 0 240 240" className="h-full w-full drop-shadow-[0_0_45px_rgba(56,189,248,0.65)]" aria-hidden="true">
                    <defs>
                      <radialGradient id="earthBlue" cx="38%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="55%" stopColor="#1D4ED8" />
                        <stop offset="100%" stopColor="#0F172A" />
                      </radialGradient>
                    </defs>
                    <circle cx="120" cy="120" r="98" fill="url(#earthBlue)" />
                    {/* Continents */}
                    <path d="M72 72 Q104 54 128 84 T112 132 Q80 140 68 106 Z" fill="#22C55E" opacity="0.78" />
                    <path d="M142 96 Q178 88 186 124 Q172 158 148 152 Q134 124 142 96 Z" fill="#16A34A" opacity="0.75" />
                    {/* Swirl clouds */}
                    <path d="M46 105 Q105 90 165 112" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.45" />
                    <path d="M78 156 Q130 144 182 162" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.38" />
                  </svg>
                </motion.div>
                <p className="relative z-20 mt-4 px-6 text-sm font-semibold tracking-widest text-sky-200 sm:text-base">
                  푸른 지구가 거대한 시야로 빨려 들어온다…
                </p>
              </div>
            )}

            {/* Beat 2: Inside Earth - Dark Storm Clouds, Rain & Lightning */}
            {beat === 2 && (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0b1120] via-[#1e293b] to-[#0f172a]">
                {/* Heavy Dark Storm Clouds */}
                <svg viewBox="0 0 1000 280" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full opacity-95" aria-hidden="true">
                  <path d="M-40 160 Q80 60 220 130 Q360 40 520 120 Q680 30 830 125 Q960 60 1060 150 V0 H-40 Z" fill="#0f172a" />
                  <path d="M40 190 Q180 105 330 165 Q480 85 650 165 Q820 95 980 185 V0 H40 Z" fill="#1e293b" opacity="0.85" />
                </svg>

                {/* Pouring Diagonal Rain Streaks */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 15, 35, 55, 75, 85].map((leftPct, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -120, x: 30, opacity: 0 }}
                    animate={{ y: 520, x: -60, opacity: [0, 0.75, 0] }}
                    transition={{ duration: 0.75, repeat: Infinity, delay: (i % 7) * 0.12, ease: 'linear' }}
                    style={{ left: `${leftPct}%`, top: '5%' }}
                    className="pointer-events-none absolute h-14 w-0.5 rotate-[14deg] bg-sky-200/75"
                  />
                ))}

                {/* Jagged Lightning Bolts + Sky Flash */}
                <motion.svg
                  viewBox="0 0 400 500"
                  animate={{ opacity: [0, 1, 0, 0, 1, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="pointer-events-none absolute inset-0 mx-auto h-full w-96 drop-shadow-[0_0_24px_#FEF08A]"
                  aria-hidden="true"
                >
                  <polyline
                    points="220,30 185,155 235,165 170,320 210,328 140,465"
                    fill="none"
                    stroke="#FEF9C3"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
                <motion.div
                  animate={{ opacity: [0, 0.42, 0, 0, 0.32, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="pointer-events-none absolute inset-0 bg-sky-100"
                />

                <p className="relative z-20 mt-40 px-6 text-base font-semibold tracking-widest text-slate-100 sm:text-lg">
                  검은 먹구름이 하늘을 뒤덮고 폭우와 번개가 내리친다…
                </p>
              </div>
            )}

            {/* Beat 3: Shaking & Cracking Ground */}
            {beat === 3 && (
              <motion.div
                animate={{ x: [-7, 7, -6, 6, -3, 3, 0], y: [-5, 5, -4, 4, 0] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a1310] via-[#2b1b12] to-[#120906]"
              >
                <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  {/* Rugged Rocky Terrain Horizon */}
                  <polygon points="0,190 190,150 420,175 630,145 800,185 800,500 0,500" fill="#291A13" />
                  {/* Glowing Magma-lit Cracks splitting through the Earth */}
                  <motion.path
                    d="M400 180 L370 250 L425 315 L360 400 L395 490"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.2, ease: 'easeOut' }}
                    className="drop-shadow-[0_0_18px_#EF4444]"
                  />
                  <motion.path
                    d="M370 250 L230 300 L140 390 M425 315 L580 355 L680 440"
                    fill="none"
                    stroke="#FB923C"
                    strokeWidth="7"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.0, delay: 0.5 }}
                    className="drop-shadow-[0_0_12px_#F97316]"
                  />
                </svg>
                <p className="relative z-20 -mt-36 px-6 text-base font-bold tracking-widest text-orange-200 sm:text-lg">
                  거대한 진동과 함께 대지가 산산이 갈라진다…
                </p>
              </motion.div>
            )}

            {/* Beat 4: Volcanic Eruption */}
            {beat === 4 && (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1f0706] via-[#450a0a] to-[#120404]">
                <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  {/* Erupting Lava Fountain */}
                  <motion.path
                    d="M355 310 Q380 90 400 35 Q420 90 445 310 Z"
                    fill="#F97316"
                    animate={{ scaleY: [0.7, 1.15, 0.9, 1.2], opacity: [0.85, 1, 0.9] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    style={{ transformOrigin: '400px 310px' }}
                  />
                  <motion.path
                    d="M375 310 Q400 120 400 70 Q400 120 425 310 Z"
                    fill="#FEF08A"
                    animate={{ scaleY: [0.75, 1.1, 0.85] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ transformOrigin: '400px 310px' }}
                  />
                  {/* Volcano Mountain Silhouette */}
                  <polygon points="80,600 340,300 460,300 720,600" fill="#1C100E" />
                  {/* Flowing Magma Rivers down the slope */}
                  <path d="M365 305 L320 430 L275 595" stroke="#EF4444" strokeWidth="14" strokeLinecap="round" fill="none" />
                  <path d="M430 305 L485 450 L535 595" stroke="#F97316" strokeWidth="12" strokeLinecap="round" fill="none" />
                </svg>
                {/* Flying Magma Sparks */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 40, x: 0, opacity: 1 }}
                    animate={{ y: -260, x: (i - 2.5) * 90, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.22 }}
                    className="pointer-events-none absolute h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_12px_#F97316]"
                  />
                ))}
                <p className="relative z-20 -mt-64 px-6 text-base font-bold tracking-widest text-amber-200 sm:text-lg">
                  분노한 화산이 하늘을 붉게 물들이며 폭발한다!
                </p>
              </div>
            )}

            {/* Beat 5: Back to Earth -> Turns Red -> Glows White -> Explodes in Flash */}
            {beat === 5 && (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#030106]">
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.12, 1.25, 2.4], opacity: [1, 1, 1, 0] }}
                  transition={{ duration: 4.1, times: [0, 0.45, 0.78, 1] }}
                  className="relative flex h-64 w-64 items-center justify-center"
                >
                  {/* Base Blue Earth fading out */}
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sky-400 via-blue-700 to-slate-900 shadow-[0_0_50px_rgba(56,189,248,0.6)]" />
                  {/* Crimson Red Overheat Layer */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.95, 1] }}
                    transition={{ duration: 2.3 }}
                    className="absolute inset-4 rounded-full bg-gradient-to-br from-orange-400 via-red-600 to-rose-900 shadow-[0_0_95px_rgba(239,68,68,0.95)]"
                  />
                  {/* Blinding Pure White Pre-Explosion Core */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: [0, 0, 1], scale: [0.7, 0.95, 1.35] }}
                    transition={{ duration: 3.4, times: [0, 0.55, 1] }}
                    className="absolute inset-0 rounded-full bg-white shadow-[0_0_120px_#FFFFFF]"
                  />
                </motion.div>

                <p className="relative z-20 mt-6 px-6 text-base font-bold tracking-widest text-rose-200 sm:text-lg">
                  별 전체가 붉게 타오르다 눈부신 백색 섬광으로 붕괴한다!
                </p>

                {/* Full-Screen Supernova White Explosion Flash */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0, 1] }}
                  transition={{ duration: 4.1, times: [0, 0.76, 1] }}
                  className="pointer-events-none fixed inset-0 z-30 bg-white"
                />
              </div>
            )}

            {/* Beat 6: Flash Clears into Transcendent Smart Glasses */}
            {beat === 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
                className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#041826] via-[#0b1936] to-[#120826] px-6"
              >
                <motion.div
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  className="pointer-events-none fixed inset-0 z-30 bg-white"
                />
                <div className="relative flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-300/65"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-8 rounded-full border border-amber-300/70"
                  />
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, y: [-7, 7, -7] }}
                    transition={{
                      scale: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                      y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="relative z-10 drop-shadow-[0_0_34px_rgba(56,189,248,0.95)]"
                  >
                    <StationeryArt
                      itemId={featured.item.id}
                      category={featured.item.category}
                      rarity="transcendent"
                      className="h-40 w-40 sm:h-48 sm:w-48"
                    />
                  </motion.div>
                </div>

                <MythicClimaxFooter
                  item={featured.item}
                  guaranteed={featured.guaranteedRarity}
                  onDone={() => setPhase('reveal')}
                />
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => setPhase('reveal')}
              className="absolute right-5 bottom-6 z-40 min-h-[40px] rounded-xl border border-white/20 bg-black/55 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:right-8 sm:bottom-8"
            >
              건너뛰기
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2A: LEGENDARY UNIFIED BLACK + GOLDEN MAGIC CIRCLE      */}
        {/* ============================================================ */}
        {phase === 'cutscene' && !isMythic && !isTranscendent && (
          <motion.div
            key="legendary-cutscene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center select-none"
          >
            <motion.div
              animate={{
                scale: beat === 0 ? [0.6, 1] : beat === 1 ? 1.65 : [1.1, 1.28, 1.1],
                opacity: beat === 0 ? 0.35 : beat === 1 ? 0.95 : 0.65,
              }}
              transition={{ duration: beat === 2 ? 3.4 : 1.8, repeat: beat === 2 ? Infinity : 0 }}
              className="pointer-events-none absolute h-80 w-80 rounded-full bg-gradient-to-tr from-amber-600/50 via-yellow-300/45 to-orange-500/40 blur-3xl"
            />

            <div className="relative flex h-72 w-72 items-center justify-center sm:h-84 sm:w-84">
              <motion.svg
                viewBox="0 0 300 300"
                initial={{ scale: 0.35, opacity: 0, rotate: 0 }}
                animate={{
                  scale: beat === 1 ? 1.18 : 1,
                  opacity: 1,
                  rotate: 360,
                }}
                transition={{
                  rotate: { duration: 14, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 1.5, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 1.2 },
                }}
                className="absolute inset-0 h-full w-full drop-shadow-[0_0_16px_rgba(251,191,36,0.75)]"
                aria-hidden="true"
              >
                <circle cx="150" cy="150" r="138" fill="none" stroke="#FBBF24" strokeWidth="2.2" />
                <circle
                  cx="150"
                  cy="150"
                  r="126"
                  fill="none"
                  stroke="#FDE68A"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                />
                <circle cx="150" cy="150" r="96" fill="none" stroke="#F59E0B" strokeWidth="1.8" />
                <rect x="62" y="62" width="176" height="176" fill="none" stroke="#FCD34D" strokeWidth="1.6" />
                <rect
                  x="62"
                  y="62"
                  width="176"
                  height="176"
                  transform="rotate(45 150 150)"
                  fill="none"
                  stroke="#FDE047"
                  strokeWidth="1.6"
                />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <g key={deg} transform={`rotate(${deg} 150 150)`}>
                    <circle cx="150" cy="18" r="4" fill="#FEF08A" />
                    <line x1="150" y1="24" x2="150" y2="54" stroke="#F59E0B" strokeWidth="1.2" />
                  </g>
                ))}
              </motion.svg>

              <motion.svg
                viewBox="0 0 200 200"
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute h-44 w-44 opacity-85"
                aria-hidden="true"
              >
                <polygon points="100,14 176,144 24,144" fill="none" stroke="#FEF08A" strokeWidth="1.4" />
                <polygon points="100,186 176,56 24,56" fill="none" stroke="#F59E0B" strokeWidth="1.4" />
              </motion.svg>

              {beat >= 2 && (
                <motion.div
                  initial={{ scale: 0.25, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, y: [-5, 5, -5] }}
                  transition={{
                    scale: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                    y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="relative z-10 drop-shadow-[0_0_28px_rgba(251,191,36,0.9)]"
                >
                  <StationeryArt
                    itemId={featured.item.id}
                    category={featured.item.category}
                    rarity="legendary"
                    className="h-36 w-36 sm:h-40 sm:w-40"
                  />
                </motion.div>
              )}
            </div>

            {beat === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.92, 0.15] }}
                transition={{ duration: 1.9 }}
                className="pointer-events-none absolute inset-0 bg-amber-200"
              />
            )}

            <div className="relative z-20 mt-4 max-w-lg">
              {beat < 2 ? (
                <motion.p
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="text-sm font-bold tracking-[0.22em] text-amber-300 uppercase"
                >
                  {beat === 0
                    ? '황금빛 마법진이 천천히 회전하며 깨어난다…'
                    : 'LEGENDARY SUMMON · 빛이 폭발한다!'}
                </motion.p>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="space-y-3"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.25em] text-amber-300 uppercase">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    LEGENDARY AWAKENING · 레전더리 강림
                  </span>
                  {featured.item.cutsceneQuote && (
                    <blockquote className="rounded-2xl border border-amber-400/30 bg-black/70 px-5 py-3.5 text-sm leading-relaxed whitespace-pre-line text-amber-100 italic backdrop-blur-md">
                      {featured.item.cutsceneQuote}
                    </blockquote>
                  )}
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">
                    {featured.item.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPhase('reveal')}
                    className="mt-2 min-h-[46px] rounded-xl bg-gradient-to-r from-amber-300 to-yellow-200 px-7 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    결과 확인하기
                  </button>
                </motion.div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPhase('reveal')}
              className="absolute right-5 bottom-6 z-40 min-h-[40px] rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:right-8 sm:bottom-8"
            >
              건너뛰기
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2B: MYTHIC UNIQUE LONG SLOWER CUTSCENES (4 BESPOKE)    */}
        {/* ============================================================ */}
        {phase === 'cutscene' && isMythic && (
          <motion.div
            key={`mythic-cutscene-${itemId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#03020a] text-center select-none"
          >
            {/* ---------------------------------------------------------- */}
            {/* 1. 성좌의 황금 깃펜                                          */}
            {/*    문 개방 -> 찬송 그림자 확대 -> 기도 그림자 확대 ->          */}
            {/*    성당 전체 모습 -> 흰 화면 따뜻 이펙트 + 문구 -> 제단 강림   */}
            {/* ---------------------------------------------------------- */}
            {itemId === 'mythic-celestial-quill' && (
              <>
                {/* Cathedral Background Layer */}
                <motion.div
                  animate={{ opacity: beat === 4 ? 0 : 1 }}
                  transition={{ duration: 1.0 }}
                  className={`pointer-events-none absolute inset-0 overflow-hidden ${
                    beat === 5
                      ? 'bg-gradient-to-b from-[#3d2708] via-[#664212] to-[#231504]'
                      : 'bg-gradient-to-b from-[#06040f] via-[#0e0a1f] to-[#030208]'
                  }`}
                >
                  {/* Beat 1: Chanting Shadow Close-Up Zoom */}
                  {beat === 1 && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1.48, opacity: 1 }}
                      transition={{ duration: 3.3, ease: 'easeOut' }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <svg viewBox="0 0 600 500" className="h-full w-full max-w-2xl" aria-hidden="true">
                        {/* Candlelight glow behind chanting figure */}
                        <radialGradient id="chantGlow" cx="50%" cy="45%" r="45%">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#05030B" stopOpacity="0" />
                        </radialGradient>
                        <circle cx="300" cy="230" r="220" fill="url(#chantGlow)" />
                        {/* Side choir shadows */}
                        <path d="M90 500 L125 270 Q155 230 185 270 L215 500 Z" fill="#04030A" opacity="0.7" />
                        <circle cx="155" cy="220" r="32" fill="#04030A" opacity="0.7" />
                        <path d="M385 500 L415 270 Q445 230 475 270 L510 500 Z" fill="#04030A" opacity="0.7" />
                        <circle cx="445" cy="220" r="32" fill="#04030A" opacity="0.7" />
                        {/* Main Chanting Hooded Silhouette (head tilted up, open mouth / singing) */}
                        <path
                          d="M190 500 L225 245 Q300 185 375 245 L410 500 Z"
                          fill="#020106"
                          stroke="#FBBF24"
                          strokeOpacity="0.28"
                          strokeWidth="2"
                        />
                        {/* Hooded Head tilted slightly upward while chanting */}
                        <path
                          d="M250 180 Q300 115 352 178 Q358 228 300 236 Q244 228 250 180 Z"
                          fill="#020106"
                          stroke="#FBBF24"
                          strokeOpacity="0.3"
                          strokeWidth="1.5"
                        />
                        {/* Open chanting mouth & warm sound rings */}
                        <ellipse cx="306" cy="202" rx="9" ry="12" fill="#F59E0B" fillOpacity="0.35" />
                        <circle cx="306" cy="202" r="34" fill="none" stroke="#FDE68A" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
                        <circle cx="306" cy="202" r="58" fill="none" stroke="#FDE68A" strokeOpacity="0.2" strokeWidth="1.2" strokeDasharray="5 6" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Beat 2: Praying Shadow Close-Up Zoom */}
                  {beat === 2 && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 1 }}
                      transition={{ duration: 3.4, ease: 'easeOut' }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <svg viewBox="0 0 600 500" className="h-full w-full max-w-2xl" aria-hidden="true">
                        <radialGradient id="prayGlow" cx="50%" cy="48%" r="42%">
                          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#05030B" stopOpacity="0" />
                        </radialGradient>
                        <circle cx="300" cy="240" r="210" fill="url(#prayGlow)" />
                        {/* Bowed Hooded Praying Silhouette */}
                        <path
                          d="M185 500 L215 265 Q300 205 385 265 L415 500 Z"
                          fill="#020106"
                          stroke="#FDE68A"
                          strokeOpacity="0.28"
                          strokeWidth="2"
                        />
                        {/* Bowed head */}
                        <path
                          d="M254 185 Q300 132 346 185 Q342 242 300 248 Q258 242 254 185 Z"
                          fill="#020106"
                          stroke="#FDE68A"
                          strokeOpacity="0.35"
                          strokeWidth="1.5"
                        />
                        {/* Clasped praying hands silhouette glowing softly at edges */}
                        <path
                          d="M286 305 L300 248 L314 305 Q300 322 286 305 Z"
                          fill="#05030C"
                          stroke="#FDE047"
                          strokeOpacity="0.55"
                          strokeWidth="2"
                        />
                      </svg>
                    </motion.div>
                  )}

                  {/* Beat 3 & 5: Full Wide Gothic Cathedral Architecture */}
                  {(beat === 0 || beat === 3 || beat === 5) && (
                    <motion.svg
                      viewBox="0 0 1200 800"
                      preserveAspectRatio="xMidYMid slice"
                      initial={beat === 3 ? { scale: 1.25, opacity: 0.4 } : { scale: 1, opacity: 1 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="cathedralRayWide" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor="#FEF08A"
                            stopOpacity={beat === 5 ? '0.7' : '0.24'}
                          />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Vaulted Cathedral Ceiling Arches */}
                      <path d="M60 800 V190 Q600 -20 1140 190 V800" fill="none" stroke="#FDE68A" strokeOpacity={beat === 5 ? '0.45' : '0.18'} strokeWidth="4" />
                      <path d="M180 800 V240 Q600 40 1020 240 V800" fill="none" stroke="#FDE68A" strokeOpacity={beat === 5 ? '0.4' : '0.15'} strokeWidth="3" />

                      {/* Central Rose Window & Lancet Windows */}
                      <circle cx="600" cy="185" r="78" fill={beat === 5 ? '#FDE047' : '#312E81'} fillOpacity={beat === 5 ? '0.35' : '0.22'} stroke="#FDE68A" strokeOpacity="0.45" strokeWidth="2.5" />
                      <path d="M510 510 V290 Q600 200 690 290 V510 Z" fill={beat === 5 ? '#FEF08A' : '#1E1B4B'} fillOpacity={beat === 5 ? '0.32' : '0.25'} stroke="#FDE68A" strokeOpacity="0.4" strokeWidth="2" />
                      <path d="M310 530 V320 Q360 230 410 320 V530 Z" fill={beat === 5 ? '#FDE047' : '#1E1B4B'} fillOpacity="0.22" stroke="#FDE68A" strokeOpacity="0.3" strokeWidth="2" />
                      <path d="M790 530 V320 Q840 230 890 320 V530 Z" fill={beat === 5 ? '#FDE047' : '#1E1B4B'} fillOpacity="0.22" stroke="#FDE68A" strokeOpacity="0.3" strokeWidth="2" />

                      {/* Pillars */}
                      <rect x="130" y="140" width="44" height="660" fill={beat === 5 ? '#78350F' : '#080514'} opacity="0.85" />
                      <rect x="245" y="180" width="34" height="620" fill={beat === 5 ? '#92400E' : '#0C081A'} opacity="0.8" />
                      <rect x="921" y="180" width="34" height="620" fill={beat === 5 ? '#92400E' : '#0C081A'} opacity="0.8" />
                      <rect x="1026" y="140" width="44" height="660" fill={beat === 5 ? '#78350F' : '#080514'} opacity="0.85" />

                      {/* God Rays */}
                      <polygon points="480,140 720,140 960,800 240,800" fill="url(#cathedralRayWide)" />

                      {/* Central Stone Altar */}
                      <rect x="470" y="595" width="260" height="32" rx="4" fill={beat === 5 ? '#FEF08A' : '#1E1B2E'} opacity="0.9" />
                      <rect x="510" y="627" width="180" height="173" fill={beat === 5 ? '#B45309' : '#12101D'} opacity="0.92" />

                      {/* Small Congregation Silhouettes in Wide Shot Beat 3 */}
                      {beat === 3 && (
                        <g fill="#030207" opacity="0.92">
                          <circle cx="360" cy="635" r="14" /><path d="M335 790 L347 655 L373 655 L385 790 Z" />
                          <circle cx="425" cy="650" r="13" /><path d="M404 790 L414 668 L436 668 L446 790 Z" />
                          <circle cx="775" cy="650" r="13" /><path d="M754 790 L764 668 L786 668 L796 790 Z" />
                          <circle cx="840" cy="635" r="14" /><path d="M815 790 L827 655 L853 655 L865 790 Z" />
                        </g>
                      )}
                    </motion.svg>
                  )}
                </motion.div>

                {/* Beat 0: Cathedral Double Doors Opening */}
                {beat === 0 && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex overflow-hidden">
                    <motion.div
                      initial={{ x: '0%' }}
                      animate={{ x: '-102%' }}
                      transition={{ delay: 0.9, duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
                      className="relative h-full w-1/2 border-r border-amber-300/60 bg-gradient-to-l from-[#120d1d] via-[#090710] to-[#040308]"
                    >
                      <div className="absolute inset-y-12 right-6 left-6 rounded-tl-[120px] border border-amber-400/25" />
                    </motion.div>
                    <motion.div
                      initial={{ x: '0%' }}
                      animate={{ x: '102%' }}
                      transition={{ delay: 0.9, duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
                      className="relative h-full w-1/2 border-l border-amber-300/60 bg-gradient-to-r from-[#120d1d] via-[#090710] to-[#040308]"
                    >
                      <div className="absolute inset-y-12 right-6 left-6 rounded-tr-[120px] border border-amber-400/25" />
                    </motion.div>
                  </div>
                )}

                {beat === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-40 px-6 text-sm font-semibold tracking-widest text-amber-200 sm:text-base"
                  >
                    어둠을 가르며 성당의 대문이 천천히 열린다…
                  </motion.p>
                )}

                {beat === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-30 mt-64 px-6"
                  >
                    <p className="text-base font-medium text-amber-100/95 sm:text-lg">
                      어두운 성전 안에 울려 퍼지는 그림자들의 장엄한 찬송…
                    </p>
                  </motion.div>
                )}

                {beat === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-30 mt-64 px-6"
                  >
                    <p className="text-base font-medium text-amber-100/95 sm:text-lg">
                      간절히 두 손을 모은 그림자의 깊은 기도…
                    </p>
                  </motion.div>
                )}

                {beat === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.0 }}
                    className="relative z-30 mt-64 px-6"
                  >
                    <p className="text-base font-medium text-amber-100 sm:text-lg">
                      성전 전체를 감싸는 고요한 숨결이 제단으로 모인다…
                    </p>
                  </motion.div>
                )}

                {/* Beat 4: Warm White Screen + "하늘께서 어린 양들을 살피시고..." */}
                {beat === 4 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#fffdf8] via-[#fff7e6] to-[#fef0c7] px-6"
                  >
                    <motion.div
                      animate={{ scale: [0.9, 1.18, 0.95], opacity: [0.55, 0.95, 0.65] }}
                      transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
                      className="pointer-events-none absolute h-96 w-96 rounded-full bg-amber-200/65 blur-3xl"
                    />
                    {STAR_POSITIONS.slice(0, 10).map((m, i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [14, -22, 14], opacity: [0.3, 0.9, 0.3] }}
                        transition={{ duration: 2.8, repeat: Infinity, delay: m.delay }}
                        style={{ left: m.left, top: m.top }}
                        className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-amber-400/55 blur-[1px]"
                      />
                    ))}
                    <motion.p
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 1.0 }}
                      className="relative z-10 text-xl font-bold tracking-wide text-amber-900 sm:text-3xl"
                    >
                      &ldquo;하늘께서 어린 양들을 살피시고...&rdquo;
                    </motion.p>
                  </motion.div>
                )}

                {/* Beat 5: Brightened Cathedral Altar with Descending Golden Quill */}
                {beat === 5 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.9 }}
                    className="relative z-30 flex max-w-xl flex-col items-center px-6"
                  >
                    <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
                      <motion.div
                        animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.6, 0.9, 0.6] }}
                        transition={{ duration: 3.0, repeat: Infinity }}
                        className="absolute inset-4 rounded-full bg-amber-300/60 blur-2xl"
                      />
                      <motion.div
                        initial={{ y: -160, opacity: 0, scale: 0.65 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 drop-shadow-[0_0_28px_rgba(253,224,71,0.9)]"
                      >
                        <StationeryArt
                          itemId={featured.item.id}
                          category={featured.item.category}
                          rarity="mythic"
                          className="h-36 w-36 sm:h-44 sm:w-44"
                        />
                      </motion.div>
                    </div>
                    <MythicClimaxFooter
                      item={featured.item}
                      guaranteed={featured.guaranteedRarity}
                      onDone={() => setPhase('reveal')}
                    />
                  </motion.div>
                )}
              </>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 2. 천공의 별빛 샤프                                          */}
            {/*    망원경 있는 초원 언덕 + 유성우 -> 우주 확대 ->              */}
            {/*    천칭자리 별 출현 + 빛 번쩍 -> 한 개의 선으로 천칭자리 연결 ->  */}
            {/*    수많은 별 배경 중앙에 아이템 등장                          */}
            {/* ---------------------------------------------------------- */}
            {itemId === 'mythic-starlight-sharp' && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#010413] via-[#081235] to-[#050d26]">
                  {STAR_POSITIONS.map((s, idx) => (
                    <motion.span
                      key={idx}
                      animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.25, 0.85] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: s.delay }}
                      style={{ left: s.left, top: s.top, width: s.size * 2, height: s.size * 2 }}
                      className="absolute rounded-full bg-sky-100"
                    />
                  ))}
                </div>

                {/* Beat 0: Grassy Meadow Hill + Telescope in Corner + Meteor Shower */}
                {beat === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.0 }}
                    className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
                  >
                    {/* Diagonal Meteor Shower across the night sky */}
                    {[
                      { x0: -260, y0: -220, delay: 0.1 },
                      { x0: -100, y0: -260, delay: 0.6 },
                      { x0: 60, y0: -240, delay: 1.1 },
                      { x0: -220, y0: -120, delay: 1.6 },
                    ].map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: m.x0, y: m.y0, opacity: 0 }}
                        animate={{ x: m.x0 + 460, y: m.y0 + 300, opacity: [0, 1, 0] }}
                        transition={{ duration: 1.7, repeat: Infinity, delay: m.delay }}
                        className="pointer-events-none absolute h-0.5 w-32 rotate-[32deg] bg-gradient-to-r from-transparent via-sky-200 to-white shadow-[0_0_8px_#7DD3FC]"
                      />
                    ))}

                    <p className="relative z-20 -mt-20 px-6 text-sm font-semibold tracking-widest text-sky-200 sm:text-base">
                      언덕 위 망원경 너머 밤하늘로 유성우가 쏟아진다…
                    </p>

                    {/* Meadow Hill + Brass Telescope in Bottom-Right Corner */}
                    <svg
                      viewBox="0 0 1200 340"
                      preserveAspectRatio="xMidYMax slice"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full sm:h-72"
                      aria-hidden="true"
                    >
                      <path
                        d="M0 240 Q320 140 680 215 T1200 165 V340 H0 Z"
                        fill="#06221c"
                      />
                      <path
                        d="M0 280 Q440 210 880 245 T1200 220 V340 H0 Z"
                        fill="#041713"
                      />
                      {/* Astronomical Telescope resting on the hill in the right corner */}
                      <g transform="translate(930, 118)">
                        {/* Tripod legs */}
                        <line x1="55" y1="62" x2="26" y2="122" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                        <line x1="55" y1="62" x2="55" y2="126" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
                        <line x1="55" y1="62" x2="84" y2="122" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                        {/* Tilted Brass Telescope Tube */}
                        <g transform="rotate(-32 55 58)">
                          <rect x="12" y="48" width="84" height="14" rx="3" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
                          <rect x="6" y="45" width="12" height="20" rx="2" fill="#FDE047" />
                          <rect x="96" y="51" width="14" height="8" rx="1.5" fill="#CBD5E1" />
                        </g>
                      </g>
                    </svg>
                  </motion.div>
                )}

                {/* Beat 1: Cosmic Deep Space Zoom */}
                {beat === 1 && (
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    transition={{ duration: 3.3, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-20 flex flex-col items-center px-6"
                  >
                    <div className="h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-600/35 via-sky-400/25 to-violet-500/35 blur-2xl" />
                    <p className="mt-4 text-base font-semibold tracking-widest text-sky-200 sm:text-lg">
                      지평선을 벗어나 광활한 심우주 속으로 시선이 뻗어 나간다…
                    </p>
                  </motion.div>
                )}

                {/* Beat 2 & 3: Libra Stars Appear -> Flash Brightly -> Single Continuous Line Draws Libra */}
                {(beat === 2 || beat === 3) && (
                  <div className="relative z-20 flex flex-col items-center px-6">
                    <svg viewBox="0 0 320 250" className="h-64 w-80 sm:h-72 sm:w-96" aria-hidden="true">
                      {/* Single continuous constellation line drawn in Beat 3 */}
                      {beat === 3 && (
                        <motion.path
                          d={LIBRA_SINGLE_PATH}
                          fill="none"
                          stroke="#7DD3FC"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0, opacity: 0.4 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 2.8, ease: 'easeInOut' }}
                          className="drop-shadow-[0_0_8px_rgba(125,211,252,0.9)]"
                        />
                      )}

                      {/* Libra Stars + Single Flash Pulse in Beat 2 */}
                      {LIBRA_STARS.map((star, idx) => (
                        <g key={star.id}>
                          {beat === 2 && (
                            <motion.circle
                              cx={star.cx}
                              cy={star.cy}
                              r={star.r * 3.5}
                              fill="#FEF08A"
                              initial={{ scale: 0.2, opacity: 0 }}
                              animate={{ scale: [0.3, 2.2, 0.4], opacity: [0, 0.95, 0] }}
                              transition={{ duration: 1.5, delay: 0.9 + idx * 0.08 }}
                            />
                          )}
                          <motion.circle
                            cx={star.cx}
                            cy={star.cy}
                            r={star.r}
                            fill="#FFFBEB"
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                          />
                        </g>
                      ))}
                    </svg>
                    <p className="mt-4 text-sm font-semibold tracking-widest text-sky-200 sm:text-base">
                      {beat === 2
                        ? '천칭자리의 별들이 일제히 찬란한 섬광을 발한다…'
                        : '하나의 빛나는 선이 별과 별을 잇고 천칭자리가 완성된다!'}
                    </p>
                  </div>
                )}

                {/* Beat 4: Endless Starry Background + Sharp Hovering */}
                {beat === 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.0 }}
                    className="relative z-20 flex max-w-xl flex-col items-center px-6"
                  >
                    <motion.div
                      animate={{ y: [-7, 7, -7] }}
                      transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
                      className="my-3 drop-shadow-[0_0_32px_rgba(125,211,252,0.9)]"
                    >
                      <StationeryArt
                        itemId={featured.item.id}
                        category={featured.item.category}
                        rarity="mythic"
                        className="h-36 w-36 sm:h-44 sm:w-44"
                      />
                    </motion.div>
                    <MythicClimaxFooter
                      item={featured.item}
                      guaranteed={featured.guaranteedRarity}
                      onDone={() => setPhase('reveal')}
                    />
                  </motion.div>
                )}
              </>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 3. 시공의 아카식 지우개                                      */}
            {/*    우주 문구 -> 붉고 큰 개기일식 -> 별빛 확대 ->               */}
            {/*    더 크고 자세한 우리 은하 중앙에 강림                       */}
            {/* ---------------------------------------------------------- */}
            {itemId === 'mythic-akashic-eraser' && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04010a] via-[#120416] to-[#030108]">
                  {STAR_POSITIONS.map((s, idx) => (
                    <motion.span
                      key={idx}
                      animate={{ opacity: [0.25, 1, 0.3], scale: [0.9, 1.35, 0.9] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: s.delay }}
                      style={{ left: s.left, top: s.top, width: s.size * 2, height: s.size * 2 }}
                      className="absolute rounded-full bg-white"
                    />
                  ))}
                </div>

                {beat === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2 }}
                    className="relative z-20 max-w-xl px-6"
                  >
                    <p className="text-xs font-bold tracking-[0.28em] text-rose-300 uppercase">
                      COSMIC CHRONICLE · 시공의 기록
                    </p>
                    <h2 className="mt-4 text-xl font-bold leading-relaxed whitespace-pre-line text-white sm:text-2xl">
                      {'별들의 궤도가 침묵하는 영원의 우주 끝에서,\n시간과 기억마저 지워버릴 진홍의 일식이 시작된다…'}
                    </h2>
                  </motion.div>
                )}

                {(beat === 1 || beat === 2) && (
                  <div className="relative z-20 flex flex-col items-center justify-center">
                    <div className="relative flex h-80 w-80 items-center justify-center sm:h-96 sm:w-96">
                      {/* Massive Crimson Solar Corona */}
                      <motion.div
                        animate={{
                          scale: beat === 2 ? [1.15, 2.4] : [0.95, 1.12, 1],
                          opacity: beat === 2 ? [0.95, 0.2] : [0.75, 1, 0.85],
                        }}
                        transition={{ duration: beat === 2 ? 3.2 : 3.8 }}
                        className="absolute h-72 w-72 rounded-full bg-gradient-to-tr from-red-700 via-rose-500 to-amber-500 blur-2xl sm:h-84 sm:w-84"
                      />

                      {/* Huge Blazing Red Sun */}
                      <div className="relative h-60 w-60 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 via-red-600 to-rose-900 shadow-[0_0_90px_rgba(239,68,68,0.95)] sm:h-72 sm:w-72">
                        {/* Gliding Black Moon forming Crimson Total Solar Eclipse */}
                        <motion.div
                          initial={{ x: -290 }}
                          animate={{ x: 0 }}
                          transition={{ duration: 3.9, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 rounded-full bg-[#050109] shadow-[0_0_24px_rgba(248,113,113,0.9)]"
                        />
                      </div>

                      {beat === 2 && (
                        <motion.svg
                          viewBox="0 0 120 120"
                          initial={{ scale: 0.05, opacity: 0, rotate: 0 }}
                          animate={{ scale: 26, opacity: [0, 1, 1, 0], rotate: 60 }}
                          transition={{ duration: 3.3, ease: [0.4, 0, 0.2, 1] }}
                          className="pointer-events-none absolute h-24 w-24"
                          aria-hidden="true"
                        >
                          <path
                            d="M60 0 L68 52 L120 60 L68 68 L60 120 L52 68 L0 60 L52 52 Z"
                            fill="#FFFBEB"
                          />
                        </motion.svg>
                      )}
                    </div>

                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-5 text-sm font-semibold tracking-widest text-rose-200 sm:text-base"
                    >
                      {beat === 1
                        ? '거대한 진홍빛 태양이 어둠에 잠식되어 붉은 개기일식이 완성된다…'
                        : '일식의 심장부에서 터진 별빛이 은하의 문을 연다!'}
                    </motion.p>
                  </div>
                )}

                {/* Beat 3: Larger, Richly Detailed Milky Way Spiral Galaxy + Eraser */}
                {beat === 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-20 flex max-w-2xl flex-col items-center px-6"
                  >
                    <div className="relative flex h-72 w-72 items-center justify-center sm:h-96 sm:w-96">
                      {/* Giant Multi-Arm Detailed Milky Way SVG */}
                      <motion.svg
                        viewBox="0 0 500 500"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
                        className="pointer-events-none absolute -inset-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)] opacity-95"
                        aria-hidden="true"
                      >
                        <defs>
                          <radialGradient id="detailedGalaxyCore" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FFFBEB" stopOpacity="1" />
                            <stop offset="18%" stopColor="#FDE68A" stopOpacity="0.82" />
                            <stop offset="40%" stopColor="#E879F9" stopOpacity="0.48" />
                            <stop offset="70%" stopColor="#4F46E5" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#03020a" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <circle cx="250" cy="250" r="245" fill="url(#detailedGalaxyCore)" />
                        {/* 4 Spiral Galactic Arms */}
                        {[0, 90, 180, 270].map((rot) => (
                          <g key={rot} transform={`rotate(${rot} 250 250)`}>
                            <path
                              d="M250 250 C295 190, 385 180, 445 255 C415 335, 320 385, 215 365"
                              fill="none"
                              stroke={rot % 180 === 0 ? '#C4B5FD' : '#F5D0FE'}
                              strokeWidth="16"
                              strokeLinecap="round"
                              opacity="0.28"
                            />
                            <path
                              d="M250 250 C285 215, 360 205, 418 262"
                              fill="none"
                              stroke="#93C5FD"
                              strokeWidth="6"
                              strokeDasharray="2 10"
                              strokeLinecap="round"
                              opacity="0.7"
                            />
                            <path
                              d="M250 250 C275 230, 330 228, 380 278"
                              fill="none"
                              stroke="#FDE68A"
                              strokeWidth="4"
                              strokeDasharray="1 14"
                              strokeLinecap="round"
                              opacity="0.75"
                            />
                          </g>
                        ))}
                        {/* Galactic Bar & Bright Core Star Cluster */}
                        <ellipse cx="250" cy="250" rx="52" ry="26" transform="rotate(-24 250 250)" fill="#FEF3C7" opacity="0.55" />
                      </motion.svg>

                      <motion.div
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, y: [-6, 6, -6] }}
                        transition={{
                          scale: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
                          y: { duration: 3.0, repeat: Infinity, ease: 'easeInOut' },
                        }}
                        className="relative z-10 drop-shadow-[0_0_34px_rgba(232,121,249,0.95)]"
                      >
                        <StationeryArt
                          itemId={featured.item.id}
                          category={featured.item.category}
                          rarity="mythic"
                          className="h-36 w-36 sm:h-44 sm:w-44"
                        />
                      </motion.div>
                    </div>

                    <MythicClimaxFooter
                      item={featured.item}
                      guaranteed={featured.guaranteedRarity}
                      onDone={() => setPhase('reveal')}
                    />
                  </motion.div>
                )}
              </>
            )}

            {/* ---------------------------------------------------------- */}
            {/* 4. 영원의 지혜 스터디 노트                                  */}
            {/*    사슬 묶인 책 + 하늘색 나비 착지 -> 흰 섬광 사슬 파괴 ->    */}
            {/*    책 펼쳐지고 차라락 + 빛 빨려들며 하얗게 ->                 */}
            {/*    노랑/파랑 문구 -> 도서관 배경 강림                        */}
            {/* ---------------------------------------------------------- */}
            {itemId === 'mythic-eternal-grimoire' && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0718] via-[#1a1030] to-[#07040e]" />

                {/* Beat 0 & 1: Chained Closed Grimoire + Sky-Blue Butterfly + Shatter */}
                {(beat === 0 || beat === 1) && (
                  <div className="relative z-20 flex flex-col items-center px-6">
                    <div className="relative flex h-64 w-64 items-center justify-center">
                      {/* Closed Ancient Book + Chains + Padlock */}
                      <motion.svg
                        viewBox="0 0 220 240"
                        animate={
                          beat === 0
                            ? { scale: [0.98, 1.01, 0.98] }
                            : { scale: [1, 1.08, 1], filter: 'brightness(1.3)' }
                        }
                        transition={{ duration: 2.0, repeat: Infinity }}
                        className="h-56 w-52"
                        aria-hidden="true"
                      >
                        {/* Book Cover */}
                        <rect x="44" y="34" width="132" height="172" rx="10" fill="#312E81" stroke="#F59E0B" strokeWidth="3" />
                        <rect x="44" y="34" width="18" height="172" rx="4" fill="#1E1B4B" />
                        <rect x="76" y="64" width="80" height="44" rx="4" fill="#4338CA" stroke="#FDE047" strokeWidth="1.5" />

                        {/* Metallic Chains */}
                        <motion.g
                          animate={beat === 1 ? { y: 260, opacity: 0, rotate: 18 } : { y: 0, opacity: 1 }}
                          transition={{ duration: 1.5, ease: [0.4, 0, 1, 1] }}
                        >
                          <line x1="40" y1="75" x2="180" y2="165" stroke="#94A3B8" strokeWidth="8" strokeDasharray="10 6" strokeLinecap="round" />
                          <line x1="180" y1="75" x2="40" y2="165" stroke="#CBD5E1" strokeWidth="8" strokeDasharray="10 6" strokeLinecap="round" />
                          {/* Central Padlock */}
                          <rect x="92" y="108" width="36" height="32" rx="5" fill="#475569" stroke="#E2E8F0" strokeWidth="2.2" />
                          <path d="M98 108 V96 A12 12 0 0 1 122 96 V108" fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
                          <circle cx="110" cy="123" r="3.5" fill="#0F172A" />
                        </motion.g>
                      </motion.svg>

                      {/* Luminous Sky-Blue Butterfly fluttering down onto padlock in Beat 0 */}
                      {beat === 0 && (
                        <motion.svg
                          viewBox="0 0 60 60"
                          initial={{ x: -130, y: -130, scale: 0.6, opacity: 0 }}
                          animate={{ x: 0, y: -8, scale: [0.85, 1.05, 0.95], opacity: 1 }}
                          transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
                          className="pointer-events-none absolute h-16 w-16 drop-shadow-[0_0_16px_rgba(56,189,248,0.95)]"
                          aria-hidden="true"
                        >
                          <motion.g
                            animate={{ scaleX: [1, 0.45, 1] }}
                            transition={{ duration: 0.55, repeat: Infinity }}
                            style={{ transformOrigin: '30px 30px' }}
                          >
                            <path d="M30 28 C16 10, 4 18, 12 32 C6 40, 18 48, 30 34 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.5" />
                            <path d="M30 28 C44 10, 56 18, 48 32 C54 40, 42 48, 30 34 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.5" />
                          </motion.g>
                          <line x1="30" y1="22" x2="30" y2="38" stroke="#F0F9FF" strokeWidth="2.5" strokeLinecap="round" />
                        </motion.svg>
                      )}
                    </div>

                    {/* White Flash on Beat 1 */}
                    {beat === 1 && (
                      <motion.div
                        initial={{ opacity: 0.96 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 1.6, ease: 'easeOut' }}
                        className="pointer-events-none fixed inset-0 z-30 bg-white"
                      />
                    )}

                    <p className="mt-4 text-sm font-semibold tracking-widest text-sky-200 sm:text-base">
                      {beat === 0
                        ? '하늘빛 나비가 사슬의 자물쇠 위에 내려앉는다…'
                        : '하얀 섬광과 함께 봉인의 사슬이 산산이 부서져 떨어진다!'}
                    </p>
                  </div>
                )}

                {/* Beat 2: Open Book Flipping Pages Rapidly + Multi-color Light Absorbing + Whiteout */}
                {beat === 2 && (
                  <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-6">
                    {/* Converging Multicolored Light Orbs sucked into the open book */}
                    {ABSORBING_ORBS.map((orb, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ x: orb.sx, y: orb.sy, scale: 1.2, opacity: 0 }}
                        animate={{ x: 0, y: 0, scale: 0.15, opacity: [0, 1, 0.9, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: orb.delay * 0.6, ease: 'easeIn' }}
                        style={{ backgroundColor: orb.color, boxShadow: `0 0 18px ${orb.color}` }}
                        className="pointer-events-none absolute h-4 w-4 rounded-full"
                      />
                    ))}

                    {/* Open Book with Right-to-Left 3D Page Flipping ("오른쪽 페이지가 왼쪽으로 넘어가기") */}
                    <div
                      style={{ perspective: '1000px' }}
                      className="relative z-10 flex h-44 w-72 items-center justify-center sm:h-48 sm:w-80"
                    >
                      {/* Base Left & Right Open Pages */}
                      <div className="relative flex h-36 w-64 rounded-lg border-2 border-amber-500 bg-amber-900/30 p-1 shadow-2xl sm:h-40 sm:w-72">
                        <div className="h-full w-1/2 rounded-l-md border-r border-amber-400/60 bg-gradient-to-r from-amber-100 to-amber-50 shadow-inner" />
                        <div className="h-full w-1/2 rounded-r-md border-l border-amber-400/60 bg-gradient-to-l from-amber-100 to-white shadow-inner" />

                        {/* Center Spine */}
                        <div className="pointer-events-none absolute top-1 bottom-1 left-1/2 w-1 -translate-x-1/2 bg-amber-500/70" />

                        {/* Flipping Sheets: anchored on the center spine (left-1/2) rotating right -> left */}
                        {[0, 1, 2].map((pIdx) => (
                          <motion.div
                            key={pIdx}
                            style={{
                              transformOrigin: 'left center',
                              transformStyle: 'preserve-3d',
                            }}
                            initial={{ rotateY: 0, opacity: 0.96 }}
                            animate={{ rotateY: -180, opacity: [0.95, 1, 0.85] }}
                            transition={{
                              duration: 0.65,
                              repeat: Infinity,
                              delay: pIdx * 0.21,
                              ease: 'easeInOut',
                            }}
                            className="absolute top-1.5 right-1.5 bottom-1.5 left-1/2 rounded-r-md border border-slate-300 bg-gradient-to-l from-white via-amber-50 to-slate-100 shadow-md"
                          >
                            <div className="mx-3 mt-4 space-y-2 opacity-40">
                              <div className="h-1 w-3/4 rounded bg-amber-400" />
                              <div className="h-1 w-2/3 rounded bg-slate-300" />
                              <div className="h-1 w-4/5 rounded bg-slate-300" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <p className="relative z-10 mt-4 text-sm font-semibold tracking-widest text-amber-100 sm:text-base">
                      오른쪽 책장이 끝없이 왼쪽으로 넘어가며 온 세상의 빛이 빨려 들어간다…
                    </p>

                    {/* Gradual Whiteout Overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.8, duration: 3.4, ease: 'easeIn' }}
                      className="pointer-events-none fixed inset-0 z-30 bg-white"
                    />
                  </div>
                )}

                {/* Beat 3: Pure White Screen with Yellow & Blue Radiant Quote */}
                {beat === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white px-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.0 }}
                      className="max-w-xl space-y-3"
                    >
                      <p className="text-xl font-extrabold tracking-wide text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.35)] sm:text-3xl">
                        &ldquo;찬란한 빛과 지혜의 파편이 모여,&rdquo;
                      </p>
                      <p className="text-xl font-extrabold tracking-wide text-blue-600 drop-shadow-[0_0_12px_rgba(37,99,235,0.3)] sm:text-3xl">
                        &ldquo;이제 영원히 지워지지 않을 한 권의 진리가 되노라.&rdquo;
                      </p>
                    </motion.div>
                  </motion.div>
                )}

                {/* Beat 4: Grand Ancient Library Background + Eternal Grimoire Reveal */}
                {beat === 4 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.0 }}
                    className="relative z-20 flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a0f2e] via-[#24163d] to-[#0c0716] px-6"
                  >
                    {/* Library Bookshelves Architectural SVG Backdrop */}
                    <svg
                      viewBox="0 0 1200 800"
                      preserveAspectRatio="xMidYMid slice"
                      className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
                      aria-hidden="true"
                    >
                      {/* Left & Right Tall Wooden Bookshelves */}
                      <rect x="60" y="60" width="220" height="740" fill="#2A1810" stroke="#78350F" strokeWidth="4" />
                      <rect x="920" y="60" width="220" height="740" fill="#2A1810" stroke="#78350F" strokeWidth="4" />
                      {[160, 280, 400, 520, 640].map((y) => (
                        <g key={y}>
                          <line x1="65" y1={y} x2="275" y2={y} stroke="#92400E" strokeWidth="6" />
                          <line x1="925" y1={y} x2="1135" y2={y} stroke="#92400E" strokeWidth="6" />
                          <rect x="82" y={y - 68} width="22" height="64" fill="#7C2D12" />
                          <rect x="110" y={y - 76} width="26" height="72" fill="#1E3A8A" />
                          <rect x="144" y={y - 60} width="20" height="56" fill="#B45309" />
                          <rect x="945" y={y - 72} width="24" height="68" fill="#4C1D95" />
                          <rect x="976" y={y - 62} width="20" height="58" fill="#92400E" />
                          <rect x="1004" y={y - 76} width="26" height="72" fill="#1E40AF" />
                        </g>
                      ))}
                      {/* Center Arch & Light Pillar */}
                      <path d="M400 800 V240 Q600 60 800 240 V800" fill="none" stroke="#FDE68A" strokeOpacity="0.35" strokeWidth="4" />
                      <rect x="520" y="0" width="160" height="800" fill="#FDE68A" opacity="0.14" />
                    </svg>

                    <div className="relative z-10 flex max-w-xl flex-col items-center">
                      <motion.div
                        animate={{ y: [-7, 7, -7] }}
                        transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
                        className="my-3 drop-shadow-[0_0_32px_rgba(251,191,36,0.9)]"
                      >
                        <StationeryArt
                          itemId={featured.item.id}
                          category={featured.item.category}
                          rarity="mythic"
                          className="h-36 w-36 sm:h-44 sm:w-44"
                        />
                      </motion.div>
                      <MythicClimaxFooter
                        item={featured.item}
                        guaranteed={featured.guaranteedRarity}
                        onDone={() => setPhase('reveal')}
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setPhase('reveal')}
              className="absolute right-5 bottom-6 z-40 min-h-[40px] rounded-xl border border-white/20 bg-black/55 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:right-8 sm:bottom-8"
            >
              건너뛰기
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* STAGE 3: FINAL ITEM REVEAL MODAL                             */}
        {/* ============================================================ */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-full items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl dark:bg-slate-900"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewMode
                      ? '연출 미리보기 결과'
                      : results.length === 1
                        ? '문구 뽑기 결과'
                        : `${results.length}연속 뽑기 결과`}
                  </h2>
                  {previewMode && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      테스트 미리보기로 실제 보관함에는 추가되지 않습니다.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`mt-4 flex flex-col items-center rounded-2xl border p-6 text-center ${featuredMeta.borderColor} ${featuredMeta.surfaceBg}`}
              >
                <span className={`text-xs font-bold ${featuredMeta.textColor}`}>
                  {featuredMeta.label} 등급
                  {featured.guaranteedRarity ? ' · 천장 확정' : ''}
                  {!previewMode &&
                    (featured.isNew ? ' · 신규 획득' : ` · 중복 (+${featured.refundPoints}P 환급)`)}
                </span>

                <motion.div
                  initial={{ scale: 0.75, rotate: -6 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="my-4"
                >
                  <StationeryArt
                    itemId={featured.item.id}
                    category={featured.item.category}
                    rarity={featured.item.rarity}
                    className="h-24 w-24"
                  />
                </motion.div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {featured.item.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {featured.item.description}
                </p>

                {featured.item.cutsceneQuote && (
                  <p className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line text-slate-700 italic dark:bg-white/10 dark:text-amber-200">
                    {featured.item.cutsceneQuote}
                  </p>
                )}

                {!previewMode && (
                  <button
                    type="button"
                    onClick={() => onEquipItem(featured.item.id)}
                    disabled={equippedItemId === featured.item.id}
                    className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {equippedItemId === featured.item.id ? '대표 문구 장착됨' : '대표 문구로 장착'}
                  </button>
                )}
              </div>

              {results.length > 1 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    전체 획득 목록 {totalRefund > 0 ? `(중복 환급 +${totalRefund}P)` : ''}
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {results.map((res, idx) => {
                      const meta = RARITY_META[res.item.rarity];
                      return (
                        <div
                          key={`${res.item.id}-${idx}`}
                          className={`flex items-center gap-3 rounded-xl border p-2.5 ${meta.borderColor} ${meta.surfaceBg}`}
                        >
                          <StationeryArt
                            itemId={res.item.id}
                            category={res.item.category}
                            rarity={res.item.rarity}
                            className="h-11 w-11 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-[11px] font-bold ${meta.textColor}`}>
                              {meta.label}
                              {res.guaranteedRarity ? ' · 확정' : ''}
                              {res.isNew ? ' · NEW' : ` · +${res.refundPoints}P`}
                            </p>
                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                              {res.item.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-[48px] w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

const MythicClimaxFooter: React.FC<{
  item: GachaItem;
  guaranteed?: 'transcendent' | 'mythic' | 'legendary';
  onDone: () => void;
}> = ({ item, guaranteed, onDone }) => {
  const isTranscendent = item.rarity === 'transcendent';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 w-full space-y-3.5"
    >
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.25em] uppercase ${
          isTranscendent ? 'text-cyan-300' : 'text-fuchsia-300'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {isTranscendent
          ? 'TRANSCENDENT FUSION · 초월 탄생'
          : `MYTHIC AWAKENING · 신화 강림${guaranteed === 'mythic' ? ' (500회 확정)' : ''}`}
      </span>

      {item.cutsceneQuote && (
        <blockquote className="rounded-2xl border border-white/15 bg-black/55 px-5 py-3.5 text-sm leading-relaxed whitespace-pre-line text-amber-100 italic shadow-xl backdrop-blur-md sm:text-base">
          {item.cutsceneQuote}
        </blockquote>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">
          {item.name}
        </h2>
        <p className="mt-1 text-xs text-slate-300">{item.description}</p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className={`min-h-[46px] rounded-xl px-7 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] ${
          isTranscendent
            ? 'bg-gradient-to-r from-cyan-300 via-amber-200 to-fuchsia-300'
            : 'bg-gradient-to-r from-amber-300 via-yellow-200 to-fuchsia-300'
        }`}
      >
        결과 확인하기
      </button>
    </motion.div>
  );
};
