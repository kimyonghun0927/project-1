import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, Trophy, Zap } from 'lucide-react';
import { GrowthLevel } from '../data/growthLevels';
import { getSharedAudioContext } from '../utils/audio';

export interface LevelUpEventData {
  from: GrowthLevel;
  to: GrowthLevel;
  totalXp: number;
}

interface LevelUpEffectModalProps {
  event: LevelUpEventData | null;
  soundEnabled: boolean;
  onClose: () => void;
}

function playLevelUpFanfare(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass impact boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.55);
    subGain.gain.setValueAtTime(0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.62);

    // Rising triumphant fanfare arpeggio + final chord
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx >= 4 ? 'triangle' : 'sawtooth';
      const startAt = now + 0.06 + idx * 0.075;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.exponentialRampToValueAtTime(idx >= 4 ? 0.14 : 0.08, startAt + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.95);
    });
  } catch {
    // Ignore audio errors
  }
}

export const LevelUpEffectModal: React.FC<LevelUpEffectModalProps> = ({
  event,
  soundEnabled,
  onClose,
}) => {
  const sparks = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.12;
        const distance = 135 + (i % 5) * 48;
        const colors = ['#FDE047', '#38BDF8', '#C084FC', '#F97316', '#34D399', '#FFFFFF'];
        return {
          id: i,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          size: 5 + (i % 4) * 3,
          color: colors[i % colors.length],
          delay: (i % 6) * 0.035,
        };
      }),
    []
  );

  useEffect(() => {
    if (!event) return;
    if (soundEnabled) {
      playLevelUpFanfare();
    }
  }, [event, soundEnabled]);

  useEffect(() => {
    if (!event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [event, onClose]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={`levelup-${event.to.level}-${event.totalXp}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="레벨업 축하 연출"
          className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-slate-950/90 p-4 backdrop-blur-md"
        >
          {/* Intense initial white-gold flash bang */}
          <motion.div
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 bg-gradient-to-br from-amber-200 via-white to-indigo-200"
          />

          {/* Camera shake & radiant impact stage */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.72, x: 0, y: 0 }}
            animate={{
              scale: [0.72, 1.07, 0.98, 1.02, 1],
              x: [0, -10, 10, -7, 7, -3, 3, 0],
              y: [0, 7, -8, 5, -5, 2, -2, 0],
            }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="relative flex w-full max-w-md flex-col items-center justify-center"
          >
            {/* Radial shockwave rings */}
            {[0, 0.14, 0.28].map((delay, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.25, opacity: 0.9 }}
                animate={{ scale: 3.1, opacity: 0 }}
                transition={{ duration: 1.15, delay, ease: 'easeOut' }}
                className={`pointer-events-none absolute h-52 w-52 rounded-full border-4 ${
                  idx === 0
                    ? 'border-amber-300'
                    : idx === 1
                      ? 'border-indigo-400'
                      : 'border-fuchsia-400'
                }`}
              />
            ))}

            {/* Rotating glowing conic halo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="pointer-events-none absolute h-80 w-80 rounded-full opacity-45 blur-2xl"
              style={{
                background:
                  'conic-gradient(from 0deg, #f59e0b, #6366f1, #ec4899, #22d3ee, #f59e0b)',
              }}
            />

            {/* High-velocity radial burst sparks */}
            {sparks.map((s) => (
              <motion.div
                key={s.id}
                initial={{ x: 0, y: 0, scale: 1.4, opacity: 1 }}
                animate={{
                  x: s.tx,
                  y: s.ty,
                  scale: [1.4, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.05, delay: s.delay, ease: 'easeOut' }}
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: s.size,
                  height: s.size,
                  backgroundColor: s.color,
                  boxShadow: `0 0 14px ${s.color}`,
                }}
              />
            ))}

            {/* Main Foreground Card */}
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.35 }}
              className="relative w-full overflow-hidden rounded-3xl border border-amber-300/60 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-6 text-center shadow-[0_0_70px_rgba(245,158,11,0.45)] sm:p-8"
            >
              {/* Diagonal light sweep */}
              <motion.div
                initial={{ x: '-140%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 1.2, delay: 0.25, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />

              <motion.div
                initial={{ scale: 0.4, rotate: -15 }}
                animate={{ scale: [0.4, 1.22, 1], rotate: [-15, 6, 0] }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_0_35px_rgba(251,191,36,0.75)]"
              >
                {event.to.level >= 15 ? (
                  <Trophy className="h-10 w-10" aria-hidden="true" />
                ) : (
                  <Zap className="h-10 w-10 fill-current" aria-hidden="true" />
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, letterSpacing: '0.45em' }}
                animate={{ opacity: 1, letterSpacing: '0.24em' }}
                transition={{ delay: 0.18, duration: 0.45 }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                LEVEL UP! 등급 상승
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </motion.div>

              {/* Old Grade -> New Grade Slam */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <span className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300">
                  Lv.{event.from.level} {event.from.name}
                </span>
                <ArrowRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <motion.span
                  initial={{ scale: 0.7 }}
                  animate={{ scale: [0.7, 1.18, 1] }}
                  transition={{ delay: 0.25, duration: 0.45 }}
                  className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 px-4 py-1.5 text-base font-black text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.6)]"
                >
                  Lv.{event.to.level} {event.to.name}
                </motion.span>
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                {event.to.name} 단계 각성!
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-indigo-200">
                꾸준한 학습으로 누적{' '}
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {event.totalXp.toLocaleString()} XP
                </span>
                에 도달했습니다.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition-transform hover:brightness-105 active:scale-[0.98]"
              >
                계속 공부하기
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
