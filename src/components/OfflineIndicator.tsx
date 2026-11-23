import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-md md:bottom-6 md:left-auto md:right-6 dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>오프라인 모드 — 기기에 저장된 데이터로 정상 작동 중</span>
    </div>
  );
};
