import React from 'react';
import { Student } from '../../types/attendance';
import { AlertTriangle } from 'lucide-react';
import { StudentCard } from '../cards/StudentCard';

interface DepartmentItem {
  name: string;
  students: number;
  avg: string;
  status: string;
}

interface AdminDepartmentsSectionProps {
  departments: DepartmentItem[];
  atRiskStudents: Student[];
}

export const AdminDepartmentsSection: React.FC<AdminDepartmentsSectionProps> = ({
  departments,
  atRiskStudents,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Department Breakdown */}
      <div className="bg-[#101526] border border-white/8 rounded-2xl p-5 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
          Department Performance
        </h2>
        <div className="space-y-3">
          {departments.map((dept, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#141A2E] border border-white/5 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">{dept.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{dept.students} Enrolled Students</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {dept.avg}
                </span>
                <p className="text-[10px] text-slate-500 font-semibold">{dept.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk Students Requiring Follow-Up */}
      <div className="bg-[#101526] border border-red-500/20 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Institutional Shortage List (&lt;75%)</span>
          </h2>
          <span className="text-xs font-mono font-bold text-red-400">
            {atRiskStudents.length} Students
          </span>
        </div>

        <div className="space-y-2.5">
          {atRiskStudents.map((std) => (
            <StudentCard
              key={std.id}
              student={std}
              showDepartment={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDepartmentsSection;
