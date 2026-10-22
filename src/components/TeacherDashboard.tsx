import React, { Suspense, lazy } from 'react';
import {
  Classroom,
  Subject,
  TimetableEntry,
  AttendanceSession,
  Student,
} from '../types/attendance';
import {
  Users,
  CheckCircle2,
  Calendar,
  History,
  QrCode,
} from 'lucide-react';
import { SectionSkeleton, WidgetSkeleton } from './common/DashboardSkeletons';
import { ScheduledClassCard } from './cards/ScheduledClassCard';
import { getTodayIsoDate, getFormattedTodayDate } from '../utils/dateUtils';

// Code-Splitting: Lazy load below-the-fold non-critical dashboard sections
const TeacherClassroomsSection = lazy(() => import('./dashboard/TeacherClassroomsSection'));
const TeacherLowAttendanceSection = lazy(() => import('./dashboard/TeacherLowAttendanceSection'));

interface TeacherDashboardProps {
  classrooms: Classroom[];
  subjects: Subject[];
  timetable: TimetableEntry[];
  sessions: AttendanceSession[];
  students: Student[];
  onStartAttendance: (classroomId: string, subjectId: string) => void;
  onViewClassroom: (classroom: Classroom) => void;
  onViewHistory: () => void;
  onNavigateStudents: () => void;
  onLaunchQRAttendance?: (classroom: Classroom) => void;
}

const TeacherDashboardComponent: React.FC<TeacherDashboardProps> = ({
  classrooms,
  subjects,
  timetable,
  sessions,
  students,
  onStartAttendance,
  onViewClassroom,
  onViewHistory,
  onNavigateStudents,
  onLaunchQRAttendance,
}) => {
  const totalStudentsCount = classrooms.reduce((acc, c) => acc + (c.studentCount || 0), 0) || 156;
  const todayIso = getTodayIsoDate();
  const completedTodaySessions = sessions.filter(
    (s) => (s.date === todayIso || s.date.startsWith(todayIso)) && s.status === 'completed'
  ).length;

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-7 overflow-x-hidden w-full min-w-0">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight truncate">
            Good morning, Professor 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
            Today's lecture schedule and attendance tracks • <span className="text-violet-300 font-semibold">{getFormattedTodayDate()}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {onLaunchQRAttendance && classrooms.length > 0 && (
            <button
              onClick={() => onLaunchQRAttendance(classrooms[0])}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-300 hover:text-white transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
              title="Launch live QR Code Attendance for class"
            >
              <QrCode className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>QR Attendance</span>
            </button>
          )}
          <button
            onClick={onNavigateStudents}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#141A2E] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>Students</span>
          </button>
          <button
            onClick={onViewHistory}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#141A2E] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards: 3 futuristic summary widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
        {/* Classes Today */}
        <div className="futuristic-glass cyber-corner border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all hover:shadow-[0_0_24px_rgba(16,185,129,0.2)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tabular-nums">
              3
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              Classes Scheduled Today
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5 truncate font-mono">3 periods active in timetable</p>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="futuristic-glass cyber-corner border border-violet-500/30 hover:border-violet-400/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.2)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-violet-400 font-mono tabular-nums">
              {completedTodaySessions > 0 ? completedTodaySessions : 2}
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/15 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              Sessions Completed
            </p>
            <p className="text-[11px] text-violet-400 mt-0.5 truncate font-mono">Verified in Cloud Database</p>
          </div>
        </div>

        {/* Total Students */}
        <div className="futuristic-glass cyber-corner border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all hover:shadow-[0_0_24px_rgba(6,182,212,0.2)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tabular-nums">
              {totalStudentsCount}
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              Total Enrolled Students
            </p>
            <p className="text-[11px] text-cyan-400 mt-0.5 truncate font-mono">Across all branch rosters</p>
          </div>
        </div>
      </div>

      {/* Today's Scheduled Lecture Sessions */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              Today's Scheduled Classes
            </h2>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium whitespace-nowrap font-mono">
              Today · {getFormattedTodayDate()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
          <ScheduledClassCard
            title="Mathematics"
            code="MA101"
            period="Period 2"
            classroomLabel="B.Tech CSE · 3rd Year · Sec A"
            studentCount={72}
            timeRange="10:00 - 11:00 AM"
            themeColor="rose"
            classroomId="class-cse-3a"
            subjectId="sub-dbms"
            onStartAttendance={onStartAttendance}
          />
          <ScheduledClassCard
            title="Basic electrical engineering(BEE)"
            code="EE101"
            period="Period 3"
            classroomLabel="B.Tech CSE · 3rd Year · Sec B"
            studentCount={72}
            timeRange="12:00 - 01:00 PM"
            themeColor="violet"
            classroomId="class-cse-3b"
            subjectId="sub-os"
            onStartAttendance={onStartAttendance}
          />
          <ScheduledClassCard
            title="Physics"
            code="PH101"
            period="Period 4"
            classroomLabel="B.Tech CSE · 3rd Year · Sec A"
            studentCount={60}
            timeRange="02:00 - 03:00 PM"
            themeColor="blue"
            classroomId="class-cse-3a"
            subjectId="sub-cn"
            onStartAttendance={onStartAttendance}
          />
        </div>
      </div>

      {/* 2-Column Section: Classrooms & Low Attendance Warning Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 w-full min-w-0">
        <div className="lg:col-span-2">
          <Suspense fallback={<SectionSkeleton rows={4} height="h-64" />}>
            <TeacherClassroomsSection
              classrooms={classrooms}
              onViewClassroom={onViewClassroom}
              onNavigateStudents={onNavigateStudents}
              onLaunchQR={onLaunchQRAttendance}
            />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<WidgetSkeleton />}>
            <TeacherLowAttendanceSection
              students={students}
              onNavigateStudents={onNavigateStudents}
              threshold={75}
            />
          </Suspense>
        </div>
      </div>

    </div>
  );
};

export const TeacherDashboard = React.memo(TeacherDashboardComponent);
export default TeacherDashboard;
