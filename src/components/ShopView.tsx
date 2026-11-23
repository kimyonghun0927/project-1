import React, { useMemo, useState } from 'react';
import { ArrowRight, Award, BookOpen, Flame, Package, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import {
  DRAW_COST_FIVE,
  DRAW_COST_SINGLE,
  DRAW_POOL_RARITIES,
  GACHA_ITEMS,
  MYTHIC_RELIC_IDS,
  PITY_LEGENDARY_INTERVAL,
  PITY_MYTHIC_INTERVAL,
  RARITY_META,
  TRANSCENDENT_ITEM,
} from '../data/gachaItems';
import { STREAK_FREEZE_PRICE } from '../data/growthLevels';
import { GachaDrawResult, OwnedItemEntry } from '../types/shop';
import { StudySession } from '../types/study';
import { GachaCutsceneModal } from './GachaCutsceneModal';
import { StationeryArt } from './StationeryArt';

interface ShopViewProps {
  points: number;
  totalDraws: number;
  inventory: Record<string, OwnedItemEntry>;
  equippedItemId: string | null;
  equippedTitleId: string | null;
  unlockedAchievementIds: string[];
  sessions: StudySession[];
  totalQuizAnswered: number;
  streakFreezeCount: number;
  streakDays: number;
  todayAttended: boolean;
  soundEnabled: boolean;
  onDrawGacha: (times: 1 | 5) => {
    ok: boolean;
    results: GachaDrawResult[];
    totalRefund: number;
    error?: string;
  };
  onBuyStreakFreeze: () => {
    ok: boolean;
    error?: string;
  };
  onSynthesizeTranscendent: () => {
    ok: boolean;
    result?: GachaDrawResult;
    error?: string;
  };
  onEquipItem: (itemId: string | null) => void;
  onGoToQuiz: () => void;
  onGoToCollection: () => void;
  onGoToTitles: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  points,
  totalDraws,
  inventory,
  equippedItemId,
  equippedTitleId,
  unlockedAchievementIds,
  sessions,
  totalQuizAnswered,
  streakFreezeCount,
  streakDays,
  todayAttended,
  soundEnabled,
  onDrawGacha,
  onBuyStreakFreeze,
  onSynthesizeTranscendent,
  onEquipItem,
  onGoToQuiz,
  onGoToCollection,
  onGoToTitles,
}) => {
  const [drawResults, setDrawResults] = useState<GachaDrawResult[] | null>(null);
  const [drawStage, setDrawStage] = useState<'roulette' | 'cutscene'>('roulette');
  const [drawRefund, setDrawRefund] = useState<number>(0);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [freezeFeedback, setFreezeFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const ownedCount = useMemo(
    () => GACHA_ITEMS.filter((item) => (inventory[item.id]?.count || 0) > 0).length,
    [inventory]
  );

  const equippedItem = useMemo(
    () => GACHA_ITEMS.find((item) => item.id === equippedItemId) || null,
    [equippedItemId]
  );

  const mythicRelics = useMemo(
    () =>
      MYTHIC_RELIC_IDS.map((id) => {
        const item = GACHA_ITEMS.find((g) => g.id === id)!;
        const count = inventory[id]?.count || 0;
        return { item, count, ready: count >= 1 };
      }),
    [inventory]
  );

  const readyMythicCount = useMemo(
    () => mythicRelics.filter((r) => r.ready).length,
    [mythicRelics]
  );

  const canSynthesize = readyMythicCount === MYTHIC_RELIC_IDS.length;

  const equippedTitle = useMemo(() => {
    if (!equippedTitleId) return null;
    const ach = ACHIEVEMENTS.find((a) => a.id === equippedTitleId);
    if (!ach) return null;
    if (unlockedAchievementIds.includes(ach.id)) return ach;
    const totalStudySeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const status = ach.evaluate({
      sessions,
      totalStudySeconds,
      inventory,
      totalDraws,
      totalQuizAnswered,
    });
    return status.unlocked ? ach : null;
  }, [
    equippedTitleId,
    inventory,
    sessions,
    totalDraws,
    totalQuizAnswered,
    unlockedAchievementIds,
  ]);

  const handleDraw = (times: 1 | 5) => {
    setDrawError(null);
    setSynthesisError(null);
    const res = onDrawGacha(times);
    if (!res.ok) {
      setDrawError(res.error || '포인트가 부족합니다.');
      return;
    }
    setDrawRefund(res.totalRefund);
    setDrawStage('roulette');
    setDrawResults(res.results);
  };

  const handleSynthesize = () => {
    setSynthesisError(null);
    const res = onSynthesizeTranscendent();
    if (!res.ok || !res.result) {
      setSynthesisError(res.error || '합성 조건을 충족하지 못했습니다.');
      return;
    }
    setDrawRefund(0);
    setDrawStage('cutscene');
    setDrawResults([res.result]);
  };

  const handleBuyFreeze = () => {
    const res = onBuyStreakFreeze();
    if (!res.ok) {
      setFreezeFeedback({ ok: false, text: res.error || '포인트가 부족합니다.' });
      return;
    }
    setFreezeFeedback({
      ok: true,
      text: `출석 방어권을 구매했습니다! (현재 보유 ${streakFreezeCount + 1}개)`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Row: Points Balance & Gacha Machine */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Gacha Draw Machine Card */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  포인트 문구 상점
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  문제를 풀고 모은 포인트로 샤프, 지우개, 만년필 등 특별한 공부 문구를 뽑아보세요.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  보유 포인트
                </span>
                <p className="font-mono text-2xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                  {points.toLocaleString()} P
                </p>
              </div>
            </div>

            {/* Rarity Drop Table */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  뽑기 등급별 출현 확률
                </span>
                <span className="font-medium text-cyan-700 dark:text-cyan-300">
                  초월 등급은 신화 4종 합성으로만 획득
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center sm:grid-cols-6">
                {DRAW_POOL_RARITIES.map((rarity) => {
                  const meta = RARITY_META[rarity];
                  return (
                    <div
                      key={rarity}
                      className={`rounded-xl border px-1.5 py-2 ${meta.borderColor} ${meta.surfaceBg}`}
                    >
                      <p className={`text-[11px] font-bold ${meta.textColor}`}>{meta.label}</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                        {meta.ratePercent}%
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pity & Total Draws Counter */}
              <div className="mt-4 space-y-2.5 border-t border-slate-200/80 pt-3.5 dark:border-slate-700/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    누적 뽑기 · 확정 천장
                  </span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums dark:text-white">
                    총 {totalDraws.toLocaleString()}회 뽑기
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* 100-draw Legendary Pity */}
                  <div className="rounded-xl border border-amber-200/80 bg-white/80 p-2.5 dark:border-amber-800/60 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        100회 확정 레전더리
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                        {PITY_LEGENDARY_INTERVAL - (totalDraws % PITY_LEGENDARY_INTERVAL)}회 남음
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{
                          width: `${((totalDraws % PITY_LEGENDARY_INTERVAL) / PITY_LEGENDARY_INTERVAL) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 500-draw Mythic Pity */}
                  <div className="rounded-xl border border-fuchsia-200/80 bg-white/80 p-2.5 dark:border-fuchsia-800/60 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-fuchsia-700 dark:text-fuchsia-300">
                        500회 확정 신화
                      </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                        {PITY_MYTHIC_INTERVAL - (totalDraws % PITY_MYTHIC_INTERVAL)}회 남음
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fuchsia-100 dark:bg-fuchsia-950">
                      <div
                        className="h-full rounded-full bg-fuchsia-500 transition-all duration-300"
                        style={{
                          width: `${((totalDraws % PITY_MYTHIC_INTERVAL) / PITY_MYTHIC_INTERVAL) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {drawError && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            >
              <span>{drawError}</span>
              <button
                type="button"
                onClick={onGoToQuiz}
                className="inline-flex items-center gap-1 font-bold text-indigo-700 underline dark:text-indigo-300"
              >
                문제 풀러 가기 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Draw CTA Buttons */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleDraw(1)}
              className="flex min-h-[54px] items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-left transition-colors hover:bg-indigo-100 active:scale-[0.99] dark:border-indigo-800 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60"
            >
              <div>
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">1회 뽑기</p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-300">문구 1종 랜덤 획득</p>
              </div>
              <span className="font-mono text-sm font-bold text-indigo-700 tabular-nums dark:text-indigo-200">
                {DRAW_COST_SINGLE} P
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDraw(5)}
              className="flex min-h-[54px] items-center justify-between rounded-xl bg-indigo-600 px-5 py-3 text-left text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.99]"
            >
              <div>
                <p className="text-sm font-bold">5연속 뽑기</p>
                <p className="text-[11px] text-indigo-100">10% 포인트 할인 혜택</p>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums">
                {DRAW_COST_FIVE} P
              </span>
            </button>
          </div>
        </section>

        {/* Equipped Representative Stationery & Quick Links */}
        <aside className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              나의 대표 문구
            </h2>
            <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
              도감 {ownedCount} / {GACHA_ITEMS.length}
            </span>
          </div>

          {equippedItem ? (
            <div
              className={`my-4 flex flex-1 flex-col items-center justify-center rounded-2xl border p-5 text-center ${
                RARITY_META[equippedItem.rarity].borderColor
              } ${RARITY_META[equippedItem.rarity].surfaceBg}`}
            >
              <span
                className={`text-xs font-bold ${RARITY_META[equippedItem.rarity].textColor}`}
              >
                {RARITY_META[equippedItem.rarity].label} 등급 · 보유 ×
                {inventory[equippedItem.id]?.count || 1}
              </span>
              <StationeryArt
                itemId={equippedItem.id}
                category={equippedItem.category}
                rarity={equippedItem.rarity}
                className="my-3 h-20 w-20"
              />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {equippedItem.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {equippedItem.description}
              </p>
            </div>
          ) : (
            <div className="my-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
              <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                아직 장착한 대표 문구가 없습니다
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                문구를 뽑아 내 책상 위의 대표 문구로 설정해보세요.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {equippedTitle && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-700/80 dark:bg-slate-800/70">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold ${RARITY_META[equippedTitle.rarity].textColor}`}>
                    칭호: [{equippedTitle.titleName}]
                  </span>
                  <button
                    type="button"
                    onClick={onGoToTitles}
                    className="font-semibold text-indigo-600 underline dark:text-indigo-400"
                  >
                    변경
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  효과: {equippedTitle.funnyEffect}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onGoToQuiz}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Award className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                문제 풀기
              </button>
              <button
                type="button"
                onClick={onGoToCollection}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <BookOpen className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                도감 보기
              </button>
              <button
                type="button"
                onClick={onGoToTitles}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                칭호 보기
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Special Item Store: 출석 방어권 (5,000 P) */}
      <section className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-emerald-900/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  출석 방어권
                </h2>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800 tabular-nums dark:bg-emerald-900/60 dark:text-emerald-200">
                  보유 {streakFreezeCount}개
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  연속 {streakDays}일 출석 중 {todayAttended ? '(오늘 완료)' : ''}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                하루 1시간 이상 공부하지 못한 날이 생겨도 연속 출석 기록이 초기화되지 않도록
                자동으로 1회 방어해줍니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBuyFreeze}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 active:scale-[0.99] whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>출석 방어권 구매 · {STREAK_FREEZE_PRICE.toLocaleString()} P</span>
          </button>
        </div>

        {freezeFeedback && (
          <div
            role={freezeFeedback.ok ? 'status' : 'alert'}
            className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${
              freezeFeedback.ok
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
            }`}
          >
            <span>{freezeFeedback.text}</span>
            {!freezeFeedback.ok && (
              <button
                type="button"
                onClick={onGoToQuiz}
                className="inline-flex items-center gap-1 font-bold text-indigo-700 underline dark:text-indigo-300"
              >
                문제 풀러 가기 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Transcendent Synthesis Forge (4 Mythic Relics -> Smart Glasses) */}
      <section className="rounded-2xl border border-cyan-300/80 bg-gradient-to-br from-cyan-50/80 via-white to-fuchsia-50/70 p-5 shadow-xs sm:p-6 dark:border-cyan-800/70 dark:from-cyan-950/40 dark:via-slate-900 dark:to-fuchsia-950/30">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-200/70 pb-4 dark:border-cyan-900/60">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                초월 성물 합성소
              </h2>
              <span className="rounded-md bg-cyan-100 px-2 py-0.5 text-[11px] font-bold text-cyan-800 dark:bg-cyan-900/70 dark:text-cyan-200">
                초월 등급
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              네 개의 신화 등급 성물을 모두 모아 하나로 합성하면 초월 등급 [{TRANSCENDENT_ITEM.name}]을
              획득합니다. (각 1개씩 소모)
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-700 tabular-nums dark:text-cyan-300">
            재료 준비 {readyMythicCount} / 4
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          {/* 4 Mythic Ingredients */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:col-span-8">
            {mythicRelics.map(({ item, count, ready }) => (
              <div
                key={item.id}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition-colors ${
                  ready
                    ? 'border-fuchsia-300 bg-white/90 dark:border-fuchsia-700 dark:bg-slate-900/80'
                    : 'border-slate-200/80 bg-slate-50/70 opacity-65 dark:border-slate-800 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[11px] font-bold">
                  <span className="text-fuchsia-700 dark:text-fuchsia-300">신화</span>
                  <span
                    className={`font-mono tabular-nums ${
                      ready
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {ready ? `보유 ×${count}` : '미보유'}
                  </span>
                </div>
                <div className={`my-2 ${!ready ? 'grayscale opacity-45' : ''}`}>
                  <StationeryArt
                    itemId={item.id}
                    category={item.category}
                    rarity={item.rarity}
                    className="h-12 w-12"
                  />
                </div>
                <p className="line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {item.name}
                </p>
              </div>
            ))}
          </div>

          {/* Target Output & Synthesize CTA */}
          <div className="flex flex-col justify-between rounded-2xl border border-cyan-300 bg-white/90 p-4 text-center lg:col-span-4 dark:border-cyan-700/80 dark:bg-slate-900/90">
            <div className="flex items-center justify-center gap-3 text-left">
              <StationeryArt
                itemId={TRANSCENDENT_ITEM.id}
                category={TRANSCENDENT_ITEM.category}
                rarity={TRANSCENDENT_ITEM.rarity}
                className="h-14 w-14 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                  초월 등급 · 보유 ×{inventory[TRANSCENDENT_ITEM.id]?.count || 0}
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {TRANSCENDENT_ITEM.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                  지구의 대격변을 넘어 탄생하는 궁극의 시야
                </p>
              </div>
            </div>

            {synthesisError && (
              <p role="alert" className="mt-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {synthesisError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSynthesize}
              disabled={!canSynthesize}
              className="mt-3.5 inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {canSynthesize
                ? '신화 4종 합성 → 스마트 안경 획득'
                : `신화 성물 ${4 - readyMythicCount}종 더 필요`}
            </button>
          </div>
        </div>
      </section>

      {/* Gacha Cutscene & Reveal Modal */}
      <GachaCutsceneModal
        results={drawResults}
        totalRefund={drawRefund}
        soundEnabled={soundEnabled}
        initialStage={drawStage}
        onClose={() => setDrawResults(null)}
        onEquipItem={onEquipItem}
        equippedItemId={equippedItemId}
      />
    </div>
  );
};
