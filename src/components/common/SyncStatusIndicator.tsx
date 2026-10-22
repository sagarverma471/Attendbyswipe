import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { subscribeFirestoreSync, FirestoreSyncState } from '../../services/syncStatusService';

interface SyncStatusIndicatorProps {
  className?: string;
  floating?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  floating = true,
}) => {
  const [syncState, setSyncState] = useState<FirestoreSyncState>({
    isSyncing: false,
    status: 'idle',
    message: '',
    lastSyncedAt: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeFirestoreSync((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  // When idle, do not render anything to remain completely non-intrusive
  if (syncState.status === 'idle') {
    return null;
  }

  const baseContainerClasses = floating
    ? 'fixed top-3.5 right-4 z-50 pointer-events-none'
    : 'inline-flex items-center';

  return (
    <div className={`${baseContainerClasses} ${className}`}>
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 transform animate-in fade-in slide-in-from-top-2 border ${
          syncState.status === 'syncing'
            ? 'bg-[#091024]/90 border-cyan-500/50 text-cyan-300 shadow-cyan-950/50'
            : syncState.status === 'synced'
            ? 'bg-[#061A14]/90 border-emerald-500/50 text-emerald-300 shadow-emerald-950/50'
            : 'bg-[#1F0E0E]/90 border-amber-500/50 text-amber-300 shadow-amber-950/50'
        }`}
      >
        {/* Animated Status Icon */}
        {syncState.status === 'syncing' && (
          <span className="relative flex items-center justify-center">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </span>
        )}

        {syncState.status === 'synced' && (
          <Check className="w-3 h-3 text-emerald-400 animate-in zoom-in-75 duration-200" />
        )}

        {syncState.status === 'error' && (
          <AlertCircle className="w-3 h-3 text-amber-400" />
        )}

        {/* Status Message */}
        <span className="font-mono text-[11px] font-semibold tracking-tight">
          {syncState.status === 'syncing'
            ? syncState.message || 'Syncing to Firestore...'
            : syncState.status === 'synced'
            ? 'Synced to Firestore'
            : 'Sync Error'}
        </span>

        {/* Subtle Firestore Cloud Pill */}
        <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-bold opacity-60 ml-0.5 font-mono">
          <Cloud className="w-2.5 h-2.5" />
          <span>Cloud</span>
        </span>
      </div>
    </div>
  );
};
