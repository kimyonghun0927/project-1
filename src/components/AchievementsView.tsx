import React, { useMemo, useState } from 'react';
import { Award, Check, Lock, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { RARITY_META } from '../data/gachaItems';
import { AchievementCategory, AchievementContext } from '../types/achievements';
import { OwnedItemEntry } from '../types/shop';
import { StudySession } from '../types/study';

interface AchievementsViewProps {
  sessions: StudySession[];
  inventory: Record<string, OwnedItemEntry>;
  totalDraws: number;
  totalQuizAnswered: number;
  unlockedAchievementIds: string[];
  equippedTitleId: string | null;
  onEquipTitle: (titleId: string | null) => void;
}

const CATEGORY_FILTERS: { id: 'all' | AchievementCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'study', label: '공부 · 습관' },
  { id: 'quiz', label: '문제 풀이' },
  { id: 'gacha', label: '뽑기 · 문구' },
];

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  sessions,
  inventory,
  totalDraws,
  totalQuizAnswered,
  unlockedAchievementIds,
  equippedTitleId,
  onEquipTitle,
}) => {
  const [filter, setFilter] = useState<'all' | AchievementCategory>('all');

  const totalStudySeconds = useMemo(
    () => sessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [sessions]
  );

  const context: AchievementContext = useMemo(
    () => ({
      sessions,
      totalStudySeconds,
      inventory,
      totalDraws,
      totalQuizAnswered,
    }),
    [inventory, sessions, totalDraws, totalQuizAnswered, totalStudySeconds]
  );

  const evaluated = useMemo(
    () =>
      ACHIEVEMENTS.map((ach) => {
        const rawStatus = ach.evaluate(context);
        const isUnlocked = rawStatus.unlocked || unlockedAchievementIds.includes(ach.id);
        return {
          ach,
          status: {
            ...rawStatus,
            unlocked: isUnlocked,
            progressPercent: isUnlocked ? 100 : rawStatus.progressPercent,
            progressText: isUnlocked && !rawStatus.unlocked ? '달성 완료' : rawStatus.progressText,
          },
        };
      }),
    [context, unlockedAchievementIds]
  );

  const unlockedCount = useMemo(
    () => evaluated.filter((item) => item.status.unlocked).length,
    [evaluated]
  );

  const equippedEntry = useMemo(
    () => evaluated.find((item) => item.ach.id === equippedTitleId && item.status.unlocked) || null,
    [equippedTitleId, evaluated]
  );

  const filteredList = useMemo(() => {
    if (filter === 'all') return evaluated;
    return evaluated.filter((item) => item.ach.category === filter);
  }, [evaluated, filter]);

  return (
    <div className="space-y-5">
      {/* Currently Equipped Title Banner */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              업적 & 칭호
            </h1>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
            달성 {unlockedCount} / {ACHIEVEMENTS.length}
          </span>
        </div>

        {equippedEntry ? (
          <div
            className={`mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              RARITY_META[equippedEntry.ach.rarity].borderColor
            } ${RARITY_META[equippedEntry.ach.rarity].surfaceBg}`}
          >
            <div>
              <span
                className={`text-xs font-bold ${RARITY_META[equippedEntry.ach.rarity].textColor}`}
              >
                착용 중인 칭호 · {RARITY_META[equippedEntry.ach.rarity].label} 등급
              </span>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                [{equippedEntry.ach.titleName}]
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                착용 효과: {equippedEntry.ach.funnyEffect}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEquipTitle(null)}
              className="min-h-[40px] shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              칭호 해제
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              현재 착용 중인 칭호가 없습니다
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              공부 기록이나 문구 뽑기·합성 조건을 달성해 특별한 칭호와 소소한 효과를 얻어보세요.
            </p>
          </div>
        )}
      </section>

      {/* Achievement List & Filter */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
          {CATEGORY_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredList.map(({ ach, status }) => {
            const meta = RARITY_META[ach.rarity];
            const isEquipped = equippedTitleId === ach.id && status.unlocked;

            return (
              <div
                key={ach.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  status.unlocked
                    ? `${meta.borderColor} ${meta.surfaceBg}`
                    : 'border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${meta.textColor}`}>
                      {meta.label} 등급 칭호
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {status.progressText}
                    </span>
                  </div>

                  {/* Masked ??? when locked, revealed titleName when unlocked */}
                  <div className="mt-2 flex items-center gap-2">
                    {!status.unlocked && (
                      <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                    <h3
                      className={`text-base font-bold ${
                        status.unlocked
                          ? 'text-slate-900 dark:text-white'
                          : 'tracking-wider text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {status.unlocked ? ach.titleName : '???'}
                    </h3>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                    획득 조건: {ach.conditionText}
                  </p>

                  {!status.unlocked ? (
                    <div className="mt-2.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${status.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 dark:bg-slate-900/60 dark:text-amber-200">
                      착용 효과: {ach.funnyEffect}
                    </p>
                  )}
                </div>

                {status.unlocked && (
                  <button
                    type="button"
                    onClick={() => onEquipTitle(isEquipped ? null : ach.id)}
                    className={`mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                      isEquipped
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {isEquipped ? '착용 중 (클릭 시 해제)' : '칭호 착용하기'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
