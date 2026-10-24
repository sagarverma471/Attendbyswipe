import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { AttendanceSession, Student } from '../../types/attendance';
import {
  Check,
  ArrowRight,
  FileText,
  Calendar,
} from 'lucide-react';
import { formatClassDate } from '../../utils/dateUtils';

interface AttendanceCompleteModalProps {
  session: AttendanceSession;
  students?: Student[];
  onViewSummary: () => void;
  onSaveAndFinish: () => void;
}

export const AttendanceCompleteModal: React.FC<AttendanceCompleteModalProps> = ({
  session,
  onViewSummary,
  onSaveAndFinish,
}) => {
  const total = session.totalStudents || Object.keys(session.records).length || 58;
  const present = session.presentCount || Object.values(session.records).filter((s) => s === 'present').length;
  const absent = session.absentCount || Object.values(session.records).filter((s) => s === 'absent').length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#8B5CF6', '#3B82F6', '#F59E0B'],
    });
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#0F1424] border border-cyan-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center shadow-2xl space-y-4 my-auto">
        {/* Celebration Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-scale-in">
          <Check className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">
            Attendance Complete!
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            All students marked for {session.subjectName}
          </p>
        </div>

        {/* Session Info Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
          <Calendar className="w-3.5 h-3.5 text-violet-400" />
          <span>{formatClassDate(session.date)} · Period {session.period}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 py-2">
          <div className="bg-[#141A2E] border border-white/5 rounded-xl p-2.5 sm:p-3">
            <p className="text-lg sm:text-2xl font-bold text-white font-mono">{total}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Total</p>
          </div>
          <div className="bg-[#141A2E] border border-emerald-500/20 rounded-xl p-2.5 sm:p-3">
            <p className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono">{present}</p>
            <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold mt-0.5">Present</p>
          </div>
          <div className="bg-[#141A2E] border border-red-500/20 rounded-xl p-2.5 sm:p-3">
            <p className="text-lg sm:text-2xl font-bold text-red-400 font-mono">{absent}</p>
            <p className="text-[10px] text-red-300 uppercase tracking-wider font-semibold mt-0.5">Absent</p>
          </div>
        </div>

        {/* Rate summary */}
        <div className="py-1">
          <span className="text-xs text-slate-400">Class Attendance Rate: </span>
          <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono">{percentage}%</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 sm:space-y-2.5 pt-2 shrink-0">
          <button
            onClick={onViewSummary}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1A223B] border border-white/10 text-white font-semibold text-xs sm:text-sm hover:bg-[#212B4A] transition-colors cursor-pointer min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-violet-400" />
            <span>View Summary & Edit</span>
          </button>

          <button
            onClick={onSaveAndFinish}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer min-h-[44px]"
          >
            <span>Save & Finish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default AttendanceCompleteModal;
