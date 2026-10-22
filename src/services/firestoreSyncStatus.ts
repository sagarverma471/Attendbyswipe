// Global reactive Firestore sync status service for network activity feedback

export interface FirestoreSyncState {
  isSyncing: boolean;
  message: string;
  lastSyncedAt: Date | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
}

let currentState: FirestoreSyncState = {
  isSyncing: false,
  message: '',
  lastSyncedAt: null,
  status: 'idle',
};

const listeners = new Set<(state: FirestoreSyncState) => void>();
let finishTimeout: any = null;

function notify() {
  const stateCopy = { ...currentState };
  listeners.forEach((listener) => {
    try {
      listener(stateCopy);
    } catch (e) {
      console.error('Error in firestore sync listener', e);
    }
  });
}

/**
 * Begin a Firestore sync network operation
 */
export function startFirestoreSync(message = 'Syncing session to Firestore...') {
  if (finishTimeout) {
    clearTimeout(finishTimeout);
    finishTimeout = null;
  }
  currentState = {
    ...currentState,
    isSyncing: true,
    message,
    status: 'syncing',
  };
  notify();
}

/**
 * Conclude a Firestore sync network operation, briefly showing a "Synced" state
 */
export function finishFirestoreSync(success = true) {
  if (finishTimeout) {
    clearTimeout(finishTimeout);
  }

  currentState = {
    ...currentState,
    isSyncing: false,
    message: success ? 'Session synced to Firestore' : 'Sync failed',
    lastSyncedAt: success ? new Date() : currentState.lastSyncedAt,
    status: success ? 'synced' : 'error',
  };
  notify();

  // Reset to idle after 2 seconds
  finishTimeout = setTimeout(() => {
    currentState = {
      ...currentState,
      status: 'idle',
      message: '',
    };
    notify();
  }, 2200);
}

/**
 * Execute an async Firestore operation with automatic status feedback
 */
export async function withFirestoreSync<T>(
  action: () => Promise<T>,
  message = 'Syncing attendance session...'
): Promise<T> {
  startFirestoreSync(message);
  const startTime = Date.now();
  try {
    const result = await action();
    // Ensure the indicator is visible for at least 700ms so the user receives clear network activity feedback
    const elapsed = Date.now() - startTime;
    if (elapsed < 700) {
      await new Promise((r) => setTimeout(r, 700 - elapsed));
    }
    finishFirestoreSync(true);
    return result;
  } catch (err) {
    finishFirestoreSync(false);
    throw err;
  }
}

/**
 * Subscribe to Firestore sync status updates
 */
export function subscribeFirestoreSync(callback: (state: FirestoreSyncState) => void): () => void {
  listeners.add(callback);
  callback({ ...currentState });
  return () => {
    listeners.delete(callback);
  };
}

export function getFirestoreSyncState(): FirestoreSyncState {
  return { ...currentState };
}
