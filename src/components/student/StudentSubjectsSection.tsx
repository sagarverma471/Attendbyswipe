import React from 'react';

interface SubjectItem {
  name: string;
  code: string;
  percent: number;
  held: number;
  attended: number;
}

interface HistoryItem {
  date: string;
  subject: string;
  status: string;
}

interface StudentSubjectsSectionProps {
  subjectBreakdown: SubjectItem[];
  recentHistory: HistoryItem[];
}

export const StudentSubjectsSection: React.FC<StudentSubjectsSectionProps> = ({
  subjectBreakdown,
  recentHistory,
}) => {
  return (
    <div className="space-y-5">
      {/* Subject-Wise Attendance Breakdown */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
            Subject-wise Attendance
          </h2>
          <span className="text-[11px] text-slate-400">5th Semester</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subjectBreakdown.length > 0 ? (
            subjectBreakdown.map((sub) => (
              <div
                key={sub.code}
                className="bg-[#121826] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-violet-400 font-semibold">
                      {sub.code}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                        sub.percent >= 75
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : sub.held === 0
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {sub.held > 0 ? `${sub.percent}%` : 'No Classes Yet'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {sub.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{sub.held > 0 ? `${sub.attended}/${sub.held} Attended` : '0/0 Conducted'}</span>
                  <span className={sub.percent >= 75 ? 'text-emerald-400' : sub.held === 0 ? 'text-slate-400' : 'text-amber-400'}>
                    {sub.held === 0 ? 'Upcoming' : sub.percent >= 75 ? 'Safe' : 'Shortage'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-slate-400 rounded-2xl bg-[#121826] border border-slate-800">
              <p className="text-xs">No specific curriculum subjects assigned yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent History Table */}
      <div className="bg-[#121826] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center justify-between">
          <span>Recent Attendance Activity Feed</span>
          <span className="text-xs text-slate-400 font-mono font-normal">
            {recentHistory.length} Recorded {recentHistory.length === 1 ? 'Lecture' : 'Lectures'}
          </span>
        </h3>
        <div className="divide-y divide-slate-800/80">
          {recentHistory.length > 0 ? (
            recentHistory.map((item, idx) => (
              <div
                key={idx}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-violet-400 text-[11px] shrink-0 font-medium">{item.date}</span>
                  <span className="font-semibold text-white truncate text-[11px] sm:text-xs">{item.subject}</span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 font-mono ${
                    item.status === 'present'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {item.status === 'present' ? 'PRESENT' : 'ABSENT'}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400">
              <p className="text-xs font-medium text-slate-300">No historical lecture sessions recorded yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed attendance sessions for this student will appear here in chronological order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentSubjectsSection;
