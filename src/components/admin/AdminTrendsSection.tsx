import React from 'react';
import { TrendingUp } from 'lucide-react';

interface AdminTrendsSectionProps {
  atRiskCount: number;
}

export const AdminTrendsSection: React.FC<AdminTrendsSectionProps> = ({ atRiskCount }) => {
  return (
    <div className="bg-[#101526] border border-white/8 rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/8">
        <div>
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Overall Institutional Attendance
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-4xl sm:text-5xl font-black text-white font-mono">
              89.4%
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+2.1% this semester</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div>
            <p className="text-slate-400">Highest Branch</p>
            <p className="text-base font-bold text-emerald-400">100%</p>
          </div>
          <div className="border-l border-white/10 pl-6">
            <p className="text-slate-400">Lowest Branch</p>
            <p className="text-base font-bold text-amber-400">61.0%</p>
          </div>
          <div className="border-l border-white/10 pl-6">
            <p className="text-slate-400">At-Risk Students</p>
            <p className="text-base font-bold text-red-400">{atRiskCount} Students</p>
          </div>
        </div>
      </div>

      {/* Visual Simulated Trend Line */}
      <div className="pt-6">
        <p className="text-xs font-semibold text-slate-300 mb-3">
          Weekly Attendance Velocity (Last 6 Weeks)
        </p>
        <div className="h-20 w-full flex items-end gap-3 pt-2">
          {[84, 86, 85, 88, 89, 89.4].map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">{val}%</span>
              <div
                className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 rounded-t-lg transition-all"
                style={{ height: `${(val - 70) * 3.5}px` }}
              />
              <span className="text-[10px] font-mono text-slate-500">W{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminTrendsSection;
