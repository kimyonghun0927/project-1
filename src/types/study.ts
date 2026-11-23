export type TimerMode = 'stopwatch' | 'pomodoro';

export type PomodoroPhase = 'focus' | 'break';

export type TabId = 'timer' | 'quiz' | 'coach' | 'shop' | 'collection' | 'titles' | 'log';

export type SubjectColorId = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

export interface Subject {
  id: string;
  name: string;
  color: SubjectColorId;
  createdAt: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  dateKey: string; // YYYY-MM-DD in local time
  startTime: number; // epoch ms
  endTime: number; // epoch ms
  durationSeconds: number;
  mode: TimerMode | 'manual';
  memo: string;
}

export interface ActiveTimerState {
  mode: TimerMode;
  pomodoroPhase: PomodoroPhase;
  subjectId: string;
  memo: string;
  isRunning: boolean;
  startedAtMs: number | null; // epoch ms when current running interval began
  accumulatedMs: number; // ms accumulated prior to current running interval
}

export interface StudySettings {
  dailyGoalMinutes: number;
  pomodoroFocusMinutes: number;
  pomodoroBreakMinutes: number;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
}
