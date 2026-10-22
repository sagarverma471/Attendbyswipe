import React, { useState } from 'react';
import { Student } from '../../types/attendance';
import {
  AlertTriangle,
  SlidersHorizontal,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { StudentCard } from '../cards/StudentCard';

interface LowAttendanceWarningProps {
  students: Student[];
  onNavigateStudents: () => void;
  defaultThreshold?: number;
}

export const LowAttendanceWarning: React.FC<LowAttendanceWarningProps> = ({
  students,
  onNavigateStudents,
  defaultThreshold = 75,
}) => {
  const [threshold, setThreshold] = useState<number>(defaultThreshold);
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);
  const [showAllAtRisk, setShowAllAtRisk] = useState<boolean>(false);

  // Filter students falling below the configurable threshold
  const atRiskStudents = students
    .filter((s) => s.attendancePercentage < threshold)
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  const severeStudents = atRiskStudents.filter((s) => s.attendancePercentage < 65);
  const displayedStudents = showAllAtRisk ? atRiskStudents : atRiskStudents.slice(0, 4);

  return (
    <div className="space-y-3">
      {/* Alert Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
            Low Attendance Warning
          </h2>
        </div>

        {/* Configuration toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Configure warning threshold percentage"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <span className="font-mono text-amber-400 font-bold">{threshold}%</span>
            <span>Threshold</span>
          </button>
        </div>
      </div>

      {/* Main Alert Container */}
      <div className="bg-gradient-to-br from-[#151928] to-[#101422] border border-amber-500/30 rounded-xl sm:rounded-2xl p-4 shadow-lg space-y-3 relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Threshold configuration slider drawer */}
        {isConfiguring && (
          <div className="bg-[#1C233B] border border-amber-500/25 rounded-xl p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Configure Cutoff Threshold:
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>50% (Permissive)</span>
              <span className="text-amber-300 font-bold">75% (UGC Standard)</span>
              <span>90% (Strict)</span>
            </div>
          </div>
        )}

        {/* Warning Summary Banner */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-slate-200 leading-snug">
              <span className="font-bold text-amber-300 font-mono">
                {atRiskStudents.length} student{atRiskStudents.length === 1 ? '' : 's'}
              </span>{' '}
              are below the <span className="font-semibold text-amber-300">{threshold}%</span> cutoff requirement.
            </p>
            {severeStudents.length > 0 && (
              <p className="text-[11px] text-rose-300">
                ⚠ {severeStudents.length} in critical debarment zone (&lt;65%).
              </p>
            )}
          </div>
        </div>

        {/* Student list */}
        {displayedStudents.length > 0 ? (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
            {displayedStudents.map((std) => {
              const shortfallClasses = Math.ceil(
                (threshold * std.totalClassesHeld - 100 * std.totalClassesAttended) / (100 - threshold)
              );

              return (
                <div key={std.id} className="relative group">
                  <StudentCard
                    student={std}
                    showDepartment={false}
                  />
                  {shortfallClasses > 0 && (
                    <div className="mt-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-[10px] text-rose-300">
                      <span>Deficit to reach {threshold}%:</span>
                      <span className="font-mono font-bold">
                        +{shortfallClasses} consecutive class{shortfallClasses === 1 ? '' : 'es'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 bg-white/5 rounded-xl">
            🎉 Great news! All students meet the {threshold}% attendance threshold.
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          {atRiskStudents.length > 4 && (
            <button
              onClick={() => setShowAllAtRisk(!showAllAtRisk)}
              className="flex-1 py-2 px-3 text-center rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {showAllAtRisk ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Show Fewer</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Show All {atRiskStudents.length} Shortages</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onNavigateStudents}
            className="flex-1 py-2 px-3 text-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Manage All Students</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowAttendanceWarning;
