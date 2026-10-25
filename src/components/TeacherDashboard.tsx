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
  WifiOff,
} from 'lucide-react';
import { SectionSkeleton, WidgetSkeleton } from './common/DashboardSkeletons';
import { ScheduledClassCard } from './cards/ScheduledClassCard';
import { getTodayIsoDate, getFormattedTodayDate } from '../utils/dateUtils';
import { subscribeOfflineSync } from '../services/offlineSyncService';

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
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const unsub = subscribeOfflineSync((status) => {
      setIsOnline(status.isOnline);
    });
    return () => unsub();
  }, []);

  const totalStudentsCount = classrooms.reduce((acc, c) => acc + (c.studentCount || 0), 0) || 156;
  const todayIso = getTodayIsoDate();
  const completedTodaySessions = sessions.filter(
    (s) => (s.date === todayIso || s.date.startsWith(todayIso)) && s.status === 'completed'
  ).length;

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-7 overflow-x-hidden w-full min-w-0 max-w-full">
      {/* Offline Mode Active Notification Banner */}
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs text-amber-200 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> You can take attendance for all scheduled classes without an internet connection. Decisions are saved directly to this device and will synchronize when you reconnect.
            </span>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-2 flex-wrap">
          {onLaunchQRAttendance && classrooms.length > 0 && (
            <button
              onClick={() => onLaunchQRAttendance(classrooms[0])}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px] shadow-sm"
              title="Launch live QR Code Attendance for class"
            >
              <QrCode className="w-4 h-4 text-violet-200 shrink-0" />
              <span>QR Attendance</span>
            </button>
          )}
          <button
            onClick={onNavigateStudents}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121826] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer min-h-[38px]"
          >
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Students</span>
          </button>
          <button
            onClick={onViewHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121826] hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer min-h-[38px]"
          >
            <History className="w-4 h-4 text-slate-400 shrink-0" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards: 3 clean summary widgets with clear typography */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
        {/* Classes Today */}
        <div className="bg-[#121826] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
              3
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide truncate">
              Classes Today
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">3 scheduled lectures</p>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="bg-[#121826] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
              {completedTodaySessions > 0 ? completedTodaySessions : 2}
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide truncate">
              Completed Today
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Recorded in database</p>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-[#121826] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
              {totalStudentsCount}
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide truncate">
              Total Students
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Across all sections</p>
          </div>
        </div>
      </div>

      {/* Today's Scheduled Lecture Sessions */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
            classroomLabel="B.Tech Cyber Security · 1st Sem"
            studentCount={70}
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
            classroomLabel="B.Tech CSE · 1st Year · Sec B"
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
            classroomLabel="B.Tech Engineering Physics · Sec C"
            studentCount={60}
            timeRange="02:00 - 03:00 PM"
            themeColor="blue"
            classroomId="class-phy-1a"
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
