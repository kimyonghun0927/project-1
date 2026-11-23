import React, { useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { StudySession, StudySettings, Subject } from '../types/study';
import {
  SUBJECT_COLORS,
  computeStreakDays,
  formatDurationKorean,
  formatHoursCompact,
  getCurrentWeekDateKeys,
  getLocalDateKey,
} from '../utils/time';

interface StatsViewProps {
  sessions: StudySession[];
  subjects: Subject[];
  settings: StudySettings;
  protectedDates: string[];
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (raw: string) => { ok: boolean; message: string };
  onClearAllSessions: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  sessions,
  subjects,
  settings,
  protectedDates,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onClearAllSessions,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const todayKey = getLocalDateKey();
  const weekDays = useMemo(() => getCurrentWeekDateKeys(), []);

  const stats = useMemo(() => {
    const totalAllSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const todaySeconds = sessions
      .filter((s) => s.dateKey === todayKey)
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    const weekMap = new Map<string, number>();
    weekDays.forEach((d) => weekMap.set(d.dateKey, 0));
    sessions.forEach((s) => {
      if (weekMap.has(s.dateKey)) {
        weekMap.set(s.dateKey, (weekMap.get(s.dateKey) || 0) + s.durationSeconds);
      }
    });

    const weekSeries = weekDays.map((d) => ({
      ...d,
      seconds: weekMap.get(d.dateKey) || 0,
      isToday: d.dateKey === todayKey,
    }));

    const weekTotalSeconds = weekSeries.reduce((acc, d) => acc + d.seconds, 0);
    const maxWeekDaySeconds = Math.max(
      settings.dailyGoalMinutes * 60,
      ...weekSeries.map((d) => d.seconds),
      3600
    );

    const longestSessionSeconds = sessions.reduce(
      (max, s) => Math.max(max, s.durationSeconds),
      0
    );
    const streakDays = computeStreakDays(sessions, protectedDates);

    // Subject breakdown across all sessions
    const subjTotals = new Map<string, { seconds: number; count: number }>();
    sessions.forEach((s) => {
      const prev = subjTotals.get(s.subjectId) || { seconds: 0, count: 0 };
      subjTotals.set(s.subjectId, {
        seconds: prev.seconds + s.durationSeconds,
        count: prev.count + 1,
      });
    });

    const subjectBreakdown = Array.from(subjTotals.entries())
      .map(([subjectId, data]) => ({
        subject: subjects.find((subj) => subj.id === subjectId),
        subjectId,
        seconds: data.seconds,
        count: data.count,
        share: totalAllSeconds > 0 ? Math.round((data.seconds / totalAllSeconds) * 100) : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    return {
      totalAllSeconds,
      todaySeconds,
      weekTotalSeconds,
      weekSeries,
      maxWeekDaySeconds,
      longestSessionSeconds,
      streakDays,
      subjectBreakdown,
    };
  }, [protectedDates, sessions, settings.dailyGoalMinutes, subjects, todayKey, weekDays]);

  const [selectedBarDate, setSelectedBarDate] = useState<string>(todayKey);
  const activeBar = stats.weekSeries.find((d) => d.dateKey === selectedBarDate) || stats.weekSeries[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = onImportJSON(reader.result);
        setImportFeedback({ ok: res.ok, text: res.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const goalLinePercent = Math.min(
    100,
    Math.round(((settings.dailyGoalMinutes * 60) / stats.maxWeekDaySeconds) * 100)
  );

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Summary Row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">이번 주 누적</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums sm:text-2xl dark:text-white">
            {formatDurationKorean(stats.weekTotalSeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">전체 누적</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums sm:text-2xl dark:text-white">
            {formatDurationKorean(stats.totalAllSeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            연속 출석 (1시간/일)
          </p>
          <p className="mt-1.5 font-mono text-xl font-bold text-indigo-600 tabular-nums sm:text-2xl dark:text-indigo-400">
            {stats.streakDays}일
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">최장 집중 세션</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums sm:text-2xl dark:text-white">
            {stats.longestSessionSeconds > 0
              ? formatDurationKorean(stats.longestSessionSeconds)
              : '0분'}
          </p>
        </div>
      </section>

      {/* Weekly Chart & Subject Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Bar Chart */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                주간 공부 흐름 (월–일)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {activeBar.label}요일 ({activeBar.dateKey}) ·{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDurationKorean(activeBar.seconds)}
                </span>
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
              점선: 일일 목표 ({formatDurationKorean(settings.dailyGoalMinutes * 60)})
            </span>
          </div>

          <div className="relative mt-8 h-52 select-none">
            {/* Goal reference line */}
            <div
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-indigo-400/70 dark:border-indigo-500/60"
              style={{ bottom: `${goalLinePercent}%` }}
            />

            <div className="grid h-full grid-cols-7 items-end gap-2 sm:gap-4">
              {stats.weekSeries.map((day) => {
                const heightPct = Math.round((day.seconds / stats.maxWeekDaySeconds) * 100);
                const selected = day.dateKey === activeBar.dateKey;
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => setSelectedBarDate(day.dateKey)}
                    className="group flex h-full flex-col items-center justify-end focus:outline-none"
                  >
                    <span className="mb-1.5 font-mono text-[11px] font-medium text-slate-500 tabular-nums dark:text-slate-400">
                      {day.seconds > 0 ? formatHoursCompact(day.seconds) : ''}
                    </span>
                    <div className="flex h-[78%] w-full max-w-[36px] items-end justify-center rounded-t-lg bg-slate-100/70 dark:bg-slate-800/60">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          selected
                            ? 'bg-indigo-600 dark:bg-indigo-400'
                            : day.isToday
                              ? 'bg-indigo-500/80 dark:bg-indigo-500'
                              : 'bg-slate-400/80 group-hover:bg-indigo-400 dark:bg-slate-600 dark:group-hover:bg-indigo-500'
                        }`}
                        style={{
                          height: `${day.seconds > 0 ? Math.max(6, heightPct) : 0}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        selected
                          ? 'font-bold text-indigo-600 dark:text-indigo-400'
                          : day.isToday
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Subject Breakdown */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            과목별 누적 비중
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            전체 {sessions.length}개 세션 기준
          </p>

          {stats.subjectBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              아직 기록된 공부 세션이 없습니다.
            </div>
          ) : (
            <ul className="mt-5 space-y-4">
              {stats.subjectBreakdown.map(({ subject, subjectId, seconds, count, share }) => {
                const c = subject ? SUBJECT_COLORS[subject.color] : SUBJECT_COLORS.indigo;
                return (
                  <li key={subjectId}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                        <span className="truncate font-semibold text-slate-900 dark:text-white">
                          {subject?.name || '삭제된 과목'}
                        </span>
                        <span className="text-xs text-slate-400 tabular-nums dark:text-slate-500">
                          {count}회
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                        {formatDurationKorean(seconds)} · {share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${c.bar}`}
                        style={{ width: `${Math.max(4, share)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Data Backup & Export */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              데이터 백업 및 내보내기
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              모든 기록은 현재 기기에 자동 저장됩니다. JSON 백업을 통해 모바일과 PC 간 데이터를 옮길 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportCSV}
              disabled={sessions.length === 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              CSV 내보내기
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              백업 저장 (JSON)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 whitespace-nowrap dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              백업 불러오기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {importFeedback && (
          <p
            className={`mt-3 text-xs font-medium ${
              importFeedback.ok
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {importFeedback.text}
          </p>
        )}

        {sessions.length > 0 && (
          <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[40px] text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
              >
                모든 공부 기록 초기화
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  정말 모든 기록을 삭제할까요?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllSessions();
                    setConfirmClear(false);
                  }}
                  className="min-h-[36px] rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  삭제 확인
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[36px] rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
