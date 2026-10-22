export interface GoogleWorkspaceResult {
  success: boolean;
  id?: string;
  url?: string;
  title?: string;
  error?: string;
}

export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  alternateLink?: string;
  courseState?: string;
}

export interface GoogleClassroomStudent {
  userId: string;
  profile?: {
    id: string;
    name?: {
      fullName?: string;
      givenName?: string;
      familyName?: string;
    };
    emailAddress?: string;
    photoUrl?: string;
  };
}

export interface DefaulterStudentItem {
  id: string;
  name: string;
  rollNo: string;
  studentId: string;
  percentage: number;
  attended: number;
  held: number;
}
