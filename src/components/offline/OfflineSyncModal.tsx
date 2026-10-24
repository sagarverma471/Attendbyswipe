import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import {
  subscribeOfflineSync,
  syncPendingOfflineSessions,
  getCurrentSyncStatus,
  OfflineSyncStatus,
} from '../../services/offlineSyncService';
import {
  requestPersistentStorage,
  dbExportFullBackup,
  dbImportFullBackup,
  dbGetSyncQueue,
  SyncQueueItem,
} from '../../services/db/indexedDBService';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>(getCurrentSyncStatus());
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<{
    persisted: boolean;
    usageMB: number;
    quotaMB: number;
    percentUsed: number;
  }>({
    persisted: false,
    usageMB: 0,
    quotaMB: 0,
    percentUsed: 0,
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to real-time offline sync status
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeOfflineSync((status) => {
      setSyncStatus(status);
    });

    // Load queue items and storage estimates
    refreshQueueAndStorage();

    return () => unsub();
  }, [isOpen]);

  const refreshQueueAndStorage = async () => {
    try {
      const q = await dbGetSyncQueue();
      setQueueItems(q.filter((i) => i.status !== 'synced'));
      const est = await requestPersistentStorage();
      setStorageInfo(est);
    } catch (e) {
      console.warn('Error refreshing queue/storage info:', e);
    }
  };

  const handleSyncNow = async () => {
    setMessage(null);
    try {
      const res = await syncPendingOfflineSessions();
      if (res.syncedCount > 0) {
        setMessage({
          text: `Successfully synchronized ${res.syncedCount} offline record(s) to cloud!`,
          type: 'success',
        });
      } else if (res.remainingCount > 0) {
        setMessage({
          text: `Sync could not reach the server. Your records remain safely stored on this device.`,
          type: 'info',
        });
      }
      refreshQueueAndStorage();
    } catch (err: any) {
      setMessage({
        text: err.message || 'Sync failed. Local records are preserved.',
        type: 'error',
      });
    }
  };

  const handleRequestPersistence = async () => {
    const res = await requestPersistentStorage();
    setStorageInfo(res);
    if (res.persisted) {
      setMessage({
        text: 'Persistent browser storage granted! Operating system will not purge offline data.',
        type: 'success',
      });
    } else {
      setMessage({
        text: 'Storage permission requested. Your browser handles retention automatically.',
        type: 'info',
      });
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backup = await dbExportFullBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `SwipeAttend_Offline_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({
        text: 'Offline database backup downloaded successfully!',
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: 'Backup export failed: ' + (err.message || 'Unknown error'),
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await dbImportFullBackup(backup);
      setMessage({
        text: `Restored ${Object.entries(res.importedCounts)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ')} from backup file!`,
        type: 'success',
      });
      if (onDataRestored) {
        onDataRestored();
      }
      refreshQueueAndStorage();
    } catch (err: any) {
      setMessage({
        text: 'Restore failed: ' + (err.message || 'Invalid backup file'),
        type: 'error',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-['Plus_Jakarta_Sans']">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0A0E1A] border border-white/10 rounded-3xl p-5 sm:p-7 flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Offline Storage & Sync Manager</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono border border-cyan-500/30">
                  IndexedDB
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Device database status, cloud sync queue, and offline disaster recovery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs">
          {/* Status Alert Banner */}
          {message && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 animate-fade-in ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : message.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : message.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="text-xs leading-relaxed">{message.text}</span>
            </div>
          )}

          {/* Section 1: Real-time Connection & Sync State */}
          <div className="p-4 rounded-2xl bg-[#101526] border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                {syncStatus.isOnline ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wifi className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <WifiOff className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {syncStatus.isOnline ? 'Online Connection' : 'Offline Mode Active'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                        syncStatus.stateCategory === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : syncStatus.stateCategory === 'offline'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : syncStatus.stateCategory === 'syncing'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {syncStatus.stateCategory.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">{syncStatus.statusMessage}</p>
                </div>
              </div>

              {/* Sync Now Button */}
              {syncStatus.isOnline && (
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncStatus.isSyncing}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-600/30 disabled:opacity-50 transition-all shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
            </div>

            {/* Pending queue items preview */}
            {queueItems.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-300">
                  {queueItems.length} Operation(s) waiting in device queue:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-[#070A14] border border-white/5 flex items-center justify-between text-slate-300"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="capitalize">{item.entityType}:</span>
                        <span className="truncate text-slate-400">{item.idempotencyKey}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Device Storage & Quota */}
          <div className="p-4 rounded-2xl bg-[#101526] border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Local Browser Storage & Persistence</span>
              </div>
              <button
                type="button"
                onClick={handleRequestPersistence}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  storageInfo.persisted
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {storageInfo.persisted ? '✓ Storage Persisted' : 'Request Persistent Storage'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>IndexedDB Usage</span>
                <span>
                  {storageInfo.usageMB} MB / {storageInfo.quotaMB > 0 ? `${storageInfo.quotaMB} MB` : 'Available'} ({storageInfo.percentUsed}% used)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(2, storageInfo.percentUsed))}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Attendance records, student rosters, portrait photos, and session decisions are saved in high-capacity IndexedDB on this device.
            </p>
          </div>

          {/* Section 3: Backup & Recovery */}
          <div className="p-4 rounded-2xl bg-[#101526] border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Offline Data Backup & Recovery</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Save an independent JSON snapshot of your local classrooms, students, and attendance sessions, or restore from a previously exported backup file.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-200 hover:text-white font-semibold transition-all cursor-pointer shadow-xs min-h-[38px]"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isExporting ? 'Exporting...' : 'Export Offline Backup (.json)'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-200 hover:text-white font-semibold transition-all cursor-pointer shadow-xs min-h-[38px]"
              >
                <Upload className="w-3.5 h-3.5 text-violet-400" />
                <span>{isImporting ? 'Restoring...' : 'Restore from Backup File'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 4: First-Time Setup & Installation Guide */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border border-violet-500/25 space-y-3">
            <div className="flex items-center gap-2 text-violet-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>How Offline Attendance Works on SwipeAttend</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Online Preload
                </span>
                <p className="text-slate-400">
                  Open SwipeAttend once while connected to download the app bundle, student rosters, and portrait photos into cache.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Classroom Swiping
                </span>
                <p className="text-slate-400">
                  Take attendance in classrooms with zero internet. Swipe decisions are immediately saved in IndexedDB.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">3</span>
                  Local Finalize
                </span>
                <p className="text-slate-400">
                  Review metrics and confirm your session locally. The session appears in history and CSV exports work offline.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">4</span>
                  Auto Cloud Sync
                </span>
                <p className="text-slate-400">
                  When you step outside or reconnect to Wi-Fi, pending sessions automatically synchronize with the cloud database.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/8 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 font-mono">
            SwipeAttend — Less Paper. Smarter Attendance.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
