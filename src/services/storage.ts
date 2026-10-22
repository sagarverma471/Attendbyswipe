import {
  Classroom,
  Student,
  Subject,
  TimetableEntry,
  AttendanceSession,
  TeacherProfile,
  AttendanceStatus,
  AuditEntry,
} from '../types/attendance';
import {
  mockClassrooms,
  mockStudents,
  mockSubjects,
  mockTimetable,
  mockHistoricalSessions,
  mockTeacherProfile,
} from '../data/mockData';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDocs, collection, query, writeBatch } from 'firebase/firestore';
import { enqueueOfflineSession } from './offlineSyncService';
import { startFirestoreSync, finishFirestoreSync, errorFirestoreSync } from './syncStatusService';

const KEYS = {
  CLASSROOMS: 'swipeattend_classrooms',
  STUDENTS: 'swipeattend_students',
  SUBJECTS: 'swipeattend_subjects',
  TIMETABLE: 'swipeattend_timetable',
  SESSIONS: 'swipeattend_sessions',
  DRAFT_SESSION: 'swipeattend_draft_session',
  TEACHER: 'swipeattend_teacher_profile',
  AUDIT: 'swipeattend_audit_logs',
};

// Ultra-fast in-memory cache to prevent repetitive JSON.parse operations
const memCache: {
  teacher: TeacherProfile | null;
  classrooms: Classroom[] | null;
  students: Student[] | null;
  subjects: Subject[] | null;
  timetable: TimetableEntry[] | null;
  sessions: AttendanceSession[] | null;
  draftSession: DraftSessionState | null | undefined;
} = {
  teacher: null,
  classrooms: null,
  students: null,
  subjects: null,
  timetable: null,
  sessions: null,
  draftSession: undefined,
};

export const getStoredTeacher = (): TeacherProfile => {
  if (memCache.teacher) return memCache.teacher;
  try {
    const raw = localStorage.getItem(KEYS.TEACHER);
    memCache.teacher = raw ? JSON.parse(raw) : mockTeacherProfile;
  } catch {
    memCache.teacher = mockTeacherProfile;
  }
  return memCache.teacher || mockTeacherProfile;
};

export const getStoredClassrooms = (): Classroom[] => {
  if (memCache.classrooms) return memCache.classrooms;
  try {
    const raw = localStorage.getItem(KEYS.CLASSROOMS);
    if (!raw) {
      localStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(mockClassrooms));
      memCache.classrooms = mockClassrooms;
    } else {
      let parsed: Classroom[] = JSON.parse(raw);
      parsed = parsed.map((cls) => {
        if (cls.id === 'class-ee-1j' || cls.id === 'class-me-1f') {
          return { ...cls, studentCount: 25 };
        }
        if (cls.id === 'class-cse-3a') {
          return { ...cls, studentCount: 72 };
        }
        if (cls.id === 'class-cse-3b') {
          return { ...cls, studentCount: 72 };
        }
        return cls;
      });
      memCache.classrooms = parsed;
    }
  } catch {
    memCache.classrooms = mockClassrooms;
  }
  return memCache.classrooms || mockClassrooms;
};

export const saveClassrooms = (classrooms: Classroom[]) => {
  memCache.classrooms = classrooms;
  try {
    localStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(classrooms));
  } catch (e) {
    console.error('Failed to save classrooms', e);
  }
};

export const getStoredStudents = (): Student[] => {
  if (memCache.students) return memCache.students;
  try {
    const raw = localStorage.getItem(KEYS.STUDENTS);
    if (!raw) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(mockStudents));
      memCache.students = mockStudents;
    } else {
      let parsed: Student[] = JSON.parse(raw);
      // Auto-migrate: If CSE (72 students), EE (25 students), or ME (25 students) are incomplete, update with complete rosters
      const cseCount = parsed.filter((s) => s.classroomId === 'class-cse-3a').length;
      const eeCount = parsed.filter((s) => s.classroomId === 'class-ee-1j').length;
      const meCount = parsed.filter((s) => s.classroomId === 'class-me-1f').length;
      
      let rosterUpdated = false;
      if (cseCount < 72 || eeCount < 10 || meCount < 10) {
        const cseMock = mockStudents.filter((s) => s.classroomId === 'class-cse-3a');
        const eeMock = mockStudents.filter((s) => s.classroomId === 'class-ee-1j');
        const meMock = mockStudents.filter((s) => s.classroomId === 'class-me-1f');
        const otherStudents = parsed.filter(
          (s) => s.classroomId !== 'class-cse-3a' && s.classroomId !== 'class-ee-1j' && s.classroomId !== 'class-me-1f'
        );
        parsed = [...cseMock, ...otherStudents, ...eeMock, ...meMock];
        rosterUpdated = true;
      }

      // Reconcile student rosters: ensure continuous numbering so roll numbers match student count exactly
      const classMap: Record<string, Student[]> = {};
      parsed.forEach((s) => {
        if (!classMap[s.classroomId]) classMap[s.classroomId] = [];
        classMap[s.classroomId].push(s);
      });

      Object.entries(classMap).forEach(([cId, cStudents]) => {
        // If students count is 71 but max roll number is 72, renumber so the 71 students have roll numbers 01 to 71
        const numericRolls = cStudents
          .map((s) => parseInt(s.rollNo.replace(/\D/g, ''), 10))
          .filter((n) => !isNaN(n));
        const maxRoll = Math.max(...numericRolls, 0);

        if (cStudents.length === 71 && maxRoll === 72) {
          cStudents.sort((a, b) => {
            const na = parseInt(a.rollNo.replace(/\D/g, ''), 10) || 0;
            const nb = parseInt(b.rollNo.replace(/\D/g, ''), 10) || 0;
            return na - nb;
          });
          cStudents.forEach((std, idx) => {
            const rollNum = idx + 1;
            const rollStr = String(rollNum).padStart(2, '0');
            std.rollNo = rollStr;
            std.studentId = `ST${1000 + rollNum}`;
            std.avatarUrl = `/student-portraits/student_${idx}.jpg`;
          });
          rosterUpdated = true;
        }
      });

      // Ensure all students have clear local portrait SVGs or JPGs
      let needsSave = rosterUpdated;
      parsed = parsed.map((s, idx) => {
        if (!s.avatarUrl || s.avatarUrl.includes('unsplash.com')) {
          needsSave = true;
          return {
            ...s,
            avatarUrl: `/student-portraits/portrait-${(idx % 28) + 1}.svg`,
          };
        }
        return s;
      });

      if (needsSave) {
        localStorage.setItem(KEYS.STUDENTS, JSON.stringify(parsed));
      }
      memCache.students = parsed;
    }
  } catch {
    memCache.students = mockStudents;
  }
  return memCache.students || mockStudents;
};

export const saveStudents = (students: Student[]) => {
  memCache.students = students;
  try {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    if (auth.currentUser) {
      // Async write with batching to avoid flooding
      const batch = writeBatch(db);
      students.slice(0, 450).forEach((std) => {
        batch.set(doc(db, 'students', std.id), std, { merge: true });
      });
      batch.commit().catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save students', e);
  }
};

const CURRENT_DATA_VERSION = 'v2026_math_bee_physics';

/**
 * Universal sanitizers to ensure legacy "Database Management System", "Operating Systems",
 * and "Computer Networks" classes are immediately updated across the whole app to
 * Mathematics, Basic electrical engineering(BEE), and Physics.
 */
export const sanitizeSubject = (sub: Subject): Subject => {
  if (
    sub.name === 'Database Management System' ||
    sub.id === 'sub-dbms' ||
    sub.code === 'CS501' ||
    sub.name.toLowerCase().includes('database')
  ) {
    return {
      ...sub,
      id: 'sub-dbms',
      name: 'Mathematics',
      code: 'MA101',
      teacherName: sub.teacherName || 'Dr. Ankit Sharma',
    };
  }
  if (
    sub.name === 'Operating Systems' ||
    sub.id === 'sub-os' ||
    sub.code === 'CS502' ||
    sub.name.toLowerCase().includes('operating system')
  ) {
    return {
      ...sub,
      id: 'sub-os',
      name: 'Basic electrical engineering(BEE)',
      code: 'EE101',
      teacherName: sub.teacherName || 'Prof. R. K. Mahato',
    };
  }
  if (
    sub.name === 'Computer Networks' ||
    sub.id === 'sub-cn' ||
    sub.code === 'CS503' ||
    sub.name.toLowerCase().includes('computer network')
  ) {
    return {
      ...sub,
      id: 'sub-cn',
      name: 'Physics',
      code: 'PH101',
      teacherName: sub.teacherName || 'Dr. S. K. Singh',
    };
  }
  return sub;
};

export const sanitizeTimetable = (item: TimetableEntry): TimetableEntry => {
  let subName = item.subjectName;
  if (subName === 'Database Management System' || item.subjectId === 'sub-dbms' || subName.toLowerCase().includes('database')) {
    subName = 'Mathematics';
  } else if (subName === 'Operating Systems' || item.subjectId === 'sub-os' || subName.toLowerCase().includes('operating system')) {
    subName = 'Basic electrical engineering(BEE)';
  } else if (subName === 'Computer Networks' || item.subjectId === 'sub-cn' || subName.toLowerCase().includes('computer network')) {
    subName = 'Physics';
  }
  return {
    ...item,
    subjectName: subName,
  };
};

export const sanitizeSession = (sess: AttendanceSession): AttendanceSession => {
  let subName = sess.subjectName;
  if (subName === 'Database Management System' || sess.subjectId === 'sub-dbms' || subName.toLowerCase().includes('database')) {
    subName = 'Mathematics';
  } else if (subName === 'Operating Systems' || sess.subjectId === 'sub-os' || subName.toLowerCase().includes('operating system')) {
    subName = 'Basic electrical engineering(BEE)';
  } else if (subName === 'Computer Networks' || sess.subjectId === 'sub-cn' || subName.toLowerCase().includes('computer network')) {
    subName = 'Physics';
  }
  return {
    ...sess,
    subjectName: subName,
  };
};

export const getStoredSubjects = (): Subject[] => {
  try {
    const version = localStorage.getItem('swipeattend_data_version');
    if (version !== CURRENT_DATA_VERSION) {
      // Force instant upgrade for users with previous version cached in localStorage
      localStorage.setItem('swipeattend_data_version', CURRENT_DATA_VERSION);
      localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(mockSubjects));
      localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(mockTimetable));
      memCache.subjects = mockSubjects;
      memCache.timetable = mockTimetable;

      // Migrate any existing saved sessions
      const existingSessionsRaw = localStorage.getItem(KEYS.SESSIONS);
      if (existingSessionsRaw) {
        try {
          const parsed = JSON.parse(existingSessionsRaw) as AttendanceSession[];
          const migrated = parsed.map(sanitizeSession);
          localStorage.setItem(KEYS.SESSIONS, JSON.stringify(migrated));
          memCache.sessions = migrated;
        } catch {}
      }
      return mockSubjects;
    }

    if (memCache.subjects) return memCache.subjects;
    const raw = localStorage.getItem(KEYS.SUBJECTS);
    if (!raw) {
      localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(mockSubjects));
      memCache.subjects = mockSubjects;
      return mockSubjects;
    }

    let parsed: Subject[] = JSON.parse(raw);
    parsed = parsed.map(sanitizeSubject);
    // Filter out obsolete duplicate subjects
    parsed = parsed.filter(
      (s, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === idx
    );
    if (parsed.length === 0) {
      parsed = mockSubjects;
    }
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(parsed));
    memCache.subjects = parsed;
    return parsed;
  } catch {
    memCache.subjects = mockSubjects;
    return mockSubjects;
  }
};

export const saveSubjects = (subjects: Subject[]) => {
  const sanitized = subjects.map(sanitizeSubject);
  memCache.subjects = sanitized;
  try {
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save subjects', e);
  }
};

export const getStoredTimetable = (): TimetableEntry[] => {
  if (memCache.timetable) return memCache.timetable;
  try {
    const raw = localStorage.getItem(KEYS.TIMETABLE);
    if (!raw) {
      localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(mockTimetable));
      memCache.timetable = mockTimetable;
    } else {
      const parsed: TimetableEntry[] = JSON.parse(raw);
      const sanitized = parsed.map(sanitizeTimetable);
      localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(sanitized));
      memCache.timetable = sanitized;
    }
  } catch {
    memCache.timetable = mockTimetable;
  }
  return memCache.timetable || mockTimetable;
};

export const getStoredSessions = (): AttendanceSession[] => {
  if (memCache.sessions) return memCache.sessions;
  try {
    const raw = localStorage.getItem(KEYS.SESSIONS);
    if (!raw) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(mockHistoricalSessions));
      memCache.sessions = mockHistoricalSessions;
    } else {
      const parsed: AttendanceSession[] = JSON.parse(raw);
      const sanitized = parsed.map(sanitizeSession);
      // Ensure mock historical QR sessions are available
      const existingIds = new Set(sanitized.map((s) => s.id));
      const missing = mockHistoricalSessions.filter((s) => !existingIds.has(s.id));
      const fullList = [...missing, ...sanitized];
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(fullList));
      memCache.sessions = fullList;
    }
  } catch {
    memCache.sessions = mockHistoricalSessions;
  }
  return memCache.sessions || mockHistoricalSessions;
};

export const saveSession = (session: AttendanceSession): AttendanceSession[] => {
  const current = getStoredSessions();
  const index = current.findIndex((s) => s.id === session.id);
  let updated: AttendanceSession[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = session;
  } else {
    updated = [session, ...current];
  }
  memCache.sessions = updated;
  try {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(updated));
    clearDraftSession();

    // Recalculate student statistics based on newly completed session
    updateStudentAttendanceStats(session);

    // If offline, queue for automatic sync when connectivity returns
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineSession(session);
    }

    // If authenticated with Firebase, sync to Firestore cloud with real-time feedback
    if (auth.currentUser) {
      startFirestoreSync('Syncing session to Firestore...');
      setDoc(doc(db, 'attendance_sessions', session.id), session)
        .then(() => {
          finishFirestoreSync('Session synced to Firestore');
        })
        .catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `attendance_sessions/${session.id}`);
          errorFirestoreSync('Firestore sync failed');
        });
    }
  } catch (e) {
    console.error('Failed to save session', e);
  }
  return updated;
};

// High-speed parallel Firestore sync using writeBatch
export const syncAllToFirestore = async () => {
  if (!auth.currentUser) return;
  startFirestoreSync('Syncing all sessions to Firestore...');
  const classrooms = getStoredClassrooms();
  const students = getStoredStudents();
  const subjects = getStoredSubjects();
  const sessions = getStoredSessions();

  try {
    const batch = writeBatch(db);

    // Sync User Profile
    batch.set(doc(db, 'users', auth.currentUser.uid), {
      userId: auth.currentUser.uid,
      email: auth.currentUser.email || '',
      displayName: auth.currentUser.displayName || 'Teacher',
      photoURL: auth.currentUser.photoURL || '',
      role: 'teacher',
      createdAt: new Date().toISOString(),
    });

    // Batch add classrooms, subjects, sessions, students up to Firestore limit
    classrooms.forEach((cls) => batch.set(doc(db, 'classrooms', cls.id), cls));
    subjects.forEach((sub) => batch.set(doc(db, 'subjects', sub.id), sub));
    sessions.slice(0, 50).forEach((sess) => batch.set(doc(db, 'attendance_sessions', sess.id), sess));
    students.slice(0, 350).forEach((std) => batch.set(doc(db, 'students', std.id), std));

    await batch.commit();
    finishFirestoreSync('All sessions synced to Firestore');
    console.log('Successfully synced records to Firestore database in a single batch!');
  } catch (error) {
    console.error('Error during Firestore batch sync:', error);
    errorFirestoreSync('Firestore sync failed');
  }
};

// Parallel fetch of cloud data from Firestore
export const loadAllFromFirestore = async () => {
  if (!auth.currentUser) return null;
  try {
    const [classSnap, studentSnap, sessionSnap] = await Promise.all([
      getDocs(collection(db, 'classrooms')),
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'attendance_sessions')),
    ]);

    const fetchedClasses = classSnap.docs.map((d) => d.data() as Classroom);
    const fetchedStudents = studentSnap.docs.map((d) => d.data() as Student);
    const fetchedSessions = sessionSnap.docs.map((d) => sanitizeSession(d.data() as AttendanceSession));

    if (fetchedClasses.length > 0) saveClassrooms(fetchedClasses);
    if (fetchedStudents.length > 0) saveStudents(fetchedStudents);
    if (fetchedSessions.length > 0) {
      memCache.sessions = fetchedSessions;
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(fetchedSessions));
    }

    return {
      classrooms: fetchedClasses.length > 0 ? fetchedClasses : null,
      students: fetchedStudents.length > 0 ? fetchedStudents : null,
      sessions: fetchedSessions.length > 0 ? fetchedSessions : null,
    };
  } catch (error) {
    console.error('Error loading data from Firestore:', error);
    return null;
  }
};

// Update student percentages upon attendance submission
const updateStudentAttendanceStats = (session: AttendanceSession) => {
  const students = getStoredStudents();
  let changed = false;

  const updatedStudents = students.map((std) => {
    const status = session.records[std.id];
    if (status === 'present' || status === 'absent') {
      changed = true;
      const newHeld = (std.totalClassesHeld || 0) + 1;
      const newAttended = (std.totalClassesAttended || 0) + (status === 'present' ? 1 : 0);
      const newPct = Math.round((newAttended / newHeld) * 100);
      return {
        ...std,
        totalClassesHeld: newHeld,
        totalClassesAttended: newAttended,
        attendancePercentage: newPct,
      };
    }
    return std;
  });

  if (changed) {
    saveStudents(updatedStudents);
  }
};

// Session Recovery: Draft save and retrieval
export interface DraftSessionState {
  session: AttendanceSession;
  currentIndex: number;
  historyStack: { studentId: string; prevStatus: AttendanceStatus }[];
  updatedAt: string;
}

export const getDraftSession = (): DraftSessionState | null => {
  if (memCache.draftSession !== undefined) return memCache.draftSession ?? null;
  try {
    const raw = localStorage.getItem(KEYS.DRAFT_SESSION);
    memCache.draftSession = raw ? JSON.parse(raw) : null;
  } catch {
    memCache.draftSession = null;
  }
  return memCache.draftSession ?? null;
};

export const saveDraftSession = (draft: DraftSessionState) => {
  memCache.draftSession = draft;
  try {
    localStorage.setItem(KEYS.DRAFT_SESSION, JSON.stringify(draft));
  } catch (e) {
    console.error('Failed to save draft session', e);
  }
};

export const clearDraftSession = () => {
  memCache.draftSession = null;
  try {
    localStorage.removeItem(KEYS.DRAFT_SESSION);
  } catch (e) {
    console.error('Failed to clear draft session', e);
  }
};

// Reset to initial BIT Sindri seed data
export const resetToSeedData = () => {
  memCache.classrooms = null;
  memCache.students = null;
  memCache.subjects = null;
  memCache.timetable = null;
  memCache.sessions = null;
  memCache.teacher = null;
  memCache.draftSession = null;
  try {
    localStorage.setItem(KEYS.CLASSROOMS, JSON.stringify(mockClassrooms));
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(mockStudents));
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(mockSubjects));
    localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(mockTimetable));
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(mockHistoricalSessions));
    localStorage.setItem(KEYS.TEACHER, JSON.stringify(mockTeacherProfile));
    localStorage.removeItem(KEYS.DRAFT_SESSION);
  } catch (e) {
    console.error('Failed to reset seed data', e);
  }
};

// Attendance shortage calculator math
// (attended + X) / (held + X) >= target / 100
// attended + X >= (target / 100) * (held + X)
// attended + X >= target*held/100 + target*X/100
// X * (1 - target/100) >= target*held/100 - attended
// X >= (target*held - 100*attended) / (100 - target)
export interface ShortageResult {
  currentPercentage: number;
  classesNeeded: number;
  canBunk: number;
  status: 'surplus' | 'shortage' | 'exact';
  explanation: string;
}

export const calculateShortage = (
  held: number,
  attended: number,
  targetPercentage: number
): ShortageResult => {
  if (held <= 0) {
    return {
      currentPercentage: 100,
      classesNeeded: 0,
      canBunk: 0,
      status: 'exact',
      explanation: 'No classes have been conducted yet.',
    };
  }

  const currentPercentage = Math.round((attended / held) * 100);

  if (targetPercentage >= 100) {
    if (attended < held) {
      return {
        currentPercentage,
        classesNeeded: 999,
        canBunk: 0,
        status: 'shortage',
        explanation: '100% attendance is mathematically impossible because classes were already missed.',
      };
    }
    return {
      currentPercentage: 100,
      classesNeeded: 0,
      canBunk: 0,
      status: 'exact',
      explanation: 'You currently have 100% attendance. Every upcoming class must be attended.',
    };
  }

  if (currentPercentage < targetPercentage) {
    // Needs to attend X consecutive classes
    const numerator = targetPercentage * held - 100 * attended;
    const denominator = 100 - targetPercentage;
    const needed = Math.ceil(numerator / denominator);
    return {
      currentPercentage,
      classesNeeded: Math.max(0, needed),
      canBunk: 0,
      status: 'shortage',
      explanation: `You must attend the next ${needed} consecutive class${needed === 1 ? '' : 'es'} without absence to reach ${targetPercentage}%.`,
    };
  } else if (currentPercentage > targetPercentage) {
    // Can safely miss Y classes without dropping below target
    // attended / (held + Y) >= target / 100
    // 100 * attended >= target * (held + Y)
    // 100 * attended - target * held >= target * Y
    // Y <= (100 * attended - target * held) / target
    const numerator = 100 * attended - targetPercentage * held;
    const canBunk = Math.floor(numerator / targetPercentage);
    return {
      currentPercentage,
      classesNeeded: 0,
      canBunk: Math.max(0, canBunk),
      status: 'surplus',
      explanation: `You have an attendance buffer. You can safely miss ${canBunk} class${canBunk === 1 ? '' : 'es'} and stay at or above ${targetPercentage}%.`,
    };
  } else {
    return {
      currentPercentage,
      classesNeeded: 0,
      canBunk: 0,
      status: 'exact',
      explanation: `You are exactly at your target attendance of ${targetPercentage}%. Attending each next class maintains this standard.`,
    };
  }
};

/**
 * Bulk save imported student records to local state and Firebase Firestore cloud
 */
export const saveImportedStudentsToFirebaseAndLocal = async (
  newStudents: Student[],
  targetClassroomId?: string
): Promise<{ savedCount: number; cloudSynced: boolean; error?: string }> => {
  const current = getStoredStudents();
  const updated = [...newStudents, ...current];
  saveStudents(updated);

  // If target classroom is provided, update classroom studentCount
  if (targetClassroomId) {
    const classrooms = getStoredClassrooms();
    const clsIdx = classrooms.findIndex((c) => c.id === targetClassroomId);
    if (clsIdx >= 0) {
      classrooms[clsIdx].studentCount = updated.filter((s) => s.classroomId === targetClassroomId).length;
      saveClassrooms(classrooms);
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'classrooms', targetClassroomId), classrooms[clsIdx], { merge: true });
        } catch (e) {
          console.warn('Failed to update classroom count in cloud:', e);
        }
      }
    }
  }

  let cloudSynced = false;
  if (auth.currentUser) {
    try {
      const batch = writeBatch(db);
      newStudents.forEach((std) => {
        batch.set(doc(db, 'students', std.id), std);
      });
      await batch.commit();
      cloudSynced = true;
    } catch (err: any) {
      console.error('Firestore batch write error:', err);
      handleFirestoreError(err, OperationType.WRITE, 'students/batch');
    }
  }

  return {
    savedCount: newStudents.length,
    cloudSynced,
  };
};

