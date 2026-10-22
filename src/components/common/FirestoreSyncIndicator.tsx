import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Cloud, AlertCircle } from 'lucide-react';
import { subscribeFirestoreSync, FirestoreSyncState } from '../../services/firestoreSyncStatus';

interface FirestoreSyncIndicatorProps {
  /** If true, renders as fixed in the top right corner of the viewport */
  fixed?: boolean;
  className?: string;
}

export const FirestoreSyncIndicator: React.FC<FirestoreSyncIndicatorProps> = ({
  fixed = false,
  className = '',
}) => {
  const [syncState, setSyncState] = useState<FirestoreSyncState>({
    isSyncing: false,
    message: '',
    lastSyncedAt: null,
    status: 'idle',
  });

  useEffect(() => {
    const unsubscribe = subscribeFirestoreSync((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  if (syncState.status === 'idle') {
    return null;
  }

  const containerClasses = fixed
    ? `fixed top-3 right-3 sm:right-5 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300`
    : `inline-flex items-center`;

  return (
    <div className={`${containerClasses} ${className}`} role="status" aria-live="polite">
      {syncState.status === 'syncing' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080E22]/95 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold shadow-lg shadow-cyan-950/60 backdrop-blur-md transition-all">
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
          <span className="tracking-tight">
            {syncState.message || 'Syncing to Firestore...'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
        </div>
      )}

      {syncState.status === 'synced' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#081816]/95 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shadow-lg shadow-emerald-950/50 backdrop-blur-md transition-all animate-in fade-in duration-200">
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="tracking-tight">Synced to Firestore</span>
        </div>
      )}

      {syncState.status === 'error' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F1010]/95 border border-amber-500/40 text-amber-300 text-[11px] font-semibold shadow-lg backdrop-blur-md">
          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="tracking-tight">Saved locally (Sync pending)</span>
        </div>
      )}
    </div>
  );
};
