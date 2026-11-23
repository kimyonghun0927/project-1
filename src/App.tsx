import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CloudSun,
  Coins,
  Flame,
  MessageCircle,
  Moon,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { AICounselorView } from './components/AICounselorView';
import { AchievementsView } from './components/AchievementsView';
import { CollectionView } from './components/CollectionView';
import { DevCheatModal } from './components/DevCheatModal';
import { GachaCutsceneModal } from './components/GachaCutsceneModal';
import { LevelUpEffectModal, LevelUpEventData } from './components/LevelUpEffectModal';
import { LogView } from './components/LogView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuizView } from './components/QuizView';
import { SessionModal } from './components/SessionModal';
import { ShopView } from './components/ShopView';
import { StatsView } from './components/StatsView';
import { SubjectsView } from './components/SubjectsView';
import { TimerView } from './components/TimerView';
import { WeatherInfo } from './components/WeatherWidget';
import { ACHIEVEMENTS } from './data/achievements';
import { RARITY_META } from './data/gachaItems';
import { GROWTH_LEVELS } from './data/growthLevels';
import { useStudyStore } from './hooks/useStudyStore';
import { GachaDrawResult, GachaItem } from './types/shop';
import { StudySession, TabId } from './types/study';
import {
  formatDurationKorean,
  formatKoreanDateFull,
  formatTimerClock,
  getLocalDateKey,
} from './utils/time';

const NAV_ITEMS: { id: TabId; label: string; mobileLabel: string; icon: typeof Timer }[] = [
  { id: 'timer', label: '타이머', mobileLabel: '타이머', icon: Timer },
  { id: 'quiz', label: '문제', mobileLabel: '문제', icon: ClipboardCheck },
  { id: 'coach', label: 'AI상담', mobileLabel: 'AI', icon: MessageCircle },
  { id: 'shop', label: '상점', mobileLabel: '상점', icon: ShoppingBag },
  { id: 'collection', label: '도감', mobileLabel: '도감', icon: BookOpen },
  { id: 'titles', label: '칭호', mobileLabel: '칭호', icon: Award },
  { id: 'log', label: '기록', mobileLabel: '기록', icon: CalendarDays },
];

type LogSubTab = 'records' | 'stats' | 'subjects';

export default function App() {
  const {
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
    dismissAttendanceNotice,
    elapsedMs,
    pomodoroTargetMs,
    pomodoroNotice,
    dismissPomodoroNotice,
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
  } = useStudyStore();

  const [activeTab, setActiveTab] = useState<TabId>('timer');
  const [logSubTab, setLogSubTab] = useState<LogSubTab>('records');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getLocalDateKey());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [devCheatOpen, setDevCheatOpen] = useState(false);
  const [previewCutscene, setPreviewCutscene] = useState<{
    results: GachaDrawResult[];
    initialStage: 'roulette' | 'cutscene';
  } | null>(null);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEventData | null>(null);
  const [toolbarWeather, setToolbarWeather] = useState<WeatherInfo | null>(null);
  const prevLevelRef = useRef<number>(growthStage.current.level);

  useEffect(() => {
    const currentLvl = growthStage.current.level;
    const prevLvl = prevLevelRef.current;
    if (currentLvl > prevLvl) {
      const fromGrade = GROWTH_LEVELS.find((g) => g.level === prevLvl) || GROWTH_LEVELS[0];
      setLevelUpEvent({
        from: fromGrade,
        to: growthStage.current,
        totalXp,
      });
    }
    prevLevelRef.current = currentLvl;
  }, [growthStage, totalXp]);

  const todayKey = getLocalDateKey();

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.dateKey === todayKey)
        .sort((a, b) => b.startTime - a.startTime),
    [sessions, todayKey]
  );

  const todayTotalSeconds = useMemo(
    () => todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0),
    [todaySessions]
  );

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

  const openNewManualModal = (dateKeyOverride?: string) => {
    setEditingSession(null);
    if (dateKeyOverride) {
      setSelectedDateKey(dateKeyOverride);
    }
    setModalOpen(true);
  };

  const openEditModal = (session: StudySession) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleSaveModal = (data: {
    id?: string;
    subjectId: string;
    dateKey: string;
    startTime: number;
    durationSeconds: number;
    memo: string;
  }) => {
    if (data.id) {
      updateSession(data.id, data);
    } else {
      addManualSession(data);
    }
  };

  // Show elapsed time on mobile tab bar if timer is running while on another tab
  const runningClockBadge = useMemo(() => {
    if (!timer.isRunning) return null;
    if (timer.mode === 'pomodoro') {
      const rem = Math.ceil(Math.max(0, pomodoroTargetMs - elapsedMs) / 1000);
      return formatTimerClock(rem);
    }
    return formatTimerClock(Math.floor(elapsedMs / 1000));
  }, [elapsedMs, pomodoroTargetMs, timer.isRunning, timer.mode]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Header: Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-md md:block dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-white"
          >
            공부로그
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="flex items-center gap-4 lg:gap-6" aria-label="주요 메뉴">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Transparent Dev Cheat Space */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setDevCheatOpen(true)}
              aria-label="개발자 테스트 및 연출 미리보기 열기"
              className="h-10 w-10 cursor-default bg-transparent opacity-0 focus-visible:opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => openNewManualModal(activeTab === 'log' ? selectedDateKey : todayKey)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              기록 추가
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Top App Bar (48px) */}
      <header className="pt-safe sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-white"
        >
          공부로그
        </button>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setDevCheatOpen(true)}
            aria-label="개발자 테스트 및 연출 미리보기 열기"
            className="h-10 w-10 cursor-default bg-transparent opacity-0 focus-visible:opacity-40 focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
          <button
            type="button"
            onClick={() => openNewManualModal(activeTab === 'log' ? selectedDateKey : todayKey)}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            기록 추가
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-12">
        {/* Workspace Toolbar (Date context, live timer, points balance, Theme & PWA Install) */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {formatKoreanDateFull(todayKey)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              오늘 {formatDurationKorean(todayTotalSeconds)}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              title={`현재 경험치 ${totalXp.toLocaleString()} XP`}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Lv.{growthStage.current.level} {growthStage.current.name}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              title="하루 1시간 이상 공부하면 연속 출석 (상점에서 방어권 구매 가능)"
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold transition-colors ${
                attendanceSummary.todayAttended
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-300 dark:hover:bg-orange-900/50'
              }`}
            >
              <Flame className="h-3 w-3" aria-hidden="true" />
              연속 {attendanceSummary.streakDays}일
              {streakFreezeCount > 0 && (
                <span className="ml-0.5 inline-flex items-center gap-0.5 text-[10px] opacity-80">
                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                  {streakFreezeCount}
                </span>
              )}
            </button>
            {toolbarWeather && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('timer')}
                  title={toolbarWeather.studyTip}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/50"
                >
                  <CloudSun className="h-3 w-3" aria-hidden="true" />
                  {toolbarWeather.locationName} {Math.round(toolbarWeather.temperature)}°{' '}
                  {toolbarWeather.condition}
                </button>
              </>
            )}
            {equippedTitle && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('titles')}
                  title={`착용 효과: ${equippedTitle.funnyEffect}`}
                  className={`font-bold underline-offset-2 hover:underline ${
                    RARITY_META[equippedTitle.rarity].textColor
                  }`}
                >
                  [{equippedTitle.titleName}]
                </button>
              </>
            )}
            {runningClockBadge && activeTab !== 'timer' && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('timer')}
                  className="font-mono font-semibold text-indigo-600 underline tabular-nums dark:text-indigo-400"
                >
                  측정 중 {runningClockBadge}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              title="포인트 문구 상점으로 이동"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-xs font-bold text-amber-700 tabular-nums transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
            >
              <Coins className="h-3.5 w-3.5" aria-hidden="true" />
              {points.toLocaleString()} P
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() =>
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              aria-label={settings.theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              title={settings.theme === 'dark' ? '라이트 모드' : '다크 모드'}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Attendance Streak / Freeze Notice */}
        {attendanceNotice && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-xs text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/50 dark:text-indigo-100">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <p className="leading-relaxed font-medium">{attendanceNotice}</p>
            </div>
            <button
              type="button"
              onClick={dismissAttendanceNotice}
              aria-label="출석 알림 닫기"
              className="rounded-lg p-1 text-indigo-600 transition-colors hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Active View */}
        {activeTab === 'timer' && (
          <TimerView
            subjects={subjects}
            todaySessions={todaySessions}
            todayTotalSeconds={todayTotalSeconds}
            settings={settings}
            timer={timer}
            elapsedMs={elapsedMs}
            pomodoroTargetMs={pomodoroTargetMs}
            pomodoroNotice={pomodoroNotice}
            growthStage={growthStage}
            attendanceSummary={attendanceSummary}
            streakFreezeCount={streakFreezeCount}
            onDismissNotice={dismissPomodoroNotice}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
            onCompleteAndSave={completeAndSaveTimer}
            onSetMode={setTimerMode}
            onSetPhase={setPomodoroPhase}
            onSetSubject={setTimerSubject}
            onSetMemo={setTimerMemo}
            onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            onOpenManualModal={() => openNewManualModal(todayKey)}
            onViewAllLogs={() => {
              setSelectedDateKey(todayKey);
              setLogSubTab('records');
              setActiveTab('log');
            }}
            onGoToShop={() => setActiveTab('shop')}
            onWeatherLoaded={setToolbarWeather}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            subjects={subjects}
            defaultSubjectId={timer.subjectId}
            onLogQuizStudyTime={addManualSession}
            onEarnPoints={addPoints}
            onEarnXp={addXp}
            onRecordQuestionsAnswered={recordQuizAnswered}
            onGoToShop={() => setActiveTab('shop')}
          />
        )}

        {activeTab === 'coach' && (
          <AICounselorView
            subjects={subjects}
            sessions={sessions}
            settings={settings}
            protectedDates={protectedDates}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView
            points={points}
            totalDraws={totalDraws}
            inventory={inventory}
            equippedItemId={equippedItemId}
            equippedTitleId={equippedTitleId}
            unlockedAchievementIds={unlockedAchievementIds}
            sessions={sessions}
            totalQuizAnswered={totalQuizAnswered}
            streakFreezeCount={streakFreezeCount}
            streakDays={attendanceSummary.streakDays}
            todayAttended={attendanceSummary.todayAttended}
            soundEnabled={settings.soundEnabled}
            onDrawGacha={drawGacha}
            onBuyStreakFreeze={buyStreakFreeze}
            onSynthesizeTranscendent={synthesizeTranscendent}
            onEquipItem={equipItem}
            onGoToQuiz={() => setActiveTab('quiz')}
            onGoToCollection={() => setActiveTab('collection')}
            onGoToTitles={() => setActiveTab('titles')}
          />
        )}

        {activeTab === 'collection' && (
          <CollectionView
            inventory={inventory}
            equippedItemId={equippedItemId}
            equippedTitleId={equippedTitleId}
            unlockedAchievementIds={unlockedAchievementIds}
            sessions={sessions}
            totalDraws={totalDraws}
            totalQuizAnswered={totalQuizAnswered}
            onEquipItem={equipItem}
            onGoToShop={() => setActiveTab('shop')}
            onGoToTitles={() => setActiveTab('titles')}
          />
        )}

        {activeTab === 'titles' && (
          <AchievementsView
            sessions={sessions}
            inventory={inventory}
            totalDraws={totalDraws}
            totalQuizAnswered={totalQuizAnswered}
            unlockedAchievementIds={unlockedAchievementIds}
            equippedTitleId={equippedTitleId}
            onEquipTitle={equipTitle}
          />
        )}

        {activeTab === 'log' && (
          <div className="space-y-5">
            <div
              role="tablist"
              aria-label="기록 및 설정 메뉴"
              className="no-scrollbar inline-flex w-full items-center overflow-x-auto rounded-xl bg-slate-200/70 p-1 sm:w-auto dark:bg-slate-800"
            >
              {(
                [
                  { id: 'records', label: '날짜별 기록' },
                  { id: 'stats', label: '주간 통계' },
                  { id: 'subjects', label: '과목 · 목표' },
                ] as { id: LogSubTab; label: string }[]
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={logSubTab === sub.id}
                  onClick={() => setLogSubTab(sub.id)}
                  className={`min-h-[40px] flex-1 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap sm:flex-none sm:text-sm ${
                    logSubTab === sub.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {logSubTab === 'records' && (
              <LogView
                selectedDateKey={selectedDateKey}
                onSelectDateKey={setSelectedDateKey}
                sessions={sessions}
                subjects={subjects}
                settings={settings}
                onOpenNewModal={() => openNewManualModal(selectedDateKey)}
                onEditSession={openEditModal}
                onDeleteSession={deleteSession}
              />
            )}

            {logSubTab === 'stats' && (
              <StatsView
                sessions={sessions}
                subjects={subjects}
                settings={settings}
                protectedDates={protectedDates}
                onExportJSON={exportBackupJSON}
                onExportCSV={exportCSV}
                onImportJSON={importBackupJSON}
                onClearAllSessions={clearAllSessions}
              />
            )}

            {logSubTab === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                settings={settings}
                onAddSubject={addSubject}
                onUpdateSubject={updateSubject}
                onDeleteSubject={deleteSubject}
                onUpdateSettings={updateSettings}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (56px, total sticky <= 13% viewport height) */}
      <nav
        aria-label="하단 탭 내비게이션"
        className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="grid h-14 grid-cols-7 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex h-full min-h-[44px] flex-col items-center justify-center transition-colors ${
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} aria-hidden="true" />
                <span className="mt-0.5 text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Manual Entry / Edit Session Modal */}
      <SessionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSession(null);
        }}
        subjects={subjects}
        defaultDateKey={activeTab === 'log' ? selectedDateKey : todayKey}
        defaultSubjectId={timer.subjectId}
        editingSession={editingSession}
        onSave={handleSaveModal}
      />

      {/* Developer Cheat & Cutscene Preview Modal */}
      <DevCheatModal
        isOpen={devCheatOpen}
        points={points}
        totalXp={totalXp}
        unlockedAchievementIds={unlockedAchievementIds}
        equippedTitleId={equippedTitleId}
        onClose={() => setDevCheatOpen(false)}
        onAddPoints={(amount) => addPoints(amount)}
        onAddXp={(amount) => addXp(amount)}
        onTestLevelUp={() => {
          const curIdx = GROWTH_LEVELS.findIndex((g) => g.level === growthStage.current.level);
          const from = GROWTH_LEVELS[Math.max(0, curIdx)] || GROWTH_LEVELS[0];
          const to =
            GROWTH_LEVELS[Math.min(GROWTH_LEVELS.length - 1, Math.max(1, curIdx + 1))] ||
            GROWTH_LEVELS[1];
          setLevelUpEvent({
            from,
            to,
            totalXp: Math.max(totalXp, to.minXp),
          });
        }}
        onUnlockTitle={devUnlockTitles}
        onGrantMythicRelics={devGrantMythicRelics}
        onPreviewGacha={(item: GachaItem, stage: 'roulette' | 'cutscene') =>
          setPreviewCutscene({
            results: [{ item, isNew: true, refundPoints: 0 }],
            initialStage: stage,
          })
        }
      />

      {/* Preview Cutscene Modal */}
      <GachaCutsceneModal
        results={previewCutscene?.results || null}
        totalRefund={0}
        soundEnabled={settings.soundEnabled}
        initialStage={previewCutscene?.initialStage || 'roulette'}
        previewMode
        onClose={() => setPreviewCutscene(null)}
        onEquipItem={equipItem}
        equippedItemId={equippedItemId}
      />

      {/* Intense Level Up Effect Modal */}
      <LevelUpEffectModal
        event={levelUpEvent}
        soundEnabled={settings.soundEnabled}
        onClose={() => setLevelUpEvent(null)}
      />

      {/* Offline PWA Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
