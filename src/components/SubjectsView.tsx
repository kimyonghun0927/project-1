import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { StudySettings, Subject, SubjectColorId } from '../types/study';
import { SUBJECT_COLORS } from '../utils/time';

interface SubjectsViewProps {
  subjects: Subject[];
  settings: StudySettings;
  onAddSubject: (name: string, color: SubjectColorId) => void;
  onUpdateSubject: (id: string, name: string, color: SubjectColorId) => void;
  onDeleteSubject: (id: string) => void;
  onUpdateSettings: (patch: Partial<StudySettings>) => void;
}

const COLOR_OPTIONS: SubjectColorId[] = ['indigo', 'sky', 'emerald', 'amber', 'rose', 'violet'];

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  settings,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onUpdateSettings,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<SubjectColorId>('indigo');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<SubjectColorId>('indigo');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddSubject(newName, newColor);
    setNewName('');
  };

  const startEdit = (subj: Subject) => {
    setEditingId(subj.id);
    setEditName(subj.name);
    setEditColor(subj.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onUpdateSubject(editingId, editName, editColor);
    setEditingId(null);
  };

  const goalHours = Math.floor(settings.dailyGoalMinutes / 60);
  const goalMins = settings.dailyGoalMinutes % 60;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Subject Management */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          공부 과목 관리
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          과목을 추가하거나 색상을 변경해 학습 기록을 깔끔하게 분류하세요.
        </p>

        {/* Add Subject Form */}
        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            maxLength={24}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 과목 이름 (예: 토익, 알고리즘)"
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {COLOR_OPTIONS.map((colorId) => {
                const c = SUBJECT_COLORS[colorId];
                const selected = newColor === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    onClick={() => setNewColor(colorId)}
                    aria-label={c.label}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform ${
                      selected
                        ? 'scale-105 border-slate-900 dark:border-white'
                        : 'border-transparent hover:scale-105'
                    }`}
                  >
                    <span className={`h-5 w-5 rounded-full ${c.dot}`} />
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!newName.trim()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              추가
            </button>
          </div>
        </form>

        {/* Existing Subjects */}
        <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {subjects.map((subj) => {
            const isEditing = editingId === subj.id;
            const c = SUBJECT_COLORS[subj.color];

            if (isEditing) {
              return (
                <li key={subj.id} className="space-y-3 py-3.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={24}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-h-[44px] flex-1 rounded-xl border border-indigo-500 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      aria-label="저장"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="취소"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {COLOR_OPTIONS.map((colorId) => {
                      const col = SUBJECT_COLORS[colorId];
                      return (
                        <button
                          key={colorId}
                          type="button"
                          onClick={() => setEditColor(colorId)}
                          aria-label={col.label}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                            editColor === colorId
                              ? 'border-slate-900 dark:border-white'
                              : 'border-transparent'
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-full ${col.dot}`} />
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            }

            return (
              <li
                key={subj.id}
                className="flex min-h-[58px] items-center justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${c.dot}`} />
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {subj.name}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(subj)}
                    aria-label="과목 수정"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSubject(subj.id)}
                    disabled={subjects.length <= 1}
                    aria-label="과목 삭제"
                    title={subjects.length <= 1 ? '최소 1개의 과목이 필요합니다' : '과목 삭제'}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:text-slate-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Study Goal & Pomodoro Preferences */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          목표 및 타이머 설정
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          일일 목표 시간과 뽀모도로 주기를 내 학습 리듬에 맞게 조절하세요.
        </p>

        <div className="mt-6 space-y-6">
          {/* Daily Goal Slider */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="daily-goal-range"
                className="text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                하루 목표 공부시간
              </label>
              <span className="font-mono text-sm font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
                {goalHours > 0 ? `${goalHours}시간 ` : ''}
                {goalMins > 0 ? `${goalMins}분` : ''}
              </span>
            </div>
            <input
              id="daily-goal-range"
              type="range"
              min={30}
              max={720}
              step={30}
              value={settings.dailyGoalMinutes}
              onChange={(e) =>
                onUpdateSettings({ dailyGoalMinutes: Number(e.target.value) })
              }
              className="mt-3 h-2 w-full cursor-pointer accent-indigo-600"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
              <span>30분</span>
              <span>6시간</span>
              <span>12시간</span>
            </div>
          </div>

          {/* Pomodoro Focus & Break */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              뽀모도로 시간 설정
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pomo-focus"
                  className="block text-xs text-slate-500 dark:text-slate-400"
                >
                  집중 시간 (분)
                </label>
                <input
                  id="pomo-focus"
                  type="number"
                  min={5}
                  max={120}
                  value={settings.pomodoroFocusMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      pomodoroFocusMinutes: Math.max(5, Math.min(120, Number(e.target.value) || 25)),
                    })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="pomo-break"
                  className="block text-xs text-slate-500 dark:text-slate-400"
                >
                  휴식 시간 (분)
                </label>
                <input
                  id="pomo-break"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.pomodoroBreakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      pomodoroBreakMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 5)),
                    })
                  }
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: '25분 / 5분', focus: 25, brk: 5 },
                { label: '50분 / 10분', focus: 50, brk: 10 },
                { label: '90분 / 20분', focus: 90, brk: 20 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      pomodoroFocusMinutes: preset.focus,
                      pomodoroBreakMinutes: preset.brk,
                    })
                  }
                  className={`min-h-[36px] rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    settings.pomodoroFocusMinutes === preset.focus &&
                    settings.pomodoroBreakMinutes === preset.brk
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Theme */}
          <div className="border-t border-slate-100 pt-5 space-y-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                타이머 완료 알림음
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEnabled}
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                화면 테마
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                  className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    settings.theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  라이트
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                  className={`min-h-[34px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    settings.theme === 'dark'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  다크
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
