import React, { useMemo } from 'react';
import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react';
import { StudySession, StudySettings, Subject } from '../types/study';
import {
  SUBJECT_COLORS,
  formatDurationKorean,
  formatKoreanDateFull,
  formatTimeOfDay,
  getLocalDateKey,
  getRecentDateKeys,
} from '../utils/time';

interface LogViewProps {
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  sessions: StudySession[];
  subjects: Subject[];
  settings: StudySettings;
  onOpenNewModal: () => void;
  onEditSession: (session: StudySession) => void;
  onDeleteSession: (id: string) => void;
}

export const LogView: React.FC<LogViewProps> = ({
  selectedDateKey,
  onSelectDateKey,
  sessions,
  subjects,
  settings,
  onOpenNewModal,
  onEditSession,
  onDeleteSession,
}) => {
  const todayKey = getLocalDateKey();
  const dateChips = useMemo(() => getRecentDateKeys(selectedDateKey, 9, 4), [selectedDateKey]);

  // Quick lookup for days that have records
  const activeDatesSet = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => set.add(s.dateKey));
    return set;
  }, [sessions]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => s.dateKey === selectedDateKey)
      .sort((a, b) => b.startTime - a.startTime);
  }, [selectedDateKey, sessions]);

  const totalSeconds = useMemo(
    () => daySessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [daySessions]
  );

  const goalSeconds = settings.dailyGoalMinutes * 60;
  const progressPct = Math.min(100, Math.round((totalSeconds / Math.max(1, goalSeconds)) * 100));

  const subjectSummary = useMemo(() => {
    const map = new Map<string, number>();
    daySessions.forEach((s) => {
      map.set(s.subjectId, (map.get(s.subjectId) || 0) + s.durationSeconds);
    });
    return Array.from(map.entries())
      .map(([subjectId, seconds]) => ({
        subject: subjects.find((subj) => subj.id === subjectId),
        subjectId,
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [daySessions, subjects]);

  return (
    <div className="space-y-6">
      {/* Date Navigation & Horizontal Date Scroller */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatKoreanDateFull(selectedDateKey)}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              날짜를 선택해 공부 기록을 확인하고 편집하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedDateKey !== todayKey && (
              <button
                type="button"
                onClick={() => onSelectDateKey(todayKey)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                오늘로 이동
              </button>
            )}
            <label className="relative inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>날짜 선택</span>
              <input
                type="date"
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) onSelectDateKey(e.target.value);
                }}
                aria-label="날짜 직접 선택"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        {/* Horizontal Date Scroller */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {dateChips.map((item) => {
            const isSelected = item.dateKey === selectedDateKey;
            const hasRecords = activeDatesSet.has(item.dateKey);
            return (
              <button
                key={item.dateKey}
                type="button"
                onClick={() => onSelectDateKey(item.dateKey)}
                className={`flex min-h-[58px] min-w-[48px] flex-col items-center justify-center rounded-2xl border px-2.5 py-2 transition-colors shrink-0 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isSelected
                      ? 'text-indigo-100'
                      : item.isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.isToday ? '오늘' : item.weekday}
                </span>
                <span className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                  {item.dayNum}
                </span>
                <span
                  className={`mt-1 h-1 w-1 rounded-full ${
                    hasRecords
                      ? isSelected
                        ? 'bg-white'
                        : 'bg-indigo-500 dark:bg-indigo-400'
                      : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Day Overview & Records Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Summary */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">선택일 총 공부시간</p>
          <p className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
            {formatDurationKorean(totalSeconds)}
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums dark:text-slate-400">
              <span>목표 {formatDurationKorean(goalSeconds)}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{progressPct}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {subjectSummary.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">과목별 요약</p>
              <ul className="mt-3 space-y-2.5">
                {subjectSummary.map(({ subject, subjectId, seconds }) => {
                  const c = subject ? SUBJECT_COLORS[subject.color] : SUBJECT_COLORS.indigo;
                  const ratio = Math.round((seconds / Math.max(1, totalSeconds)) * 100);
                  return (
                    <li key={subjectId} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {subject?.name || '삭제된 과목'}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                        {formatDurationKorean(seconds)} ({ratio}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenNewModal}
            className="mt-6 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            이 날짜에 기록 추가
          </button>
        </section>

        {/* Sessions List */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              세션 목록 ({daySessions.length})
            </h3>
          </div>

          {daySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                이 날짜에 저장된 공부 기록이 없습니다
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                오른쪽 상단 또는 왼쪽 버튼을 눌러 수동으로 기록을 남길 수 있습니다.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {daySessions.map((sess) => {
                const subj = subjects.find((s) => s.id === sess.subjectId);
                const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.indigo;
                const modeLabel =
                  sess.mode === 'pomodoro'
                    ? '뽀모도로'
                    : sess.mode === 'manual'
                      ? '직접 입력'
                      : '스톱워치';

                return (
                  <li
                    key={sess.id}
                    className="flex min-h-[68px] items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {subj?.name || '삭제된 과목'}
                        </span>
                      </div>
                      <p className="mt-1 truncate pl-5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {formatTimeOfDay(sess.startTime)} – {formatTimeOfDay(sess.endTime)}
                        <span aria-hidden="true"> · </span>
                        {modeLabel}
                        {sess.memo ? ` · ${sess.memo}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <span className="mr-1 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                        {formatDurationKorean(sess.durationSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditSession(sess)}
                        aria-label="기록 수정"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(sess.id)}
                        aria-label="기록 삭제"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
