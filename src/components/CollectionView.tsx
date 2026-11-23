import React, { useMemo, useState } from 'react';
import { Award, BookOpen, Check, Package, ShoppingBag, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { GACHA_ITEMS, RARITY_META, RARITY_ORDER } from '../data/gachaItems';
import { GachaItem, ItemRarity, OwnedItemEntry } from '../types/shop';
import { StudySession } from '../types/study';
import { StationeryArt } from './StationeryArt';

interface CollectionViewProps {
  inventory: Record<string, OwnedItemEntry>;
  equippedItemId: string | null;
  equippedTitleId: string | null;
  unlockedAchievementIds: string[];
  sessions: StudySession[];
  totalDraws: number;
  totalQuizAnswered: number;
  onEquipItem: (itemId: string | null) => void;
  onGoToShop: () => void;
  onGoToTitles: () => void;
}

export const CollectionView: React.FC<CollectionViewProps> = ({
  inventory,
  equippedItemId,
  equippedTitleId,
  unlockedAchievementIds,
  sessions,
  totalDraws,
  totalQuizAnswered,
  onEquipItem,
  onGoToShop,
  onGoToTitles,
}) => {
  const [rarityFilter, setRarityFilter] = useState<ItemRarity | 'all'>('all');
  const [inspectedItem, setInspectedItem] = useState<GachaItem | null>(null);

  const ownedCount = useMemo(
    () => GACHA_ITEMS.filter((item) => (inventory[item.id]?.count || 0) > 0).length,
    [inventory]
  );

  const equippedItem = useMemo(
    () => GACHA_ITEMS.find((item) => item.id === equippedItemId) || null,
    [equippedItemId]
  );

  const filteredItems = useMemo(() => {
    if (rarityFilter === 'all') return GACHA_ITEMS;
    return GACHA_ITEMS.filter((item) => item.rarity === rarityFilter);
  }, [rarityFilter]);

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

  return (
    <div className="space-y-6">
      {/* Top Equipped Showcase Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              아이템 도감 & 나의 대표 문구
            </h1>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
            수집 {ownedCount} / {GACHA_ITEMS.length}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
          {/* Equipped Item Preview */}
          <div className="md:col-span-7">
            {equippedItem ? (
              <div
                className={`flex flex-col items-center gap-4 rounded-2xl border p-4 text-center sm:flex-row sm:text-left ${
                  RARITY_META[equippedItem.rarity].borderColor
                } ${RARITY_META[equippedItem.rarity].surfaceBg}`}
              >
                <div className="shrink-0">
                  <StationeryArt
                    itemId={equippedItem.id}
                    category={equippedItem.category}
                    rarity={equippedItem.rarity}
                    className="h-20 w-20"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold ${RARITY_META[equippedItem.rarity].textColor}`}
                  >
                    {RARITY_META[equippedItem.rarity].label} 등급 · 보유 ×
                    {inventory[equippedItem.id]?.count || 1}
                  </span>
                  <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                    {equippedItem.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {equippedItem.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  아직 장착한 대표 문구가 없습니다
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  상점에서 문구를 뽑거나 신화 4종을 합성해 대표 문구로 장착해보세요.
                </p>
              </div>
            )}
          </div>

          {/* Equipped Title + Quick Links */}
          <div className="flex flex-col justify-between gap-3 md:col-span-5">
            {equippedTitle ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700/80 dark:bg-slate-800/70">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold ${RARITY_META[equippedTitle.rarity].textColor}`}>
                    장착 칭호: [{equippedTitle.titleName}]
                  </span>
                  <button
                    type="button"
                    onClick={onGoToTitles}
                    className="font-semibold text-indigo-600 underline dark:text-indigo-400"
                  >
                    칭호 변경
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  효과: {equippedTitle.funnyEffect}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700/80 dark:bg-slate-800/70">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  착용 중인 칭호 없음
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  칭호 탭에서 업적을 달성하고 개성 있는 칭호를 착용해보세요.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onGoToShop}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap"
              >
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                상점 · 합성소
              </button>
              <button
                type="button"
                onClick={onGoToTitles}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Award className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                칭호 관리
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Collection Grid */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              내 필통 & 문구 도감
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              초월 → 신화 → 레전더리 → 에픽 → 레어 → 일반 → 쓰레기 순으로 정렬되어 있습니다.
            </p>
          </div>

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setRarityFilter('all')}
              className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                rarityFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              전체
            </button>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRarityFilter(r)}
                className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  rarityFilter === r
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {RARITY_META[r].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredItems.map((item) => {
            const owned = inventory[item.id];
            const isOwned = !!owned && owned.count > 0;
            const meta = RARITY_META[item.rarity];
            const isEquipped = equippedItemId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => isOwned && setInspectedItem(item)}
                disabled={!isOwned}
                className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-transform ${
                  isOwned
                    ? `${meta.borderColor} ${meta.surfaceBg} hover:scale-[1.02]`
                    : 'border-slate-200/70 bg-slate-50/50 opacity-50 dark:border-slate-800 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[11px] font-bold">
                  <span className={meta.textColor}>{meta.label}</span>
                  {isOwned && (
                    <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
                      ×{owned.count}
                    </span>
                  )}
                </div>

                <div className={`my-2.5 ${!isOwned ? 'grayscale opacity-40' : ''}`}>
                  <StationeryArt
                    itemId={item.id}
                    category={item.category}
                    rarity={item.rarity}
                    className="h-14 w-14"
                  />
                </div>

                <p className="line-clamp-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {isOwned
                    ? item.name
                    : item.rarity === 'transcendent'
                      ? '미합성 초월 문구'
                      : item.isSecret
                        ? '??? (비밀)'
                        : '미수집 문구'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {isEquipped
                    ? '대표 장착 중'
                    : isOwned
                      ? '자세히 보기'
                      : item.rarity === 'transcendent'
                        ? '신화 4종 합성'
                        : item.isSecret
                          ? '알 수 없는 확률'
                          : '뽑기에서 획득'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Item Inspection Modal */}
      {inspectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setInspectedItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${RARITY_META[inspectedItem.rarity].textColor}`}>
                {RARITY_META[inspectedItem.rarity].label} 등급
              </span>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                aria-label="닫기"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-2 flex flex-col items-center text-center">
              <StationeryArt
                itemId={inspectedItem.id}
                category={inspectedItem.category}
                rarity={inspectedItem.rarity}
                className="my-3 h-24 w-24"
              />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {inspectedItem.name}
              </h3>
              <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                보유 수량 {inventory[inspectedItem.id]?.count || 1}개
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {inspectedItem.description}
              </p>
              {inspectedItem.cutsceneQuote && (
                <p className="mt-3 w-full rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line text-slate-700 italic dark:bg-slate-800 dark:text-amber-200">
                  {inspectedItem.cutsceneQuote}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  onEquipItem(inspectedItem.id);
                  setInspectedItem(null);
                }}
                disabled={equippedItemId === inspectedItem.id}
                className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {equippedItemId === inspectedItem.id ? '현재 대표 문구입니다' : '대표 문구로 장착'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
