import React, { Suspense, lazy } from 'react';
import { Classroom, Student, AttendanceSession } from '../../types/attendance';
import {
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { SectionSkeleton } from '../common/DashboardSkeletons';

// Code-Splitting: Lazy load lower analytical sections
const AdminTrendsSection = lazy(() => import('./AdminTrendsSection'));
const AdminDepartmentsSection = lazy(() => import('./AdminDepartmentsSection'));

interface AdminDashboardProps {
  classrooms: Classroom[];
  students: Student[];
  sessions: AttendanceSession[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  classrooms,
  students,
  sessions,
}) => {
  const atRiskStudents = students.filter((s) => s.attendancePercentage < 75);

  const departments = [
    { name: 'Computer Science & Engineering', students: 58, avg: '90.2%', status: 'Nominal' },
    { name: 'Electrical Engineering', students: 56, avg: '88.6%', status: 'Nominal' },
    { name: 'Mechanical Engineering', students: 52, avg: '87.9%', status: 'Nominal' },
    { name: 'Electronics & Communication', students: 48, avg: '91.0%', status: 'Nominal' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-7 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
              Institutional Admin Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
              BIT Sindri
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Campus-wide attendance governance, policy adherence, and department metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4" />
          <span>Institutional Policies Active</span>
        </div>
      </div>

      {/* 4 Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="futuristic-glass cyber-corner border border-cyan-500/25 hover:border-cyan-400/60 rounded-2xl p-5 shadow-lg transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">156</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 font-mono">
            Total Students
          </p>
        </div>

        <div className="futuristic-glass cyber-corner border border-emerald-500/25 hover:border-emerald-400/60 rounded-2xl p-5 shadow-lg transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">12</span>
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 font-mono">
            Active Faculty
          </p>
        </div>

        <div className="futuristic-glass cyber-corner border border-violet-500/25 hover:border-violet-400/60 rounded-2xl p-5 shadow-lg transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-violet-400 font-mono tabular-nums">24</span>
            <Building className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 font-mono">
            Smart Classrooms
          </p>
        </div>

        <div className="futuristic-glass cyber-corner border border-indigo-500/25 hover:border-indigo-400/60 rounded-2xl p-5 shadow-lg transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-white font-mono tabular-nums">24</span>
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 font-mono">
            Curriculum Courses
          </p>
        </div>
      </div>

      {/* Overall Attendance & Trend Banner (Lazy-loaded) */}
      <Suspense fallback={<SectionSkeleton rows={2} height="h-48" />}>
        <AdminTrendsSection atRiskCount={atRiskStudents.length} />
      </Suspense>

      {/* 2-Column: Departments Breakdown & At-Risk Roster (Lazy-loaded) */}
      <Suspense fallback={<SectionSkeleton rows={4} height="h-64" />}>
        <AdminDepartmentsSection
          departments={departments}
          atRiskStudents={atRiskStudents}
        />
      </Suspense>
    </div>
  );
};
