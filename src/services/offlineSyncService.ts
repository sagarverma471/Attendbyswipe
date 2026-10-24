import { AttendanceSession, Student, Classroom, Subject } from '../types/attendance';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  dbGetSyncQueue,
  dbEnqueueSync,
  dbRemoveSyncItem,
  dbPut,
  SyncQueueItem,
  dbSaveSession,
  dbGetSessions,
} from './db/indexedDBService';

export type SyncStateCategory = 'online' | 'offline' | 'syncing' | 'pending' | 'error';

export interface OfflineSyncStatus {
  isOnline: boolean;
  stateCategory: SyncStateCategory;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  statusMessage: string;
  lastError: string | null;
  conflictsCount: number;
  lastEvent?: 'offline' | 'online' | 'synced' | null;
  syncedSessionCount?: number;
}

export interface SyncConflictRecord {
  id: string;
  entityType: 'session' | 'student';
  localData: any;
  remoteData: any;
  detectedAt: string;
  reason: string;
  resolved: boolean;
}

type SyncListener = (status: OfflineSyncStatus) => void;
const listeners = new Set<SyncListener>();
let conflictList: SyncConflictRecord[] = [];

let currentStatus: OfflineSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  stateCategory: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastSyncTime: null,
  isSyncing: false,
  statusMessage: typeof navigator !== 'undefined' && navigator.onLine
    ? 'Connected — all changes synchronized.'
    : "You're offline. Attendance will be saved on this device.",
  lastError: null,
  conflictsCount: 0,
};

function determineStateCategory(
  isOnline: boolean,
  isSyncing: boolean,
  pendingCount: number,
  lastError: string | null
): { category: SyncStateCategory; message: string } {
  if (!isOnline) {
    return {
      category: 'offline',
      message: "You're offline. Attendance will be saved on this device.",
    };
  }
  if (isSyncing) {
    return {
      category: 'syncing',
      message: 'Synchronizing your attendance records...',
    };
  }
  if (lastError && pendingCount > 0) {
    return {
      category: 'error',
      message: 'Some changes could not be synchronized. Your local records are preserved.',
    };
  }
  if (pendingCount > 0) {
    return {
      category: 'pending',
      message: `${pendingCount} attendance ${pendingCount === 1 ? 'change' : 'changes'} waiting to sync.`,
    };
  }
  return {
    category: 'online',
    message: 'Connected — all changes synchronized.',
  };
}

function notifyListeners() {
  const { category, message } = determineStateCategory(
    currentStatus.isOnline,
    currentStatus.isSyncing,
    currentStatus.pendingCount,
    currentStatus.lastError
  );

  currentStatus = {
    ...currentStatus,
    stateCategory: category,
    statusMessage: message,
    conflictsCount: conflictList.filter((c) => !c.resolved).length,
  };

  listeners.forEach((listener) => {
    try {
      listener({ ...currentStatus });
    } catch (e) {
      console.error('Error in sync listener', e);
    }
  });
}

/**
 * Subscribe to sync state changes
 */
export function subscribeOfflineSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentStatus });
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSyncStatus(): OfflineSyncStatus {
  return { ...currentStatus };
}

export function getSyncConflicts(): SyncConflictRecord[] {
  return [...conflictList];
}

export function resolveSyncConflict(conflictId: string, resolution: 'keep_local' | 'keep_remote') {
  const conflict = conflictList.find((c) => c.id === conflictId);
  if (!conflict) return;

  conflict.resolved = true;
  if (resolution === 'keep_local') {
    // Re-queue local data for overwrite
    if (conflict.entityType === 'session') {
      enqueueOfflineSession(conflict.localData);
    }
  } else if (resolution === 'keep_remote') {
    // Save remote data to local DB
    if (conflict.entityType === 'session') {
      dbSaveSession(conflict.remoteData);
    }
  }
  notifyListeners();
}

/**
 * Refresh pending count from IndexedDB
 */
export async function refreshPendingQueueCount(): Promise<number> {
  try {
    const queue = await dbGetSyncQueue();
    const pending = queue.filter((item) => item.status !== 'synced');
    currentStatus.pendingCount = pending.length;
    notifyListeners();
    return pending.length;
  } catch {
    return currentStatus.pendingCount;
  }
}

/**
 * Enqueue an attendance session taken while offline
 */
export async function enqueueOfflineSession(session: AttendanceSession): Promise<void> {
  const idempotencyKey = `session_${session.id}_${session.updatedAt || session.completedAt || session.createdAt || 'v1'}`;

  const item: SyncQueueItem = {
    id: `sync_sess_${session.id}`,
    entityType: 'session',
    action: 'create',
    payload: {
      ...session,
      syncStatus: 'pending',
    },
    idempotencyKey,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await dbEnqueueSync(item);
    // Also mark session as pending in local sessions store
    await dbSaveSession({
      ...session,
      syncStatus: 'pending',
    });
  } catch (err) {
    console.warn('Failed to enqueue session to IndexedDB sync_queue, attempting fallback:', err);
  }

  await refreshPendingQueueCount();

  // If online right now, attempt immediate background sync
  if (currentStatus.isOnline) {
    syncPendingOfflineSessions().catch(() => {});
  }
}

/**
 * Enqueue a student change created or edited while offline
 */
export async function enqueueOfflineStudent(student: Student, action: 'create' | 'update' = 'create'): Promise<void> {
  const item: SyncQueueItem = {
    id: `sync_std_${student.id}_${Date.now()}`,
    entityType: 'student',
    action,
    payload: student,
    idempotencyKey: `student_${student.id}_${Date.now()}`,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbEnqueueSync(item);
  await refreshPendingQueueCount();

  if (currentStatus.isOnline) {
    syncPendingOfflineSessions().catch(() => {});
  }
}

/**
 * Enqueue a classroom change created or edited while offline
 */
export async function enqueueOfflineClassroom(classroom: Classroom, action: 'create' | 'update' = 'create'): Promise<void> {
  const item: SyncQueueItem = {
    id: `sync_cls_${classroom.id}_${Date.now()}`,
    entityType: 'classroom',
    action,
    payload: classroom,
    idempotencyKey: `classroom_${classroom.id}_${Date.now()}`,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbEnqueueSync(item);
  await refreshPendingQueueCount();

  if (currentStatus.isOnline) {
    syncPendingOfflineSessions().catch(() => {});
  }
}

/**
 * Execute full synchronization of all pending queue items
 */
export async function syncPendingOfflineSessions(): Promise<{
  syncedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (!navigator.onLine) {
    return {
      syncedCount: 0,
      remainingCount: currentStatus.pendingCount,
      errors: ['Device is offline.'],
    };
  }

  if (currentStatus.isSyncing) {
    return {
      syncedCount: 0,
      remainingCount: currentStatus.pendingCount,
      errors: ['Sync already in progress.'],
    };
  }

  currentStatus.isSyncing = true;
  currentStatus.lastError = null;
  notifyListeners();

  const queue = await dbGetSyncQueue();
  const pendingItems = queue.filter((item) => item.status !== 'synced');

  if (pendingItems.length === 0) {
    currentStatus.isSyncing = false;
    currentStatus.pendingCount = 0;
    currentStatus.lastSyncTime = new Date().toISOString();
    notifyListeners();
    return { syncedCount: 0, remainingCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  for (const item of pendingItems) {
    try {
      item.attempts += 1;
      item.updatedAt = new Date().toISOString();

      if (item.entityType === 'session') {
        const session = item.payload as AttendanceSession;

        // 1. Conflict detection: Check if remote version exists
        let hasConflict = false;
        try {
          if (db) {
            const remoteDocRef = doc(db, 'attendance_sessions', session.id);
            const remoteDocSnap = await getDoc(remoteDocRef);
            if (remoteDocSnap.exists()) {
              const remoteData = remoteDocSnap.data() as AttendanceSession;
              const remoteTime = remoteData.updatedAt || remoteData.completedAt || remoteData.createdAt;
              const localTime = session.updatedAt || session.completedAt || session.createdAt;

              // If remote was updated after local creation and has different status
              if (remoteTime && localTime && new Date(remoteTime) > new Date(localTime)) {
                // Record conflict and do not silently overwrite
                hasConflict = true;
                conflictList.push({
                  id: `conflict_${session.id}_${Date.now()}`,
                  entityType: 'session',
                  localData: session,
                  remoteData,
                  detectedAt: new Date().toISOString(),
                  reason: 'Remote session has newer modification timestamp.',
                  resolved: false,
                });
              }
            }
          }
        } catch (checkErr) {
          console.warn('Could not check remote version for conflict:', checkErr);
        }

        if (hasConflict) {
          // Pause this item until conflict is resolved
          item.status = 'failed';
          item.lastError = 'Conflict detected with server version.';
          await dbPut('sync_queue', item);
          continue;
        }

        // 2. Perform upload to cloud/server
        let uploaded = false;

        // A. Primary: Firestore Sync if db configured
        try {
          if (db) {
            const cleanSession = {
              ...session,
              syncStatus: 'synced' as const,
              syncedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'attendance_sessions', session.id), cleanSession, { merge: true });
            uploaded = true;
          }
        } catch (fsErr: any) {
          console.warn('Firestore upload error:', fsErr);
        }

        // B. Secondary: Express backend offline sync endpoint
        if (!uploaded) {
          try {
            const res = await fetch('/api/qr-session/sync-offline', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session }),
            });
            if (res.ok) {
              uploaded = true;
            }
          } catch (apiErr: any) {
            console.warn('Server offline sync endpoint error:', apiErr);
          }
        }

        if (uploaded) {
          // Update local session status to 'synced'
          await dbSaveSession({
            ...session,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
          });
          // Remove from sync queue on confirmed success
          await dbRemoveSyncItem(item.id);
          syncedCount++;
        } else {
          item.status = 'failed';
          item.lastError = 'Network or cloud service unreachable';
          await dbPut('sync_queue', item);
          errors.push(`Failed to sync session: ${session.id}`);
        }
      } else if (item.entityType === 'student') {
        const student = item.payload as Student;
        if (db) {
          await setDoc(doc(db, 'students', student.id), student, { merge: true });
          await dbRemoveSyncItem(item.id);
          syncedCount++;
        } else {
          item.status = 'failed';
          await dbPut('sync_queue', item);
        }
      } else if (item.entityType === 'classroom') {
        const classroom = item.payload as Classroom;
        if (db) {
          await setDoc(doc(db, 'classrooms', classroom.id), classroom, { merge: true });
          await dbRemoveSyncItem(item.id);
          syncedCount++;
        } else {
          item.status = 'failed';
          await dbPut('sync_queue', item);
        }
      }
    } catch (err: any) {
      console.error('Error processing sync item:', err);
      item.status = 'failed';
      item.lastError = err.message || 'Unknown error';
      await dbPut('sync_queue', item);
      errors.push(err.message || 'Error syncing record');
    }
  }

  const remaining = await refreshPendingQueueCount();

  currentStatus.isSyncing = false;
  currentStatus.lastSyncTime = syncedCount > 0 ? new Date().toISOString() : currentStatus.lastSyncTime;
  currentStatus.lastError = errors.length > 0 ? errors[0] : null;
  notifyListeners();

  return {
    syncedCount,
    remainingCount: remaining,
    errors,
  };
}

/**
 * Initialize window network event listeners
 */
export function initOfflineSyncMonitoring() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[OfflineSync] Network status: ONLINE');
    currentStatus.isOnline = true;
    currentStatus.lastError = null;
    notifyListeners();

    // Small delay to allow radio interfaces to stabilize
    setTimeout(() => {
      syncPendingOfflineSessions().catch((err) => {
        console.warn('Auto sync on reconnect error:', err);
      });
    }, 1500);
  });

  window.addEventListener('offline', () => {
    console.log('[OfflineSync] Network status: OFFLINE');
    currentStatus.isOnline = false;
    notifyListeners();
  });

  // Initial count load
  refreshPendingQueueCount().catch(() => {});
}
