import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { StudySession, Subject } from '../types/study';
import { SUBJECT_COLORS, getLocalDateKey } from '../utils/time';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  defaultDateKey: string;
  defaultSubjectId: string;
  editingSession: StudySession | null;
  onSave: (data: {
    id?: string;
    subjectId: string;
    dateKey: string;
    startTime: number;
    durationSeconds: number;
    memo: string;
  }) => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  subjects,
  defaultDateKey,
  defaultSubjectId,
  editingSession,
  onSave,
}) => {
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [startHHMM, setStartHHMM] = useState('09:00');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingSession) {
      setSubjectId(editingSession.subjectId);
      setDateKey(editingSession.dateKey);
      const d = new Date(editingSession.startTime);
      setStartHHMM(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
      const totalMins = Math.max(1, Math.round(editingSession.durationSeconds / 60));
      setHours(Math.floor(totalMins / 60));
      setMinutes(totalMins % 60);
      setMemo(editingSession.memo);
    } else {
      setSubjectId(defaultSubjectId || subjects[0]?.id || '');
      setDateKey(defaultDateKey || getLocalDateKey());
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setStartHHMM(
        `${String(oneHourAgo.getHours()).padStart(2, '0')}:${String(
          oneHourAgo.getMinutes()
        ).padStart(2, '0')}`
      );
      setHours(1);
      setMinutes(0);
      setMemo('');
    }
  }, [defaultDateKey, defaultSubjectId, editingSession, isOpen, subjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      setError('공부 시간은 최소 1분 이상이어야 합니다.');
      return;
    }
    if (!subjectId) {
      setError('과목을 선택해주세요.');
      return;
    }

    const [y, m, d] = dateKey.split('-').map(Number);
    const [hh, mm] = startHHMM.split(':').map(Number);
    const startDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);

    onSave({
      id: editingSession?.id,
      subjectId,
      dateKey,
      startTime: startDate.getTime(),
      durationSeconds: totalMinutes * 60,
      memo,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="session-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {editingSession ? '공부 기록 수정' : '공부 기록 추가'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              과목 선택
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {subjects.map((subj) => {
                const active = subj.id === subjectId;
                const c = SUBJECT_COLORS[subj.color];
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setSubjectId(subj.id)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                    <span>{subj.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="session-date"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                날짜
              </label>
              <input
                id="session-date"
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                required
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="session-start"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                시작 시각
              </label>
              <input
                id="session-start"
                type="time"
                value={startHHMM}
                onChange={(e) => setStartHHMM(e.target.value)}
                required
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              공부한 시간
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                  aria-label="시간"
                  className="min-h-[44px] w-full bg-transparent font-mono text-base font-semibold text-slate-900 tabular-nums focus:outline-none dark:text-white"
                />
                <span className="text-sm text-slate-500 whitespace-nowrap dark:text-slate-400">
                  시간
                </span>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                  }
                  aria-label="분"
                  className="min-h-[44px] w-full bg-transparent font-mono text-base font-semibold text-slate-900 tabular-nums focus:outline-none dark:text-white"
                />
                <span className="text-sm text-slate-500 whitespace-nowrap dark:text-slate-400">
                  분
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="session-memo"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              공부 내용 메모 (선택)
            </label>
            <input
              id="session-memo"
              type="text"
              maxLength={80}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 미적분 기출문제 2단원 복습"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              취소
            </button>
            <button
              type="submit"
              className="min-h-[48px] flex-[2] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 whitespace-nowrap"
            >
              {editingSession ? '수정 저장' : '기록 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
