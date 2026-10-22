import { AttendanceSession } from '../types/attendance';
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const OFFLINE_QUEUE_KEY = 'swipeattend_offline_sync_queue';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  lastEvent?: 'offline' | 'online' | 'synced' | null;
  syncedSessionCount?: number;
}

type SyncListener = (status: OfflineSyncStatus) => void;
const listeners = new Set<SyncListener>();

let currentStatus: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: getPendingQueue().length,
  lastSyncTime: null,
  isSyncing: false,
  lastEvent: null,
};

function notifyListeners(event?: 'offline' | 'online' | 'synced', syncedCount?: number) {
  currentStatus = {
    ...currentStatus,
    pendingCount: getPendingQueue().length,
    lastEvent: event || currentStatus.lastEvent,
    syncedSessionCount: syncedCount !== undefined ? syncedCount : currentStatus.syncedSessionCount,
  };
  listeners.forEach((listener) => listener(currentStatus));
}

export function getPendingQueue(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingQueue(queue: AttendanceSession[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline sync queue', e);
  }
}

/**
 * Enqueue an attendance session taken while offline
 */
export function enqueueOfflineSession(session: AttendanceSession): void {
  const queue = getPendingQueue();
  // Avoid duplicate queue entries
  const existingIdx = queue.findIndex((s) => s.id === session.id);
  if (existingIdx >= 0) {
    queue[existingIdx] = session;
  } else {
    queue.push(session);
  }
  savePendingQueue(queue);
  notifyListeners();
}

/**
 * Flush and sync all pending sessions to cloud
 */
export async function syncPendingOfflineSessions(): Promise<{
  syncedCount: number;
  remainingCount: number;
}> {
  if (!navigator.onLine) {
    return { syncedCount: 0, remainingCount: getPendingQueue().length };
  }

  const queue = getPendingQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  currentStatus.isSyncing = true;
  notifyListeners();

  const remaining: AttendanceSession[] = [];
  let synced = 0;

  for (const session of queue) {
    let success = false;
    // 1. Try Firestore sync
    try {
      if (auth.currentUser || db) {
        await setDoc(doc(db, 'attendance_sessions', session.id), session);
        success = true;
      }
    } catch (err) {
      console.warn('Firestore offline sync retry failed for session:', session.id, err);
    }

    // 2. Also notify server backend
    try {
      await fetch('/api/qr-session/sync-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      });
      success = true;
    } catch {}

    if (success) {
      synced++;
    } else {
      remaining.push(session);
    }
  }

  savePendingQueue(remaining);
  currentStatus.isSyncing = false;
  currentStatus.lastSyncTime = new Date().toLocaleTimeString();
  
  if (synced > 0) {
    notifyListeners('synced', synced);
  } else {
    notifyListeners();
  }

  return { syncedCount: synced, remainingCount: remaining.length };
}

// Global Event Listeners for Online / Offline transitions
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners('online');
    // Automatically sync pending sessions when back online
    syncPendingOfflineSessions();
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners('offline');
  });
}

export function subscribeOfflineSync(listener: SyncListener): () => void {
  listeners.add(listener);
  // Defer notification to next microtask so subscriber useEffect completes cleanly without synchronous setState
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      if (listeners.has(listener)) {
        listener(currentStatus);
      }
    });
  } else {
    setTimeout(() => {
      if (listeners.has(listener)) {
        listener(currentStatus);
      }
    }, 0);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getOfflineSyncStatus(): OfflineSyncStatus {
  return currentStatus;
}
