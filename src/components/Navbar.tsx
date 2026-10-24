import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Role, AttendanceSession, Classroom, Student, Subject } from '../types/attendance';
import { User } from '../services/firebase';
import { SwipeAttendLogo } from './common/SwipeAttendLogo';
import { subscribeOfflineSync, OfflineSyncStatus, getCurrentSyncStatus } from '../services/offlineSyncService';
import { formatClassDate } from '../utils/dateUtils';
import { DownloadAppModal } from './common/DownloadAppModal';
import { OfflineStatusBadge } from './offline/OfflineStatusBadge';
import { OfflineSyncModal } from './offline/OfflineSyncModal';
import {
  Sparkles,
  RotateCcw,
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Cloud,
  LogOut,
  LogIn,
  QrCode,
  Menu,
  Play,
  X,
  LayoutDashboard,
  Users,
  History,
  BookOpen,
  Check,
  ChevronRight,
  RefreshCw,
  WifiOff,
  Wifi,
  TrendingUp,
  TrendingDown,
  Download,
} from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeView: string;
  onNavigate: (view: string) => void;
  hasDraftSession: boolean;
  onResumeDraft: () => void;
  onResetData: () => void;
  teacherName: string;
  firebaseUser: User | null;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  isSyncing: boolean;
  onSyncFirestore: () => void;
  onOpenScanQR?: () => void;
  sessions?: AttendanceSession[];
  classrooms?: Classroom[];
  students?: Student[];
  subjects?: Subject[];
}

const EMPTY_SESSIONS: AttendanceSession[] = [];
const EMPTY_CLASSROOMS: Classroom[] = [];
const EMPTY_SUBJECTS: Subject[] = [];

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeView,
  onNavigate,
  hasDraftSession,
  onResumeDraft,
  onResetData,
  teacherName,
  firebaseUser,
  onSignInGoogle,
  onSignOutGoogle,
  isSyncing,
  onSyncFirestore,
  onOpenScanQR,
  sessions = EMPTY_SESSIONS,
  classrooms = EMPTY_CLASSROOMS,
  students = [],
  subjects = EMPTY_SUBJECTS,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<OfflineSyncStatus>(getCurrentSyncStatus());
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeOfflineSync((status) => {
      setOfflineStatus(status);
    });
    return () => unsub();
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleRoleSelect = (role: Role) => {
    onRoleChange(role);
    if (role === 'teacher') onNavigate('dashboard');
    else if (role === 'student') onNavigate('student');
    else if (role === 'admin') onNavigate('admin');
    setIsMenuOpen(false);
  };

  const handleNavClick = (view: string) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleConfirmReset = () => {
    if (window.confirm('Reset all demo data back to default BIT Sindri records?')) {
      onResetData();
      setIsMenuOpen(false);
    }
  };

  // Get user-friendly role label
  const getRoleLabel = () => {
    if (currentRole === 'teacher') return 'Teacher Portal';
    if (currentRole === 'student') return 'Student Portal';
    return 'Admin Portal';
  };

  // Calculate quick attendance trends metrics for the 3-line drawer section
  const trendsStats = useMemo(() => {
    const completedSessions = (sessions || []).filter(
      (s) => s.status === 'completed' && s.totalStudents > 0
    );

    const avg =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce(
              (acc, s) => acc + (s.presentCount / s.totalStudents) * 100,
              0
            ) / completedSessions.length
          )
        : 88;

    const recent = completedSessions
      .slice(-3)
      .reverse()
      .map((s) => ({
        subjectName: s.subjectName || 'Class Lecture',
        date: formatClassDate(s.date),
        percentage: Math.round((s.presentCount / s.totalStudents) * 100),
        present: s.presentCount,
        total: s.totalStudents,
      }));

    return {
      avgPercentage: avg,
      completedCount: completedSessions.length,
      recent,
    };
  }, [sessions]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-6 lg:px-8 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => onNavigate(currentRole === 'teacher' ? 'dashboard' : currentRole === 'student' ? 'student' : 'admin')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
              aria-label="Go to SwipeAttend home"
            >
              <SwipeAttendLogo size={32} />
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans'] whitespace-nowrap">
                    Swipe<span className="text-violet-400">Attend</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900">
                    BIT Sindri
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Center: Desktop Role & View Switcher */}
          <div className="hidden md:flex items-center p-1 bg-[#121826] border border-slate-800 rounded-xl gap-1">
            <button
              onClick={() => handleRoleSelect('teacher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRole === 'teacher'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </button>
            <button
              onClick={() => handleRoleSelect('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRole === 'student'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
            <button
              onClick={() => handleRoleSelect('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Right Corner: Controls, Quick Draft & Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Draft Resume Indicator Button (shown in History section only, removed from front screen) */}
            {hasDraftSession && activeView === 'history' && (
              <button
                onClick={onResumeDraft}
                className="h-7 px-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 text-[11px] font-extrabold tracking-tight border border-amber-300/80 shadow-[0_1px_6px_rgba(245,158,11,0.25)] transition-all cursor-pointer flex flex-row items-center justify-center gap-1 shrink-0 whitespace-nowrap"
                title="Resume in-progress attendance session"
              >
                <Play className="w-2.5 h-2.5 fill-slate-950 shrink-0" />
                <span>Resume Draft</span>
              </button>
            )}

            {/* User Profile Avatar if logged in */}
            {firebaseUser && (
              <div
                className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-700 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 cursor-pointer"
                onClick={() => setIsMenuOpen(true)}
                title={`Signed in as ${firebaseUser.displayName || firebaseUser.email}`}
              >
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || 'User'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  firebaseUser.email?.slice(0, 2).toUpperCase() || 'U'
                )}
              </div>
            )}

            {/* Menu Trigger Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="relative h-8 px-2.5 rounded-lg bg-[#121826] hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer flex flex-row items-center justify-center gap-1.5 shrink-0 whitespace-nowrap text-xs font-semibold"
              title="Open Navigation Menu"
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>Menu</span>

              {/* Alert Badge for draft session */}
              {hasDraftSession && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu Drawer Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              ref={drawerRef}
              className="w-screen max-w-md bg-[#0D1322] border-l border-white/10 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-250 ease-out"
              role="dialog"
              aria-modal="true"
              aria-label="SwipeAttend Navigation Menu"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#090E1A]">
                <div className="flex items-center gap-2.5">
                  <SwipeAttendLogo size={32} />
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Swipe<span className="text-violet-400">Attend</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">BIT Sindri Campus</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Close button */}
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 divide-y divide-white/5">
                {/* SECTION 1: ROLE & PORTAL SWITCHER */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Active Portal / Role</span>
                    <span className="text-[10px] text-violet-400 font-normal">Switch access mode</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {/* Teacher Portal Option */}
                    <button
                      onClick={() => handleRoleSelect('teacher')}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentRole === 'teacher'
                          ? 'bg-violet-600/20 border-violet-500/50 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            currentRole === 'teacher'
                              ? 'bg-violet-600 text-white'
                              : 'bg-violet-500/10 text-violet-400'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            Teacher Portal
                            {currentRole === 'teacher' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-500/30 text-violet-300 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Swipe attendance, student roster & class timetable
                          </p>
                        </div>
                      </div>
                      {currentRole === 'teacher' ? (
                        <Check className="w-4 h-4 text-violet-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {/* Student Portal Option */}
                    <button
                      onClick={() => handleRoleSelect('student')}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentRole === 'student'
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            currentRole === 'student'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            Student Portal
                            {currentRole === 'student' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Attendance percentage, subject breakdown & QR scan
                          </p>
                        </div>
                      </div>
                      {currentRole === 'student' ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {/* Admin Portal Option */}
                    <button
                      onClick={() => handleRoleSelect('admin')}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentRole === 'admin'
                          ? 'bg-amber-600/20 border-amber-500/50 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            currentRole === 'admin'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5">
                            Admin Portal
                            {currentRole === 'admin' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Institutional audit, department compliance & analytics
                          </p>
                        </div>
                      </div>
                      {currentRole === 'admin' ? (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* SECTION 2: WORKSPACE NAVIGATION */}
                <div className="space-y-2 pt-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Workspaces & Views
                  </div>

                  <div className="space-y-1">
                    {/* Dashboard */}
                    <button
                      onClick={() => handleNavClick('dashboard')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeView === 'dashboard'
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <LayoutDashboard className="w-4 h-4 text-violet-400" />
                        <span>Teacher Dashboard</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>

                    {/* Attendance Trends & Analytics (Accessible under 3-line menu) */}
                    <button
                      onClick={() => handleNavClick('trends')}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        activeView === 'trends'
                          ? 'bg-violet-600/25 border-violet-500/60 text-white shadow-md shadow-violet-600/20'
                          : 'bg-gradient-to-r from-violet-950/40 to-slate-900/60 border-violet-500/25 hover:border-violet-500/50 hover:bg-violet-900/30 text-slate-200 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                            <span>Attendance Trends & Analytics</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-violet-500/25 text-violet-300 border border-violet-500/30">
                              Charts
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Day-by-day attendance trends, percentages & class analytics
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
                    </button>

                    {/* Students Roster */}
                    <button
                      onClick={() => handleNavClick('students')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeView === 'students'
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Student Roster & Batch Actions</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>

                    {/* Classrooms */}
                    <button
                      onClick={() => handleNavClick('classrooms')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeView === 'classrooms'
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-sky-400" />
                        <span>Classrooms & Branches</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>

                    {/* Attendance History */}
                    <button
                      onClick={() => handleNavClick('history')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeView === 'history'
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <History className="w-4 h-4 text-teal-400" />
                        <span>Attendance History & CSV Export</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>




                {/* SECTION 3: ATTENDANCE TRENDS & INSIGHTS (under 3-line button) */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      <span>Attendance Trends</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Daily Presence %
                    </span>
                  </div>

                  {/* Attendance Trends Widget Card under 3-line button */}
                  <div className="bg-gradient-to-br from-[#12182B] via-[#0F1424] to-[#0A0E1A] border border-violet-500/25 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Avg Presence
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span
                            className={`text-2xl font-extrabold font-mono ${
                              trendsStats.avgPercentage >= 75
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {trendsStats.avgPercentage}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            target ≥75%
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Net Trend
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-0.5 text-emerald-400 font-mono text-xs font-bold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+4.2%</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">
                            improving
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Delivered Lectures Breakdown */}
                    {trendsStats.recent.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          Recent Recorded Lectures:
                        </p>
                        {trendsStats.recent.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/5 border border-white/5"
                          >
                            <div className="truncate max-w-[200px]">
                              <span className="font-semibold text-slate-200">
                                {item.subjectName}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                                {item.date}
                              </span>
                            </div>
                            <span
                              className={`font-mono text-xs font-bold ${
                                item.percentage >= 75
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {item.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Launch Full Interactive Trends Button */}
                    <button
                      onClick={() => handleNavClick('trends')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-violet-600/20"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      <span>Open Full Interactive Trends</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />
                    </button>
                  </div>
                </div>

                {/* SECTION 4: OFFLINE STORAGE & SYNC MANAGER */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Offline Storage & Sync</span>
                    <span className="text-[10px] text-cyan-400 font-normal">IndexedDB Engine</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsOfflineModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 text-slate-200 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        {offlineStatus.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                          <span>Offline Storage & Queue</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                            !offlineStatus.isOnline 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                              : offlineStatus.pendingCount > 0 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {!offlineStatus.isOnline ? 'Offline' : offlineStatus.pendingCount > 0 ? `${offlineStatus.pendingCount} Pending` : 'Synced'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Inspect queue, backup data & local device storage
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
                  </button>
                </div>

                {/* SECTION 5: FIREBASE AUTH & ACCOUNT */}
                <div className="space-y-2 pt-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cloud Account & Persistence
                  </div>

                  {firebaseUser ? (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/40 bg-emerald-900/50 flex items-center justify-center text-sm font-bold text-emerald-200 shrink-0">
                          {firebaseUser.photoURL ? (
                            <img
                              src={firebaseUser.photoURL}
                              alt={firebaseUser.displayName || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            firebaseUser.email?.slice(0, 2).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {firebaseUser.displayName || 'Signed In Teacher'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {firebaseUser.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                            <span className="text-[10px] text-emerald-300 font-medium">
                              Firestore Sync Enabled
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (onSyncFirestore) {
                            await onSyncFirestore();
                          }
                        }}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing with Firestore...' : 'Sync Now with Firestore'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onSignOutGoogle();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Firebase</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 space-y-2.5">
                      <p className="text-xs text-slate-300">
                        Sign in with Google to synchronize all student records, QR codes, and attendance history across devices in Firestore.
                      </p>
                      <button
                        onClick={() => {
                          onSignInGoogle();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 transition-all cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign in with Google</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-white/10 bg-[#090E1A] text-center">
                <p className="text-[10px] text-slate-500">
                  SwipeAttend • BIT Sindri Attendance Management System
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full App Download & PWA Install Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        students={students}
        sessions={sessions}
        classrooms={classrooms}
      />

      {/* Offline Storage & Cloud Sync Manager Modal */}
      <OfflineSyncModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        onDataRestored={() => {
          window.location.reload();
        }}
      />
    </>
  );
};
