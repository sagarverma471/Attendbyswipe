import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import {
  Student,
  AttendanceSession,
  AttendanceStatus,
} from '../../types/attendance';
import {
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  Keyboard,
  List,
  Layers,
  Search,
  CheckCheck,
  GraduationCap,
  Calendar,
  Sparkles,
  QrCode,
  FileText,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  User,
  ShieldCheck,
  Building,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';
import { formatClassDate } from '../../utils/dateUtils';
import { saveAttendanceDecision } from '../../services/storage';

interface SwipeArenaProps {
  session: AttendanceSession;
  students: Student[];
  initialIndex?: number;
  onUpdateSession: (session: AttendanceSession, currentIndex: number, historyStack: any[]) => void;
  onComplete: (session: AttendanceSession) => void;
  onExit: () => void;
  onOpenQR?: () => void;
  onViewSummary?: (session: AttendanceSession) => void;
}

interface UndoItem {
  index: number;
  studentId: string;
  previousStatus: AttendanceStatus;
}

interface ActiveSwipeCardProps {
  student: Student;
  index: number;
  total: number;
  sessionDate: string;
  exitDirection: 'left' | 'right' | null;
  onSwipe: (status: AttendanceStatus, direction: 'left' | 'right') => void;
  isProcessing: boolean;
  triggerHaptic: (ms?: number) => void;
}

/**
 * Individual Active Draggable Card.
 * Each student card has its own isolated MotionValues and lifecycle to prevent
 * any cross-student state contamination or shared transform collisions.
 */
const ActiveSwipeCard: React.FC<ActiveSwipeCardProps> = ({
  student,
  index,
  total,
  sessionDate,
  exitDirection,
  onSwipe,
  isProcessing,
  triggerHaptic,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-16, 0, 16]);
  const presentOpacity = useTransform(x, [18, 70], [0, 1]);
  const absentOpacity = useTransform(x, [-70, -18], [1, 0]);
  const presentGlowOpacity = useTransform(x, [15, 75], [0, 1]);
  const absentGlowOpacity = useTransform(x, [-75, -15], [1, 0]);

  // Smoothly trigger off-screen animation whenever exitDirection is set
  useEffect(() => {
    if (exitDirection === 'right') {
      const targetX = typeof window !== 'undefined' ? Math.max(window.innerWidth, 800) : 800;
      animate(x, targetX, { duration: 0.22, ease: [0.32, 0.72, 0, 1] });
    } else if (exitDirection === 'left') {
      const targetX = typeof window !== 'undefined' ? -Math.max(window.innerWidth, 800) : -800;
      animate(x, targetX, { duration: 0.22, ease: [0.32, 0.72, 0, 1] });
    }
  }, [exitDirection, x]);

  // Touch and mouse drag completion evaluation
  const handleDragEnd = (_: any, info: any) => {
    if (isProcessing) return;

    const currentX = x.get();
    const offsetX = info?.offset?.x ?? 0;
    const velocityX = info?.velocity?.x ?? 0;

    // Responsive thresholds: 45px drag distance OR 180px/s flick velocity
    const isSwipeRight = currentX > 45 || offsetX > 45 || velocityX > 180;
    const isSwipeLeft = currentX < -45 || offsetX < -45 || velocityX < -180;

    if (isSwipeRight) {
      triggerHaptic(12);
      const targetX = typeof window !== 'undefined' ? Math.max(window.innerWidth, 800) : 800;
      animate(x, targetX, { duration: 0.22, ease: [0.32, 0.72, 0, 1] });
      onSwipe('present', 'right');
    } else if (isSwipeLeft) {
      triggerHaptic(12);
      const targetX = typeof window !== 'undefined' ? -Math.max(window.innerWidth, 800) : -800;
      animate(x, targetX, { duration: 0.22, ease: [0.32, 0.72, 0, 1] });
      onSwipe('absent', 'left');
    } else {
      // Smoothly snap back to center if threshold not met
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 28 });
    }
  };

  const attendanceRate = student.attendancePercentage ?? 0;
  const isGoodAttendance = attendanceRate >= 75;
  const isWarningAttendance = attendanceRate >= 60 && attendanceRate < 75;

  return (
    <motion.div
      style={{
        x,
        rotate,
        touchAction: 'none',
        zIndex: 20,
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      drag="x"
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.94, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 }}
      exit={{
        x: exitDirection === 'right' ? (typeof window !== 'undefined' ? Math.max(window.innerWidth, 800) : 800) : -(typeof window !== 'undefined' ? Math.max(window.innerWidth, 800) : 800),
        rotate: exitDirection === 'right' ? 18 : -18,
        opacity: 0,
        scale: 0.88,
        transition: { duration: 0.12, ease: 'easeOut' },
      }}
      transition={{ type: 'spring', damping: 28, stiffness: 420 }}
      className="absolute inset-0 z-20 w-full h-[470px] sm:h-[495px] md:h-[515px] rounded-3xl bg-[#121826] border border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-xl cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden will-change-transform transform-gpu"
    >
      {/* Present/Absent Edge Glow Overlays */}
      <motion.div
        style={{ opacity: presentGlowOpacity }}
        className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10"
      />
      <motion.div
        style={{ opacity: absentGlowOpacity }}
        className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-rose-500 bg-rose-500/10"
      />

      {/* Floating Directional Action Stamps during Drag */}
      <motion.div
        style={{ opacity: presentOpacity }}
        className="absolute top-5 right-5 z-20 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg pointer-events-none rotate-6"
      >
        <Check className="w-4 h-4 stroke-[3]" />
        <span>PRESENT</span>
      </motion.div>

      <motion.div
        style={{ opacity: absentOpacity }}
        className="absolute top-5 left-5 z-20 px-3.5 py-1.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg pointer-events-none -rotate-6"
      >
        <X className="w-4 h-4 stroke-[3]" />
        <span>ABSENT</span>
      </motion.div>

      {/* Card Header: Position & Attendance Rate */}
      <div className="flex items-center justify-between w-full pointer-events-none select-none gap-2">
        <span className="text-xs text-slate-400 font-semibold font-mono">
          Student {index + 1} of {total}
        </span>

        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            isGoodAttendance
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : isWarningAttendance
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {attendanceRate}% Attendance
        </span>
      </div>

      {/* Center: Student Avatar, Full Name & Identifiers */}
      <div className="flex flex-col items-center text-center my-auto pointer-events-none select-none py-2">
        <div className="mb-3">
          <StudentAvatar
            name={student.name}
            avatarUrl={student.avatarUrl}
            rollNo={student.rollNo}
            studentId={student.studentId}
            size="deck"
            priority={true}
            className="ring-4 ring-slate-800 shadow-xl"
          />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight select-none truncate max-w-full px-2">
          {student.name}
        </h2>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap justify-center select-none text-xs">
          <span className="font-semibold text-violet-300 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 font-mono">
            Roll No. {student.rollNo}
          </span>
          {student.studentId && (
            <span className="text-slate-400 px-2 py-1 rounded-lg bg-slate-800/60 font-mono">
              ID: {student.studentId}
            </span>
          )}
        </div>
      </div>

      {/* Student Details Summary Box */}
      <div className="w-full bg-[#0B0F19] border border-slate-800/90 rounded-2xl p-3 text-xs space-y-1.5 pointer-events-none select-none">
        <div className="flex items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="truncate font-medium text-slate-200">
              {student.department || 'B.Tech Engineering'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
            {student.section ? `Sec ${student.section.replace(/^Section\s*/i, '')}` : 'Sec A'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1.5 border-t border-slate-800/80">
          <span>Classes Attended:</span>
          <span className="font-semibold text-slate-200">
            {student.totalClassesHeld > 0
              ? `${student.totalClassesAttended} of ${student.totalClassesHeld} (${attendanceRate}%)`
              : `${attendanceRate}%`}
          </span>
        </div>
      </div>

      {/* Quick 1-Tap Action Buttons directly on Card Bottom */}
      <div className="w-full flex items-center justify-between gap-2.5 pt-1 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic(12);
            onSwipe('absent', 'left');
          }}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:scale-95 border border-red-500/30 text-red-300 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm select-none"
          title="Mark Absent (Swipe Left)"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
          <span>Absent</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic(12);
            onSwipe('present', 'right');
          }}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm select-none"
          title="Mark Present (Swipe Right)"
        >
          <span>Present</span>
          <Check className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Preview Peek Card rendered underneath the active card in the deck.
 * Positioned strictly behind the active card (z-0) with scale and opacity
 * to provide a clean, subtle card deck depth effect without any text, photo,
 * or details overlapping or interfering with the active card.
 */
const PeekDeckCard: React.FC<{ student: Student; index: number }> = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-0 w-full h-[470px] sm:h-[495px] md:h-[515px] rounded-3xl bg-[#060A18] border border-cyan-500/20 shadow-xl pointer-events-none select-none overflow-hidden transition-all duration-200"
      style={{
        transform: 'scale(0.96) translateY(6px)',
        opacity: 0.6,
        zIndex: 0,
      }}
    >
      {/* Sleek deck backplate header rim */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      {/* Background card interior: all text/photo clipped so it never interferes with active student */}
      <div className="w-full h-full bg-[#050814]/90" />
    </div>
  );
};

export const SwipeArena: React.FC<SwipeArenaProps> = ({
  session,
  students,
  initialIndex = 0,
  onUpdateSession,
  onComplete,
  onExit,
  onOpenQR,
  onViewSummary,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(session.records || {});
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const [searchQuery, setSearchQuery] = useState('');
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Authoritative synchronous refs to completely prevent closure staleness and race conditions during rapid animations
  const recordsRef = useRef<Record<string, AttendanceStatus>>(records);
  const currentIndexRef = useRef<number>(currentIndex);
  const undoStackRef = useRef<UndoItem[]>(undoStack);
  const sessionRef = useRef<AttendanceSession>(session);
  const isProcessingRef = useRef(false);

  // Keep refs synchronized with props/state
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Synchronize records if external session updates (e.g. from cloud sync or draft restore)
  useEffect(() => {
    if (session?.records && Object.keys(session.records).length > 0) {
      setRecords(session.records);
      recordsRef.current = session.records;
    }
  }, [session?.id]);

  // Sync initialIndex only when session identity actually changes
  const lastSessionIdRef = useRef(session.id);
  useEffect(() => {
    if (lastSessionIdRef.current !== session.id) {
      lastSessionIdRef.current = session.id;
      setCurrentIndex(initialIndex);
      currentIndexRef.current = initialIndex;
    }
  }, [session.id, initialIndex]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((ms = 12) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }, []);

  const totalStudents = students.length;
  const currentStudent = students[currentIndex];
  const nextStudent = students[currentIndex + 1];

  // Derived counts
  const presentCount = useMemo(
    () => Object.values(records).filter((s) => s === 'present').length,
    [records]
  );
  const absentCount = useMemo(
    () => Object.values(records).filter((s) => s === 'absent').length,
    [records]
  );
  const remainingCount = Math.max(0, totalStudents - (presentCount + absentCount));
  const progressPercent = totalStudents > 0 ? Math.round(((presentCount + absentCount) / totalStudents) * 100) : 0;

  /**
   * Authoritative synchronous session propagator:
   * Immediately updates internal refs, React states, and propagates the latest session
   * and index to the parent (App.tsx and storage) synchronously without waiting for passive effects.
   */
  const notifySessionProgress = useCallback(
    (
      newRecords: Record<string, AttendanceStatus>,
      newIndex: number,
      newStack: UndoItem[]
    ) => {
      const present = Object.values(newRecords).filter((s) => s === 'present').length;
      const absent = Object.values(newRecords).filter((s) => s === 'absent').length;
      const isComplete = newIndex >= totalStudents;

      const updatedSession: AttendanceSession = {
        ...sessionRef.current,
        records: newRecords,
        presentCount: present,
        absentCount: absent,
        unmarkedCount: Math.max(0, totalStudents - (present + absent)),
        status: isComplete ? 'completed' : 'draft',
      };

      // 1. Synchronously update authoritative refs first
      sessionRef.current = updatedSession;
      recordsRef.current = newRecords;
      currentIndexRef.current = newIndex;
      undoStackRef.current = newStack;

      // 2. Update React local states
      setRecords(newRecords);
      setCurrentIndex(newIndex);
      setUndoStack(newStack);

      // 3. Immediately propagate to parent (saves draft & synchronizes activeSession without passive effect lag)
      onUpdateSession(updatedSession, newIndex, newStack);
    },
    [totalStudents, onUpdateSession]
  );

  // Mark student with reliable animation sequence and instantaneous synchronous state propagation
  const markStudent = useCallback(
    (status: AttendanceStatus, direction?: 'left' | 'right') => {
      const currentIdx = currentIndexRef.current;
      const currentStd = students[currentIdx];
      if (!currentStd || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);

      const chosenDirection = direction || (status === 'present' ? 'right' : 'left');
      setExitDirection(chosenDirection);
      triggerHaptic(12);

      const studentId = currentStd.id;
      const prevStatus = recordsRef.current[studentId] || 'unmarked';
      const newRecords = { ...recordsRef.current, [studentId]: status };
      const newUndoItem: UndoItem = {
        index: currentIdx,
        studentId,
        previousStatus: prevStatus,
      };
      const newUndoStack = [...undoStackRef.current, newUndoItem];
      const nextIdx = currentIdx + 1 >= totalStudents ? totalStudents : currentIdx + 1;

      // Journal attendance decision to IndexedDB immediately without waiting for network
      saveAttendanceDecision({
        id: `dec_${sessionRef.current.id}_${studentId}_${Date.now()}`,
        sessionId: sessionRef.current.id,
        studentId,
        studentName: currentStd.name,
        rollNo: currentStd.rollNo,
        classroomId: sessionRef.current.classroomId,
        status,
        previousStatus: prevStatus,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      // Lightning-fast card exit animation (120ms) before advancing student
      setTimeout(() => {
        setExitDirection(null);
        notifySessionProgress(newRecords, nextIdx, newUndoStack);
        isProcessingRef.current = false;
        setIsProcessing(false);

        if (nextIdx >= totalStudents) {
          const present = Object.values(newRecords).filter((s) => s === 'present').length;
          const absent = Object.values(newRecords).filter((s) => s === 'absent').length;
          const finalizedSession: AttendanceSession = {
            ...sessionRef.current,
            records: newRecords,
            presentCount: present,
            absentCount: absent,
            unmarkedCount: 0,
            status: 'completed',
          };
          sessionRef.current = finalizedSession;
          onComplete(finalizedSession);
        }
      }, 120);
    },
    [students, totalStudents, notifySessionProgress, onComplete, triggerHaptic]
  );

  // Undo Functionality with instantaneous synchronous state propagation
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || isProcessingRef.current) return;
    triggerHaptic(10);

    const stack = undoStackRef.current;
    const lastAction = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);

    const updatedRecords = { ...recordsRef.current };
    if (lastAction.previousStatus === 'unmarked') {
      delete updatedRecords[lastAction.studentId];
    } else {
      updatedRecords[lastAction.studentId] = lastAction.previousStatus;
    }

    // Journal undo action to IndexedDB
    saveAttendanceDecision({
      id: `dec_undo_${sessionRef.current.id}_${lastAction.studentId}_${Date.now()}`,
      sessionId: sessionRef.current.id,
      studentId: lastAction.studentId,
      classroomId: sessionRef.current.classroomId,
      status: lastAction.previousStatus,
      previousStatus: recordsRef.current[lastAction.studentId],
      timestamp: new Date().toISOString(),
      synced: false,
    });

    setExitDirection(null);
    notifySessionProgress(updatedRecords, lastAction.index, newStack);
  }, [notifySessionProgress, triggerHaptic]);

  // Skip to next student without marking
  const handleSkipNext = useCallback(() => {
    const currIdx = currentIndexRef.current;
    if (isProcessingRef.current || currIdx + 1 >= totalStudents) return;
    const nextIdx = currIdx + 1;
    setExitDirection(null);
    notifySessionProgress(recordsRef.current, nextIdx, undoStackRef.current);
  }, [totalStudents, notifySessionProgress]);

  // Mark all remaining present
  const handleMarkAllRemainingPresent = useCallback(() => {
    const updated = { ...recordsRef.current };
    students.forEach((s) => {
      if (!updated[s.id] || updated[s.id] === 'unmarked') {
        updated[s.id] = 'present';
      }
    });
    notifySessionProgress(updated, totalStudents, undoStackRef.current);
    onComplete(sessionRef.current);
  }, [students, totalStudents, notifySessionProgress, onComplete]);

  // List mode toggle for individual student row
  const handleListStatusToggle = useCallback(
    (studentId: string, targetStatus: AttendanceStatus) => {
      const currentStatus = recordsRef.current[studentId] || 'unmarked';
      const nextStatus = currentStatus === targetStatus ? 'unmarked' : targetStatus;
      const updated = { ...recordsRef.current };
      if (nextStatus === 'unmarked') {
        delete updated[studentId];
      } else {
        updated[studentId] = nextStatus;
      }
      notifySessionProgress(updated, currentIndexRef.current, undoStackRef.current);
    },
    [notifySessionProgress]
  );

  // Exit/Back button: flush latest session and exit
  const handleExitSession = useCallback(() => {
    notifySessionProgress(recordsRef.current, currentIndexRef.current, undoStackRef.current);
    onExit();
  }, [notifySessionProgress, onExit]);

  // End button: flush finalized session and complete
  const handleEndSession = useCallback(() => {
    const present = Object.values(recordsRef.current).filter((s) => s === 'present').length;
    const absent = Object.values(recordsRef.current).filter((s) => s === 'absent').length;
    const finalized: AttendanceSession = {
      ...sessionRef.current,
      records: recordsRef.current,
      presentCount: present,
      absentCount: absent,
      unmarkedCount: Math.max(0, totalStudents - (present + absent)),
      status: 'completed',
    };
    sessionRef.current = finalized;
    onUpdateSession(finalized, currentIndexRef.current, undoStackRef.current);
    onComplete(finalized);
  }, [totalStudents, onUpdateSession, onComplete]);

  // Summary button: flush latest session and view summary
  const handleSummaryClick = useCallback(() => {
    notifySessionProgress(recordsRef.current, currentIndexRef.current, undoStackRef.current);
    if (onViewSummary) {
      onViewSummary(sessionRef.current);
    } else {
      onComplete(sessionRef.current);
    }
  }, [notifySessionProgress, onViewSummary, onComplete]);

  // High-Speed Keyboard Navigation for Instant Evaluation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Right / D / 1 / Enter: Instant Present
      if (e.key === 'ArrowRight' || key === 'd' || key === '1' || e.key === 'Enter') {
        e.preventDefault();
        markStudent('present', 'right');
      }
      // Left / A / 2: Instant Absent
      else if (e.key === 'ArrowLeft' || key === 'a' || key === '2') {
        e.preventDefault();
        markStudent('absent', 'left');
      }
      // Space / S: Instant Skip Next
      else if (e.key === ' ' || key === 's') {
        e.preventDefault();
        handleSkipNext();
      }
      // U / Backspace / Ctrl+Z / Cmd+Z: Instant Undo
      else if (
        key === 'u' ||
        e.key === 'Backspace' ||
        ((key === 'z') && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markStudent, handleUndo, handleSkipNext]);

  return (
    <div className="flex-1 bg-[#070A12] text-white flex flex-col justify-between p-2.5 sm:p-5 lg:p-7 select-none overflow-x-hidden min-h-screen">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
        {/* RESPONSIVE HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleExitSession}
              className="p-2 rounded-xl bg-[#121826] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-slate-800"
              title="Pause and Exit to Dashboard"
              aria-label="Exit attendance session"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {session.subjectName}
              </h1>
              <p className="text-xs text-slate-400 truncate">
                {session.classroomName} · Period {session.period || 2}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Swipe / List Mode Toggle */}
            <div className="flex items-center p-1 bg-[#121826] rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('swipe')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'swipe'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Swipe card mode"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List mode"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            {/* Class QR */}
            {onOpenQR && (
              <button
                onClick={onOpenQR}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121826] hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold border border-slate-800 transition-colors min-h-[36px] cursor-pointer"
                title="Open Live QR Code for students to scan"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-400" />
                <span>QR</span>
              </button>
            )}

            {/* End / Done Button */}
            <button
              onClick={handleEndSession}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors min-h-[36px] flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Finish and save attendance session"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* COUNTER & PROGRESS INDICATOR BAR */}
        <div className="mt-3 bg-[#121826] border border-slate-800/80 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap text-xs">
            <span className="font-bold text-white font-mono">
              Student {Math.min(currentIndex + 1, totalStudents)} of {totalStudents}
            </span>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-emerald-400 font-semibold">{presentCount} Present</span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400 font-semibold">{absentCount} Absent</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{remainingCount} Left</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/70 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-200 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* MAIN BODY: SWIPE ARENA VS LIST VIEW */}
        {viewMode === 'swipe' ? (
          <div className="relative flex-1 flex flex-col items-center justify-center my-3 sm:my-5 min-h-[480px] touch-none">
            {/* DECK CARDS CONTAINER */}
            <div className="relative w-full max-w-[340px] xs:max-w-[360px] sm:max-w-md h-[460px] sm:h-[485px] md:h-[500px] flex items-center justify-center">
              {/* Peek Card: Upcoming Student in Deck */}
              {nextStudent && <PeekDeckCard student={nextStudent} index={currentIndex + 1} />}

              {/* Active Draggable Student Card */}
              <AnimatePresence>
                {currentStudent ? (
                  <ActiveSwipeCard
                    key={currentStudent.id}
                    student={currentStudent}
                    index={currentIndex}
                    total={totalStudents}
                    sessionDate={session.date}
                    exitDirection={exitDirection}
                    onSwipe={markStudent}
                    isProcessing={isProcessing}
                    triggerHaptic={triggerHaptic}
                  />
                ) : (
                  <div className="text-center p-6 sm:p-8 bg-[#121826] rounded-3xl border border-slate-800 w-full max-w-sm shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-lg font-bold text-white mb-1">Attendance Complete!</p>
                    <p className="text-xs text-slate-400 mb-5">
                      {presentCount} Present · {absentCount} Absent
                    </p>
                    <button
                      onClick={() => {
                        const finalSession: AttendanceSession = {
                          ...session,
                          records,
                          presentCount,
                          absentCount,
                          unmarkedCount: 0,
                          status: 'completed',
                        };
                        onComplete(finalSession);
                      }}
                      className="w-full py-2.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors cursor-pointer min-h-[42px]"
                    >
                      View Summary
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* BOTTOM ERGONOMIC THUMB-FRIENDLY CONTROLS */}
            <div className="flex items-center justify-center gap-5 sm:gap-8 mt-4">
              {/* Absent Button */}
              <button
                onClick={() => {
                  triggerHaptic(12);
                  markStudent('absent', 'left');
                }}
                disabled={!currentStudent || isProcessing}
                className="group flex flex-col items-center cursor-pointer focus:outline-none"
                aria-label="Mark student absent"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-900/30 group-hover:scale-105 active:scale-95 transition-all">
                  <X className="w-7 h-7 stroke-[3]" />
                </div>
                <span className="mt-1.5 text-xs font-bold text-rose-400">
                  Absent
                </span>
              </button>

              {/* Undo Button */}
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0 || isProcessing}
                className={`group flex flex-col items-center cursor-pointer focus:outline-none ${
                  undoStack.length === 0 ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                aria-label="Undo previous decision"
                title="Undo last marked student"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#161F33] border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-300 group-hover:text-white active:scale-95 transition-all">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-400">
                  Undo
                </span>
              </button>

              {/* Skip / Next Button */}
              <button
                onClick={handleSkipNext}
                disabled={!currentStudent || currentIndex + 1 >= totalStudents || isProcessing}
                className={`group flex flex-col items-center cursor-pointer focus:outline-none ${
                  !currentStudent || currentIndex + 1 >= totalStudents ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                aria-label="Skip to next student"
                title="Skip student without marking"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#161F33] border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-300 group-hover:text-white active:scale-95 transition-all">
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-400">
                  Skip
                </span>
              </button>

              {/* Present Button */}
              <button
                onClick={() => {
                  triggerHaptic(12);
                  markStudent('present', 'right');
                }}
                disabled={!currentStudent || isProcessing}
                className="group flex flex-col items-center cursor-pointer focus:outline-none"
                aria-label="Mark student present"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 group-hover:scale-105 active:scale-95 transition-all">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <span className="mt-1.5 text-xs font-bold text-emerald-400">
                  Present
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* LIST MODE */
          <div className="mt-4 flex-1 bg-[#101526] border border-white/8 rounded-2xl p-3 sm:p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, roll no, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#171E33] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                onClick={handleMarkAllRemainingPresent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 text-xs font-semibold transition-colors cursor-pointer min-h-[34px]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[52vh] divide-y divide-white/5 pr-1">
              {students
                .filter(
                  (s) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.rollNo.includes(searchQuery) ||
                    (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((student, idx) => {
                  const status = records[student.id] || 'unmarked';
                  return (
                    <div
                      key={student.id}
                      className="py-2.5 px-1.5 flex items-center justify-between gap-2 hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 w-5 shrink-0">
                          {idx + 1}
                        </span>
                        <StudentAvatar
                          name={student.name}
                          avatarUrl={student.avatarUrl}
                          rollNo={student.rollNo}
                          studentId={student.studentId}
                          size="sm"
                          className="ring-1 ring-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            Roll {student.rollNo} {student.studentId ? `· ${student.studentId}` : ''} · {student.attendancePercentage}%
                          </p>
                        </div>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleListStatusToggle(student.id, 'present')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[32px] ${
                            status === 'present'
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleListStatusToggle(student.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[32px] ${
                            status === 'absent'
                              ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* BOTTOM SHORTCUTS BAR */}
        <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium text-slate-400">
              <Keyboard className="w-3 h-3 text-violet-400" />
              <span className="hidden sm:inline">Shortcuts:</span>
            </span>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">→ Present</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">← Absent</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Z Undo</span>
            </div>
            <span className="sm:hidden text-[10px] text-slate-500">
              Swipe card right (Present) or left (Absent)
            </span>
          </div>

          {nextStudent && viewMode === 'swipe' && (
            <div className="flex items-center gap-1.5 bg-[#12182B] px-2 py-0.5 rounded-lg border border-white/8 text-[11px] truncate max-w-[190px]">
              <span className="text-[10px] text-slate-400">Next:</span>
              <span className="font-semibold text-slate-200 truncate">{nextStudent.name.split(' ')[0]}</span>
              <span className="font-mono text-violet-300 text-[10px]">#{nextStudent.rollNo}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
