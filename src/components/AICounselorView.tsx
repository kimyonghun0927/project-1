import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send } from 'lucide-react';
import { QuizSessionRecord } from '../types/quiz';
import { CoachMessage } from '../types/shop';
import { StudySession, StudySettings, Subject } from '../types/study';
import { computeStreakDays, formatDurationKorean, getLocalDateKey } from '../utils/time';

interface AICounselorViewProps {
  subjects: Subject[];
  sessions: StudySession[];
  settings: StudySettings;
  protectedDates: string[];
}

const COACH_STORAGE_KEY = 'gongbulog_coach_messages_v1';
const QUIZ_HISTORY_KEY = 'gongbulog_quiz_history_v1';

const QUICK_PROMPTS = [
  '오늘 내 공부 기록 바탕으로 학습 계획 세워줘',
  '집중력이 떨어질 때 뽀모도로 활용법 알려줘',
  '틀린 문제 단원을 효과적으로 복습하는 방법',
  '시험 일주일 전 암기 과목 마무리 전략',
];

function loadMessages(): CoachMessage[] {
  try {
    const raw = localStorage.getItem(COACH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const AICounselorView: React.FC<AICounselorViewProps> = ({
  subjects,
  sessions,
  settings,
  protectedDates,
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const studyContext = useMemo(() => {
    const todayKey = getLocalDateKey();
    const todaySeconds = sessions
      .filter((s) => s.dateKey === todayKey)
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekSeconds = sessions
      .filter((s) => s.startTime >= sevenDaysAgoMs)
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    let recentQuizzes: Array<{ unit: string; subject: string; score: string }> = [];
    try {
      const rawQuizzes = localStorage.getItem(QUIZ_HISTORY_KEY);
      if (rawQuizzes) {
        const parsed = JSON.parse(rawQuizzes) as QuizSessionRecord[];
        if (Array.isArray(parsed)) {
          recentQuizzes = parsed.slice(0, 4).map((q) => ({
            subject: q.subjectName,
            unit: q.unitName,
            score: `${q.scoreCount}/${q.questions.length}`,
          }));
        }
      }
    } catch {
      recentQuizzes = [];
    }

    return {
      subjects: subjects.map((s) => s.name),
      todayMinutes: Math.round(todaySeconds / 60),
      weekMinutes: Math.round(weekSeconds / 60),
      dailyGoalMinutes: settings.dailyGoalMinutes,
      streakDays: computeStreakDays(sessions, protectedDates),
      recentQuizzes,
    };
  }, [protectedDates, sessions, settings.dailyGoalMinutes, subjects]);

  const sendMessage = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    if (!textOverride) setInput('');

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    };

    const assistantId = `model-${Date.now() + 1}`;
    const assistantPlaceholder: CoachMessage = {
      id: assistantId,
      role: 'model',
      text: '',
      createdAt: Date.now() + 1,
    };

    const historySnapshot = messages.slice(-14).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historySnapshot,
          studyContext,
        }),
      });

      if (!response.ok || !response.body) {
        const errPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errPayload.error || 'AI 상담 응답을 받아오지 못했습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          const data = JSON.parse(jsonStr) as {
            text?: string;
            done?: boolean;
            error?: string;
          };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + data.text } : m
              )
            );
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 상담 중 오류가 발생했습니다.';
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.text.length > 0));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleResetChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setError(null);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-13.5rem)] min-h-[480px] max-w-4xl flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs md:h-[calc(100vh-11rem)] dark:border-slate-800 dark:bg-slate-900">
      {/* Top Header with Study Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
            AI 공부 상담
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            오늘 {formatDurationKorean(studyContext.todayMinutes * 60)}
            <span aria-hidden="true"> · </span>
            연속 {studyContext.streakDays}일
            <span aria-hidden="true"> · </span>
            등록 과목 {studyContext.subjects.length}개 반영 중
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            disabled={isStreaming}
            onClick={handleResetChat}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            새 상담
          </button>
        )}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="max-w-md space-y-2">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                공부 고민이나 학습 계획을 물어보세요
              </p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                현재 기록된 공부 시간, 과목, 최근 문제 풀이 기록을 바탕으로 맞춤형 학습 조언을 드립니다.
              </p>
            </div>

            <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-medium leading-relaxed text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200/80 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                    }`}
                  >
                    {msg.text ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        답변을 정리하고 있습니다...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={scrollEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 sm:mx-6 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3 sm:p-4 dark:border-slate-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="공부 방법, 슬럼프, 과목별 질문 무엇이든 입력해보세요..."
          aria-label="AI 공부 상담 메시지 입력"
          className="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          aria-label="전송"
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">전송</span>
        </button>
      </form>
    </div>
  );
};
