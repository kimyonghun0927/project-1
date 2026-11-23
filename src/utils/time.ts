import { StudySession, SubjectColorId } from '../types/study';
import { getSharedAudioContext } from './audio';

export const SUBJECT_COLORS: Record<
  SubjectColorId,
  {
    label: string;
    dot: string;
    bar: string;
    ring: string;
    softBg: string;
    text: string;
  }
> = {
  indigo: {
    label: '인디고',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
    bar: 'bg-indigo-600 dark:bg-indigo-500',
    ring: 'stroke-indigo-600 dark:stroke-indigo-400',
    softBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  emerald: {
    label: '에메랄드',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    bar: 'bg-emerald-600 dark:bg-emerald-500',
    ring: 'stroke-emerald-600 dark:stroke-emerald-400',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    label: '앰버',
    dot: 'bg-amber-500 dark:bg-amber-400',
    bar: 'bg-amber-500 dark:bg-amber-400',
    ring: 'stroke-amber-500 dark:stroke-amber-400',
    softBg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    label: '로즈',
    dot: 'bg-rose-600 dark:bg-rose-400',
    bar: 'bg-rose-600 dark:bg-rose-500',
    ring: 'stroke-rose-600 dark:stroke-rose-400',
    softBg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-300',
  },
  sky: {
    label: '스카이',
    dot: 'bg-sky-600 dark:bg-sky-400',
    bar: 'bg-sky-600 dark:bg-sky-500',
    ring: 'stroke-sky-600 dark:stroke-sky-400',
    softBg: 'bg-sky-50 dark:bg-sky-950/50',
    text: 'text-sky-700 dark:text-sky-300',
  },
  violet: {
    label: '바이올렛',
    dot: 'bg-violet-600 dark:bg-violet-400',
    bar: 'bg-violet-600 dark:bg-violet-500',
    ring: 'stroke-violet-600 dark:stroke-violet-400',
    softBg: 'bg-violet-50 dark:bg-violet-950/50',
    text: 'text-violet-700 dark:text-violet-300',
  },
};

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatTimerClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatDurationKorean(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (hours > 0) {
    return `${hours}시간`;
  }
  if (minutes > 0) {
    return `${minutes}분`;
  }
  return `${seconds}초`;
}

export function formatHoursCompact(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  if (hours >= 10) {
    return `${hours.toFixed(1)}h`;
  }
  if (hours >= 1) {
    return `${hours.toFixed(1)}h`;
  }
  const mins = Math.round(totalSeconds / 60);
  return `${mins}m`;
}

export function formatTimeOfDay(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatKoreanDateFull(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export function getRecentDateKeys(anchorDateKey: string, countBefore = 10, countAfter = 3): {
  dateKey: string;
  weekday: string;
  dayNum: number;
  isToday: boolean;
}[] {
  const todayKey = getLocalDateKey();
  const anchor = parseDateKey(anchorDateKey);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const result = [];

  for (let offset = -countBefore; offset <= countAfter; offset++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + offset);
    const key = getLocalDateKey(d);
    result.push({
      dateKey: key,
      weekday: weekdays[d.getDay()],
      dayNum: d.getDate(),
      isToday: key === todayKey,
    });
  }
  return result;
}

export function getCurrentWeekDateKeys(referenceDate: Date = new Date()): {
  dateKey: string;
  label: string;
}[] {
  const day = referenceDate.getDay();
  // Monday as start of week
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  return labels.map((label, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      dateKey: getLocalDateKey(d),
      label,
    };
  });
}

export const ATTENDANCE_MIN_SECONDS = 3600; // 하루 1시간 이상 공부 시 출석 1회

export function getDailyStudySecondsMap(sessions: StudySession[]): Map<string, number> {
  const dailyMap = new Map<string, number>();
  for (const s of sessions) {
    dailyMap.set(s.dateKey, (dailyMap.get(s.dateKey) || 0) + s.durationSeconds);
  }
  return dailyMap;
}

export function computeStreakDays(
  sessions: StudySession[],
  protectedDates: string[] = []
): number {
  const dailyMap = getDailyStudySecondsMap(sessions);
  const protectedSet = new Set(protectedDates);

  const isDayValid = (dateKey: string) =>
    (dailyMap.get(dateKey) || 0) >= ATTENDANCE_MIN_SECONDS || protectedSet.has(dateKey);

  let streak = 0;
  const cursor = new Date();
  const todayKey = getLocalDateKey(cursor);

  // If today hasn't reached 1 hour yet, check consecutive streak up to yesterday
  if (!isDayValid(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (isDayValid(getLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface DailyAttendanceDay {
  dateKey: string;
  weekday: string;
  dayNum: number;
  seconds: number;
  attended: boolean;
  protected: boolean;
  isToday: boolean;
}

export interface AttendanceSummary {
  todaySeconds: number;
  todayAttended: boolean;
  remainingSecondsToday: number;
  streakDays: number;
  totalAttendedDays: number;
  recent7Days: DailyAttendanceDay[];
}

export function getAttendanceSummary(
  sessions: StudySession[],
  protectedDates: string[] = []
): AttendanceSummary {
  const dailyMap = getDailyStudySecondsMap(sessions);
  const protectedSet = new Set(protectedDates);
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const todaySeconds = dailyMap.get(todayKey) || 0;
  const todayAttended = todaySeconds >= ATTENDANCE_MIN_SECONDS;

  let totalAttendedDays = 0;
  dailyMap.forEach((sec) => {
    if (sec >= ATTENDANCE_MIN_SECONDS) totalAttendedDays += 1;
  });

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const recent7Days: DailyAttendanceDay[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const key = getLocalDateKey(d);
    const sec = dailyMap.get(key) || 0;
    recent7Days.push({
      dateKey: key,
      weekday: weekdays[d.getDay()],
      dayNum: d.getDate(),
      seconds: sec,
      attended: sec >= ATTENDANCE_MIN_SECONDS,
      protected: sec < ATTENDANCE_MIN_SECONDS && protectedSet.has(key),
      isToday: key === todayKey,
    });
  }

  return {
    todaySeconds,
    todayAttended,
    remainingSecondsToday: Math.max(0, ATTENDANCE_MIN_SECONDS - todaySeconds),
    streakDays: computeStreakDays(sessions, protectedDates),
    totalAttendedDays,
    recent7Days,
  };
}

export function playTimerCompleteSound(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5 soft chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.46);
    });
  } catch {
    // Audio playback may be blocked if user hasn't interacted yet
  }
}
