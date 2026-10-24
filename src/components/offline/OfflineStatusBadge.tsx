import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  subscribeOfflineSync,
  getCurrentSyncStatus,
  OfflineSyncStatus,
} from '../../services/offlineSyncService';

interface OfflineStatusBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({
  onClick,
  className = '',
}) => {
  const [status, setStatus] = useState<OfflineSyncStatus>(getCurrentSyncStatus());

  useEffect(() => {
    const unsub = subscribeOfflineSync((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsub();
  }, []);

  const { isOnline, stateCategory, pendingCount, isSyncing } = status;

  if (!isOnline) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer hover:bg-amber-500/25 active:scale-95 ${className}`}
        title="You're offline. Attendance will be saved on this device."
      >
        <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span className="hidden sm:inline">Offline (Saved to Device)</span>
        <span className="sm:hidden">Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500/25 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
            {pendingCount}
          </span>
        )}
      </button>
    );
  }

  if (isSyncing) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition-all cursor-pointer hover:bg-cyan-500/25 ${className}`}
        title="Synchronizing your attendance records..."
      >
        <RefreshCw className="w-3.5 h-3.5 shrink-0 text-cyan-400 animate-spin" />
        <span className="hidden sm:inline">Synchronizing...</span>
        <span className="sm:hidden">Syncing</span>
      </button>
    );
  }

  if (stateCategory === 'error') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer hover:bg-rose-500/25 ${className}`}
        title="Some changes could not be synchronized. Your local records are preserved."
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
        <span className="hidden sm:inline">Sync Error (Saved Locally)</span>
        <span className="sm:hidden">Sync Retry</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all cursor-pointer hover:bg-amber-500/25 ${className}`}
        title={`${pendingCount} attendance session(s) waiting to sync.`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span className="hidden sm:inline">{pendingCount} Waiting to Sync</span>
        <span className="sm:hidden">{pendingCount} Pending</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold transition-all cursor-pointer hover:bg-emerald-500/20 ${className}`}
      title="Connected — all changes synchronized."
    >
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
      <span className="hidden md:inline">Online • Synced</span>
      <span className="md:hidden">Synced</span>
    </button>
  );
};
