import React from 'react';
import { Classroom } from '../../types/attendance';
import { ArrowRight } from 'lucide-react';
import { ClassroomCard } from '../cards/ClassroomCard';

interface TeacherClassroomsSectionProps {
  classrooms: Classroom[];
  onViewClassroom: (classroom: Classroom) => void;
  onNavigateStudents: () => void;
  onLaunchQR?: (classroom: Classroom) => void;
}

export const TeacherClassroomsSection: React.FC<TeacherClassroomsSectionProps> = ({
  classrooms,
  onViewClassroom,
  onNavigateStudents,
  onLaunchQR,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
          Assigned Classrooms
        </h2>
        <button
          onClick={onNavigateStudents}
          className="text-xs text-violet-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {classrooms.map((cls) => (
          <ClassroomCard
            key={cls.id}
            classroom={cls}
            variant="dashboard"
            onSelect={onViewClassroom}
            onLaunchQR={onLaunchQR}
          />
        ))}
      </div>
    </div>
  );
};

export default TeacherClassroomsSection;
