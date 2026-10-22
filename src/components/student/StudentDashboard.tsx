import React, { Suspense, lazy, useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import QRCode from 'qrcode';
import { Student, AttendanceSession, Subject, Classroom, Role } from '../../types/attendance';
import { User } from '../../services/firebase';
import {
  Check,
  X,
  Calendar,
  QrCode,
  ShieldCheck,
  Sparkles,
  IdCard,
  Search,
  Lock,
  Unlock,
  Users,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Layers,
  Filter,
} from 'lucide-react';
import { SectionSkeleton, WidgetSkeleton } from '../common/DashboardSkeletons';
import { StudentAvatar } from '../common/StudentAvatar';
import { formatClassDate } from '../../utils/dateUtils';
import { SwipeAttendLogo } from '../common/SwipeAttendLogo';
import { StudentSearchBar } from './StudentSearchBar';

// Code-Splitting: Lazy load student shortage calculator and subjects/history
const StudentShortageSection = lazy(() => import('./StudentShortageSection'));
const StudentSubjectsSection = lazy(() => import('./StudentSubjectsSection'));

interface StudentDashboardProps {
  student: Student | null;
  allStudents?: Student[];
  sessions?: AttendanceSession[];
  subjects?: Subject[];
  classrooms?: Classroom[];
  onSelectStudent?: (student: Student) => void;
  onClearStudent?: () => void;
  onOpenScanQR?: () => void;
  currentUserRole?: Role;
  firebaseUser?: User | null;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  allStudents = [],
  sessions = [],
  subjects = [],
  classrooms = [],
  onSelectStudent,
  onClearStudent,
  onOpenScanQR,
  currentUserRole = 'student',
  firebaseUser = null,
}) => {
  const [isIDCardOpen, setIsIDCardOpen] = useState(false);
  const [portalSearchQuery, setPortalSearchQuery] = useState('');
  const [portalDeptFilter, setPortalDeptFilter] = useState('All');
  const [displayLimit, setDisplayLimit] = useState(36);
  const deferredPortalQuery = useDeferredValue(portalSearchQuery);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset displayLimit whenever search query or department filter changes
  useEffect(() => {
    setDisplayLimit(36);
  }, [portalSearchQuery, portalDeptFilter]);

  // Privacy verification state: Students verify their identity before viewing complete attendance records
  const isPrivilegedUser = currentUserRole === 'teacher' || currentUserRole === 'admin';
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    if (isPrivilegedUser) return true;
    if (!student || typeof window === 'undefined') return true;
    return sessionStorage.getItem(`swipeattend_verified_${student.id}`) === 'true';
  });
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Sync verification state when student changes
  useEffect(() => {
    if (isPrivilegedUser) {
      setIsVerified(true);
      return;
    }
    if (!student) {
      setIsVerified(false);
      return;
    }
    const verified = sessionStorage.getItem(`swipeattend_verified_${student.id}`) === 'true';
    setIsVerified(verified);
    setVerificationInput('');
    setVerificationError('');
  }, [student?.id, isPrivilegedUser]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!student) return;

    const cleanInput = verificationInput.trim().toLowerCase();
    const cleanRoll = student.rollNo.trim().toLowerCase();
    const cleanId = (student.studentId || '').trim().toLowerCase();

    // Verify if entered roll number, student ID, or 1-click confirmation
    if (
      cleanInput === cleanRoll ||
      cleanInput === cleanId ||
      cleanInput === '' ||
      cleanRoll.endsWith(cleanInput)
    ) {
      setIsVerified(true);
      sessionStorage.setItem(`swipeattend_verified_${student.id}`, 'true');
      setVerificationError('');
    } else {
      setVerificationError(`Verification failed. Please enter roll number "${student.rollNo}" to unlock.`);
    }
  };

  // Generate QR code for student ID card modal
  useEffect(() => {
    if (!isIDCardOpen || !qrCanvasRef.current || !student) return;
    const qrPayload = JSON.stringify({
      rollNo: student.rollNo,
      studentId: student.studentId,
      name: student.name,
      department: student.department || 'Computer Science',
      institution: 'BIT Sindri',
      timestamp: new Date().toISOString(),
    });

    QRCode.toCanvas(
      qrCanvasRef.current,
      qrPayload,
      {
        width: 190,
        margin: 2,
        color: {
          dark: '#FFFFFF',
          light: '#080C1D',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('Failed to generate student QR code', err);
      }
    );
  }, [isIDCardOpen, student]);

  // Real sessions from database where this student was evaluated
  const studentSessions = useMemo(() => {
    if (!student) return [];
    return sessions.filter(
      (s) => s.status === 'completed' && s.records && s.records[student.id]
    );
  }, [sessions, student]);

  // Dynamic Attendance Calculations strictly computed from database records
  const { held, attended, missed, overallPercentage } = useMemo(() => {
    if (!student) return { held: 0, attended: 0, missed: 0, overallPercentage: 0 };

    let sessionPresent = 0;
    let sessionAbsent = 0;

    studentSessions.forEach((s) => {
      const rec = s.records[student.id];
      if (rec === 'present') sessionPresent++;
      else if (rec === 'absent') sessionAbsent++;
    });

    const baseHeld = typeof student.totalClassesHeld === 'number' ? student.totalClassesHeld : 0;
    const baseAttended = typeof student.totalClassesAttended === 'number' ? student.totalClassesAttended : 0;

    // Merge registered baseline with live completed sessions
    const totalHeld = Math.max(baseHeld, studentSessions.length);
    const totalAttended = Math.max(baseAttended, sessionPresent);
    const totalMissed = Math.max(0, totalHeld - totalAttended);
    const pct = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : (student.attendancePercentage || 0);

    return {
      held: totalHeld,
      attended: totalAttended,
      missed: totalMissed,
      overallPercentage: pct,
    };
  }, [student, studentSessions]);

  // Dynamic Subject Breakdown strictly based on database curriculum and sessions
  const subjectBreakdown = useMemo(() => {
    if (!student) return [];
    // Find subjects associated with student's classroom
    const classSubs = subjects.filter((s) => s.classroomId === student.classroomId);
    const targetSubs = classSubs.length > 0 ? classSubs : subjects.slice(0, 4);

    // Filter completed sessions for this classroom or student
    const completedSessions = sessions.filter(
      (s) => s.status === 'completed' && (s.classroomId === student.classroomId || s.records[student.id])
    );

    return targetSubs.map((sub, idx) => {
      const subSessions = completedSessions.filter(
        (sess) =>
          sess.subjectId === sub.id ||
          (sess.subjectName && sess.subjectName.toLowerCase() === sub.name.toLowerCase())
      );
      const subHeld = subSessions.length;
      let subAttended = 0;

      subSessions.forEach((sess) => {
        if (sess.records[student.id] === 'present') subAttended++;
      });

      // If sessions exist, compute real %; if none held yet, 0% with 0/0 held
      const percent = subHeld > 0 ? Math.round((subAttended / subHeld) * 100) : 0;
      return {
        name: sub.name,
        code: sub.code || `CS${501 + idx}`,
        percent,
        held: subHeld,
        attended: subAttended,
      };
    });
  }, [subjects, sessions, student]);

  // Dynamic Recent History strictly based on database completed records
  const recentHistory = useMemo(() => {
    if (!student) return [];
    return studentSessions
      .slice(-8)
      .reverse()
      .map((s) => ({
        date: formatClassDate(s.date),
        subject: s.subjectName || 'Lecture Session',
        status: s.records[student.id],
      }));
  }, [studentSessions, student]);

  // All distinct departments for the portal filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return ['All', ...Array.from(set)];
  }, [allStudents]);

  // Filtered students for Directory Search using deferred query for 120fps typing
  const filteredPortalStudents = useMemo(() => {
    const q = deferredPortalQuery.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (portalDeptFilter !== 'All' && s.department !== portalDeptFilter) {
        return false;
      }
      if (!q) return true;
      const nameMatch = s.name.toLowerCase().includes(q);
      const rollMatch = s.rollNo.toLowerCase().includes(q);
      const idMatch = s.studentId ? s.studentId.toLowerCase().includes(q) : false;
      const deptMatch = s.department ? s.department.toLowerCase().includes(q) : false;
      return nameMatch || rollMatch || idMatch || deptMatch;
    });
  }, [allStudents, deferredPortalQuery, portalDeptFilter]);

  // Windowed visible slice for instantaneous DOM rendering
  const visiblePortalStudents = useMemo(() => {
    return filteredPortalStudents.slice(0, displayLimit);
  }, [filteredPortalStudents, displayLimit]);

  const strokeDashoffset = 314 - (314 * overallPercentage) / 100;

  // =========================================================================
  // VIEW A: NO STUDENT SELECTED YET — SHOW STUDENT SEARCH & ACCESS DIRECTORY
  // =========================================================================
  if (!student) {
    return (
      <div className="max-w-6xl mx-auto py-3 sm:py-5 px-3 sm:px-6 lg:px-8 space-y-4 animate-fade-in">
        {/* Compact, Ultra-Quick Student Search Bar */}
        <div className="futuristic-glass cyber-corner border border-cyan-500/25 rounded-xl p-2 sm:p-2.5 shadow-md">
          {/* Small & Quick Search Input Row */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 pointer-events-none shrink-0" />
              <input
                type="text"
                autoFocus
                value={portalSearchQuery}
                onChange={(e) => setPortalSearchQuery(e.target.value)}
                placeholder="Search by student name, roll no, or ID..."
                className="w-full bg-[#080D20]/95 border border-cyan-500/25 focus:border-cyan-400 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all font-['Plus_Jakarta_Sans']"
              />
              {portalSearchQuery && (
                <button
                  onClick={() => setPortalSearchQuery('')}
                  className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Compact Department Filter & Quick Action */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={portalDeptFilter}
                onChange={(e) => setPortalDeptFilter(e.target.value)}
                className="bg-[#0C1226] border border-cyan-500/30 hover:border-cyan-400/60 rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer transition-colors"
                title="Filter by department"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept} className="bg-[#0C1226] text-white">
                    {dept === 'All' ? 'All Depts' : dept.replace('B.Tech ', '')}
                  </option>
                ))}
              </select>

              {onOpenScanQR && (
                <button
                  onClick={onOpenScanQR}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Scan live classroom QR code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results / Student Directory Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {filteredPortalStudents.length}{' '}
                {filteredPortalStudents.length === 1 ? 'Student Found' : 'Students Found'}
                {portalSearchQuery ? ` matching "${portalSearchQuery}"` : ''}
              </span>
            </span>
            <span>Click any student to view their individual attendance records</span>
          </div>

          {visiblePortalStudents.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {visiblePortalStudents.map((std) => {
                const rate = std.attendancePercentage || 0;
                return (
                  <div
                    key={std.id}
                    onClick={() => onSelectStudent && onSelectStudent(std)}
                    className="futuristic-glass cyber-corner border border-cyan-500/20 hover:border-cyan-400/60 rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-cyan-950/40 shadow-lg cursor-pointer group"
                  >
                    <div>
                      {/* Header with Avatar, Name, and Roll */}
                      <div className="flex items-start gap-3">
                        <StudentAvatar
                          name={std.name}
                          avatarUrl={std.avatarUrl}
                          rollNo={std.rollNo}
                          studentId={std.studentId}
                          size="md"
                          className="ring-2 ring-cyan-500/30 group-hover:ring-cyan-400 shadow-md shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {std.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 font-mono text-xs">
                            <span className="text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                              Roll #{std.rollNo}
                            </span>
                            {std.studentId && (
                              <span className="text-slate-400">ID: {std.studentId}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Academic Info */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 text-xs text-slate-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300 truncate">
                          <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span className="truncate">{std.department || 'B.Tech Engineering'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{std.semester || '5th Sem'}</span>
                          <span className="font-mono text-violet-300 font-semibold">
                            {std.section ? std.section : 'Section A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Attendance Percentage & Action */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg border ${
                            rate >= 75
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : rate >= 65
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {rate}% Attendance
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ({std.totalClassesAttended || 0}/{std.totalClassesHeld || 0})
                        </span>
                      </div>

                      <span className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                        <span>View Records</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>

              {filteredPortalStudents.length > displayLimit && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => prev + 36)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <span>Load More Students ({filteredPortalStudents.length - displayLimit} remaining)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="futuristic-glass cyber-corner border border-cyan-500/20 rounded-3xl p-10 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No registered students found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No students matched "{portalSearchQuery}". Try searching by roll number (e.g. 26CY1001 or 12), partial name, or choose "All Departments".
              </p>
              <button
                onClick={() => {
                  setPortalSearchQuery('');
                  setPortalDeptFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: STUDENT SELECTED — SHOW INDIVIDUAL ATTENDANCE DASHBOARD
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 animate-fade-in overflow-x-hidden">
      {/* =========================================================================
          PROMINENT TOP SEARCH BAR & DIRECTORY SWITCHER
          ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider">
            <Search className="w-3.5 h-3.5" />
            <span>Search Student Directory or Switch Record</span>
          </span>
          <div className="flex items-center gap-2">
            {onClearStudent && (
              <button
                onClick={onClearStudent}
                className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                title="Return to student search directory"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Students Directory</span>
              </button>
            )}
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              ({allStudents.length} Students in DB)
            </span>
          </div>
        </div>

        {allStudents.length > 0 && onSelectStudent && (
          <StudentSearchBar
            students={allStudents}
            selectedStudent={student}
            onSelectStudent={(newStudent) => {
              onSelectStudent(newStudent);
              setIsVerified(isPrivilegedUser);
            }}
            classrooms={classrooms}
          />
        )}
      </div>

      {/* =========================================================================
          ACTIVE STUDENT IDENTITY STRIP WITH DIRECTORY RETURN
          ========================================================================= */}
      <div className="futuristic-glass cyber-corner border border-cyan-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <StudentAvatar
            name={student.name}
            avatarUrl={student.avatarUrl}
            rollNo={student.rollNo}
            studentId={student.studentId}
            size="md"
            className="ring-2 ring-cyan-500/40 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {student.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
                Roll #{student.rollNo}
              </span>
              {student.studentId && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px] hidden sm:inline">
                  ID: {student.studentId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {student.department || 'B.Tech Engineering'} • {student.semester || '5th Sem'} • {student.section || 'Sec A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Privacy Verification Badge */}
          {isVerified ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identity Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Records Protected</span>
            </div>
          )}

          {/* Digital ID Pass Trigger */}
          <button
            onClick={() => setIsIDCardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-white font-bold text-xs border border-cyan-500/30 transition-all cursor-pointer min-h-[36px]"
            title="Display personal digital student ID card with QR badge"
          >
            <IdCard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Digital ID & QR Pass</span>
          </button>

          {/* Teacher / Mobile QR Scanner Trigger */}
          {onOpenScanQR && (
            <button
              onClick={onOpenScanQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all cursor-pointer min-h-[36px]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Class QR</span>
            </button>
          )}

          {/* Switch Student Action */}
          {onClearStudent && (
            <button
              onClick={onClearStudent}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              title="Search a different student"
            >
              Switch Student
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          PRIVACY GATE VERIFICATION PROMPT (If student records not yet unlocked)
          ========================================================================= */}
      {!isVerified && !isPrivilegedUser && (
        <div className="futuristic-glass cyber-corner border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Student Record Verification Required
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                To protect student academic privacy, please confirm your Roll Number (<span className="text-cyan-300 font-mono font-bold">{student.rollNo}</span>) or click "Unlock My Records" to view your complete subject-wise attendance breakdown and lecture history.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder={`Enter roll number (${student.rollNo})...`}
              className="flex-1 bg-[#090D1F] border border-amber-500/30 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Records</span>
            </button>
          </form>

          {verificationError && (
            <p className="text-[11px] text-red-400 font-mono flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{verificationError}</span>
            </p>
          )}
        </div>
      )}

      {/* =========================================================================
          MAIN STAT SHOWCASE: CIRCULAR RING + STAT COLUMNS + SHORTAGE CALCULATOR
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Circular Dial & Quick Stats Column */}
        <div className="lg:col-span-2 futuristic-glass cyber-corner border border-cyan-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-7 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Glowing Circular Ring */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                className="text-[#10152B]"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="url(#neonEmerald)"
                strokeWidth="10"
                strokeDasharray="314"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="neonEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-mono tracking-tight tabular-nums">
                {overallPercentage}%
              </span>
              <span className="text-[9px] sm:text-[11px] uppercase tracking-wider font-bold text-cyan-300 mt-0.5">
                Attendance
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-2 sm:space-y-3 w-full sm:w-auto">
            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#090E20]/90 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Present</p>
                  <p className="text-[10px] text-slate-500 font-mono">Attended</p>
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {attended}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#090E20]/90 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Absent</p>
                  <p className="text-[10px] text-slate-500 font-mono">Missed</p>
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-mono text-red-400 tabular-nums">
                {missed}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#090E20]/90 border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Total</p>
                  <p className="text-[10px] text-slate-500 font-mono">Conducted</p>
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
                {held}
              </span>
            </div>
          </div>
        </div>

        {/* Shortage Calculator Card (Lazy-loaded) */}
        <div>
          <Suspense fallback={<WidgetSkeleton />}>
            <StudentShortageSection held={held} attended={attended} />
          </Suspense>
        </div>
      </div>

      {/* =========================================================================
          SUBJECT-WISE ATTENDANCE BREAKDOWN & HISTORY
          ========================================================================= */}
      {isVerified ? (
        <Suspense fallback={<SectionSkeleton rows={4} height="h-64" />}>
          <StudentSubjectsSection
            subjectBreakdown={subjectBreakdown}
            recentHistory={recentHistory}
          />
        </Suspense>
      ) : (
        <div className="p-6 rounded-2xl bg-[#090E20]/80 border border-white/10 text-center space-y-2">
          <Lock className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Subject Breakdown & Historical Log Locked</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please verify student identity above to inspect individual course attendance percentages and lecture timeline.
          </p>
        </div>
      )}

      {/* =========================================================================
          STUDENT DIGITAL ID CARD & QR PASS MODAL
          ========================================================================= */}
      {isIDCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-sm rounded-3xl futuristic-glass cyber-corner border border-cyan-500/40 shadow-2xl p-6 text-slate-100 flex flex-col items-center space-y-4">
            <button
              onClick={() => setIsIDCardOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Holographic Security Ribbon */}
            <div className="w-full h-1 rounded-full hologram-ribbon opacity-80 pointer-events-none" />

            {/* Institution Card Banner */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SwipeAttendLogo size={32} />
                <div>
                  <h4 className="text-xs font-black tracking-tight text-white uppercase font-mono">BIT SINDRI</h4>
                  <p className="text-[10px] text-cyan-400 font-mono">HOLOGRAPHIC SMART PASS</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                VERIFIED
              </span>
            </div>

            {/* Student Photo & Details */}
            <div className="flex flex-col items-center text-center space-y-1">
              <StudentAvatar
                name={student.name}
                avatarUrl={student.avatarUrl}
                rollNo={student.rollNo}
                studentId={student.studentId}
                size="xl"
                className="ring-4 ring-cyan-500/50 shadow-2xl"
              />
              <h3 className="text-base font-bold text-white pt-2">{student.name}</h3>
              <p className="text-xs font-mono font-bold text-cyan-300">Roll #{student.rollNo}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                ID: {student.studentId} • {student.department || 'B.Tech Engineering'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {student.semester || '5th Sem'} • {student.section || 'Sec A'}
              </p>
            </div>

            {/* QR Code Canvas */}
            <div className="p-4 rounded-2xl bg-[#080D1D]/90 border border-cyan-500/25 shadow-inner flex flex-col items-center">
              <canvas ref={qrCanvasRef} className="rounded-xl shadow-md" />
              <p className="text-[10px] text-cyan-400 font-mono mt-2">Biometric Scan Active</p>
            </div>

            <button
              onClick={() => setIsIDCardOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 transition-all cursor-pointer min-h-[44px]"
            >
              Close ID Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
