import React, { useEffect, useRef } from 'react';
import { useToast } from './ToastContext';
import { subscribeOfflineSync, OfflineSyncStatus } from '../../services/offlineSyncService';

/**
 * OfflineToastWatcher connects offlineSyncService events with Toast notifications:
 * 1. Alerts user when application switches to offline mode
 * 2. Alerts user when network restores and data has successfully synced with Firestore
 */
export const OfflineToastWatcher: React.FC = () => {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const prevOnlineRef = useRef<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeOfflineSync((status: OfflineSyncStatus) => {
      // Avoid firing toast on initial page load if already online
      if (isInitialMount.current) {
        isInitialMount.current = false;
        prevOnlineRef.current = status.isOnline;
        if (!status.isOnline) {
          showToastRef.current({
            type: 'offline',
            title: 'Offline Mode Active',
            description: 'No internet connection. Attendance sessions will be saved locally and auto-synced when reconnected.',
            duration: 6000,
          });
        }
        return;
      }

      // Check transition to Offline
      if (prevOnlineRef.current && !status.isOnline) {
        showToastRef.current({
          type: 'offline',
          title: 'You are now Offline',
          description: 'SwipeAttend has switched to offline mode. All scans & swipe attendance are stored safely offline.',
          duration: 6000,
        });
      }

      // Check transition to Online
      if (!prevOnlineRef.current && status.isOnline) {
        showToastRef.current({
          type: 'online',
          title: 'Connection Restored',
          description: status.pendingCount > 0
            ? `Back online! Syncing ${status.pendingCount} offline session(s) to Firestore...`
            : 'Back online! Connected to cloud services.',
          duration: 4000,
        });
      }

      // Check if data was synced with Firestore
      if (status.lastEvent === 'synced' && (status.syncedSessionCount ?? 0) > 0) {
        showToastRef.current({
          type: 'sync',
          title: 'Data Synced with Firestore',
          description: `Successfully synchronized ${status.syncedSessionCount} offline attendance session(s) to the cloud database.`,
          duration: 5000,
        });
      }

      prevOnlineRef.current = status.isOnline;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
};
