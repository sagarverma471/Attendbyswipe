import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { AttendanceSession, Classroom } from '../../types/attendance';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  CheckCircle,
  Users,
} from 'lucide-react';

interface AttendanceTrendPoint {
  date: string;
  rawDate: string;
  percentage: number;
  presentCount: number;
  absentCount: number;
  totalStudents: number;
  subjectName: string;
  classroomName: string;
}

interface DashboardWidgetProps {
  sessions: AttendanceSession[];
  classrooms?: Classroom[];
  threshold?: number;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  sessions,
  classrooms = [],
  threshold = 75,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7' | '14' | 'all'>('7');

  // Compute aggregated daily presence data
  const trendData = useMemo(() => {
    // Only completed sessions
    const completed = sessions.filter((s) => s.status === 'completed' && s.totalStudents > 0);

    const filtered =
      selectedClassId === 'all'
        ? completed
        : completed.filter((s) => s.classroomId === selectedClassId);

    // Group by date or display chronological sessions
    // Sort chronologically ascending
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Map to daily records
    const points: AttendanceTrendPoint[] = sorted.map((s) => {
      const pct = Math.round((s.presentCount / s.totalStudents) * 100);
      const d = new Date(s.date);
      const formattedDate = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : s.date;

      return {
        date: formattedDate,
        rawDate: s.date,
        percentage: pct,
        presentCount: s.presentCount,
        absentCount: s.absentCount,
        totalStudents: s.totalStudents,
        subjectName: s.subjectName || 'Lecture',
        classroomName: s.classroomName || 'Class',
      };
    });

    if (timeRange === '7') return points.slice(-7);
    if (timeRange === '14') return points.slice(-14);
    return points;
  }, [sessions, selectedClassId, timeRange]);

  // Overall metric calculations
  const stats = useMemo(() => {
    if (trendData.length === 0) {
      return {
        avgPercentage: 0,
        trendDirection: 'neutral' as 'up' | 'down' | 'neutral',
        trendDelta: 0,
        highestDay: null as AttendanceTrendPoint | null,
        lowestDay: null as AttendanceTrendPoint | null,
        totalRecorded: 0,
      };
    }

    const sum = trendData.reduce((acc, p) => acc + p.percentage, 0);
    const avg = Math.round(sum / trendData.length);

    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    let trendDelta = 0;

    if (trendData.length >= 2) {
      const first = trendData[0].percentage;
      const last = trendData[trendData.length - 1].percentage;
      trendDelta = last - first;
      if (trendDelta > 0) trendDirection = 'up';
      else if (trendDelta < 0) trendDirection = 'down';
    }

    const sortedByPct = [...trendData].sort((a, b) => a.percentage - b.percentage);
    const lowestDay = sortedByPct[0];
    const highestDay = sortedByPct[sortedByPct.length - 1];

    return {
      avgPercentage: avg,
      trendDirection,
      trendDelta: Math.abs(trendDelta),
      highestDay,
      lowestDay,
      totalRecorded: trendData.length,
    };
  }, [trendData]);

  return (
    <div className="futuristic-glass cyber-corner border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header with Title and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans'] tracking-tight flex items-center gap-2">
                <span>Attendance Trends & Analytics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                  Telemetry Stream
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Historical day-by-day attendance trends across delivered lectures
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Classroom Dropdown */}
          {classrooms.length > 0 && (
            <div className="relative">
              <select
                value={selectedClassId}
                aria-label="Filter attendance trend by classroom"
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-[#182038] border border-white/10 hover:border-violet-500/30 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer transition-colors"
              >
                <option value="all">All Classrooms</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.split('-')[0].trim()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Range Pills */}
          <div className="flex items-center bg-[#182038] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '7'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 7
            </button>
            <button
              onClick={() => setTimeRange('14')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === '14'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 14
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#161D33]/70 border border-white/5 rounded-xl p-2.5 sm:p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Avg Presence
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-xl sm:text-2xl font-extrabold font-mono ${
                stats.avgPercentage >= threshold
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {stats.avgPercentage}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              target ≥{threshold}%
            </span>
          </div>
        </div>

        <div className="bg-[#161D33]/70 border border-white/5 rounded-xl p-2.5 sm:p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Net Trend
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {stats.trendDirection === 'up' && (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                  +{stats.trendDelta}%
                </span>
                <span className="text-[10px] text-slate-400">improving</span>
              </>
            )}
            {stats.trendDirection === 'down' && (
              <>
                <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-sm sm:text-base font-bold text-rose-400 font-mono">
                  -{stats.trendDelta}%
                </span>
                <span className="text-[10px] text-slate-400">drop</span>
              </>
            )}
            {stats.trendDirection === 'neutral' && (
              <>
                <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm sm:text-base font-bold text-slate-300 font-mono">
                  Stable
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#161D33]/70 border border-white/5 rounded-xl p-2.5 sm:p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Peak Attendance
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400">
              {stats.highestDay ? `${stats.highestDay.percentage}%` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {stats.highestDay ? stats.highestDay.date : ''}
            </span>
          </div>
        </div>

        <div className="bg-[#161D33]/70 border border-white/5 rounded-xl p-2.5 sm:p-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Delivered Sessions
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-violet-300">
              {stats.totalRecorded}
            </span>
            <span className="text-[10px] text-slate-400">lectures</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Area Chart */}
      <div className="bg-[#0D1222]/90 border border-white/5 rounded-xl p-3 sm:p-4">
        {trendData.length > 0 ? (
          <div className="w-full h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="presenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                    <stop offset="85%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.07)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(val) => `${val}%`}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomTooltip threshold={threshold} />} />
                {/* 75% Institutional Threshold Reference Line */}
                <ReferenceLine
                  y={threshold}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Min Req ${threshold}%`,
                    position: 'insideTopRight',
                    fill: '#F59E0B',
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#presenceGradient)"
                  dot={{
                    r: 3.5,
                    fill: '#8B5CF6',
                    stroke: '#FFFFFF',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5.5,
                    fill: '#A78BFA',
                    stroke: '#FFFFFF',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Calendar className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-xs font-semibold text-slate-300">
              No completed sessions found for the selected filter
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Take attendance using Swipe, QR, or List mode to populate real-time trend analytics.
            </p>
          </div>
        )}

        {/* Legend footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-slate-300 font-medium">Daily Presence %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400" />
              <span className="text-amber-300 font-medium">{threshold}% Institutional Cutoff</span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            Powered by AttendanceSession store
          </span>
        </div>
      </div>
    </div>
  );
};

// Custom Tooltip component for Recharts
const CustomTooltip = ({
  active,
  payload,
  label,
  threshold,
}: any) => {
  if (active && payload && payload.length) {
    const data: AttendanceTrendPoint = payload[0].payload;
    const isAbove = data.percentage >= threshold;

    return (
      <div className="bg-[#131A2E]/95 backdrop-blur-md border border-violet-500/30 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[190px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="font-bold text-white flex items-center gap-1">
            <Calendar className="w-3 h-3 text-violet-400" />
            {data.date}
          </span>
          <span
            className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
              isAbove
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {data.percentage}% Presence
          </span>
        </div>

        <p className="text-[11px] font-semibold text-slate-200 truncate">
          {data.subjectName}
        </p>
        <p className="text-[10px] text-slate-400 truncate">{data.classroomName}</p>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
          <div className="flex items-center gap-1 text-emerald-400 font-mono">
            <span>✓ {data.presentCount} present</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-mono">
            <span>✕ {data.absentCount} absent</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 pt-0.5 flex items-center gap-1 font-mono">
          <Users className="w-3 h-3 text-slate-400" />
          <span>Total roster: {data.totalStudents}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default DashboardWidget;
