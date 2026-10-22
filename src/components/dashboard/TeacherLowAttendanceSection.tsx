import React from 'react';
import { Student } from '../../types/attendance';
import { LowAttendanceWarning } from './LowAttendanceWarning';

interface TeacherLowAttendanceSectionProps {
  students: Student[];
  onNavigateStudents: () => void;
  threshold?: number;
}

export const TeacherLowAttendanceSection: React.FC<TeacherLowAttendanceSectionProps> = ({
  students,
  onNavigateStudents,
  threshold = 75,
}) => {
  return (
    <LowAttendanceWarning
      students={students}
      onNavigateStudents={onNavigateStudents}
      defaultThreshold={threshold}
    />
  );
};

export default TeacherLowAttendanceSection;

