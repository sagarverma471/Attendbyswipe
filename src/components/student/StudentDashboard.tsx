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

  // Direct immediate access to attendance records
  const isVerified = true;

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
        {/* Compact, Clean Student Search Bar */}
        <div className="bg-[#121826] border border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-sm">
          {/* Search Input Row */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none shrink-0" />
              <input
                type="text"
                autoFocus
                value={portalSearchQuery}
                onChange={(e) => setPortalSearchQuery(e.target.value)}
                placeholder="Search by student name, roll no, or ID..."
                className="w-full bg-[#0B0F19] border border-slate-800 focus:border-violet-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none transition-all font-['Plus_Jakarta_Sans']"
              />
              {portalSearchQuery && (
                <button
                  onClick={() => setPortalSearchQuery('')}
                  className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter & Quick Action */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={portalDeptFilter}
                onChange={(e) => setPortalDeptFilter(e.target.value)}
                className="bg-[#0B0F19] border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none cursor-pointer transition-colors"
                title="Filter by department"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept} className="bg-[#121826] text-white">
                    {dept === 'All' ? 'All Depts' : dept.replace('B.Tech ', '')}
                  </option>
                ))}
              </select>

              {onOpenScanQR && (
                <button
                  onClick={onOpenScanQR}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
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
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {filteredPortalStudents.length}{' '}
                {filteredPortalStudents.length === 1 ? 'Student' : 'Students'}
                {portalSearchQuery ? ` matching "${portalSearchQuery}"` : ''}
              </span>
            </span>
            <span className="text-slate-400">Click any student to view attendance</span>
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
                    className="bg-[#121826] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer group"
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
                          className="ring-1 ring-slate-700 group-hover:ring-violet-400 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                            {std.name}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5 font-mono text-xs text-slate-400">
                            <span>Roll #{std.rollNo}</span>
                            {std.studentId && <span>· {std.studentId}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Academic Info */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300 truncate">
                          <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span className="truncate">{std.department || 'B.Tech Engineering'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{std.semester || '1st Year'}</span>
                          <span className="text-slate-300 font-medium">
                            {std.section ? std.section : 'Section A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Attendance Percentage & Action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                          rate >= 75
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : rate >= 65
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {rate}% Attendance
                      </span>

                      <span className="text-xs font-semibold text-violet-400 group-hover:text-violet-300 flex items-center gap-1">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-2 active:scale-95"
                  >
                    <span>Load More Students ({filteredPortalStudents.length - displayLimit} remaining)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#121826] border border-slate-800 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <Search className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No registered students found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No students matched "{portalSearchQuery}". Try searching by roll number (e.g. 26CY1001 or 12), partial name, or choose "All Departments".
              </p>
              <button
                onClick={() => {
                  setPortalSearchQuery('');
                  setPortalDeptFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
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
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Search className="w-3.5 h-3.5 text-violet-400" />
            <span>Search Student Directory or Switch Record</span>
          </span>
          <div className="flex items-center gap-2">
            {onClearStudent && (
              <button
                onClick={onClearStudent}
                className="text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
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
            }}
            classrooms={classrooms}
          />
        )}
      </div>

      {/* =========================================================================
          ACTIVE STUDENT IDENTITY STRIP WITH DIRECTORY RETURN
          ========================================================================= */}
      <div className="bg-[#121826] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <StudentAvatar
            name={student.name}
            avatarUrl={student.avatarUrl}
            rollNo={student.rollNo}
            studentId={student.studentId}
            size="md"
            className="ring-1 ring-slate-700 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white truncate">
                {student.name}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono text-xs font-semibold">
                Roll #{student.rollNo}
              </span>
              {student.studentId && (
                <span className="text-slate-400 font-mono text-xs">
                  · ID: {student.studentId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {student.department || 'B.Tech Engineering'} · {student.semester || '1st Year'} · {student.section || 'Sec A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Digital ID Pass Trigger */}
          <button
            onClick={() => setIsIDCardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer min-h-[36px]"
            title="Display personal digital student ID card with QR badge"
          >
            <IdCard className="w-4 h-4 text-violet-200" />
            <span>Digital ID Card</span>
          </button>

          {/* Mobile QR Scanner Trigger */}
          {onOpenScanQR && (
            <button
              onClick={onOpenScanQR}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer min-h-[36px]"
            >
              <QrCode className="w-4 h-4 text-slate-400" />
              <span>Scan QR</span>
            </button>
          )}

          {/* Switch Student Action */}
          {onClearStudent && (
            <button
              onClick={onClearStudent}
              className="px-3 py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
              title="Search a different student"
            >
              Switch Student
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN STAT SHOWCASE: CIRCULAR RING + STAT COLUMNS + SHORTAGE CALCULATOR
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Circular Dial & Quick Stats Column */}
        <div className="lg:col-span-2 bg-[#121826] border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 shadow-sm relative overflow-hidden">
          {/* Circular Ring */}
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
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-0.5">
                Attendance
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-2 sm:space-y-2.5 w-full sm:w-auto">
            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Present</p>
                  <p className="text-[10px] text-slate-500 font-mono">Attended</p>
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {attended}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
                  <X className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Absent</p>
                  <p className="text-[10px] text-slate-500 font-mono">Missed</p>
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-mono text-rose-400 tabular-nums">
                {missed}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 sm:gap-6 p-2.5 sm:p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Total</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#121826] border border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col items-center space-y-4">
            <button
              onClick={() => setIsIDCardOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Institution Card Banner */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SwipeAttendLogo size={28} />
                <div>
                  <h4 className="text-xs font-bold tracking-tight text-white uppercase">BIT SINDRI</h4>
                  <p className="text-[10px] text-slate-400">Student Identity Pass</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
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
                className="ring-2 ring-violet-500/40 shadow-lg"
              />
              <h3 className="text-base font-bold text-white pt-2">{student.name}</h3>
              <p className="text-xs font-mono font-semibold text-violet-300">Roll #{student.rollNo}</p>
              <p className="text-[11px] text-slate-400">
                ID: {student.studentId} · {student.department || 'B.Tech Engineering'}
              </p>
              <p className="text-[10px] text-slate-500">
                {student.semester || '1st Year'} · {student.section || 'Sec A'}
              </p>
            </div>

            {/* QR Code Canvas */}
            <div className="p-3.5 rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-inner flex flex-col items-center">
              <canvas ref={qrCanvasRef} className="rounded-xl shadow-sm" />
              <p className="text-[10px] text-slate-400 mt-2">Attendance Check-in QR</p>
            </div>

            <button
              onClick={() => setIsIDCardOpen(false)}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer min-h-[40px]"
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
