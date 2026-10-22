import React from 'react';
import { BookOpen, Play } from 'lucide-react';
import { getFormattedTodayDate } from '../../utils/dateUtils';

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
 * Memoized ScheduledClassCard for the Teacher Dashboard lecture schedule grid.
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
  const colorStyles = {
    rose: {
      bg: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
    },
    violet: {
      bg: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
    },
    blue: {
      bg: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    },
  }[themeColor];

  return (
    <div className="futuristic-glass cyber-corner border border-cyan-500/20 hover:border-cyan-400/50 rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between shadow-lg transition-all group hover:shadow-cyan-950/50 min-w-0 w-full overflow-hidden">
      <div className="min-w-0">
        <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 min-w-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorStyles.bg}`}>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate group-hover:text-cyan-300 transition-colors">
              {title}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{code} · {period}</p>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-300 bg-[#0A0F22]/90 border border-white/5 rounded-xl p-2.5 sm:p-3 mb-3.5 min-w-0">
          <p className="font-semibold text-slate-200 truncate">{classroomLabel}</p>
          <div className="flex items-center justify-between text-slate-400 text-[11px] gap-1">
            <span className="truncate">{studentCount} Students</span>
            <span className="font-mono text-cyan-300 font-semibold shrink-0">{timeRange}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-slate-400 font-mono gap-1">
            <span className="shrink-0">Session:</span>
            <span className="text-emerald-400 font-semibold truncate">Today · {getFormattedTodayDate()}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onStartAttendance(classroomId, subjectId)}
        className="w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/25 transition-all cursor-pointer min-h-[44px] active:scale-98 group-hover:shadow-lg group-hover:shadow-cyan-500/30 min-w-0"
        title="Start attendance session for this class"
      >
        <Play className="w-3.5 h-3.5 fill-white shrink-0" />
        <span className="truncate">Take Attendance</span>
      </button>
    </div>
  );
};

export const ScheduledClassCard = React.memo(ScheduledClassCardComponent);
export default ScheduledClassCard;
