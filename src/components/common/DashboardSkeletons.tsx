import React from 'react';

/**
 * High-performance lightweight skeleton fallback for dashboard sections
 * Prevents Layout Shift (CLS) on mobile devices while non-critical chunks load.
 */
export const SectionSkeleton: React.FC<{ rows?: number; height?: string }> = ({
  rows = 2,
  height = 'h-36',
}) => {
  return (
    <div className={`w-full rounded-2xl bg-[#101526]/80 border border-white/5 p-4 sm:p-5 animate-pulse ${height} flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <div className="h-4 bg-white/10 rounded-lg w-1/3" />
        <div className="h-4 bg-white/5 rounded-lg w-1/6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[#141A2E]/60 border border-white/5 p-2.5 flex items-center justify-between">
            <div className="space-y-1.5 w-2/3">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
            <div className="h-6 w-12 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="h-3 bg-white/5 rounded w-1/4" />
    </div>
  );
};

export const WidgetSkeleton: React.FC = () => {
  return (
    <div className="w-full rounded-2xl bg-[#101526]/80 border border-white/5 p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-white/10 rounded-lg w-1/2" />
        <div className="h-4 bg-white/5 rounded-lg w-1/4" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-[#141A2E]/60 border border-white/5 flex items-center p-2 gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-2.5 bg-white/10 rounded w-1/2" />
              <div className="h-2 bg-white/5 rounded w-1/3" />
            </div>
            <div className="h-5 w-10 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
