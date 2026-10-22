import React from 'react';
import { Student, AttendanceStatus } from '../../types/attendance';
import { Check, X, Trash2 } from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';

interface StudentCardProps {
  student: Student;
  showDepartment?: boolean;
}

/**
 * Memoized StudentCard for alerts and shortage rosters in dashboards
 */
const StudentCardComponent: React.FC<StudentCardProps> = ({
  student,
  showDepartment = false,
}) => {
  const isSevere = student.attendancePercentage < 60;

  return (
    <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-[#141A2E] border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <StudentAvatar
          name={student.name}
          avatarUrl={student.avatarUrl}
          rollNo={student.rollNo}
          studentId={student.studentId}
          size="sm"
          className="ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{student.name}</p>
          <p className="text-[10px] text-slate-400 font-mono truncate">
            Roll {student.rollNo} {showDepartment ? `• ${student.department.replace('B.Tech ', '')}` : ''}
          </p>
        </div>
      </div>

      <span
        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${
          isSevere
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}
      >
        {student.attendancePercentage}%
      </span>
    </div>
  );
};

export const StudentCard = React.memo(StudentCardComponent);

interface StudentTableRowProps {
  student: Student;
  onDeleteRequest: (student: Student) => void;
  isSelected?: boolean;
  onToggleSelect?: (studentId: string) => void;
  onQuickStatusChange?: (studentId: string, status: AttendanceStatus) => void;
}

/**
 * Memoized StudentTableRow for high-performance roster tables
 */
const StudentTableRowComponent: React.FC<StudentTableRowProps> = ({
  student,
  onDeleteRequest,
  isSelected,
  onToggleSelect,
  onQuickStatusChange,
}) => {
  return (
    <tr className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-violet-600/10' : ''}`}>
      <td className="py-3 px-3 sm:px-4 text-center w-10">
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={() => onToggleSelect?.(student.id)}
          className="rounded accent-violet-600 cursor-pointer w-4 h-4"
          aria-label={`Select ${student.name}`}
        />
      </td>
      <td className="py-3 px-3 sm:px-4">
        <StudentAvatar
          name={student.name}
          avatarUrl={student.avatarUrl}
          rollNo={student.rollNo}
          studentId={student.studentId}
          size="sm"
          className="ring-1 ring-white/10"
        />
      </td>
      <td className="py-3 px-3 sm:px-4">
        <p className="font-semibold text-white text-xs truncate max-w-[140px] sm:max-w-none">{student.name}</p>
        <p className="text-[10px] text-slate-400 font-mono">{student.studentId}</p>
      </td>
      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-violet-300 text-xs">
        {student.rollNo}
      </td>
      <td className="py-3 px-3 sm:px-4 font-medium text-slate-300 text-xs truncate max-w-[120px] sm:max-w-none">
        {student.department.replace('B.Tech ', '')}
      </td>
      <td className="py-3 px-3 sm:px-4 text-slate-400 text-xs">
        {student.semester.split('•')[0] || '3rd Year'}
      </td>
      <td className="py-3 px-3 sm:px-4 font-mono font-bold text-xs">
        <span
          className={
            student.attendancePercentage >= 75
              ? 'text-emerald-400'
              : student.attendancePercentage >= 60
              ? 'text-amber-400'
              : 'text-red-400'
          }
        >
          {student.attendancePercentage}%
        </span>
      </td>
      <td className="py-3 px-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          {onQuickStatusChange && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuickStatusChange(student.id, 'present')}
                className="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                title="Mark Present"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onQuickStatusChange(student.id, 'absent')}
                className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 text-[10px] font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                title="Mark Absent"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        </div>
      </td>
      <td className="py-3 px-3 sm:px-4 text-right">
        <button
          onClick={() => onDeleteRequest(student)}
          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer min-h-[32px] min-w-[32px]"
          title={`Remove ${student.name}`}
          aria-label={`Remove ${student.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

export const StudentTableRow = React.memo(StudentTableRowComponent);

interface StudentAttendanceSummaryRowProps {
  index: number;
  student: Student;
  status: AttendanceStatus;
  onToggleStatus: (studentId: string, currentStatus: AttendanceStatus) => void;
}

/**
 * Memoized student row in Attendance Summary verification view
 */
const StudentAttendanceSummaryRowComponent: React.FC<StudentAttendanceSummaryRowProps> = ({
  index,
  student,
  status,
  onToggleStatus,
}) => {
  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono text-slate-400 text-xs">
        {index + 1}
      </td>
      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
        <StudentAvatar
          name={student.name}
          avatarUrl={student.avatarUrl}
          rollNo={student.rollNo}
          studentId={student.studentId}
          size="sm"
          className="ring-1 ring-white/10"
        />
      </td>
      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
        <p className="font-semibold text-white truncate max-w-[150px] text-xs">{student.name}</p>
        <p className="text-[10px] text-slate-400 font-mono">{student.studentId}</p>
      </td>
      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-bold text-violet-300 text-xs">
        {student.rollNo}
      </td>
      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">
        <button
          onClick={() => onToggleStatus(student.id, status)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer min-h-[32px] ${
            status === 'present'
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/35 shadow-xs'
              : status === 'absent'
              ? 'bg-red-500/25 text-red-300 border border-red-500/50 hover:bg-red-500/35 shadow-xs'
              : 'bg-amber-500/25 text-amber-300 border border-amber-500/50 hover:bg-amber-500/35'
          }`}
          title="Click to toggle status"
        >
          {status === 'present' ? (
            <>
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Present</span>
            </>
          ) : status === 'absent' ? (
            <>
              <X className="w-3 h-3 stroke-[3]" />
              <span>Absent</span>
            </>
          ) : (
            <span>Unmarked</span>
          )}
        </button>
      </td>
      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-semibold text-xs">
        <span
          className={
            student.attendancePercentage >= 75
              ? 'text-emerald-400'
              : student.attendancePercentage >= 60
              ? 'text-amber-400'
              : 'text-red-400'
          }
        >
          {student.attendancePercentage}%
        </span>
      </td>
    </tr>
  );
};

export const StudentAttendanceSummaryRow = React.memo(StudentAttendanceSummaryRowComponent);

export default StudentCard;
