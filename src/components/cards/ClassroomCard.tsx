import React from 'react';
import { Classroom } from '../../types/attendance';
import { ArrowRight, QrCode, Upload, FileText } from 'lucide-react';
import { formatClassDate } from '../../utils/dateUtils';

interface ClassroomCardProps {
  classroom: Classroom;
  variant?: 'dashboard' | 'manager';
  onSelect?: (classroom: Classroom) => void;
  onLaunchQR?: (classroom: Classroom) => void;
  onUploadStudents?: (classroom: Classroom) => void;
}

/**
 * Memoized ClassroomCard component to eliminate redundant re-renders
 * during parent state updates (timers, sync status, active view changes).
 */
const ClassroomCardComponent: React.FC<ClassroomCardProps> = ({
  classroom,
  variant = 'dashboard',
  onSelect,
  onLaunchQR,
  onUploadStudents,
}) => {
  if (variant === 'manager') {
    return (
      <div className="bg-[#101526] border border-white/8 hover:border-violet-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl transition-all">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25">
              {classroom.institutionType} • {classroom.academicYear}
            </span>
            <span className="text-xs font-mono font-bold text-slate-300">
              Sec {classroom.section}
            </span>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-white mb-1">
            {classroom.name}
          </h2>
          <p className="text-xs text-slate-400">
            {classroom.department}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-[#141A2E] text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Enrolled:</span>
              <p className="font-bold text-white font-mono mt-0.5">
                {classroom.studentCount} Students
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Threshold:</span>
              <p className="font-bold text-emerald-400 font-mono mt-0.5">
                {classroom.attendanceThreshold}%
              </p>
            </div>
          </div>

          {/* Bully PDF quick indicator for Mech and EE */}
          {classroom.id === 'class-me-1f' && (
            <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Roster document: <strong>Mech 1 bully.pdf</strong></span>
              </span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">Ready</span>
            </div>
          )}
          {classroom.id === 'class-ee-1j' && (
            <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-[11px] text-sky-300">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Roster document: <strong>EE bully.pdf</strong></span>
              </span>
              <span className="text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded font-mono">Ready</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {onUploadStudents && (
              <button
                onClick={() => onUploadStudents(classroom)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-400/50 shadow-sm transition-all cursor-pointer active:scale-95"
                title={`Upload student roster / PDF document for ${classroom.name}`}
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Upload PDF</span>
              </button>
            )}
            {onLaunchQR && (
              <button
                onClick={() => onLaunchQR(classroom)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs border border-violet-400/50 shadow-sm transition-all cursor-pointer active:scale-95"
                title="Generate live QR Code for student self-attendance"
              >
                <QrCode className="w-3.5 h-3.5 text-violet-200" />
                <span>QR</span>
              </button>
            )}
          </div>

          {onSelect && (
            <button
              onClick={() => onSelect(classroom)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141B32] hover:bg-[#1D274A] border border-cyan-500/40 text-cyan-200 hover:text-white font-bold text-xs transition-all cursor-pointer min-h-[32px] active:scale-95"
            >
              <span>View Students</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default 'dashboard' variant for Teacher Dashboard
  return (
    <div className="bg-[#121826] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-sm min-w-0 w-full overflow-hidden">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-sm font-bold text-white truncate min-w-0 flex-1">
            {classroom.name}
          </h3>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 shrink-0">
            {classroom.section}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {classroom.department} · {classroom.year}
        </p>

        <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-300 font-mono">
          <div>
            <span className="text-slate-400 text-xs">Students: </span>
            <span className="font-bold text-white">{classroom.studentCount}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Threshold: </span>
            <span className="font-bold text-emerald-400">{classroom.attendanceThreshold}%</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        {onLaunchQR ? (
          <button
            onClick={() => onLaunchQR(classroom)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            title="Generate live QR Code for student self-attendance"
          >
            <QrCode className="w-3.5 h-3.5 text-violet-200" />
            <span>QR Code</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 font-mono truncate">
            Last: {formatClassDate(classroom.lastAttendanceDate)}
          </span>
        )}
        {onSelect && (
          <button
            onClick={() => onSelect(classroom)}
            className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 flex items-center gap-1.5 cursor-pointer min-h-[32px] shrink-0 transition-all active:scale-95 shadow-sm"
          >
            <span>Roster</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export const ClassroomCard = React.memo(ClassroomCardComponent);
export default ClassroomCard;
