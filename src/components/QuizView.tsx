import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  QuizDifficulty,
  QuizGradingMode,
  QuizQuestion,
  QuizQuestionType,
  QuizSessionRecord,
  QuizUserAnswer,
} from '../types/quiz';
import { Subject } from '../types/study';
import { evaluateQuestionAnswer, getSuggestedUnits } from '../utils/quizUnits';
import { SUBJECT_COLORS, formatDurationKorean, formatTimerClock, getLocalDateKey } from '../utils/time';

interface QuizViewProps {
  subjects: Subject[];
  defaultSubjectId: string;
  onLogQuizStudyTime: (input: {
    subjectId: string;
    dateKey: string;
    startTime: number;
    durationSeconds: number;
    memo: string;
  }) => void;
  onEarnPoints: (amount: number) => void;
  onEarnXp?: (amount: number) => void;
  onRecordQuestionsAnswered?: (count: number) => void;
  onGoToShop: () => void;
}

const QUIZ_HISTORY_KEY = 'gongbulog_quiz_history_v1';
const CUSTOM_UNITS_KEY = 'gongbulog_custom_units_v1';
const QUIZ_PREP_SECONDS = 10 * 60; // 10분 (600초) 과목 예습 시간

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const DIFFICULTY_OPTIONS: { id: QuizDifficulty; label: string }[] = [
  { id: 'easy', label: '기초' },
  { id: 'medium', label: '보통' },
  { id: 'hard', label: '심화' },
];

const COUNT_OPTIONS = [3, 5, 10];

const TYPE_OPTIONS: { id: QuizQuestionType; label: string }[] = [
  { id: 'multiple_choice', label: '객관식 4지선다' },
  { id: 'short_answer', label: '단답형' },
  { id: 'mixed', label: '혼합' },
];

export const QuizView: React.FC<QuizViewProps> = ({
  subjects,
  defaultSubjectId,
  onLogQuizStudyTime,
  onEarnPoints,
  onEarnXp,
  onRecordQuestionsAnswered,
  onGoToShop,
}) => {
  // Setup state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [unitName, setUnitName] = useState<string>('');
  const [gradingMode, setGradingMode] = useState<QuizGradingMode>('instant');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questionType, setQuestionType] = useState<QuizQuestionType>('multiple_choice');

  // Persisted custom units per subject & quiz history
  const [customUnitsBySubject, setCustomUnitsBySubject] = useState<Record<string, string[]>>(() =>
    readLocalJSON<Record<string, string[]>>(CUSTOM_UNITS_KEY, {})
  );
  const [quizHistory, setQuizHistory] = useState<QuizSessionRecord[]>(() =>
    readLocalJSON<QuizSessionRecord[]>(QUIZ_HISTORY_KEY, [])
  );

  // Active quiz session state
  const [stage, setStage] = useState<'setup' | 'preparing' | 'solving' | 'summary'>('setup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // 10-minute preparation screen state
  const [prepRemainingSeconds, setPrepRemainingSeconds] = useState<number>(QUIZ_PREP_SECONDS);
  const [prepElapsedSeconds, setPrepElapsedSeconds] = useState<number>(0);
  const [prepPaused, setPrepPaused] = useState<boolean>(false);
  const [prepStatus, setPrepStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [prepError, setPrepError] = useState<string | null>(null);
  const [prepNotes, setPrepNotes] = useState<string>('');
  const [prepChecklist, setPrepChecklist] = useState<boolean[]>([false, false, false]);
  const [includePrepStudyTime, setIncludePrepStudyTime] = useState<boolean>(true);
  const [prepStartedAtMs, setPrepStartedAtMs] = useState<number>(Date.now());
  const [prepConfig, setPrepConfig] = useState<{
    subjectId: string;
    subjectName: string;
    unitName: string;
    gradingMode: QuizGradingMode;
    difficulty: QuizDifficulty;
  } | null>(null);
  const [preparedQuestions, setPreparedQuestions] = useState<QuizQuestion[] | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [activeMeta, setActiveMeta] = useState<{
    recordId: string;
    subjectId: string;
    subjectName: string;
    unitName: string;
    gradingMode: QuizGradingMode;
    difficulty: QuizDifficulty;
    startedAtMs: number;
    isRetry?: boolean;
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, QuizUserAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showInstantExplanation, setShowInstantExplanation] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');
  const [loggedToStudy, setLoggedToStudy] = useState(false);
  const [sessionPointsEarned, setSessionPointsEarned] = useState(0);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [lastQuestionPoints, setLastQuestionPoints] = useState<number | null>(null);
  const [lastQuestionXp, setLastQuestionXp] = useState<number | null>(null);

  // Keep selectedSubjectId valid
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(customUnitsBySubject));
    } catch {
      // Ignore storage errors
    }
  }, [customUnitsBySubject]);

  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(quizHistory));
    } catch {
      // Ignore storage errors
    }
  }, [quizHistory]);

  // Quiz elapsed clock while solving
  useEffect(() => {
    if (stage !== 'solving') return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  // 10-minute preparation countdown timer
  useEffect(() => {
    if (stage !== 'preparing' || prepPaused) return;
    const id = window.setInterval(() => {
      setPrepRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setPrepElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [prepPaused, stage]);

  // Abort any in-flight generation on unmount
  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
    };
  }, []);

  const activeSetupSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const suggestedUnits = useMemo(() => {
    if (!activeSetupSubject) return [];
    const presets = getSuggestedUnits(activeSetupSubject.name);
    const recent = customUnitsBySubject[activeSetupSubject.id] || [];
    return Array.from(new Set([...recent, ...presets])).slice(0, 8);
  }, [activeSetupSubject, customUnitsBySubject]);

  const saveUnitSuggestion = useCallback((subjectId: string, unit: string) => {
    const trimmed = unit.trim();
    if (!trimmed) return;
    setCustomUnitsBySubject((prev) => {
      const existing = prev[subjectId] || [];
      const next = [trimmed, ...existing.filter((u) => u !== trimmed)].slice(0, 5);
      return { ...prev, [subjectId]: next };
    });
  }, []);

  const enterSolvingWithPrepared = useCallback(() => {
    if (!preparedQuestions || !prepConfig) return;

    if (includePrepStudyTime && prepElapsedSeconds >= 10) {
      onLogQuizStudyTime({
        subjectId: prepConfig.subjectId,
        dateKey: getLocalDateKey(new Date(prepStartedAtMs)),
        startTime: prepStartedAtMs,
        durationSeconds: prepElapsedSeconds,
        memo: `${prepConfig.unitName} 문제 출제 중 예습`,
      });
    }

    const initialAnswers: Record<string, QuizUserAnswer> = {};
    preparedQuestions.forEach((q) => {
      initialAnswers[q.id] = {
        choiceIndex: null,
        text: '',
        checked: false,
        isCorrect: null,
      };
    });

    setActiveQuestions(preparedQuestions);
    setAnswers(initialAnswers);
    setCurrentIndex(0);
    setShowHint(false);
    setShowInstantExplanation(false);
    setElapsedSeconds(0);
    setLoggedToStudy(false);
    setSessionPointsEarned(0);
    setSessionXpEarned(0);
    setLastQuestionPoints(null);
    setLastQuestionXp(null);
    setReviewFilter('all');
    setActiveMeta({
      recordId: `quiz-${Date.now()}`,
      subjectId: prepConfig.subjectId,
      subjectName: prepConfig.subjectName,
      unitName: prepConfig.unitName,
      gradingMode: prepConfig.gradingMode,
      difficulty: prepConfig.difficulty,
      startedAtMs: Date.now(),
      isRetry: false,
    });
    setStage('solving');
  }, [
    includePrepStudyTime,
    onLogQuizStudyTime,
    prepConfig,
    prepElapsedSeconds,
    prepStartedAtMs,
    preparedQuestions,
  ]);

  // Auto-start quiz when 10-minute prep countdown finishes and questions are ready
  useEffect(() => {
    if (stage === 'preparing' && prepRemainingSeconds === 0 && prepStatus === 'ready' && preparedQuestions) {
      enterSolvingWithPrepared();
    }
  }, [enterSolvingWithPrepared, prepRemainingSeconds, prepStatus, preparedQuestions, stage]);

  const fetchQuizForPreparation = async (config: {
    subjectId: string;
    subjectName: string;
    unitName: string;
    gradingMode: QuizGradingMode;
    difficulty: QuizDifficulty;
  }) => {
    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;

    setIsGenerating(true);
    setPrepStatus('loading');
    setPrepError(null);
    setPreparedQuestions(null);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          subjectName: config.subjectName,
          unitName: config.unitName,
          difficulty: config.difficulty,
          count: questionCount,
          questionType,
        }),
      });

      const payload = (await response.json()) as {
        questions?: QuizQuestion[];
        error?: string;
      };

      if (controller.signal.aborted) return;

      if (!response.ok || !Array.isArray(payload.questions) || payload.questions.length === 0) {
        setPrepStatus('error');
        setPrepError(payload.error || '문제를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      saveUnitSuggestion(config.subjectId, config.unitName);
      setPreparedQuestions(payload.questions);
      setPrepStatus('ready');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setPrepStatus('error');
      setPrepError('서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
      }
    }
  };

  const startNewQuiz = (overrideParams?: {
    subjectId: string;
    subjectName: string;
    unitName: string;
    gradingMode: QuizGradingMode;
    difficulty: QuizDifficulty;
  }) => {
    const targetSubjectId = overrideParams?.subjectId || activeSetupSubject?.id || '';
    const targetSubjectName = overrideParams?.subjectName || activeSetupSubject?.name || '';
    const targetUnit = (overrideParams?.unitName ?? unitName).trim();
    const targetMode = overrideParams?.gradingMode || gradingMode;
    const targetDifficulty = overrideParams?.difficulty || difficulty;

    if (!targetSubjectName || !targetUnit) {
      setGenerateError('공부하고 싶은 단원명을 입력하거나 아래에서 선택해주세요.');
      return;
    }

    const config = {
      subjectId: targetSubjectId,
      subjectName: targetSubjectName,
      unitName: targetUnit,
      gradingMode: targetMode,
      difficulty: targetDifficulty,
    };

    setGenerateError(null);
    setPrepConfig(config);
    setPrepRemainingSeconds(QUIZ_PREP_SECONDS);
    setPrepElapsedSeconds(0);
    setPrepPaused(false);
    setPrepNotes('');
    setPrepChecklist([false, false, false]);
    setIncludePrepStudyTime(true);
    setPrepStartedAtMs(Date.now());
    setStage('preparing');

    void fetchQuizForPreparation(config);
  };

  const handleCancelPreparation = () => {
    generateAbortRef.current?.abort();
    setIsGenerating(false);
    setStage('setup');
  };

  const currentQuestion = activeQuestions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const updateCurrentChoice = (choiceIdx: number) => {
    if (!currentQuestion) return;
    if (activeMeta?.gradingMode === 'instant' && currentAnswer?.checked) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        choiceIndex: choiceIdx,
        text: '',
        checked: false,
        isCorrect: null,
      },
    }));
  };

  const updateCurrentShortText = (text: string) => {
    if (!currentQuestion) return;
    if (activeMeta?.gradingMode === 'instant' && currentAnswer?.checked) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        choiceIndex: null,
        text,
        checked: false,
        isCorrect: null,
      },
    }));
  };

  const getPointsForQuestion = (isCorrect: boolean, diff: QuizDifficulty, isRetry?: boolean) => {
    if (isRetry) return isCorrect ? 15 : 5;
    if (!isCorrect) return diff === 'hard' ? 15 : 10;
    if (diff === 'hard') return 50;
    if (diff === 'easy') return 20;
    return 30;
  };

  const persistQuizRecord = (
    gradedAnswers: Record<string, QuizUserAnswer>,
    questionsToSave: QuizQuestion[],
    meta: NonNullable<typeof activeMeta>,
    finalElapsedSec: number,
    isLogged: boolean,
    earnedPts: number
  ) => {
    const scoreCount = questionsToSave.filter((q) => gradedAnswers[q.id]?.isCorrect).length;
    const record: QuizSessionRecord = {
      id: meta.recordId,
      subjectId: meta.subjectId,
      subjectName: meta.subjectName,
      unitName: meta.unitName,
      gradingMode: meta.gradingMode,
      difficulty: meta.difficulty,
      createdAt: meta.startedAtMs,
      elapsedSeconds: finalElapsedSec,
      questions: questionsToSave,
      answers: gradedAnswers,
      scoreCount,
      pointsEarned: earnedPts,
      pointsAwarded: true,
      loggedToStudy: isLogged,
    };

    setQuizHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== record.id);
      return [record, ...filtered].slice(0, 15);
    });
  };

  // Instant mode: check current single question
  const handleInstantCheck = () => {
    if (!currentQuestion || !currentAnswer || currentAnswer.checked) return;
    const isCorrect = evaluateQuestionAnswer(currentQuestion, currentAnswer);
    const earned = getPointsForQuestion(
      isCorrect,
      activeMeta?.difficulty || 'medium',
      activeMeta?.isRetry
    );
    const earnedXp = earned;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAnswer,
        checked: true,
        isCorrect,
      },
    }));
    onEarnPoints(earned);
    onEarnXp?.(earnedXp);
    onRecordQuestionsAnswered?.(1);
    setSessionPointsEarned((prev) => prev + earned);
    setSessionXpEarned((prev) => prev + earnedXp);
    setLastQuestionPoints(earned);
    setLastQuestionXp(earnedXp);
    // Automatically open explanation if wrong!
    setShowInstantExplanation(!isCorrect);
  };

  const handleNextOrFinishInstant = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowHint(false);
      setShowInstantExplanation(false);
      setLastQuestionPoints(null);
      setLastQuestionXp(null);
      return;
    }

    if (activeMeta) {
      persistQuizRecord(
        answers,
        activeQuestions,
        activeMeta,
        elapsedSeconds,
        loggedToStudy,
        sessionPointsEarned
      );
    }
    setStage('summary');
  };

  // Batch mode: grade all questions at once
  const handleBatchGradeAll = () => {
    const graded: Record<string, QuizUserAnswer> = {};
    let totalEarned = 0;
    let correctTotal = 0;

    activeQuestions.forEach((q) => {
      const prev = answers[q.id] || {
        choiceIndex: null,
        text: '',
        checked: false,
        isCorrect: null,
      };
      const isCorrect = evaluateQuestionAnswer(q, prev);
      if (isCorrect) correctTotal += 1;
      totalEarned += getPointsForQuestion(
        isCorrect,
        activeMeta?.difficulty || 'medium',
        activeMeta?.isRetry
      );
      graded[q.id] = {
        ...prev,
        checked: true,
        isCorrect,
      };
    });

    if (!activeMeta?.isRetry && activeQuestions.length >= 3 && correctTotal === activeQuestions.length) {
      totalEarned += 50; // All-correct bonus
    }

    onEarnPoints(totalEarned);
    onEarnXp?.(totalEarned);
    onRecordQuestionsAnswered?.(activeQuestions.length);
    setSessionPointsEarned(totalEarned);
    setSessionXpEarned(totalEarned);
    setAnswers(graded);
    if (activeMeta) {
      persistQuizRecord(graded, activeQuestions, activeMeta, elapsedSeconds, loggedToStudy, totalEarned);
    }
    setStage('summary');
  };

  const handleRetryWrongOnly = () => {
    const wrongQuestions = activeQuestions.filter((q) => !answers[q.id]?.isCorrect);
    if (wrongQuestions.length === 0 || !activeMeta) return;

    const resetAnswers: Record<string, QuizUserAnswer> = {};
    wrongQuestions.forEach((q) => {
      resetAnswers[q.id] = {
        choiceIndex: null,
        text: '',
        checked: false,
        isCorrect: null,
      };
    });

    setActiveQuestions(wrongQuestions);
    setAnswers(resetAnswers);
    setCurrentIndex(0);
    setShowHint(false);
    setShowInstantExplanation(false);
    setElapsedSeconds(0);
    setLoggedToStudy(false);
    setSessionPointsEarned(0);
    setSessionXpEarned(0);
    setLastQuestionPoints(null);
    setLastQuestionXp(null);
    setActiveMeta({
      ...activeMeta,
      recordId: `quiz-retry-${Date.now()}`,
      startedAtMs: Date.now(),
      isRetry: true,
    });
    setStage('solving');
  };

  const handleOpenHistoryRecord = (record: QuizSessionRecord) => {
    setActiveQuestions(record.questions);
    setAnswers(record.answers);
    setElapsedSeconds(record.elapsedSeconds);
    setLoggedToStudy(record.loggedToStudy);
    setSessionPointsEarned(record.pointsEarned || 0);
    setSessionXpEarned(record.pointsEarned || 0);
    setLastQuestionPoints(null);
    setLastQuestionXp(null);
    setReviewFilter('all');
    setActiveMeta({
      recordId: record.id,
      subjectId: record.subjectId,
      subjectName: record.subjectName,
      unitName: record.unitName,
      gradingMode: record.gradingMode,
      difficulty: record.difficulty,
      startedAtMs: record.createdAt,
    });
    setStage('summary');
  };

  const handleSaveStudyTime = () => {
    if (!activeMeta || loggedToStudy) return;
    const total = activeQuestions.length;
    const correctCount = activeQuestions.filter((q) => answers[q.id]?.isCorrect).length;
    const durationToLog = Math.max(60, elapsedSeconds); // at least 1 min if completed quickly
    onLogQuizStudyTime({
      subjectId: activeMeta.subjectId,
      dateKey: getLocalDateKey(new Date(activeMeta.startedAtMs)),
      startTime: activeMeta.startedAtMs,
      durationSeconds: durationToLog,
      memo: `${activeMeta.unitName} 문제 풀이 (${correctCount}/${total})`,
    });
    setLoggedToStudy(true);
    persistQuizRecord(
      answers,
      activeQuestions,
      activeMeta,
      elapsedSeconds,
      true,
      sessionPointsEarned
    );
  };

  const answeredCount = useMemo(() => {
    return activeQuestions.filter((q) => {
      const a = answers[q.id];
      if (!a) return false;
      return q.type === 'multiple_choice' ? a.choiceIndex !== null : a.text.trim().length > 0;
    }).length;
  }, [activeQuestions, answers]);

  // ==========================
  // STAGE 1: SETUP & HISTORY
  // ==========================
  if (stage === 'setup') {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Quiz Builder Card */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              맞춤형 연습 문제 만들기
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              과목과 단원을 고르면 AI가 바로 풀어볼 수 있는 연습 문제를 만들어줍니다.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {/* 1. Subject Selection */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                01. 과목 선택
              </span>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                {subjects.map((subj) => {
                  const selected = subj.id === activeSetupSubject?.id;
                  const c = SUBJECT_COLORS[subj.color];
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(subj.id);
                        setUnitName('');
                        setGenerateError(null);
                      }}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                      <span>{subj.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Unit / Chapter Selection */}
            <div>
              <label
                htmlFor="quiz-unit-input"
                className="block text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                02. 공부할 단원 입력 또는 선택
              </label>
              <input
                id="quiz-unit-input"
                type="text"
                maxLength={60}
                value={unitName}
                onChange={(e) => {
                  setUnitName(e.target.value);
                  if (generateError) setGenerateError(null);
                }}
                placeholder="예: 미분법, 관계대명사, 데이터베이스 정규화..."
                className="mt-2 min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />

              <div className="mt-2.5 flex flex-wrap gap-2">
                {suggestedUnits.map((unit) => {
                  const selected = unitName.trim() === unit;
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        setUnitName(unit);
                        setGenerateError(null);
                      }}
                      className={`min-h-[38px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {unit}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Two Grading Modes */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                03. 채점 방식 선택
              </span>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setGradingMode('instant')}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors ${
                    gradingMode === 'instant'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      gradingMode === 'instant'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    한 문제씩 즉시 채점
                  </span>
                  <span className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    매 문제를 풀고 바로 채점하며, 틀리면 풀이를 즉시 확인합니다.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradingMode('batch')}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors ${
                    gradingMode === 'batch'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:border-indigo-400 dark:bg-indigo-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      gradingMode === 'batch'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    여러 문제 풀고 일괄 채점
                  </span>
                  <span className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    모든 문제를 끝까지 푼 뒤 마지막에 한 번에 채점하고 복습합니다.
                  </span>
                </button>
              </div>
            </div>

            {/* 4. Options: Count, Difficulty, Question Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  문제 수
                </span>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {COUNT_OPTIONS.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors tabular-nums ${
                        questionCount === cnt
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cnt}문제
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  난이도
                </span>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDifficulty(opt.id)}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                        difficulty === opt.id
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  유형
                </span>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuizQuestionType)}
                  aria-label="문제 유형"
                  className="mt-1.5 min-h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {generateError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {generateError}
              </div>
            )}

            <button
              type="button"
              onClick={() => startNewQuiz()}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span>문제 만들고 10분 예습 시작하기</span>
            </button>
          </div>
        </section>

        {/* Recent Quiz History Sidebar */}
        <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              최근 푼 문제 기록 ({quizHistory.length})
            </h2>
            {quizHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setQuizHistory([])}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                기록 비우기
              </button>
            )}
          </div>

          {quizHistory.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                아직 푼 문제 세트가 없습니다
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                문제를 풀고 채점하면 이곳에 점수와 오답 풀이가 저장되어 언제든 복습할 수 있습니다.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {quizHistory.map((rec) => {
                const subj = subjects.find((s) => s.id === rec.subjectId);
                const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.indigo;
                const modeText = rec.gradingMode === 'instant' ? '즉시 채점' : '일괄 채점';
                return (
                  <li
                    key={rec.id}
                    className="flex min-h-[68px] items-center justify-between gap-2 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenHistoryRecord(rec)}
                      className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {rec.unitName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate pl-4.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {rec.subjectName}
                        <span aria-hidden="true"> · </span>
                        {modeText}
                        <span aria-hidden="true"> · </span>
                        {formatDurationKorean(rec.elapsedSeconds)}
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-1 font-mono text-sm font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                        {rec.scoreCount}/{rec.questions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuizHistory((prev) => prev.filter((item) => item.id !== rec.id))
                        }
                        aria-label="문제 기록 삭제"
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    );
  }

  // ======================================================
  // STAGE 1.5: 10-MINUTE STUDY PREPARATION SCREEN
  // ======================================================
  if (stage === 'preparing' && prepConfig) {
    const prepRadius = 84;
    const prepCircumference = 2 * Math.PI * prepRadius;
    const prepProgress = (QUIZ_PREP_SECONDS - prepRemainingSeconds) / QUIZ_PREP_SECONDS;
    const prepDashoffset = prepCircumference * (1 - prepProgress);
    const checklistItems = [
      `${prepConfig.unitName} 핵심 용어와 기본 개념 3가지 머릿속으로 떠올리기`,
      `${prepConfig.subjectName} 과목에서 자주 헷갈리는 조건·예외 정리하기`,
      `직접 메모장에 중요 공식이나 키워드 적어보고 문제 풀이 준비하기`,
    ];

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Preparation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-xs sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleCancelPreparation}
              aria-label="설정으로 돌아가기"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                [{prepConfig.subjectName}] {prepConfig.unitName} 자율 예습 시간
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                문제가 출제되는 동안 10분 예습 타이머로 해당 단원을 미리 복습해보세요.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
              prepStatus === 'ready'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : prepStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
            }`}
          >
            {prepStatus === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {prepStatus === 'ready' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {prepStatus === 'error' && <XCircle className="h-3.5 w-3.5" />}
            {prepStatus === 'loading'
              ? 'AI 문제 출제 중...'
              : prepStatus === 'ready'
                ? `출제 완료 (${preparedQuestions?.length || 0}문제)`
                : '출제 오류'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Left: 10-Minute Study Countdown Clock */}
          <section className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="w-full">
              <p className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                10분 과목 공부 시간
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                타이머가 끝나면 자동으로 문제 풀이가 시작됩니다
              </p>
            </div>

            <div className="relative my-6 flex h-48 w-48 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
                <circle
                  cx="100"
                  cy="100"
                  r={prepRadius}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={prepRadius}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={prepCircumference}
                  strokeDashoffset={prepDashoffset}
                  className="stroke-indigo-600 transition-[stroke-dashoffset] duration-300 dark:stroke-indigo-400"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-4xl font-bold text-slate-900 tabular-nums dark:text-white">
                  {formatTimerClock(prepRemainingSeconds)}
                </span>
                <span className="mt-1 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  공부 경과 {formatTimerClock(prepElapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={() => setPrepPaused((prev) => !prev)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {prepPaused ? (
                  <>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    예습 타이머 다시 시작
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" aria-hidden="true" />
                    예습 타이머 일시정지
                  </>
                )}
              </button>

              {prepStatus === 'error' ? (
                <button
                  type="button"
                  onClick={() => void fetchQuizForPreparation(prepConfig)}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  문제 다시 출제하기
                </button>
              ) : (
                <button
                  type="button"
                  disabled={prepStatus !== 'ready'}
                  onClick={enterSolvingWithPrepared}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prepStatus === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      문제 생성 대기 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      공부 완료 · 바로 문제 풀기
                    </>
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Right: Subject Study Checklist & Scratchpad */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {prepConfig.subjectName} · {prepConfig.unitName} 예습 가이드
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                문제를 풀기 전 아래 체크리스트와 메모장을 활용해 단원 핵심을 짚어보세요.
              </p>

              {prepError && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                >
                  {prepError}
                </div>
              )}

              <div className="mt-4 space-y-2">
                {checklistItems.map((label, idx) => {
                  const checked = prepChecklist[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setPrepChecklist((prev) =>
                          prev.map((val, i) => (i === idx ? !val : val))
                        )
                      }
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                        checked
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 line-through dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="prep-notes-input"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  예습 메모장 (핵심 개념 · 공식 적어보기)
                </label>
                <textarea
                  id="prep-notes-input"
                  rows={4}
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder={`${prepConfig.unitName} 단원에서 꼭 기억해야 할 개념이나 공식을 자유롭게 정리해보세요...`}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includePrepStudyTime}
                onChange={(e) => setIncludePrepStudyTime(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                문제 풀이를 시작할 때 예습 시간({formatDurationKorean(prepElapsedSeconds)})을 공부 기록과 경험치에 반영
              </span>
            </label>
          </section>
        </div>
      </div>
    );
  }

  // ==========================
  // STAGE 2: SOLVING VIEW
  // ==========================
  if (stage === 'solving' && currentQuestion && activeMeta) {
    const isInstant = activeMeta.gradingMode === 'instant';
    const isChecked = !!currentAnswer?.checked;
    const isMultipleChoice = currentQuestion.type === 'multiple_choice';
    const hasInput = isMultipleChoice
      ? currentAnswer?.choiceIndex !== null && currentAnswer?.choiceIndex !== undefined
      : (currentAnswer?.text || '').trim().length > 0;

    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Top Solving Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs sm:px-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setStage('setup')}
              aria-label="문제 설정으로 돌아가기"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {activeMeta.unitName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {activeMeta.subjectName}
                <span aria-hidden="true"> · </span>
                {isInstant ? '한 문제씩 즉시 채점' : '전체 풀이 후 일괄 채점'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs font-semibold text-slate-600 tabular-nums dark:text-slate-300">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatTimerClock(elapsedSeconds)}
            </span>
            <span>
              {currentIndex + 1} / {activeQuestions.length}
            </span>
          </div>
        </div>

        {/* Question Step Navigator */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {activeQuestions.map((q, idx) => {
            const ans = answers[q.id];
            const isCurrent = idx === currentIndex;
            const isAnswered =
              q.type === 'multiple_choice'
                ? ans?.choiceIndex !== null && ans?.choiceIndex !== undefined
                : (ans?.text || '').trim().length > 0;
            const lockedInInstant = isInstant && idx > currentIndex && !ans?.checked;

            let btnStyle =
              'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
            if (ans?.checked) {
              btnStyle = ans.isCorrect
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-300';
            } else if (isCurrent) {
              btnStyle = 'border-indigo-600 bg-indigo-600 text-white';
            } else if (isAnswered) {
              btnStyle =
                'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300';
            }

            return (
              <button
                key={q.id}
                type="button"
                disabled={lockedInInstant}
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowHint(false);
                  setShowInstantExplanation(
                    isInstant && !!answers[q.id]?.checked && !answers[q.id]?.isCorrect
                  );
                }}
                className={`flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors shrink-0 disabled:opacity-40 ${btnStyle}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question Body Card */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
              문제 {currentIndex + 1} · {isMultipleChoice ? '객관식 4지선다' : '단답형'}
            </span>
            {currentQuestion.hint && (
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {showHint ? '힌트 닫기' : '힌트 보기'}
              </button>
            )}
          </div>

          <h2 className="mt-3 whitespace-pre-line text-base font-semibold leading-relaxed text-slate-900 sm:text-lg dark:text-white">
            {currentQuestion.question}
          </h2>

          {showHint && currentQuestion.hint && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
              힌트: {currentQuestion.hint}
            </div>
          )}

          {/* Answer Input Area */}
          {isMultipleChoice ? (
            <div className="mt-5 space-y-2.5">
              {currentQuestion.choices.map((choice, cIdx) => {
                const isSelected = currentAnswer?.choiceIndex === cIdx;
                const isCorrectChoice = cIdx === currentQuestion.correctChoiceIndex;

                let optionClasses =
                  'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800';

                if (isChecked) {
                  if (isCorrectChoice) {
                    optionClasses =
                      'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-100';
                  } else if (isSelected && !isCorrectChoice) {
                    optionClasses =
                      'border-rose-500 bg-rose-50 text-rose-900 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-100';
                  } else {
                    optionClasses =
                      'border-slate-200/70 bg-slate-50/60 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500';
                  }
                } else if (isSelected) {
                  optionClasses =
                    'border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100';
                }

                return (
                  <button
                    key={cIdx}
                    type="button"
                    disabled={isInstant && isChecked}
                    onClick={() => updateCurrentChoice(cIdx)}
                    className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${optionClasses}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cIdx + 1}
                      </span>
                      <span className="leading-relaxed">{choice}</span>
                    </div>

                    {isChecked && isCorrectChoice && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {isChecked && isSelected && !isCorrectChoice && (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <label
                htmlFor="short-answer-input"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                정답 입력
              </label>
              <input
                id="short-answer-input"
                type="text"
                disabled={isInstant && isChecked}
                value={currentAnswer?.text || ''}
                onChange={(e) => updateCurrentShortText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isInstant && !isChecked && hasInput) {
                    e.preventDefault();
                    handleInstantCheck();
                  }
                }}
                placeholder="정답을 입력하세요"
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none disabled:opacity-75 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          {/* Instant Mode Feedback & Explanation */}
          {isInstant && isChecked && (
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div
                className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                  currentAnswer.isCorrect
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {currentAnswer.isCorrect ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>정답입니다!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>
                        오답입니다 · 정답:{' '}
                        {isMultipleChoice
                          ? `${currentQuestion.correctChoiceIndex + 1}번 (${currentQuestion.choices[currentQuestion.correctChoiceIndex]})`
                          : currentQuestion.shortAnswer}
                      </span>
                    </>
                  )}
                  {lastQuestionPoints !== null && (
                    <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums dark:text-indigo-300">
                      +{lastQuestionPoints} P
                      {lastQuestionXp ? ` · +${lastQuestionXp} XP` : ''}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstantExplanation((prev) => !prev)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold underline"
                >
                  {showInstantExplanation ? (
                    <>
                      풀이 접기 <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      풀이 보기 <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              {showInstantExplanation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    풀이 및 핵심 개념
                  </p>
                  <p className="mt-1.5 whitespace-pre-line">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
            {isInstant ? (
              <>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    const prevIdx = currentIndex - 1;
                    setCurrentIndex(prevIdx);
                    const prevQ = activeQuestions[prevIdx];
                    setShowHint(false);
                    setShowInstantExplanation(
                      !!answers[prevQ.id]?.checked && !answers[prevQ.id]?.isCorrect
                    );
                  }}
                  className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </button>

                {!isChecked ? (
                  <button
                    type="button"
                    disabled={!hasInput}
                    onClick={handleInstantCheck}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 sm:flex-none sm:min-w-[180px]"
                  >
                    <Check className="h-4 w-4" />
                    정답 확인
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextOrFinishInstant}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:flex-none sm:min-w-[180px]"
                  >
                    <span>
                      {currentIndex < activeQuestions.length - 1 ? '다음 문제' : '결과 요약 보기'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1);
                    setShowHint(false);
                  }}
                  className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전
                </button>

                <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                  {currentIndex < activeQuestions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex((prev) => prev + 1);
                        setShowHint(false);
                      }}
                      className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                    >
                      다음
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBatchGradeAll}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap"
                  >
                    <Check className="h-4 w-4" />
                    전체 채점하기 ({answeredCount}/{activeQuestions.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ==========================
  // STAGE 3: SUMMARY & REVIEW
  // ==========================
  const totalCount = activeQuestions.length;
  const correctCount = activeQuestions.filter((q) => answers[q.id]?.isCorrect).length;
  const wrongCount = totalCount - correctCount;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const filteredQuestions = activeQuestions.filter((q) =>
    reviewFilter === 'wrong' ? !answers[q.id]?.isCorrect : true
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Score Summary Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {activeMeta?.subjectName} · {activeMeta?.unitName}
            </p>
            <h1 className="mt-1 font-mono text-3xl font-bold text-slate-900 tabular-nums dark:text-white">
              {totalCount}문제 중 {correctCount}문제 정답 ({scorePercent}%)
            </h1>
            <p className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              풀이 시간 {formatDurationKorean(elapsedSeconds)} ·{' '}
              {activeMeta?.gradingMode === 'instant' ? '즉시 채점 모드' : '일괄 채점 모드'}
              {sessionPointsEarned > 0 ? (
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {' '}
                  · +{sessionPointsEarned} P
                  {sessionXpEarned > 0 ? ` · +${sessionXpEarned} XP` : ''} 획득
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoToShop}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 whitespace-nowrap"
            >
              상점에서 뽑기
            </button>

            <button
              type="button"
              disabled={loggedToStudy}
              onClick={handleSaveStudyTime}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                loggedToStudy
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900/60'
              }`}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              {loggedToStudy ? '공부 기록 저장됨' : '풀이 시간 기록에 저장'}
            </button>

            {wrongCount > 0 && (
              <button
                type="button"
                onClick={handleRetryWrongOnly}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                틀린 문제({wrongCount}) 다시 풀기
              </button>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={() =>
                activeMeta &&
                startNewQuiz({
                  subjectId: activeMeta.subjectId,
                  subjectName: activeMeta.subjectName,
                  unitName: activeMeta.unitName,
                  gradingMode: activeMeta.gradingMode,
                  difficulty: activeMeta.difficulty,
                })
              }
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              같은 단원 새 문제
            </button>

            <button
              type="button"
              onClick={() => setStage('setup')}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              다른 단원 선택
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Full Review List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            문항별 채점 결과 및 풀이
          </h2>
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setReviewFilter('all')}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                reviewFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              전체 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilter('wrong')}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                reviewFilter === 'wrong'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              틀린 문제 ({wrongCount})
            </button>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            틀린 문제가 없습니다. 모든 문제를 정확히 맞혔습니다!
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const originalNumber = activeQuestions.findIndex((item) => item.id === q.id) + 1;
              const ans = answers[q.id];
              const isCorrect = !!ans?.isCorrect;
              const userDisplay =
                q.type === 'multiple_choice'
                  ? ans?.choiceIndex !== null && ans?.choiceIndex !== undefined
                    ? `${ans.choiceIndex + 1}번 (${q.choices[ans.choiceIndex]})`
                    : '미응답'
                  : ans?.text?.trim() || '미응답';
              const correctDisplay =
                q.type === 'multiple_choice'
                  ? `${q.correctChoiceIndex + 1}번 (${q.choices[q.correctChoiceIndex]})`
                  : q.shortAnswer;

              return (
                <article
                  key={q.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      문제 {originalNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isCorrect
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          정답
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          오답
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-900 sm:text-base dark:text-white">
                    {q.question}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      <span className="font-medium text-slate-400">내 답안: </span>
                      <span
                        className={
                          isCorrect
                            ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                            : 'font-semibold text-rose-700 dark:text-rose-300'
                        }
                      >
                        {userDisplay}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p>
                        <span className="font-medium text-slate-400">정답: </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {correctDisplay}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 sm:text-sm dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      풀이
                    </p>
                    <p className="mt-1 whitespace-pre-line">{q.explanation}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
