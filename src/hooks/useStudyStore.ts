import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import {
  DRAW_COST_FIVE,
  DRAW_COST_SINGLE,
  MYTHIC_RELIC_IDS,
  PITY_LEGENDARY_INTERVAL,
  PITY_MYTHIC_INTERVAL,
  RARITY_META,
  TRANSCENDENT_ITEM,
  rollGachaItemByRarity,
  rollSingleGachaItem,
} from '../data/gachaItems';
import {
  STREAK_FREEZE_PRICE,
  computeStudyXpFromSessions,
  getGrowthStageProgress,
} from '../data/growthLevels';
import { GachaDrawResult, OwnedItemEntry } from '../types/shop';
import {
  ActiveTimerState,
  PomodoroPhase,
  StudySession,
  StudySettings,
  Subject,
  SubjectColorId,
  TimerMode,
} from '../types/study';
import {
  ATTENDANCE_MIN_SECONDS,
  getAttendanceSummary,
  getDailyStudySecondsMap,
  getLocalDateKey,
  parseDateKey,
  playTimerCompleteSound,
} from '../utils/time';

const STORAGE_KEYS = {
  subjects: 'gongbulog_subjects_v1',
  sessions: 'gongbulog_sessions_v1',
  timer: 'gongbulog_active_timer_v1',
  settings: 'gongbulog_settings_v1',
  points: 'gongbulog_points_v1',
  inventory: 'gongbulog_inventory_v1',
  equippedItem: 'gongbulog_equipped_item_v1',
  totalDraws: 'gongbulog_total_draws_v1',
  equippedTitle: 'gongbulog_equipped_title_v1',
  totalQuizAnswered: 'gongbulog_total_quiz_answered_v1',
  unlockedAchievements: 'gongbulog_unlocked_achievements_v1',
  bonusXp: 'gongbulog_bonus_xp_v1',
  streakFreezeCount: 'gongbulog_streak_freeze_v1',
  protectedDates: 'gongbulog_protected_dates_v1',
  lastAttendanceCheckDate: 'gongbulog_last_attendance_check_v1',
} as const;

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'subj-korean', name: '국어 / 독서', color: 'indigo', createdAt: 1 },
  { id: 'subj-english', name: '영어', color: 'sky', createdAt: 2 },
  { id: 'subj-math', name: '수학', color: 'emerald', createdAt: 3 },
  { id: 'subj-major', name: '전공 / 코딩', color: 'violet', createdAt: 4 },
  { id: 'subj-cert', name: '자격증', color: 'amber', createdAt: 5 },
];

const DEFAULT_SETTINGS: StudySettings = {
  dailyGoalMinutes: 240, // 4 hours
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  soundEnabled: true,
  theme: 'light',
};

const DEFAULT_TIMER: ActiveTimerState = {
  mode: 'stopwatch',
  pomodoroPhase: 'focus',
  subjectId: DEFAULT_SUBJECTS[0].id,
  memo: '',
  isRunning: false,
  startedAtMs: null,
  accumulatedMs: 0,
};

function safeReadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useStudyStore() {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const stored = safeReadJSON<Subject[]>(STORAGE_KEYS.subjects, DEFAULT_SUBJECTS);
    return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_SUBJECTS;
  });

  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const stored = safeReadJSON<StudySession[]>(STORAGE_KEYS.sessions, []);
    return Array.isArray(stored) ? stored : [];
  });

  const [settings, setSettings] = useState<StudySettings>(() => {
    const stored = safeReadJSON<Partial<StudySettings>>(STORAGE_KEYS.settings, {});
    return { ...DEFAULT_SETTINGS, ...stored };
  });

  const [timer, setTimer] = useState<ActiveTimerState>(() => {
    const stored = safeReadJSON<Partial<ActiveTimerState>>(STORAGE_KEYS.timer, {});
    return { ...DEFAULT_TIMER, ...stored };
  });

  const [points, setPoints] = useState<number>(() => {
    const stored = safeReadJSON<number>(STORAGE_KEYS.points, 100);
    return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(0, stored) : 100;
  });

  const [inventory, setInventory] = useState<Record<string, OwnedItemEntry>>(() => {
    const stored = safeReadJSON<Record<string, OwnedItemEntry>>(STORAGE_KEYS.inventory, {});
    return stored && typeof stored === 'object' ? stored : {};
  });

  const [equippedItemId, setEquippedItemId] = useState<string | null>(() => {
    const stored = safeReadJSON<string | null>(STORAGE_KEYS.equippedItem, null);
    return typeof stored === 'string' ? stored : null;
  });

  const [totalDraws, setTotalDraws] = useState<number>(() => {
    const stored = safeReadJSON<number>(STORAGE_KEYS.totalDraws, 0);
    return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
  });

  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(() => {
    const stored = safeReadJSON<string | null>(STORAGE_KEYS.equippedTitle, null);
    return typeof stored === 'string' ? stored : null;
  });

  const [totalQuizAnswered, setTotalQuizAnswered] = useState<number>(() => {
    const stored = safeReadJSON<number>(STORAGE_KEYS.totalQuizAnswered, 0);
    return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
  });

  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>(() => {
    const stored = safeReadJSON<string[]>(STORAGE_KEYS.unlockedAchievements, []);
    return Array.isArray(stored) ? stored : [];
  });

  const [bonusXp, setBonusXp] = useState<number>(() => {
    const stored = safeReadJSON<number>(STORAGE_KEYS.bonusXp, 0);
    return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
  });

  const [streakFreezeCount, setStreakFreezeCount] = useState<number>(() => {
    const stored = safeReadJSON<number>(STORAGE_KEYS.streakFreezeCount, 0);
    return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
  });

  const [protectedDates, setProtectedDates] = useState<string[]>(() => {
    const stored = safeReadJSON<string[]>(STORAGE_KEYS.protectedDates, []);
    return Array.isArray(stored) ? stored : [];
  });

  const [lastAttendanceCheckDate, setLastAttendanceCheckDate] = useState<string | null>(() => {
    const stored = safeReadJSON<string | null>(STORAGE_KEYS.lastAttendanceCheckDate, null);
    return typeof stored === 'string' ? stored : null;
  });

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [pomodoroNotice, setPomodoroNotice] = useState<string | null>(null);
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    } catch {
      // Ignore quota errors
    }
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    } catch {
      // Ignore quota errors
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify(timer));
    } catch {
      // Ignore quota errors
    }
  }, [timer]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.points, JSON.stringify(points));
    } catch {
      // Ignore quota errors
    }
  }, [points]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
    } catch {
      // Ignore quota errors
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.equippedItem, JSON.stringify(equippedItemId));
    } catch {
      // Ignore quota errors
    }
  }, [equippedItemId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.totalDraws, JSON.stringify(totalDraws));
    } catch {
      // Ignore quota errors
    }
  }, [totalDraws]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.equippedTitle, JSON.stringify(equippedTitleId));
    } catch {
      // Ignore quota errors
    }
  }, [equippedTitleId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.totalQuizAnswered, JSON.stringify(totalQuizAnswered));
    } catch {
      // Ignore quota errors
    }
  }, [totalQuizAnswered]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.unlockedAchievements, JSON.stringify(unlockedAchievementIds));
    } catch {
      // Ignore quota errors
    }
  }, [unlockedAchievementIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.bonusXp, JSON.stringify(bonusXp));
    } catch {
      // Ignore quota errors
    }
  }, [bonusXp]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.streakFreezeCount, JSON.stringify(streakFreezeCount));
    } catch {
      // Ignore quota errors
    }
  }, [streakFreezeCount]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.protectedDates, JSON.stringify(protectedDates));
    } catch {
      // Ignore quota errors
    }
  }, [protectedDates]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.lastAttendanceCheckDate,
        JSON.stringify(lastAttendanceCheckDate)
      );
    } catch {
      // Ignore quota errors
    }
  }, [lastAttendanceCheckDate]);

  // Day-rollover check: automatically apply 출석 방어권 if user missed 1-hour attendance on previous day(s)
  const currentDateKey = getLocalDateKey(new Date(nowMs));
  useEffect(() => {
    if (!lastAttendanceCheckDate) {
      setLastAttendanceCheckDate(currentDateKey);
      return;
    }
    if (lastAttendanceCheckDate >= currentDateKey) {
      return;
    }

    const dailyMap = getDailyStudySecondsMap(sessions);
    const protectedSet = new Set(protectedDates);
    const isDayValid = (key: string) =>
      (dailyMap.get(key) || 0) >= ATTENDANCE_MIN_SECONDS || protectedSet.has(key);

    // Inspect missed days between lastAttendanceCheckDate (inclusive) and currentDateKey (exclusive)
    const cursor = parseDateKey(lastAttendanceCheckDate);
    const prevDay = new Date(cursor);
    prevDay.setDate(prevDay.getDate() - 1);
    let hadActiveStreakBeforeGap = isDayValid(getLocalDateKey(prevDay));

    const missedDaysToProtect: string[] = [];
    let guard = 0;
    while (getLocalDateKey(cursor) < currentDateKey && guard < 31) {
      guard += 1;
      const key = getLocalDateKey(cursor);
      if (isDayValid(key)) {
        hadActiveStreakBeforeGap = true;
      } else if (hadActiveStreakBeforeGap) {
        missedDaysToProtect.push(key);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (
      missedDaysToProtect.length > 0 &&
      missedDaysToProtect.length <= streakFreezeCount
    ) {
      setProtectedDates((prev) => Array.from(new Set([...prev, ...missedDaysToProtect])));
      setStreakFreezeCount((prev) => Math.max(0, prev - missedDaysToProtect.length));
      setAttendanceNotice(
        `1시간 공부 출석을 놓친 날이 있어 출석 방어권 ${missedDaysToProtect.length}개가 자동 사용되어 연속 출석이 유지되었습니다!`
      );
    } else if (missedDaysToProtect.length > 0) {
      setAttendanceNotice(
        '어제 1시간 이상 공부를 완료하지 못해 연속 출석 기록이 초기화되었습니다. 오늘 다시 1시간을 채워보세요!'
      );
    }

    setLastAttendanceCheckDate(currentDateKey);
  }, [currentDateKey, lastAttendanceCheckDate, protectedDates, sessions, streakFreezeCount]);

  // Auto-sync newly unlocked achievements cleanly so earned titles never disappear even after synthesis
  useEffect(() => {
    const totalStudySeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const ctx = {
      sessions,
      totalStudySeconds,
      inventory,
      totalDraws,
      totalQuizAnswered,
    };
    setUnlockedAchievementIds((prev) => {
      const nextSet = new Set(prev);
      let changed = false;
      for (const ach of ACHIEVEMENTS) {
        if (!nextSet.has(ach.id) && ach.evaluate(ctx).unlocked) {
          nextSet.add(ach.id);
          changed = true;
        }
      }
      return changed ? Array.from(nextSet) : prev;
    });
  }, [inventory, sessions, totalDraws, totalQuizAnswered]);

  // Ensure selected subjectId always points to an existing subject
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.id === timer.subjectId)) {
      setTimer((prev) => ({ ...prev, subjectId: subjects[0].id }));
    }
  }, [subjects, timer.subjectId]);

  // Real-time ticker when timer is running, plus periodic / visibility refresh when idle for midnight rollover
  useEffect(() => {
    const refreshNow = () => setNowMs(Date.now());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshNow();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (timer.isRunning) {
      refreshNow();
      const id = window.setInterval(refreshNow, 250);
      return () => {
        window.clearInterval(id);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    const idleId = window.setInterval(refreshNow, 60000);
    return () => {
      window.clearInterval(idleId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [timer.isRunning]);

  const elapsedMs = timer.isRunning && timer.startedAtMs !== null
    ? timer.accumulatedMs + Math.max(0, nowMs - timer.startedAtMs)
    : timer.accumulatedMs;

  const pomodoroTargetMs =
    (timer.pomodoroPhase === 'focus'
      ? settings.pomodoroFocusMinutes
      : settings.pomodoroBreakMinutes) *
    60 *
    1000;

  // Handle Pomodoro completion when countdown hits 0
  useEffect(() => {
    if (timer.mode !== 'pomodoro' || !timer.isRunning) return;
    if (elapsedMs < pomodoroTargetMs) return;

    const currentEndMs = Date.now();
    const completedPhase = timer.pomodoroPhase;

    if (settings.soundEnabled) {
      playTimerCompleteSound();
    }

    if (completedPhase === 'focus') {
      const durationSec = Math.round(pomodoroTargetMs / 1000);
      const startMs = currentEndMs - pomodoroTargetMs;
      const newSession: StudySession = {
        id: createId('sess'),
        subjectId: timer.subjectId,
        dateKey: getLocalDateKey(new Date(startMs)),
        startTime: startMs,
        endTime: currentEndMs,
        durationSeconds: durationSec,
        mode: 'pomodoro',
        memo: timer.memo.trim(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setPomodoroNotice(
        `집중 ${settings.pomodoroFocusMinutes}분 완료! 기록이 저장되었습니다. 이제 ${settings.pomodoroBreakMinutes}분 휴식하세요.`
      );
      setTimer((prev) => ({
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedMs: 0,
        pomodoroPhase: 'break',
      }));
    } else {
      setPomodoroNotice('휴식 시간이 끝났습니다. 다시 집중을 시작해보세요!');
      setTimer((prev) => ({
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedMs: 0,
        pomodoroPhase: 'focus',
      }));
    }
  }, [
    elapsedMs,
    pomodoroTargetMs,
    settings.pomodoroBreakMinutes,
    settings.pomodoroFocusMinutes,
    settings.soundEnabled,
    timer.isRunning,
    timer.memo,
    timer.mode,
    timer.pomodoroPhase,
    timer.subjectId,
  ]);

  const startTimer = useCallback(() => {
    setPomodoroNotice(null);
    const now = Date.now();
    setNowMs(now);
    setTimer((prev) => {
      if (prev.isRunning) return prev;
      return {
        ...prev,
        isRunning: true,
        startedAtMs: now,
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setTimer((prev) => {
      if (!prev.isRunning) return prev;
      const delta = prev.startedAtMs !== null ? Math.max(0, now - prev.startedAtMs) : 0;
      return {
        ...prev,
        isRunning: false,
        startedAtMs: null,
        accumulatedMs: prev.accumulatedMs + delta,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setPomodoroNotice(null);
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      startedAtMs: null,
      accumulatedMs: 0,
    }));
  }, []);

  const setTimerMode = useCallback((mode: TimerMode) => {
    setPomodoroNotice(null);
    setTimer((prev) => ({
      ...prev,
      mode,
      pomodoroPhase: 'focus',
      isRunning: false,
      startedAtMs: null,
      accumulatedMs: 0,
    }));
  }, []);

  const setPomodoroPhase = useCallback((phase: PomodoroPhase) => {
    setPomodoroNotice(null);
    setTimer((prev) => ({
      ...prev,
      pomodoroPhase: phase,
      isRunning: false,
      startedAtMs: null,
      accumulatedMs: 0,
    }));
  }, []);

  const setTimerSubject = useCallback((subjectId: string) => {
    setTimer((prev) => ({ ...prev, subjectId }));
  }, []);

  const setTimerMemo = useCallback((memo: string) => {
    setTimer((prev) => ({ ...prev, memo }));
  }, []);

  const completeAndSaveTimer = useCallback((): { saved: boolean; message: string } => {
    const now = Date.now();
    const totalMs =
      timer.isRunning && timer.startedAtMs !== null
        ? timer.accumulatedMs + Math.max(0, now - timer.startedAtMs)
        : timer.accumulatedMs;

    if (timer.mode === 'pomodoro' && timer.pomodoroPhase === 'break') {
      resetTimer();
      setTimer((prev) => ({ ...prev, pomodoroPhase: 'focus' }));
      return { saved: false, message: '휴식 타이머를 종료하고 집중 모드로 돌아왔습니다.' };
    }

    const totalSeconds = Math.floor(totalMs / 1000);
    if (totalSeconds < 10) {
      return { saved: false, message: '10초 이상 공부한 경우에만 기록할 수 있습니다.' };
    }

    const startTime = now - totalMs;
    const newSession: StudySession = {
      id: createId('sess'),
      subjectId: timer.subjectId,
      dateKey: getLocalDateKey(new Date(startTime)),
      startTime,
      endTime: now,
      durationSeconds: totalSeconds,
      mode: timer.mode,
      memo: timer.memo.trim(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      startedAtMs: null,
      accumulatedMs: 0,
      memo: '',
      pomodoroPhase: 'focus',
    }));

    return { saved: true, message: '공부 기록이 저장되었습니다.' };
  }, [resetTimer, timer]);

  const addManualSession = useCallback(
    (input: {
      subjectId: string;
      dateKey: string;
      startTime: number;
      durationSeconds: number;
      memo: string;
    }) => {
      const newSession: StudySession = {
        id: createId('sess'),
        subjectId: input.subjectId,
        dateKey: input.dateKey,
        startTime: input.startTime,
        endTime: input.startTime + input.durationSeconds * 1000,
        durationSeconds: input.durationSeconds,
        mode: 'manual',
        memo: input.memo.trim(),
      };
      setSessions((prev) => [newSession, ...prev]);
    },
    []
  );

  const updateSession = useCallback(
    (
      id: string,
      patch: {
        subjectId: string;
        dateKey: string;
        startTime: number;
        durationSeconds: number;
        memo: string;
      }
    ) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                subjectId: patch.subjectId,
                dateKey: patch.dateKey,
                startTime: patch.startTime,
                endTime: patch.startTime + patch.durationSeconds * 1000,
                durationSeconds: patch.durationSeconds,
                memo: patch.memo.trim(),
              }
            : s
        )
      );
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addSubject = useCallback((name: string, color: SubjectColorId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newSubj: Subject = {
      id: createId('subj'),
      name: trimmed,
      color,
      createdAt: Date.now(),
    };
    setSubjects((prev) => [...prev, newSubj]);
  }, []);

  const updateSubject = useCallback((id: string, name: string, color: SubjectColorId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: trimmed, color } : s))
    );
  }, []);

  const deleteSubject = useCallback(
    (id: string) => {
      if (subjects.length <= 1) return;
      const remaining = subjects.filter((s) => s.id !== id);
      if (remaining.length === subjects.length || remaining.length === 0) return;
      const fallbackId = remaining[0].id;
      setSubjects(remaining);
      setSessions((currSessions) =>
        currSessions.map((sess) =>
          sess.subjectId === id ? { ...sess, subjectId: fallbackId } : sess
        )
      );
    },
    [subjects]
  );

  const updateSettings = useCallback((patch: Partial<StudySettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const exportBackupJSON = useCallback(() => {
    const payload = {
      app: '공부로그',
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects,
      sessions,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gongbulog-backup-${getLocalDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions, settings, subjects]);

  const exportCSV = useCallback(() => {
    const subjMap = new Map(subjects.map((s) => [s.id, s.name]));
    const header = ['날짜', '과목', '시작시각', '종료시각', '공부시간(분)', '방식', '메모'];
    const rows = sessions.map((s) => {
      const startD = new Date(s.startTime);
      const endD = new Date(s.endTime);
      const fmt = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const modeLabel =
        s.mode === 'pomodoro' ? '뽀모도로' : s.mode === 'manual' ? '수동입력' : '스톱워치';
      const safeMemo = `"${(s.memo || '').replace(/"/g, '""')}"`;
      return [
        s.dateKey,
        `"${(subjMap.get(s.subjectId) || '기타').replace(/"/g, '""')}"`,
        fmt(startD),
        fmt(endD),
        String(Math.round((s.durationSeconds / 60) * 10) / 10),
        modeLabel,
        safeMemo,
      ].join(',');
    });
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gongbulog-records-${getLocalDateKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions, subjects]);

  const importBackupJSON = useCallback((rawText: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawText) as {
        subjects?: Subject[];
        sessions?: StudySession[];
        settings?: Partial<StudySettings>;
      };
      if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
        return { ok: false, message: '올바른 공부로그 백업 파일이 아닙니다.' };
      }
      if (parsed.subjects.length > 0) {
        setSubjects(parsed.subjects);
      }
      setSessions(parsed.sessions);
      if (parsed.settings) {
        setSettings((prev) => ({ ...prev, ...parsed.settings }));
      }
      return { ok: true, message: `${parsed.sessions.length}개의 공부 기록을 불러왔습니다.` };
    } catch {
      return { ok: false, message: '파일을 읽는 중 오류가 발생했습니다.' };
    }
  }, []);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
  }, []);

  const addPoints = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setPoints((prev) => prev + Math.round(amount));
  }, []);

  const equipItem = useCallback((itemId: string | null) => {
    setEquippedItemId(itemId);
  }, []);

  const equipTitle = useCallback((titleId: string | null) => {
    setEquippedTitleId(titleId);
  }, []);

  const recordQuizAnswered = useCallback((count: number) => {
    if (!Number.isFinite(count) || count <= 0) return;
    setTotalQuizAnswered((prev) => prev + Math.round(count));
  }, []);

  const drawGacha = useCallback(
    (
      times: 1 | 5
    ): { ok: boolean; results: GachaDrawResult[]; totalRefund: number; error?: string } => {
      const cost = times === 5 ? DRAW_COST_FIVE : DRAW_COST_SINGLE;
      if (points < cost) {
        return {
          ok: false,
          results: [],
          totalRefund: 0,
          error: `포인트가 부족합니다. (필요: ${cost}P / 보유: ${points}P)`,
        };
      }

      const workingInventory: Record<string, OwnedItemEntry> = { ...inventory };
      const results: GachaDrawResult[] = [];
      let totalRefund = 0;

      for (let i = 0; i < times; i++) {
        const drawNumber = totalDraws + i + 1;
        let guaranteedRarity: 'mythic' | 'legendary' | undefined;
        let item;

        if (drawNumber % PITY_MYTHIC_INTERVAL === 0) {
          guaranteedRarity = 'mythic';
          item = rollGachaItemByRarity('mythic');
        } else if (drawNumber % PITY_LEGENDARY_INTERVAL === 0) {
          guaranteedRarity = 'legendary';
          item = rollGachaItemByRarity('legendary');
        } else {
          item = rollSingleGachaItem();
        }

        const existing = workingInventory[item.id];
        if (existing) {
          const refundPoints = RARITY_META[item.rarity].duplicateRefund;
          totalRefund += refundPoints;
          workingInventory[item.id] = {
            ...existing,
            count: existing.count + 1,
          };
          results.push({ item, isNew: false, refundPoints, guaranteedRarity });
        } else {
          workingInventory[item.id] = {
            itemId: item.id,
            count: 1,
            firstObtainedAt: Date.now(),
          };
          results.push({ item, isNew: true, refundPoints: 0, guaranteedRarity });
        }
      }

      setInventory(workingInventory);
      setTotalDraws((prev) => prev + times);
      setPoints((prev) => Math.max(0, prev - cost + totalRefund));
      if (!equippedItemId && results[0]) {
        setEquippedItemId(results[0].item.id);
      }

      return { ok: true, results, totalRefund };
    },
    [equippedItemId, inventory, points, totalDraws]
  );

  const synthesizeTranscendent = useCallback((): {
    ok: boolean;
    result?: GachaDrawResult;
    error?: string;
  } => {
    const missing = MYTHIC_RELIC_IDS.some((id) => (inventory[id]?.count || 0) < 1);
    if (missing) {
      return {
        ok: false,
        error: '신화 등급 문구 4종을 모두 1개 이상 보유해야 합성할 수 있습니다.',
      };
    }

    const workingInventory: Record<string, OwnedItemEntry> = { ...inventory };
    for (const id of MYTHIC_RELIC_IDS) {
      const entry = workingInventory[id];
      if (!entry) continue;
      if (entry.count <= 1) {
        delete workingInventory[id];
      } else {
        workingInventory[id] = { ...entry, count: entry.count - 1 };
      }
    }

    const existingGlasses = workingInventory[TRANSCENDENT_ITEM.id];
    const isNew = !existingGlasses;
    workingInventory[TRANSCENDENT_ITEM.id] = existingGlasses
      ? { ...existingGlasses, count: existingGlasses.count + 1 }
      : {
          itemId: TRANSCENDENT_ITEM.id,
          count: 1,
          firstObtainedAt: Date.now(),
        };

    setInventory(workingInventory);
    if (!equippedItemId || !workingInventory[equippedItemId]) {
      setEquippedItemId(TRANSCENDENT_ITEM.id);
    }

    return {
      ok: true,
      result: {
        item: TRANSCENDENT_ITEM,
        isNew,
        refundPoints: 0,
        guaranteedRarity: 'transcendent',
      },
    };
  }, [equippedItemId, inventory]);

  const devUnlockTitles = useCallback((target: 'all' | string, autoEquip?: boolean) => {
    if (target === 'all') {
      setUnlockedAchievementIds(ACHIEVEMENTS.map((a) => a.id));
      return;
    }
    setUnlockedAchievementIds((prev) => (prev.includes(target) ? prev : [...prev, target]));
    if (autoEquip) {
      setEquippedTitleId(target);
    }
  }, []);

  const devGrantMythicRelics = useCallback(() => {
    setInventory((prev) => {
      const next = { ...prev };
      for (const id of MYTHIC_RELIC_IDS) {
        const cur = next[id];
        next[id] = cur
          ? { ...cur, count: cur.count + 1 }
          : { itemId: id, count: 1, firstObtainedAt: Date.now() };
      }
      return next;
    });
  }, []);

  const addXp = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBonusXp((prev) => prev + Math.round(amount));
  }, []);

  const buyStreakFreeze = useCallback((): { ok: boolean; error?: string } => {
    if (points < STREAK_FREEZE_PRICE) {
      return {
        ok: false,
        error: `포인트가 부족합니다. (필요: ${STREAK_FREEZE_PRICE.toLocaleString()}P / 보유: ${points.toLocaleString()}P)`,
      };
    }
    setPoints((prev) => Math.max(0, prev - STREAK_FREEZE_PRICE));
    setStreakFreezeCount((prev) => prev + 1);
    return { ok: true };
  }, [points]);

  const totalXp = useMemo(
    () => computeStudyXpFromSessions(sessions) + bonusXp,
    [bonusXp, sessions]
  );

  const growthStage = useMemo(() => getGrowthStageProgress(totalXp), [totalXp]);

  const attendanceSummary = useMemo(
    () => getAttendanceSummary(sessions, protectedDates),
    [protectedDates, sessions]
  );

  return {
    subjects,
    sessions,
    settings,
    timer,
    points,
    inventory,
    equippedItemId,
    totalDraws,
    equippedTitleId,
    totalQuizAnswered,
    unlockedAchievementIds,
    totalXp,
    growthStage,
    streakFreezeCount,
    protectedDates,
    attendanceSummary,
    attendanceNotice,
    dismissAttendanceNotice: () => setAttendanceNotice(null),
    elapsedMs,
    pomodoroTargetMs,
    pomodoroNotice,
    dismissPomodoroNotice: () => setPomodoroNotice(null),
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerMode,
    setPomodoroPhase,
    setTimerSubject,
    setTimerMemo,
    completeAndSaveTimer,
    addManualSession,
    updateSession,
    deleteSession,
    addSubject,
    updateSubject,
    deleteSubject,
    updateSettings,
    exportBackupJSON,
    exportCSV,
    importBackupJSON,
    clearAllSessions,
    addPoints,
    addXp,
    buyStreakFreeze,
    equipItem,
    equipTitle,
    recordQuizAnswered,
    drawGacha,
    synthesizeTranscendent,
    devUnlockTitles,
    devGrantMythicRelics,
  };
}
