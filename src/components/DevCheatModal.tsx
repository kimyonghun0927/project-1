import React, { useEffect, useMemo, useState } from 'react';
import { Award, Check, Coins, Delete, Film, Lock, PackagePlus, Play, Sparkles, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { GACHA_ITEMS, RARITY_META, TRANSCENDENT_ITEM } from '../data/gachaItems';
import { GachaItem } from '../types/shop';

const DEV_PASSCODE = '0927';

interface DevCheatModalProps {
  isOpen: boolean;
  points: number;
  totalXp: number;
  unlockedAchievementIds: string[];
  equippedTitleId: string | null;
  onClose: () => void;
  onAddPoints: (amount: number) => void;
  onAddXp: (amount: number) => void;
  onTestLevelUp?: () => void;
  onPreviewGacha: (item: GachaItem, stage: 'roulette' | 'cutscene') => void;
  onUnlockTitle: (target: 'all' | string, autoEquip?: boolean) => void;
  onGrantMythicRelics: () => void;
}

export const DevCheatModal: React.FC<DevCheatModalProps> = ({
  isOpen,
  points,
  totalXp,
  unlockedAchievementIds,
  equippedTitleId,
  onClose,
  onAddPoints,
  onAddXp,
  onTestLevelUp,
  onPreviewGacha,
  onUnlockTitle,
  onGrantMythicRelics,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setUnlocked(false);
      setPasscodeInput('');
      setPasscodeError(null);
      setNotice(null);
    }
  }, [isOpen]);

  const mythicItems = useMemo(
    () => GACHA_ITEMS.filter((item) => item.rarity === 'mythic'),
    []
  );
  const legendaryItems = useMemo(
    () => GACHA_ITEMS.filter((item) => item.rarity === 'legendary'),
    []
  );
  const trashItems = useMemo(
    () => GACHA_ITEMS.filter((item) => item.rarity === 'trash'),
    []
  );

  if (!isOpen) return null;

  const verifyPasscode = (nextValue: string) => {
    const cleaned = nextValue.replace(/\D/g, '').slice(0, 4);
    setPasscodeInput(cleaned);
    setPasscodeError(null);

    if (cleaned.length === 4) {
      if (cleaned === DEV_PASSCODE) {
        setUnlocked(true);
        setPasscodeInput('');
      } else {
        setPasscodeError('비밀번호가 올바르지 않습니다.');
        setPasscodeInput('');
      }
    }
  };

  const handleKeyPadPress = (digit: string) => {
    if (passcodeInput.length >= 4) return;
    verifyPasscode(passcodeInput + digit);
  };

  const handleGrantPoints = (amount: number) => {
    onAddPoints(amount);
    setNotice(`+${amount.toLocaleString()} P가 지급되었습니다!`);
  };

  const handleGrantXp = (amount: number) => {
    onAddXp(amount);
    setNotice(`+${amount.toLocaleString()} XP가 지급되었습니다!`);
  };

  const handleGrantMythics = () => {
    onGrantMythicRelics();
    setNotice('신화 4종 성물이 1개씩 지급되었습니다! 상점 합성소에서 합성을 테스트해보세요.');
  };

  const handleUnlockTitle = (target: 'all' | string, label?: string, autoEquip?: boolean) => {
    onUnlockTitle(target, autoEquip);
    setNotice(
      target === 'all'
        ? '모든 칭호가 해금되었습니다!'
        : `[${label}] 칭호가 해금 및 장착되었습니다!`
    );
  };

  const launchPreview = (item: GachaItem, stage: 'roulette' | 'cutscene') => {
    onClose();
    onPreviewGacha(item, stage);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />

        {!unlocked ? (
          /* PASSCODE LOCK SCREEN (0927) */
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    개발자 공간 인증
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    4자리 비밀번호를 입력하세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center">
              {/* 4-dot PIN indicator */}
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-bold transition-colors ${
                      idx < passcodeInput.length
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                        : 'border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    {idx < passcodeInput.length ? '●' : ''}
                  </div>
                ))}
              </div>

              {/* Keyboard direct input option */}
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={passcodeInput}
                onChange={(e) => verifyPasscode(e.target.value)}
                placeholder="키보드로 숫자 4자리 입력"
                aria-label="비밀번호 입력"
                className="mt-4 w-full max-w-[240px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center font-mono text-sm tracking-widest text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              {passcodeError && (
                <p role="alert" className="mt-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {passcodeError}
                </p>
              )}

              {/* Touch Keypad */}
              <div className="mt-4 grid w-full max-w-[240px] grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleKeyPadPress(d)}
                    className="min-h-[46px] rounded-xl border border-slate-200 bg-white font-mono text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPasscodeInput('');
                    setPasscodeError(null);
                  }}
                  className="min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPadPress('0')}
                  className="min-h-[46px] rounded-xl border border-slate-200 bg-white font-mono text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPasscodeInput((prev) => prev.slice(0, -1))}
                  aria-label="지우기"
                  className="flex min-h-[46px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* UNLOCKED DEVELOPER CHEAT & CUTSCENE PREVIEW */
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  개발자 테스트 & 연출 미리보기
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  포인트·성물·칭호 즉시 지급과 초월/신화/레전더리 컷신을 바로 감상할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Points & Relic Grant Cheat Section */}
            <section className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Coins className="h-4 w-4" aria-hidden="true" />
                  포인트 & 신화 성물 지급
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                  현재 {points.toLocaleString()} P
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[500, 2000, 10000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleGrantPoints(amount)}
                    className="min-h-[42px] rounded-xl border border-amber-300 bg-white px-3 py-2 font-mono text-xs font-bold text-amber-800 tabular-nums transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    +{amount.toLocaleString()} P
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGrantMythics}
                className="mt-2.5 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-fuchsia-300 bg-white px-3 py-2 text-xs font-bold text-fuchsia-800 transition-colors hover:bg-fuchsia-50 dark:border-fuchsia-700 dark:bg-slate-900 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/50"
              >
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                신화 4종 성물 1세트 지급 (상점 합성 테스트용)
              </button>

              <div className="mt-3 border-t border-amber-200/70 pt-3 dark:border-amber-800/50">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                  <span>경험치 (XP) 즉시 지급</span>
                  <span className="font-mono tabular-nums">현재 {totalXp.toLocaleString()} XP</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[500, 2500, 10000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleGrantXp(amount)}
                      className="min-h-[40px] rounded-xl border border-indigo-200 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-indigo-700 tabular-nums transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                    >
                      +{amount.toLocaleString()} XP
                    </button>
                  ))}
                </div>
                {onTestLevelUp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTestLevelUp();
                    }}
                    className="mt-2 inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    레벨업 강렬 이펙트 미리보기
                  </button>
                )}
              </div>

              {notice && (
                <p className="mt-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {notice}
                </p>
              )}
            </section>

            {/* Transcendent Synthesis Cutscene */}
            <section className="mt-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                초월 등급 합성 시네마틱 컷신
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-300 bg-gradient-to-r from-cyan-50 via-sky-50 to-fuchsia-50 px-3.5 py-2.5 dark:border-cyan-700/80 dark:from-cyan-950/50 dark:via-slate-900 dark:to-fuchsia-950/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {TRANSCENDENT_ITEM.name} (초월)
                  </p>
                  <p className="truncate text-[11px] text-cyan-700 dark:text-cyan-300">
                    4성물 회전·합체 → 지구 폭풍·번개 → 땅 균열 → 화산 폭발 → 백색 섬광
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => launchPreview(TRANSCENDENT_ITEM, 'cutscene')}
                  className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95 whitespace-nowrap"
                >
                  <Film className="h-3.5 w-3.5" aria-hidden="true" />
                  합성 컷신
                </button>
              </div>
            </section>

            {/* Mythic Unique Cutscenes */}
            <section className="mt-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Sparkles className="h-4 w-4 text-fuchsia-500" aria-hidden="true" />
                신화 전용 시네마틱 컷신 (아이템별 고유 연출)
              </div>

              <div className="grid grid-cols-1 gap-2">
                {mythicItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50/50 px-3.5 py-2.5 dark:border-fuchsia-800/70 dark:bg-fuchsia-950/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="truncate text-[11px] text-fuchsia-700 dark:text-fuchsia-300">
                        {item.id === 'mythic-akashic-eraser'
                          ? '우주 문구 → 붉고 큰 개기일식 → 별빛 확대 → 거대한 우리 은하'
                          : item.id === 'mythic-celestial-quill'
                            ? '성당 문 → 찬송 그림자 확대 → 기도 그림자 확대 → 성당 전체 → 흰 화면 → 제단'
                            : item.id === 'mythic-starlight-sharp'
                              ? '초원 망원경+유성우 → 우주 확대 → 천칭자리 한 선 연결 → 강림'
                              : '사슬 책+나비 → 파괴 → 오른쪽→왼쪽 책장 넘김+빛 흡수 → 흰 화면 문구 → 도서관'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => launchPreview(item, 'cutscene')}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-700 whitespace-nowrap"
                      >
                        <Film className="h-3.5 w-3.5" aria-hidden="true" />
                        컷신
                      </button>
                      <button
                        type="button"
                        onClick={() => launchPreview(item, 'roulette')}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-fuchsia-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-fuchsia-800 hover:bg-fuchsia-100 whitespace-nowrap dark:border-fuchsia-700 dark:bg-slate-900 dark:text-fuchsia-200"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        룰렛+컷신
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Title / Achievement Cheats */}
            <section className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Award className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                  업적 · 칭호 해금 및 장착 테스트
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlockTitle('all')}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                >
                  모든 칭호 즉시 해금
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ACHIEVEMENTS.map((ach) => {
                  const isUnlocked = unlockedAchievementIds.includes(ach.id);
                  const isEquipped = equippedTitleId === ach.id;
                  const meta = RARITY_META[ach.rarity];
                  return (
                    <button
                      key={ach.id}
                      type="button"
                      onClick={() => handleUnlockTitle(ach.id, ach.titleName, true)}
                      className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors hover:opacity-90 ${meta.borderColor} ${meta.surfaceBg}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${meta.textColor}`}>
                            {meta.label}
                          </span>
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            [{ach.titleName}]
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {ach.funnyEffect}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                        {isEquipped ? (
                          <>
                            <Check className="h-3 w-3" /> 장착중
                          </>
                        ) : isUnlocked ? (
                          '장착'
                        ) : (
                          '해금+장착'
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Unified Legendary Golden Magic Circle Cutscene */}
            <section className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                레전더리 통일 컷신 (검은 화면 + 금색 마법진)
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {legendaryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => launchPreview(item, 'cutscene')}
                    className="flex min-h-[42px] items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-left text-xs font-semibold text-slate-800 transition-colors hover:bg-amber-100/70 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-slate-100 dark:hover:bg-amber-900/40"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-2 shrink-0 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                      마법진 컷신
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Roulette + Trash Items Preview */}
            <section className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                쓰레기 등급 문구 룰렛 연출 미리보기
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {trashItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => launchPreview(item, 'roulette')}
                    className={`flex min-h-[42px] items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-stone-200/70 dark:hover:bg-stone-800 ${RARITY_META.trash.borderColor} ${RARITY_META.trash.surfaceBg}`}
                  >
                    <span className="truncate text-slate-800 dark:text-slate-100">
                      {item.name}
                      {item.isSecret ? ' (비밀 0.1%)' : ''}
                    </span>
                    <span className="ml-2 shrink-0 text-[11px] text-stone-500 dark:text-stone-400">
                      룰렛 보기
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
