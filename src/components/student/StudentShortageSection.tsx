import React, { useState } from 'react';
import { calculateShortage } from '../../services/storage';
import { Calculator, Sparkles } from 'lucide-react';

interface StudentShortageSectionProps {
  held: number;
  attended: number;
}

export const StudentShortageSection: React.FC<StudentShortageSectionProps> = ({
  held,
  attended,
}) => {
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const shortageResult = calculateShortage(held, attended, targetPercentage);

  return (
    <div className="bg-[#101526] border border-violet-500/25 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Shortage Calculator
            </h3>
            <p className="text-[10px] text-slate-400">Estimate classes to hit target</p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-semibold">Target Goal:</span>
              <span className="text-violet-400 font-bold font-mono text-sm">
                {targetPercentage}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer min-h-[36px]"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>60%</span>
              <span>75% (Min)</span>
              <span>85% (Honor)</span>
            </div>
          </div>

          {/* Calculator Output */}
          <div
            className={`p-3 rounded-xl border text-xs ${
              shortageResult.status === 'surplus'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : shortageResult.status === 'shortage'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
            }`}
          >
            <div className="flex items-start gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {shortageResult.status === 'surplus'
                    ? `Buffer: ${shortageResult.canBunk} Safe Misses`
                    : shortageResult.status === 'shortage'
                    ? `Required: +${shortageResult.classesNeeded} Classes`
                    : 'On Track'}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                  {shortageResult.explanation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-3 text-center">
        Formula: (Attended + N) / (Held + N) ≥ Target %
      </p>
    </div>
  );
};

export default StudentShortageSection;
