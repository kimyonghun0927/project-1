import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 whitespace-nowrap shrink-0 dark:border-indigo-800/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        앱 설치
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          홈 화면에 추가
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  iPhone / iPad에 앱 설치하기
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="닫기"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">01</span>
                  <span>
                    Safari 하단(또는 상단) 도구 막대에서{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                      <Share className="h-3.5 w-3.5" aria-hidden="true" /> 공유
                    </span>{' '}
                    버튼을 누르세요.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">02</span>
                  <span>
                    아래로 스크롤하여 <strong className="text-slate-900 dark:text-white">홈 화면에 추가</strong>를 선택하면 앱처럼 바로 실행할 수 있습니다.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
