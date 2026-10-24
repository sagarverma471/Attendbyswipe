import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { Student, Classroom } from '../../types/attendance';
import { Search, X, Users, Filter, Check, ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';

interface StudentSearchBarProps {
  students: Student[];
  selectedStudent?: Student | null;
  onSelectStudent: (student: Student) => void;
  classrooms?: Classroom[];
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export const StudentSearchBar: React.FC<StudentSearchBarProps> = ({
  students,
  selectedStudent = null,
  onSelectStudent,
  classrooms = [],
  className = '',
  autoFocus = false,
  placeholder = 'Search by student name, roll number (e.g. 26CY1001 or 10), or student ID...',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Defer query for 120fps typing without UI thread lag
  const deferredQuery = useDeferredValue(query);

  // Extract distinct departments/branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return ['All', ...Array.from(set)];
  }, [students]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter students by deferred query (name, rollNo, studentId) and branch, sliced to 30 for max performance
  const filteredStudents = useMemo(() => {
    const trimmed = deferredQuery.trim().toLowerCase();

    const result = students.filter((student) => {
      // Branch filter
      if (selectedBranch !== 'All' && student.department !== selectedBranch) {
        return false;
      }

      if (!trimmed) return true;

      const nameMatch = student.name.toLowerCase().includes(trimmed);
      const rollMatch = student.rollNo.toLowerCase().includes(trimmed);
      const idMatch = student.studentId ? student.studentId.toLowerCase().includes(trimmed) : false;
      const deptMatch = student.department ? student.department.toLowerCase().includes(trimmed) : false;

      return nameMatch || rollMatch || idMatch || deptMatch;
    });

    return result.slice(0, 30);
  }, [students, deferredQuery, selectedBranch]);

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={searchContainerRef} className={`relative w-full ${className}`}>
      {/* Clean Search Input Box */}
      <div className="bg-[#121826] border border-slate-800 rounded-xl p-1 flex items-center gap-1.5 shadow-sm">
        <div className="relative flex-1 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            className="w-full bg-[#0B0F19] border border-slate-800 focus:border-violet-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none transition-all font-['Plus_Jakarta_Sans']"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Compact Branch / Department Filter Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setIsOpen(true);
            }}
            className="bg-[#0B0F19] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none cursor-pointer transition-colors"
            title="Filter students by department"
          >
            {branches.map((b) => (
              <option key={b} value={b} className="bg-[#121826] text-white">
                {b === 'All' ? 'All Depts' : b.replace('B.Tech ', '')}
              </option>
            ))}
          </select>

          {/* Quick Small Search Toggle */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            title="Toggle student list"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Results Overlay */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#121826] border border-slate-800 shadow-2xl max-h-[400px] overflow-hidden flex flex-col animate-fade-in">
          {/* Results Header */}
          <div className="p-3 bg-[#0E1422] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-200">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
              {query ? ` for "${query}"` : ''}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-[11px] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Student Results List */}
          <div className="overflow-y-auto divide-y divide-white/5 p-1.5 flex-1 max-h-[350px]">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((std) => {
                const isSelected = selectedStudent ? std.id === selectedStudent.id : false;
                const rate = std.attendancePercentage || 0;

                return (
                  <div
                    key={std.id}
                    onClick={() => handleSelect(std)}
                    className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-500/40'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <StudentAvatar
                        name={std.name}
                        avatarUrl={std.avatarUrl}
                        rollNo={std.rollNo}
                        studentId={std.studentId}
                        size="md"
                        className="ring-2 ring-cyan-500/30 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">
                            {std.name}
                          </h4>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 text-[10px] font-mono font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap mt-0.5 font-mono">
                          <span className="text-cyan-300 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            Roll #{std.rollNo}
                          </span>
                          {std.studentId && (
                            <span className="text-slate-400">ID: {std.studentId}</span>
                          )}
                          <span>·</span>
                          <span className="truncate text-slate-300">
                            {std.department || 'Engineering'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {std.semester || 'Academic Year'} • {std.section || 'Sec A'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Attendance Rate + Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded-lg inline-block ${
                            rate >= 75
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : rate >= 65
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {rate}%
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {std.totalClassesAttended || 0}/{std.totalClassesHeld || 0} Attended
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(std);
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-black font-bold'
                            : 'bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-white'
                        }`}
                        title="View individual attendance dashboard"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No registered students found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No matching student records found for "{query}". Try searching by roll number (e.g. 26CY1001 or 10), full name, or student ID.
                </p>
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="p-2.5 bg-[#070B1A] border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Select any student to load their dynamic profile and attendance records.</span>
            <span className="hidden sm:inline text-cyan-400">BIT Sindri Database</span>
          </div>
        </div>
      )}
    </div>
  );
};
