import { StudySession } from '../types/study';

export const DAILY_ATTENDANCE_TARGET_SECONDS = 3600; // 1시간 (3,600초)
export const STREAK_FREEZE_PRICE = 5000;

export interface GrowthLevel {
  level: number;
  name: string;
  minXp: number;
  badgeClasses: string;
  barClasses: string;
}

export const GROWTH_LEVELS: GrowthLevel[] = [
  {
    level: 1,
    name: '아기',
    minXp: 0,
    badgeClasses: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    barClasses: 'bg-rose-500',
  },
  {
    level: 2,
    name: '걸음마',
    minXp: 100,
    badgeClasses: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    barClasses: 'bg-orange-500',
  },
  {
    level: 3,
    name: '유치원',
    minXp: 300,
    badgeClasses: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    barClasses: 'bg-amber-500',
  },
  {
    level: 4,
    name: '초1',
    minXp: 600,
    badgeClasses: 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800',
    barClasses: 'bg-lime-500',
  },
  {
    level: 5,
    name: '초2',
    minXp: 1100,
    badgeClasses: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    barClasses: 'bg-emerald-500',
  },
  {
    level: 6,
    name: '초3',
    minXp: 1800,
    badgeClasses: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    barClasses: 'bg-teal-500',
  },
  {
    level: 7,
    name: '초4',
    minXp: 2800,
    badgeClasses: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    barClasses: 'bg-cyan-500',
  },
  {
    level: 8,
    name: '초5',
    minXp: 4200,
    badgeClasses: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    barClasses: 'bg-sky-500',
  },
  {
    level: 9,
    name: '초6',
    minXp: 6000,
    badgeClasses: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    barClasses: 'bg-blue-500',
  },
  {
    level: 10,
    name: '중1',
    minXp: 8500,
    badgeClasses: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    barClasses: 'bg-indigo-500',
  },
  {
    level: 11,
    name: '중2',
    minXp: 12000,
    badgeClasses: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    barClasses: 'bg-violet-500',
  },
  {
    level: 12,
    name: '중3',
    minXp: 16500,
    badgeClasses: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    barClasses: 'bg-purple-500',
  },
  {
    level: 13,
    name: '고1',
    minXp: 22500,
    badgeClasses: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800',
    barClasses: 'bg-fuchsia-500',
  },
  {
    level: 14,
    name: '고2',
    minXp: 30000,
    badgeClasses: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
    barClasses: 'bg-pink-500',
  },
  {
    level: 15,
    name: '고3',
    minXp: 40000,
    badgeClasses: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700',
    barClasses: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
  },
];

export interface GrowthStageProgress {
  totalXp: number;
  current: GrowthLevel;
  next: GrowthLevel | null;
  xpIntoLevel: number;
  xpRequiredForNext: number;
  xpRemaining: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

export function getGrowthStageProgress(rawXp: number): GrowthStageProgress {
  const totalXp = Math.max(0, Math.floor(rawXp));
  let currentIndex = 0;

  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= GROWTH_LEVELS[i].minXp) {
      currentIndex = i;
      break;
    }
  }

  const current = GROWTH_LEVELS[currentIndex];
  const next = currentIndex < GROWTH_LEVELS.length - 1 ? GROWTH_LEVELS[currentIndex + 1] : null;

  if (!next) {
    return {
      totalXp,
      current,
      next: null,
      xpIntoLevel: totalXp - current.minXp,
      xpRequiredForNext: 0,
      xpRemaining: 0,
      progressPercent: 100,
      isMaxLevel: true,
    };
  }

  const xpIntoLevel = totalXp - current.minXp;
  const xpRequiredForNext = next.minXp - current.minXp;
  const xpRemaining = Math.max(0, next.minXp - totalXp);
  const progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / xpRequiredForNext) * 100));

  return {
    totalXp,
    current,
    next,
    xpIntoLevel,
    xpRequiredForNext,
    xpRemaining,
    progressPercent,
    isMaxLevel: false,
  };
}

export function computeStudyXpFromSessions(sessions: StudySession[]): number {
  let sessionXp = 0;
  const dailySeconds = new Map<string, number>();

  for (const s of sessions) {
    if (s.durationSeconds >= 60) {
      sessionXp += Math.floor(s.durationSeconds / 60) * 10;
    } else if (s.durationSeconds >= 10) {
      sessionXp += 5;
    }
    dailySeconds.set(s.dateKey, (dailySeconds.get(s.dateKey) || 0) + s.durationSeconds);
  }

  let attendanceBonusXp = 0;
  dailySeconds.forEach((sec) => {
    if (sec >= DAILY_ATTENDANCE_TARGET_SECONDS) {
      attendanceBonusXp += 200;
    }
  });

  return sessionXp + attendanceBonusXp;
}
