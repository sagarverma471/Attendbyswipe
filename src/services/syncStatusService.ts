export interface FirestoreSyncState {
  isSyncing: boolean;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: Date | null;
  error?: string | null;
}

type SyncStateListener = (state: FirestoreSyncState) => void;

let state: FirestoreSyncState = {
  isSyncing: false,
  status: 'idle',
  message: '',
  lastSyncedAt: null,
  error: null,
};

const listeners = new Set<SyncStateListener>();
let autoClearTimeout: any = null;

function notify() {
  const snapshot = { ...state };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.error('Error in sync state listener', e);
    }
  });
}

/**
 * Begin a Firestore sync operation (shows the syncing indicator)
 */
export function startFirestoreSync(message: string = 'Syncing session to Firestore...'): void {
  if (autoClearTimeout) {
    clearTimeout(autoClearTimeout);
    autoClearTimeout = null;
  }
  state = {
    ...state,
    isSyncing: true,
    status: 'syncing',
    message,
    error: null,
  };
  notify();
}

/**
 * Successfully completed a Firestore sync operation
 */
export function finishFirestoreSync(message: string = 'Synced to Firestore'): void {
  if (autoClearTimeout) {
    clearTimeout(autoClearTimeout);
  }
  state = {
    ...state,
    isSyncing: false,
    status: 'synced',
    message,
    lastSyncedAt: new Date(),
    error: null,
  };
  notify();

  // Keep 'synced' status briefly visible for feedback, then transition back to 'idle'
  autoClearTimeout = setTimeout(() => {
    state = {
      ...state,
      status: 'idle',
      message: '',
    };
    notify();
  }, 2200);
}

/**
 * Failed a Firestore sync operation
 */
export function errorFirestoreSync(error: string = 'Failed to sync with Firestore'): void {
  if (autoClearTimeout) {
    clearTimeout(autoClearTimeout);
  }
  state = {
    ...state,
    isSyncing: false,
    status: 'error',
    message: error,
    error,
  };
  notify();

  autoClearTimeout = setTimeout(() => {
    state = {
      ...state,
      status: 'idle',
      message: '',
      error: null,
    };
    notify();
  }, 4000);
}

/**
 * Subscribe to real-time Firestore sync events
 */
export function subscribeFirestoreSync(listener: SyncStateListener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get current sync state snapshot
 */
export function getFirestoreSyncState(): FirestoreSyncState {
  return { ...state };
}
