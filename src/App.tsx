import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react';
import {
  Role,
  Classroom,
  Student,
  Subject,
  TimetableEntry,
  AttendanceSession,
  AttendanceStatus,
  QRAttendanceSession,
} from './types/attendance';
import {
  getStoredClassrooms,
  saveClassrooms,
  getStoredStudents,
  saveStudents,
  getStoredSubjects,
  getStoredTimetable,
  getStoredSessions,
  saveSession,
  getDraftSession,
  saveDraftSession,
  clearDraftSession,
  resetToSeedData,
  getStoredTeacher,
  DraftSessionState,
  syncAllToFirestore,
  loadAllFromFirestore,
} from './services/storage';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
  User,
  testConnection,
} from './services/firebase';

import { Navbar } from './components/Navbar';
import { Sparkles, TrendingUp, ChevronLeft } from 'lucide-react';
import { ToastProvider } from './components/common/ToastContext';
import { OfflineToastWatcher } from './components/common/OfflineToastWatcher';
import { SwipeAttendLogo } from './components/common/SwipeAttendLogo';
import { RetroCRTScreen } from './components/common/RetroCRTScreen';

// Code-Splitting: Lazy-load heavy views and modals for fast mobile load times
const TeacherDashboard = lazy(() =>
  import('./components/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const DashboardWidget = lazy(() =>
  import('./components/dashboard/DashboardWidget').then((m) => ({ default: m.DashboardWidget }))
);
const SwipeArena = lazy(() =>
  import('./components/attendance/SwipeArena').then((m) => ({ default: m.SwipeArena }))
);
const AttendanceSummaryView = lazy(() =>
  import('./components/attendance/AttendanceSummaryView').then((m) => ({ default: m.AttendanceSummaryView }))
);
const AttendanceCompleteModal = lazy(() =>
  import('./components/attendance/AttendanceCompleteModal').then((m) => ({ default: m.AttendanceCompleteModal }))
);
const AttendanceSetupModal = lazy(() =>
  import('./components/attendance/AttendanceSetupModal').then((m) => ({ default: m.AttendanceSetupModal }))
);
const ClassroomQRGeneratorModal = lazy(() =>
  import('./components/qr/ClassroomQRGeneratorModal').then((m) => ({ default: m.ClassroomQRGeneratorModal }))
);
const StudentScanAttendanceModal = lazy(() =>
  import('./components/qr/StudentScanAttendanceModal').then((m) => ({ default: m.StudentScanAttendanceModal }))
);
const StudentAttendancePage = lazy(() =>
  import('./components/qr/StudentAttendancePage').then((m) => ({ default: m.StudentAttendancePage }))
);
const StudentDashboard = lazy(() =>
  import('./components/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const StudentManager = lazy(() =>
  import('./components/roster/StudentManager').then((m) => ({ default: m.StudentManager }))
);
const ClassroomManager = lazy(() =>
  import('./components/roster/ClassroomManager').then((m) => ({ default: m.ClassroomManager }))
);
const AttendanceHistoryView = lazy(() =>
  import('./components/history/AttendanceHistoryView').then((m) => ({ default: m.AttendanceHistoryView }))
);

// High-speed lightweight loader fallback
const ViewLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[360px] animate-fade-in">
    <div className="relative flex items-center justify-center">
      <div className="absolute -inset-2 rounded-2xl bg-violet-600/20 blur-md animate-pulse" />
      <SwipeAttendLogo size={48} className="animate-pulse" />
    </div>
    <p className="mt-4 text-xs font-semibold text-slate-400 font-mono tracking-wide">
      Loading SwipeAttend...
    </p>
  </div>
);

export default function App() {
  const [role, setRole] = useState<Role>('teacher');
  const [activeView, setActiveView] = useState<string>('dashboard');

  // Firebase Auth & Cloud Sync State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Application Data Stores - Lazy initializers run ONCE on initial mount only
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => getStoredClassrooms());
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [subjects, setSubjects] = useState<Subject[]>(() => getStoredSubjects());
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => getStoredTimetable());
  const [sessions, setSessions] = useState<AttendanceSession[]>(() => getStoredSessions());
  const teacher = useMemo(() => getStoredTeacher(), []);

  // Active Session State
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(0);
  const [draftState, setDraftState] = useState<DraftSessionState | null>(() => getDraftSession());

  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupInitialClassId, setSetupInitialClassId] = useState<string>('');
  const [setupInitialSubId, setSetupInitialSubId] = useState<string>('');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Live QR Attendance Modals State
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [selectedQRClassroom, setSelectedQRClassroom] = useState<Classroom | null>(null);
  const [selectedQRSubject, setSelectedQRSubject] = useState<Subject | undefined>(undefined);

  const [isStudentScanOpen, setIsStudentScanOpen] = useState(false);
  const [studentScanParams, setStudentScanParams] = useState<{
    sessionId?: string;
    classroomId?: string;
    token?: string;
  }>(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      sessionId: params.get('sessionId') || undefined,
      classroomId: params.get('classroomId') || undefined,
      token: params.get('token') || undefined,
    };
  });

  // Auto-detect student scan link from native mobile camera QR scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const sessionId = params.get('sessionId');
    const classroomId = params.get('classroomId');
    const token = params.get('token');

    if (action === 'student-qr' && (sessionId || classroomId)) {
      setStudentScanParams({
        sessionId: sessionId || undefined,
        classroomId: classroomId || undefined,
        token: token || undefined,
      });
      setIsStudentScanOpen(true);
    }
  }, []);

  // Ensure subjects, timetable, and sessions are immediately upgraded to Mathematics, BEE, Physics
  useEffect(() => {
    setSubjects(getStoredSubjects());
    setTimetable(getStoredTimetable());
    setSessions(getStoredSessions());
  }, []);

  // Firebase connection test & auth listener
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // When logged in, fetch existing data from Firestore
        setIsSyncing(true);
        const cloudData = await loadAllFromFirestore();
        if (cloudData) {
          if (cloudData.classrooms) setClassrooms(cloudData.classrooms);
          if (cloudData.students) setStudents(cloudData.students);
          if (cloudData.sessions) setSessions(cloudData.sessions);
        } else {
          // If Firestore is empty, seed it with current BIT Sindri roster
          await syncAllToFirestore();
        }
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync draft existence when switching views
  useEffect(() => {
    setDraftState(getDraftSession());
  }, [activeView]);

  const handleSignInGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleSyncFirestore = async () => {
    if (!firebaseUser) return;
    setIsSyncing(true);
    await syncAllToFirestore();
    setIsSyncing(false);
  };

  // Start new Attendance Session from setup modal
  const handleStartAttendance = useCallback((classroomId: string, subjectId: string) => {
    setSetupInitialClassId(classroomId);
    setSetupInitialSubId(subjectId);
    setIsSetupModalOpen(true);
  }, []);

  // Launch Live QR Attendance Modal for a classroom
  const handleLaunchQRAttendance = useCallback(
    (cls: Classroom, sub?: Subject) => {
      setSelectedQRClassroom(cls);
      const subjectToUse = sub || subjects.find((s) => s.classroomId === cls.id);
      setSelectedQRSubject(subjectToUse);
      setIsQRGeneratorOpen(true);
    },
    [subjects]
  );

  const handleStartQRFromSetup = useCallback(
    (classroomId: string, subjectId: string) => {
      const cls = classrooms.find((c) => c.id === classroomId) || classrooms[0];
      const sub = subjects.find((s) => s.id === subjectId);
      if (cls) {
        handleLaunchQRAttendance(cls, sub);
      }
    },
    [classrooms, subjects, handleLaunchQRAttendance]
  );

  const handleOpenStudentScanner = useCallback(() => {
    setIsStudentScanOpen(true);
  }, []);

  const handleOpenStudentScanFromTeacher = useCallback((sess: QRAttendanceSession) => {
    setStudentScanParams({
      sessionId: sess.id,
      classroomId: sess.classroomId,
      token: sess.currentToken,
    });
    setIsStudentScanOpen(true);
  }, []);

  const handleFinalizeQRAttendance = useCallback((finalSession: AttendanceSession) => {
    const updatedSessions = saveSession(finalSession);
    setSessions(updatedSessions);
    setStudents(getStoredStudents());
    setIsQRGeneratorOpen(false);
    setActiveSession(finalSession);
    setActiveView('attendance-summary');
  }, []);

  const handleLaunchSession = (config: {
    classroomId: string;
    subjectId: string;
    date: string;
    period: number;
    order: 'roll' | 'name' | 'random';
    notes?: string;
  }) => {
    const currentClass = classrooms.find((c) => c.id === config.classroomId);
    const currentSub = subjects.find((s) => s.id === config.subjectId);
    const enrolledStudents = students.filter((s) => s.classroomId === config.classroomId);

    const initialRecords: Record<string, AttendanceStatus> = {};
    enrolledStudents.forEach((s) => {
      initialRecords[s.id] = 'unmarked';
    });

    const newSession: AttendanceSession = {
      id: `session-${Date.now()}`,
      classroomId: config.classroomId,
      classroomName: currentClass?.name || 'Classroom',
      subjectId: config.subjectId,
      subjectName: currentSub?.name || 'Subject',
      date: config.date,
      period: config.period,
      markedBy: teacher.name,
      status: 'draft',
      records: initialRecords,
      totalStudents: enrolledStudents.length,
      presentCount: 0,
      absentCount: 0,
      unmarkedCount: enrolledStudents.length,
      createdAt: new Date().toISOString(),
      notes: config.notes,
    };

    setActiveSession(newSession);
    setCurrentSessionIndex(0);
    setIsSetupModalOpen(false);
    setActiveView('attendance-swipe');
  };

  // Real-time progress update while swiping (saves draft and syncs activeSession so summary and resume stay completely in sync)
  const handleUpdateSessionProgress = useCallback(
    (
      updatedSession: AttendanceSession,
      index: number,
      historyStack: any[]
    ) => {
      setActiveSession(updatedSession);
      setCurrentSessionIndex(index);
      saveDraftSession({
        session: updatedSession,
        currentIndex: index,
        historyStack,
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  // Resume Draft from unexpected browser refresh / crash
  const handleResumeDraft = () => {
    const draft = getDraftSession();
    if (draft && draft.session) {
      setActiveSession(draft.session);
      setCurrentSessionIndex(draft.currentIndex || 0);
      setActiveView('attendance-swipe');
    }
  };

  // When all students have been evaluated in SwipeArena
  const handleCompleteSwipe = (completedSession: AttendanceSession) => {
    setActiveSession(completedSession);
    setIsCompleteModalOpen(true);
  };

  // Move to review table from completion modal
  const handleViewSummaryFromModal = () => {
    setIsCompleteModalOpen(false);
    setActiveView('attendance-summary');
  };

  // Confirm and Finalize Save Attendance
  const handleConfirmSave = (finalSession: AttendanceSession) => {
    const updatedSessions = saveSession(finalSession);
    setSessions(updatedSessions);
    setStudents(getStoredStudents()); // Reload student percentages
    setActiveSession(null);
    clearDraftSession();
    setDraftState(null);
    setIsCompleteModalOpen(false);
    setActiveView('dashboard');
  };

  // Quick Reset to BIT Sindri demo state
  const handleResetData = () => {
    resetToSeedData();
    setClassrooms(getStoredClassrooms());
    setStudents(getStoredStudents());
    setSubjects(getStoredSubjects());
    setTimetable(getStoredTimetable());
    setSessions(getStoredSessions());
    setActiveSession(null);
    clearDraftSession();
    setDraftState(null);
    setActiveView('dashboard');
  };

  // Student Manager Handlers
  const handleAddStudent = useCallback((newStd: Omit<Student, 'id'>) => {
    const std: Student = {
      ...newStd,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => {
      const updated = [std, ...prev];
      saveStudents(updated);
      return updated;
    });
  }, []);

  const handleImportStudents = useCallback((imported: Student[]) => {
    setStudents((prev) => {
      const updated = [...imported, ...prev];
      saveStudents(updated);
      return updated;
    });
  }, []);

  const handleDeleteStudent = useCallback((studentId: string) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== studentId);
      saveStudents(updated);
      return updated;
    });
  }, []);

  // Batch update student attendance statuses (e.g. mark all present/absent)
  const handleBatchUpdateStudents = useCallback(
    (
      studentIds: string[],
      status: AttendanceStatus,
      config?: {
        classroomId?: string;
        subjectId?: string;
        createSessionRecord?: boolean;
        notes?: string;
      }
    ) => {
      if (studentIds.length === 0) return;

      // 1. Recalculate attendance stats for each targeted student
      const updatedStudents = students.map((std) => {
        if (!studentIds.includes(std.id)) return std;
        const newHeld = (std.totalClassesHeld || 0) + 1;
        const newAttended = (std.totalClassesAttended || 0) + (status === 'present' ? 1 : 0);
        const newPct = Math.round((newAttended / newHeld) * 100);
        return {
          ...std,
          totalClassesHeld: newHeld,
          totalClassesAttended: newAttended,
          attendancePercentage: newPct,
        };
      });

      setStudents(updatedStudents);
      saveStudents(updatedStudents);

      // 2. Log attendance session into history & sync with Firestore
      if (config?.createSessionRecord !== false) {
        const targetClassId =
          config?.classroomId ||
          students.find((s) => studentIds.includes(s.id))?.classroomId ||
          classrooms[0]?.id ||
          'class-cse-3a';
        const targetClass = classrooms.find((c) => c.id === targetClassId);
        const targetSub = subjects.find((s) => s.id === config?.subjectId) || subjects[0];

        const recordsMap: Record<string, AttendanceStatus> = {};
        studentIds.forEach((id) => {
          recordsMap[id] = status;
        });

        const batchSession: AttendanceSession = {
          id: `session-batch-${Date.now()}`,
          classroomId: targetClassId,
          classroomName: targetClass?.name || 'Classroom',
          subjectId: targetSub?.id || 'general',
          subjectName: targetSub?.name || 'Manual Batch Adjustment',
          date: new Date().toISOString().split('T')[0],
          period: 1,
          markedBy: teacher.name,
          status: 'completed',
          records: recordsMap,
          totalStudents: studentIds.length,
          presentCount: status === 'present' ? studentIds.length : 0,
          absentCount: status === 'absent' ? studentIds.length : 0,
          unmarkedCount: 0,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          notes:
            config?.notes ||
            `Batch status update: Marked ${studentIds.length} students as ${status}`,
        };

        const updatedSessions = saveSession(batchSession);
        setSessions(updatedSessions);
      }
    },
    [students, classrooms, subjects, teacher.name]
  );

  // Classroom Manager Handlers
  const handleCreateClassroom = useCallback((newCls: Classroom) => {
    setClassrooms((prev) => {
      const updated = [newCls, ...prev];
      saveClassrooms(updated);
      return updated;
    });
  }, []);

  // Stable navigation callbacks to prevent memoized dashboard re-renders
  const handleViewClassroom = useCallback((_cls: Classroom) => {
    setActiveView('students');
  }, []);

  const handleViewHistory = useCallback(() => {
    setActiveView('history');
  }, []);

  const handleNavigateStudents = useCallback(() => {
    setActiveView('students');
  }, []);

  const handleSelectClassroom = useCallback((_cls: Classroom) => {
    setActiveView('students');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setActiveView('dashboard');
  }, []);

  // Historical Session Update
  const handleUpdateHistoricalSession = useCallback((updatedSession: AttendanceSession) => {
    const updated = saveSession(updatedSession);
    setSessions(updated);
  }, []);

  // Dynamic Student Selection for Student View & Search
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('rollNo') || params.get('studentId') || params.get('student');
    if (fromUrl) return fromUrl;
    return localStorage.getItem('swipeattend_selected_student_id') || '';
  });

  const currentStudentUser = useMemo<Student | null>(() => {
    if (!selectedStudentId || students.length === 0) return null;
    const cleanId = selectedStudentId.trim().toLowerCase();
    const found = students.find(
      (s) =>
        s.id.toLowerCase() === cleanId ||
        s.rollNo.toLowerCase() === cleanId ||
        (s.studentId && s.studentId.toLowerCase() === cleanId) ||
        (s.email && s.email.toLowerCase() === cleanId)
    );
    return found || null;
  }, [students, selectedStudentId]);

  const handleSelectStudent = useCallback((studentToSelect: Student) => {
    setSelectedStudentId(studentToSelect.id);
    try {
      localStorage.setItem('swipeattend_selected_student_id', studentToSelect.id);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('rollNo', studentToSelect.rollNo);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.error('Failed to save selected student ID', e);
    }
  }, []);

  const handleClearSelectedStudent = useCallback(() => {
    setSelectedStudentId('');
    try {
      localStorage.removeItem('swipeattend_selected_student_id');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('rollNo');
        url.searchParams.delete('studentId');
        url.searchParams.delete('student');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.error('Failed to clear selected student', e);
    }
  }, []);

  // Auto-match student when Firebase user signs in with student email
  useEffect(() => {
    if (firebaseUser?.email && students.length > 0 && !selectedStudentId) {
      const emailLower = firebaseUser.email.toLowerCase();
      const matched = students.find(
        (s) =>
          (s.email && s.email.toLowerCase() === emailLower) ||
          emailLower.includes(s.rollNo.toLowerCase())
      );
      if (matched) {
        handleSelectStudent(matched);
      }
    }
  }, [firebaseUser, students, selectedStudentId, handleSelectStudent]);

  const enrolledStudentsForActiveSession = useMemo(() => {
    if (!activeSession) return students;
    const enrolled = students.filter((s) => s.classroomId === activeSession.classroomId);
    const list = enrolled.length > 0 ? enrolled : students;
    const sorted = [...list].sort((a, b) => {
      const numA = parseInt(a.rollNo.replace(/\D/g, ''), 10);
      const numB = parseInt(b.rollNo.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
    });

    const isPhysics =
      activeSession.subjectId === 'sub-cn' ||
      activeSession.subjectName?.toLowerCase().includes('physic');
    if (isPhysics) {
      return sorted.slice(0, 60);
    }
    const isBee =
      activeSession.subjectId === 'sub-os' ||
      activeSession.subjectName?.toLowerCase().includes('bee') ||
      activeSession.subjectName?.toLowerCase().includes('electrical');
    if (isBee) {
      return sorted.slice(0, 72);
    }
    const isMath =
      activeSession.subjectId === 'sub-dbms' ||
      activeSession.subjectName?.toLowerCase().includes('math');
    if (isMath) {
      return sorted.slice(0, 72);
    }
    return sorted;
  }, [students, activeSession?.classroomId, activeSession?.subjectId, activeSession?.subjectName]);

  const selectedQREnrolledStudents = useMemo(() => {
    if (!selectedQRClassroom) return [];
    return students.filter((s) => s.classroomId === selectedQRClassroom.id);
  }, [students, selectedQRClassroom]);

  // Check if opened via smartphone camera scanning the QR code
  const isDirectStudentScan = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('action') === 'student-qr' || window.location.pathname === '/attend';
  }, []);

  // When a student scans the QR code from their mobile camera, render the dedicated mobile attendance page directly
  if (isDirectStudentScan) {
    return (
      <ToastProvider>
        <OfflineToastWatcher />
        <RetroCRTScreen>
          <Suspense fallback={<ViewLoadingFallback />}>
            <StudentAttendancePage
              initialSessionId={studentScanParams.sessionId}
              initialClassroomId={studentScanParams.classroomId}
              initialToken={studentScanParams.token}
              allClassrooms={classrooms}
              allStudents={students}
              onDone={() => {
                window.history.replaceState({}, '', window.location.pathname);
                window.location.reload();
              }}
            />
          </Suspense>
        </RetroCRTScreen>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <OfflineToastWatcher />
      <RetroCRTScreen>
        <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Top Navigation Bar */}
        <Navbar
        currentRole={role}
        onRoleChange={(newRole) => {
          setRole(newRole);
          if (newRole === 'teacher') setActiveView('dashboard');
          else if (newRole === 'student') setActiveView('student');
          else if (newRole === 'admin') setActiveView('admin');
        }}
        activeView={activeView}
        onNavigate={setActiveView}
        hasDraftSession={!!draftState}
        onResumeDraft={handleResumeDraft}
        onResetData={handleResetData}
        teacherName={teacher.name}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        isSyncing={isSyncing}
        onSyncFirestore={handleSyncFirestore}
        onOpenScanQR={handleOpenStudentScanner}
        sessions={sessions}
        classrooms={classrooms}
        students={students}
        subjects={subjects}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Suspense fallback={<ViewLoadingFallback />}>
          {activeView === 'dashboard' && (
            <TeacherDashboard
              classrooms={classrooms}
              subjects={subjects}
              timetable={timetable}
              sessions={sessions}
              students={students}
              onStartAttendance={handleStartAttendance}
              onViewClassroom={handleViewClassroom}
              onViewHistory={handleViewHistory}
              onNavigateStudents={handleNavigateStudents}
              onLaunchQRAttendance={handleLaunchQRAttendance}
            />
          )}

          {activeView === 'classrooms' && (
            <ClassroomManager
              classrooms={classrooms}
              students={students}
              onCreateClassroom={handleCreateClassroom}
              onSelectClassroom={handleSelectClassroom}
              onLaunchQRAttendance={handleLaunchQRAttendance}
              onImportStudents={handleImportStudents}
              onBack={handleBackToDashboard}
            />
          )}

          {activeView === 'students' && (
            <StudentManager
              students={students}
              classrooms={classrooms}
              onAddStudent={handleAddStudent}
              onImportStudents={handleImportStudents}
              onDeleteStudent={handleDeleteStudent}
              onBatchUpdateStudents={handleBatchUpdateStudents}
              onBack={handleBackToDashboard}
            />
          )}

          {activeView === 'history' && (
            <AttendanceHistoryView
              sessions={sessions}
              students={students}
              onUpdateSession={handleUpdateHistoricalSession}
              onBack={() => setActiveView('dashboard')}
            />
          )}

          {activeView === 'trends' && (
            <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-5 animate-fade-in w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Back to Teacher Dashboard"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                      <span>Attendance Trends & Analytics</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        BIT Sindri
                      </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Historical day-by-day attendance trends, presence percentages, and lecture analytics.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-3 py-2 rounded-xl bg-[#141A2E] hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  ← Back to Dashboard
                </button>
              </div>

              <DashboardWidget
                sessions={sessions}
                classrooms={classrooms}
                threshold={75}
              />
            </div>
          )}

          {activeView === 'student' && (
            <StudentDashboard
              student={currentStudentUser}
              allStudents={students}
              sessions={sessions}
              subjects={subjects}
              classrooms={classrooms}
              onSelectStudent={handleSelectStudent}
              onClearStudent={handleClearSelectedStudent}
              onOpenScanQR={handleOpenStudentScanner}
              currentUserRole={role}
              firebaseUser={firebaseUser}
            />
          )}

          {activeView === 'admin' && (
            <AdminDashboard
              classrooms={classrooms}
              students={students}
              sessions={sessions}
            />
          )}

          {activeView === 'attendance-swipe' && activeSession && (
            <SwipeArena
              session={activeSession}
              students={enrolledStudentsForActiveSession}
              initialIndex={currentSessionIndex}
              onUpdateSession={handleUpdateSessionProgress}
              onComplete={handleCompleteSwipe}
              onViewSummary={(currSession) => {
                setActiveSession(currSession);
                setActiveView('attendance-summary');
              }}
              onExit={() => {
                const draft = getDraftSession();
                if (draft?.session) {
                  setActiveSession(draft.session);
                  setCurrentSessionIndex(draft.currentIndex || 0);
                }
                setActiveView('dashboard');
              }}
              onOpenQR={() => {
                const cls = classrooms.find((c) => c.id === activeSession.classroomId);
                if (cls) handleLaunchQRAttendance(cls);
              }}
            />
          )}

          {activeView === 'attendance-summary' && activeSession && (
            <AttendanceSummaryView
              session={activeSession}
              students={enrolledStudentsForActiveSession}
              onConfirmSave={handleConfirmSave}
              onBackToSwipe={() => setActiveView('attendance-swipe')}
            />
          )}
        </Suspense>
      </main>

      {/* Lazy-Loaded Modals (Zero impact on initial bundle payload) */}
      <Suspense fallback={null}>
        {isSetupModalOpen && (
          <AttendanceSetupModal
            isOpen={isSetupModalOpen}
            onClose={() => setIsSetupModalOpen(false)}
            classrooms={classrooms}
            subjects={subjects}
            students={students}
            existingSessions={sessions}
            onStartSession={handleLaunchSession}
            onStartQRSession={handleStartQRFromSetup}
            onEnrollStudents={handleImportStudents}
            onCreateClassroom={handleCreateClassroom}
            initialClassroomId={setupInitialClassId}
            initialSubjectId={setupInitialSubId}
          />
        )}

        {isCompleteModalOpen && activeSession && (
          <AttendanceCompleteModal
            session={activeSession}
            students={students}
            onViewSummary={handleViewSummaryFromModal}
            onSaveAndFinish={() => handleConfirmSave(activeSession)}
          />
        )}

        {isQRGeneratorOpen && selectedQRClassroom && (
          <ClassroomQRGeneratorModal
            isOpen={isQRGeneratorOpen}
            onClose={() => setIsQRGeneratorOpen(false)}
            classroom={selectedQRClassroom}
            subject={selectedQRSubject}
            teacherName={teacher.name}
            enrolledStudents={selectedQREnrolledStudents}
            onFinalizeAttendance={handleFinalizeQRAttendance}
            onOpenStudentScanView={handleOpenStudentScanFromTeacher}
          />
        )}

        {isStudentScanOpen && (
          <StudentScanAttendanceModal
            isOpen={isStudentScanOpen}
            onClose={() => setIsStudentScanOpen(false)}
            initialSessionId={studentScanParams.sessionId}
            initialClassroomId={studentScanParams.classroomId}
            initialToken={studentScanParams.token}
            allClassrooms={classrooms}
            allStudents={students}
            onAttendanceMarkedSuccess={() => {
              setStudents(getStoredStudents());
            }}
          />
        )}
      </Suspense>
    </div>
  </RetroCRTScreen>
</ToastProvider>
);
}
