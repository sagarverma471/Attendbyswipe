import React from 'react';
import { BookOpen, Play, Users, Clock } from 'lucide-react';

interface ScheduledClassCardProps {
  title: string;
  code: string;
  period: string;
  classroomLabel: string;
  studentCount: number;
  timeRange: string;
  themeColor: 'rose' | 'violet' | 'blue';
  classroomId: string;
  subjectId: string;
  onStartAttendance: (classroomId: string, subjectId: string) => void;
}

/**
 * Clean, modern ScheduledClassCard with clear visual hierarchy,
 * high legibility, and an immediate primary action.
 */
const ScheduledClassCardComponent: React.FC<ScheduledClassCardProps> = ({
  title,
  code,
  period,
  classroomLabel,
  studentCount,
  timeRange,
  themeColor,
  classroomId,
  subjectId,
  onStartAttendance,
}) => {
  const iconAccent = {
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[themeColor];

  return (
    <div className="bg-[#121826] border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-sm hover:shadow-md min-w-0 w-full group">
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconAccent}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white tracking-tight truncate group-hover:text-violet-300 transition-colors">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium truncate">
              {code} · {period}
            </p>
          </div>
        </div>

        <div className="bg-[#0B0F19] rounded-xl p-3 border border-slate-800/80 mb-4 space-y-1.5 text-xs">
          <p className="font-semibold text-slate-200 truncate">{classroomLabel}</p>
          <div className="flex items-center justify-between text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{studentCount} Students</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{timeRange}</span>
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onStartAttendance(classroomId, subjectId)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm min-h-[42px]"
        title="Start attendance session for this class"
      >
        <Play className="w-4 h-4 fill-white" />
        <span>Take Attendance</span>
      </button>
    </div>
  );
};

export const ScheduledClassCard = React.memo(ScheduledClassCardComponent);
export default ScheduledClassCard;
