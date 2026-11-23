import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  DAILY_ATTENDANCE_TARGET_SECONDS,
  GROWTH_LEVELS,
  GrowthStageProgress,
} from '../data/growthLevels';
import {
  ActiveTimerState,
  PomodoroPhase,
  StudySession,
  StudySettings,
  Subject,
  TimerMode,
} from '../types/study';
import {
  AttendanceSummary,
  SUBJECT_COLORS,
  formatDurationKorean,
  formatTimeOfDay,
  formatTimerClock,
} from '../utils/time';
import { WeatherInfo, WeatherWidget } from './WeatherWidget';

interface TimerViewProps {
  subjects: Subject[];
  todaySessions: StudySession[];
  todayTotalSeconds: number;
  settings: StudySettings;
  timer: ActiveTimerState;
  elapsedMs: number;
  pomodoroTargetMs: number;
  pomodoroNotice: string | null;
  growthStage: GrowthStageProgress;
  attendanceSummary: AttendanceSummary;
  streakFreezeCount: number;
  onDismissNotice: () => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onCompleteAndSave: () => { saved: boolean; message: string };
  onSetMode: (mode: TimerMode) => void;
  onSetPhase: (phase: PomodoroPhase) => void;
  onSetSubject: (id: string) => void;
  onSetMemo: (memo: string) => void;
  onToggleSound: () => void;
  onOpenManualModal: () => void;
  onViewAllLogs: () => void;
  onGoToShop: () => void;
  onWeatherLoaded?: (weather: WeatherInfo) => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  subjects,
  todaySessions,
  todayTotalSeconds,
  settings,
  timer,
  elapsedMs,
  pomodoroTargetMs,
  pomodoroNotice,
  growthStage,
  attendanceSummary,
  streakFreezeCount,
  onDismissNotice,
  onStart,
  onPause,
  onReset,
  onCompleteAndSave,
  onSetMode,
  onSetPhase,
  onSetSubject,
  onSetMemo,
  onToggleSound,
  onOpenManualModal,
  onViewAllLogs,
  onGoToShop,
  onWeatherLoaded,
}) => {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  const activeSubject = subjects.find((s) => s.id === timer.subjectId) || subjects[0];
  const activeColor = activeSubject ? SUBJECT_COLORS[activeSubject.color] : SUBJECT_COLORS.indigo;

  const isPomodoro = timer.mode === 'pomodoro';
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingMs = Math.max(0, pomodoroTargetMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const displayClock = isPomodoro
    ? formatTimerClock(remainingSeconds)
    : formatTimerClock(elapsedSeconds);

  // Progress ratio for SVG ring
  const ringRadius = 110;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressRatio = isPomodoro
    ? Math.min(1, elapsedMs / Math.max(1, pomodoroTargetMs))
    : ((elapsedSeconds % 3600) / 3600);
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  const goalSeconds = settings.dailyGoalMinutes * 60;
  const dailyPercent = Math.min(100, Math.round((todayTotalSeconds / Math.max(1, goalSeconds)) * 100));
  const goalRadius = 38;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalDashoffset = goalCircumference * (1 - Math.min(1, todayTotalSeconds / Math.max(1, goalSeconds)));

  const handleSaveClick = () => {
    const res = onCompleteAndSave();
    setFeedback({ ok: res.saved, text: res.message });
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const hasElapsed = elapsedMs >= 1000;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
      {/* Left / Primary Focus Timer Surface */}
      <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-8 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
        {/* Top Timer Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="타이머 모드"
            className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={timer.mode === 'stopwatch'}
              onClick={() => onSetMode('stopwatch')}
              className={`min-h-[40px] rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                timer.mode === 'stopwatch'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              스톱워치
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={timer.mode === 'pomodoro'}
              onClick={() => onSetMode('pomodoro')}
              className={`min-h-[40px] rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                timer.mode === 'pomodoro'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              뽀모도로
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isPomodoro && (
              <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onSetPhase('focus')}
                  className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    timer.pomodoroPhase === 'focus'
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  집중 {settings.pomodoroFocusMinutes}분
                </button>
                <button
                  type="button"
                  onClick={() => onSetPhase('break')}
                  className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    timer.pomodoroPhase === 'break'
                      ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  휴식 {settings.pomodoroBreakMinutes}분
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={settings.soundEnabled ? '알림음 끄기' : '알림음 켜기'}
              title={settings.soundEnabled ? '알림음 켜짐' : '알림음 꺼짐'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Pomodoro Completion Notice */}
        {pomodoroNotice && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-200">
            <span>{pomodoroNotice}</span>
            <button
              type="button"
              onClick={onDismissNotice}
              className="shrink-0 text-xs font-semibold text-indigo-700 underline dark:text-indigo-300"
            >
              닫기
            </button>
          </div>
        )}

        {/* Subject Selector */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              공부 과목
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              탭하여 전환
            </span>
          </div>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {subjects.map((subj) => {
              const selected = subj.id === timer.subjectId;
              const c = SUBJECT_COLORS[subj.color];
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => onSetSubject(subj.id)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <span>{subj.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Circular Timer Display */}
        <div className="my-7 flex flex-col items-center justify-center sm:my-9">
          <div className="relative flex h-60 w-60 items-center justify-center sm:h-64 sm:w-64">
            <svg
              className="h-full w-full -rotate-90"
              viewBox="0 0 256 256"
              aria-hidden="true"
            >
              <circle
                cx="128"
                cy="128"
                r={ringRadius}
                fill="none"
                strokeWidth="10"
                className="stroke-slate-100 dark:stroke-slate-800"
              />
              <circle
                cx="128"
                cy="128"
                r={ringRadius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                className={`transition-[stroke-dashoffset] duration-300 ease-out ${
                  isPomodoro && timer.pomodoroPhase === 'break'
                    ? 'stroke-emerald-500 dark:stroke-emerald-400'
                    : activeColor.ring
                }`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className={`h-2 w-2 rounded-full ${activeColor.dot}`} />
                <span className="max-w-[140px] truncate">
                  {isPomodoro && timer.pomodoroPhase === 'break'
                    ? '휴식 시간'
                    : activeSubject?.name || '공부'}
                </span>
              </div>
              <div
                aria-live="off"
                className="mt-1.5 font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-5xl dark:text-white"
              >
                {displayClock}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {timer.isRunning
                  ? '집중 측정 중'
                  : hasElapsed
                    ? '일시정지됨'
                    : isPomodoro
                      ? `${timer.pomodoroPhase === 'focus' ? '집중' : '휴식'} 준비`
                      : '시작 버튼을 누르세요'}
              </div>
            </div>
          </div>

          {/* Session Memo */}
          <div className="mt-5 w-full max-w-sm">
            <input
              type="text"
              maxLength={80}
              value={timer.memo}
              onChange={(e) => onSetMemo(e.target.value)}
              placeholder="이번 공부 목표나 메모를 입력하세요 (선택)"
              aria-label="이번 공부 목표나 메모"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div
            role="status"
            className={`mb-4 rounded-xl px-4 py-2.5 text-center text-xs font-medium ${
              feedback.ok
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Ergonomic Primary Actions (Thumb-friendly >= 48px) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!timer.isRunning ? (
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-transform hover:bg-indigo-700 active:scale-[0.98] whitespace-nowrap sm:flex-none sm:min-w-[180px]"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              {hasElapsed ? '계속하기' : '공부 시작'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-sm transition-transform hover:bg-slate-800 active:scale-[0.98] whitespace-nowrap sm:flex-none sm:min-w-[160px] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
              일시정지
            </button>
          )}

          {hasElapsed && (
            <>
              <button
                type="button"
                onClick={handleSaveClick}
                className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 whitespace-nowrap sm:flex-none dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {isPomodoro && timer.pomodoroPhase === 'break'
                  ? '휴식 끝내기'
                  : '완료 및 저장'}
              </button>

              <button
                type="button"
                onClick={onReset}
                aria-label="타이머 초기화"
                title="초기화"
                className="inline-flex min-h-[50px] min-w-[50px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Right / Today Summary & Recent Sessions */}
      <aside className="flex flex-col gap-6 lg:col-span-5">
        {/* Today's Goal Progress Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                오늘의 누적 공부
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums sm:text-3xl dark:text-white">
                {formatDurationKorean(todayTotalSeconds)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                하루 목표 {formatDurationKorean(goalSeconds)} · 달성률 {dailyPercent}%
              </p>
            </div>

            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                <circle
                  cx="48"
                  cy="48"
                  r={goalRadius}
                  fill="none"
                  strokeWidth="8"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={goalRadius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={goalCircumference}
                  strokeDashoffset={goalDashoffset}
                  className="stroke-indigo-600 transition-[stroke-dashoffset] duration-300 dark:stroke-indigo-400"
                />
              </svg>
              <span className="absolute font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                {dailyPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* XP Growth Stage & Daily 1-Hour Attendance Streak Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          {/* Growth Stage Row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                나의 학습 등급 · 경험치
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${growthStage.current.badgeClasses}`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Lv.{growthStage.current.level} {growthStage.current.name}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">
                  {growthStage.totalXp.toLocaleString()} XP
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRoadmapOpen(true)}
              className="inline-flex min-h-[34px] shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              등급표
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${growthStage.current.barClasses}`}
                style={{ width: `${Math.max(3, growthStage.progressPercent)}%` }}
              />
            </div>
            <p className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
              <span>
                {growthStage.isMaxLevel
                  ? '최고 등급 [고3] 달성 완료!'
                  : `다음 [${growthStage.next?.name}]까지 ${growthStage.xpRemaining.toLocaleString()} XP`}
              </span>
              <span className="font-mono font-semibold">
                {Math.round(growthStage.progressPercent)}%
              </span>
            </p>
          </div>

          {/* Daily 1-Hour Attendance & Streak Row */}
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
                  <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  연속 출석 {attendanceSummary.streakDays}일
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    attendanceSummary.todayAttended
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {attendanceSummary.todayAttended ? '오늘 출석 완료' : '오늘 출석 진행 중'}
                </span>
              </div>

              <button
                type="button"
                onClick={onGoToShop}
                title="상점에서 출석 방어권 구매"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                방어권 {streakFreezeCount}개
              </button>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                <span>오늘 출석 기준 (1시간 이상 공부)</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(60, Math.floor(attendanceSummary.todaySeconds / 60))}분 / 60분
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    attendanceSummary.todayAttended ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (attendanceSummary.todaySeconds / DAILY_ATTENDANCE_TARGET_SECONDS) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* 7-day Attendance Stamp Strip */}
            <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
              {attendanceSummary.recent7Days.map((day) => (
                <div
                  key={day.dateKey}
                  title={`${day.dateKey}: ${formatDurationKorean(day.seconds)}`}
                  className={`flex flex-col items-center rounded-xl border py-1.5 ${
                    day.attended
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : day.protected
                        ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300'
                        : day.isToday
                          ? 'border-indigo-300 bg-indigo-50/50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                          : 'border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-medium">{day.weekday}</span>
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                    {day.attended ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : day.protected ? (
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      day.dayNum
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Weather Widget */}
        <WeatherWidget onWeatherLoaded={onWeatherLoaded} />

        {/* Today's Recent Sessions List */}
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              오늘의 기록 ({todaySessions.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenManualModal}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 whitespace-nowrap dark:text-indigo-400 dark:hover:bg-indigo-950/60"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                직접 추가
              </button>
              {todaySessions.length > 0 && (
                <button
                  type="button"
                  onClick={onViewAllLogs}
                  className="min-h-[36px] rounded-lg px-2 text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap dark:text-slate-400 dark:hover:text-white"
                >
                  전체 보기
                </button>
              )}
            </div>
          </div>

          {todaySessions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                오늘 기록된 공부가 아직 없습니다
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                타이머로 공부를 시작하거나 놓친 시간을 직접 추가해보세요.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {todaySessions.slice(0, 5).map((sess) => {
                const subj = subjects.find((s) => s.id === sess.subjectId);
                const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.indigo;
                const modeText =
                  sess.mode === 'pomodoro'
                    ? '뽀모도로'
                    : sess.mode === 'manual'
                      ? '직접 입력'
                      : '스톱워치';

                return (
                  <li
                    key={sess.id}
                    className="flex min-h-[60px] items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {subj?.name || '삭제된 과목'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate pl-4.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {formatTimeOfDay(sess.startTime)} – {formatTimeOfDay(sess.endTime)}
                        <span aria-hidden="true"> · </span>
                        {modeText}
                        {sess.memo ? ` · ${sess.memo}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                      {formatDurationKorean(sess.durationSeconds)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* 15-Tier Growth Level Roadmap Modal */}
      {roadmapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setRoadmapOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  성장 등급표 (아기 → 고3)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  공부 1분 +10 XP · 1시간 출석 +200 XP · 문제 풀이 +10~50 XP
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoadmapOpen(false)}
                aria-label="닫기"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {GROWTH_LEVELS.map((lvl) => {
                const isReached = growthStage.totalXp >= lvl.minXp;
                const isCurrent = growthStage.current.level === lvl.level;
                return (
                  <div
                    key={lvl.level}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/30 dark:border-indigo-400 dark:bg-indigo-950/50'
                        : isReached
                          ? 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/60'
                          : 'border-slate-100 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-bold ${lvl.badgeClasses}`}
                      >
                        Lv.{lvl.level}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{lvl.name}</span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          현재
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-slate-600 tabular-nums dark:text-slate-300">
                      {lvl.minXp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
