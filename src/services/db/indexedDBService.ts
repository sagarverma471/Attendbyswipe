import {
  Classroom,
  Student,
  Subject,
  TimetableEntry,
  AttendanceSession,
  TeacherProfile,
  AttendanceStatus,
} from '../../types/attendance';

export const DB_NAME = 'SwipeAttendDB';
export const DB_VERSION = 1;

export interface AttendanceDecisionLog {
  id: string; // e.g., dec_<sessionId>_<studentId>_<timestamp>
  sessionId: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  classroomId: string;
  status: AttendanceStatus;
  previousStatus?: AttendanceStatus;
  timestamp: string;
  synced: boolean;
}

export interface StoredDraftSession {
  id: string; // 'active_draft'
  session: AttendanceSession;
  currentIndex: number;
  historyStack: { studentId: string; prevStatus: AttendanceStatus }[];
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string; // unique operation id
  entityType: 'session' | 'decision' | 'classroom' | 'student' | 'subject';
  action: 'create' | 'update' | 'delete';
  payload: any;
  idempotencyKey: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppMetadata {
  key: string;
  value: any;
  updatedAt: string;
}

export interface SwipeAttendBackupData {
  appName: string;
  version: string;
  exportedAt: string;
  data: {
    teacher?: TeacherProfile | null;
    classrooms: Classroom[];
    students: Student[];
    subjects: Subject[];
    timetable: TimetableEntry[];
    sessions: AttendanceSession[];
    decisions: AttendanceDecisionLog[];
    syncQueue: SyncQueueItem[];
  };
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Initialize and open the SwipeAttend IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Classrooms Store
        if (!db.objectStoreNames.contains('classrooms')) {
          db.createObjectStore('classrooms', { keyPath: 'id' });
        }

        // 2. Students Store (with classroom & rollNo indexes)
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('classroomId', 'classroomId', { unique: false });
          studentStore.createIndex('rollNo', 'rollNo', { unique: false });
        }

        // 3. Subjects Store
        if (!db.objectStoreNames.contains('subjects')) {
          const subStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subStore.createIndex('classroomId', 'classroomId', { unique: false });
        }

        // 4. Timetable Store
        if (!db.objectStoreNames.contains('timetable')) {
          const ttStore = db.createObjectStore('timetable', { keyPath: 'id' });
          ttStore.createIndex('classroomId', 'classroomId', { unique: false });
          ttStore.createIndex('day', 'day', { unique: false });
        }

        // 5. Attendance Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessStore.createIndex('classroomId', 'classroomId', { unique: false });
          sessStore.createIndex('date', 'date', { unique: false });
          sessStore.createIndex('status', 'status', { unique: false });
          sessStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // 6. Attendance Decisions Log (immediate per-swipe journaling)
        if (!db.objectStoreNames.contains('attendance_decisions')) {
          const decStore = db.createObjectStore('attendance_decisions', { keyPath: 'id' });
          decStore.createIndex('sessionId', 'sessionId', { unique: false });
          decStore.createIndex('studentId', 'studentId', { unique: false });
          decStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 7. Active Draft Session Store
        if (!db.objectStoreNames.contains('draft_session')) {
          db.createObjectStore('draft_session', { keyPath: 'id' });
        }

        // 8. Offline Synchronization Queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('entityType', 'entityType', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 9. Teacher Profile Store
        if (!db.objectStoreNames.contains('teacher_profile')) {
          db.createObjectStore('teacher_profile', { keyPath: 'id' });
        }

        // 10. Audit Trail Store
        if (!db.objectStoreNames.contains('audit_trail')) {
          const auditStore = db.createObjectStore('audit_trail', { keyPath: 'id' });
          auditStore.createIndex('sessionId', 'sessionId', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 11. Application Metadata & Settings Store
        if (!db.objectStoreNames.contains('app_metadata')) {
          db.createObjectStore('app_metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (event: Event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      console.error('IndexedDB unexpected initialization error:', err);
      reject(err);
    }
  });

  return dbInitPromise;
}

/**
 * Low-level IndexedDB Generic Helpers
 */
export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbPut<T>(storeName: string, item: T): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbPutBatch<T>(storeName: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Request persistent browser storage so operating system does not purge offline database
 */
export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
}> {
  let persisted = false;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      persisted = await navigator.storage.persist();
    } catch (e) {
      console.warn('Storage persist request error:', e);
    }
  }

  let usageMB = 0;
  let quotaMB = 0;
  let percentUsed = 0;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageMB = estimate.usage ? Math.round((estimate.usage / (1024 * 1024)) * 100) / 100 : 0;
      quotaMB = estimate.quota ? Math.round((estimate.quota / (1024 * 1024)) * 100) / 100 : 0;
      if (quotaMB > 0) {
        percentUsed = Math.round((usageMB / quotaMB) * 1000) / 10;
      }
    } catch (e) {
      console.warn('Storage estimate error:', e);
    }
  }

  return { persisted, usageMB, quotaMB, percentUsed };
}

/**
 * High-Level Domain DB Operations
 */

// Classrooms
export async function dbGetClassrooms(): Promise<Classroom[]> {
  return dbGetAll<Classroom>('classrooms');
}

export async function dbSaveClassrooms(classrooms: Classroom[]): Promise<void> {
  await dbClear('classrooms');
  await dbPutBatch('classrooms', classrooms);
}

// Students
export async function dbGetStudents(): Promise<Student[]> {
  return dbGetAll<Student>('students');
}

export async function dbSaveStudents(students: Student[]): Promise<void> {
  await dbClear('students');
  await dbPutBatch('students', students);
}

// Subjects
export async function dbGetSubjects(): Promise<Subject[]> {
  return dbGetAll<Subject>('subjects');
}

export async function dbSaveSubjects(subjects: Subject[]): Promise<void> {
  await dbClear('subjects');
  await dbPutBatch('subjects', subjects);
}

// Timetable
export async function dbGetTimetable(): Promise<TimetableEntry[]> {
  return dbGetAll<TimetableEntry>('timetable');
}

export async function dbSaveTimetable(timetable: TimetableEntry[]): Promise<void> {
  await dbClear('timetable');
  await dbPutBatch('timetable', timetable);
}

// Sessions
export async function dbGetSessions(): Promise<AttendanceSession[]> {
  return dbGetAll<AttendanceSession>('sessions');
}

export async function dbSaveSession(session: AttendanceSession): Promise<void> {
  await dbPut('sessions', session);
}

export async function dbSaveSessionsBatch(sessions: AttendanceSession[]): Promise<void> {
  await dbPutBatch('sessions', sessions);
}

// Attendance Decision Journal (Immediate per-decision save)
export async function dbSaveAttendanceDecision(decision: AttendanceDecisionLog): Promise<void> {
  await dbPut('attendance_decisions', decision);
}

export async function dbGetAttendanceDecisionsForSession(sessionId: string): Promise<AttendanceDecisionLog[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('attendance_decisions', 'readonly');
      const store = tx.objectStore('attendance_decisions');
      const index = store.index('sessionId');
      const req = index.getAll(sessionId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Draft Session
export async function dbSaveDraftSession(draft: {
  session: AttendanceSession;
  currentIndex: number;
  historyStack: any[];
  updatedAt: string;
}): Promise<void> {
  const payload: StoredDraftSession = {
    id: 'active_draft',
    ...draft,
  };
  await dbPut('draft_session', payload);
}

export async function dbGetDraftSession(): Promise<StoredDraftSession | null> {
  return dbGet<StoredDraftSession>('draft_session', 'active_draft');
}

export async function dbClearDraftSession(): Promise<void> {
  await dbDelete('draft_session', 'active_draft');
}

// Sync Queue
export async function dbGetSyncQueue(): Promise<SyncQueueItem[]> {
  return dbGetAll<SyncQueueItem>('sync_queue');
}

export async function dbEnqueueSync(item: SyncQueueItem): Promise<void> {
  await dbPut('sync_queue', item);
}

export async function dbRemoveSyncItem(id: string): Promise<void> {
  await dbDelete('sync_queue', id);
}

export async function dbClearSyncQueue(): Promise<void> {
  await dbClear('sync_queue');
}

// Teacher Profile
export async function dbSaveTeacherProfile(teacher: TeacherProfile): Promise<void> {
  await dbPut('teacher_profile', { id: 'primary_teacher', ...teacher });
}

export async function dbGetTeacherProfile(): Promise<TeacherProfile | null> {
  const res = await dbGet<any>('teacher_profile', 'primary_teacher');
  if (!res) return null;
  const { id, ...teacher } = res;
  return teacher as TeacherProfile;
}

/**
 * Full Offline Data Backup and Recovery
 */
export async function dbExportFullBackup(): Promise<SwipeAttendBackupData> {
  const [
    teacher,
    classrooms,
    students,
    subjects,
    timetable,
    sessions,
    decisions,
    syncQueue,
  ] = await Promise.all([
    dbGetTeacherProfile(),
    dbGetClassrooms(),
    dbGetStudents(),
    dbGetSubjects(),
    dbGetTimetable(),
    dbGetSessions(),
    dbGetAll<AttendanceDecisionLog>('attendance_decisions'),
    dbGetSyncQueue(),
  ]);

  return {
    appName: 'SwipeAttend',
    version: '1.0.0-offline',
    exportedAt: new Date().toISOString(),
    data: {
      teacher,
      classrooms,
      students,
      subjects,
      timetable,
      sessions,
      decisions,
      syncQueue,
    },
  };
}

export async function dbImportFullBackup(backup: SwipeAttendBackupData): Promise<{
  success: boolean;
  importedCounts: Record<string, number>;
}> {
  if (!backup || !backup.data) {
    throw new Error('Invalid backup file structure: missing data payload');
  }

  const { data } = backup;
  const importedCounts: Record<string, number> = {};

  if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
    await dbSaveClassrooms(data.classrooms);
    importedCounts.classrooms = data.classrooms.length;
  }
  if (Array.isArray(data.students) && data.students.length > 0) {
    await dbSaveStudents(data.students);
    importedCounts.students = data.students.length;
  }
  if (Array.isArray(data.subjects) && data.subjects.length > 0) {
    await dbSaveSubjects(data.subjects);
    importedCounts.subjects = data.subjects.length;
  }
  if (Array.isArray(data.timetable) && data.timetable.length > 0) {
    await dbSaveTimetable(data.timetable);
    importedCounts.timetable = data.timetable.length;
  }
  if (Array.isArray(data.sessions) && data.sessions.length > 0) {
    await dbSaveSessionsBatch(data.sessions);
    importedCounts.sessions = data.sessions.length;
  }
  if (data.teacher) {
    await dbSaveTeacherProfile(data.teacher);
    importedCounts.teacher = 1;
  }

  return { success: true, importedCounts };
}
