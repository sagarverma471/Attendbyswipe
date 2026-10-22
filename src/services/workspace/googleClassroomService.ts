import { GoogleWorkspaceResult, GoogleClassroomCourse, GoogleClassroomStudent } from './types';

/**
 * Lists active Google Classroom courses for the signed-in teacher.
 */
export async function fetchGoogleClassroomCourses(token: string): Promise<GoogleClassroomCourse[]> {
  try {
    const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Google Classroom courses (${res.status})`);
    }

    const data = await res.json();
    return (data.courses || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      descriptionHeading: c.descriptionHeading,
      room: c.room,
      alternateLink: c.alternateLink,
      courseState: c.courseState,
    }));
  } catch (err: any) {
    console.error('Error in fetchGoogleClassroomCourses:', err);
    throw err;
  }
}

/**
 * Fetches enrolled students in a specific Google Classroom course.
 */
export async function fetchGoogleClassroomStudents(
  courseId: string,
  token: string
): Promise<GoogleClassroomStudent[]> {
  try {
    const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch course students (${res.status})`);
    }

    const data = await res.json();
    return data.students || [];
  } catch (err: any) {
    console.error('Error in fetchGoogleClassroomStudents:', err);
    throw err;
  }
}

/**
 * Posts an attendance announcement into the Google Classroom stream.
 */
export async function postClassroomAttendanceAnnouncement(
  courseId: string,
  text: string,
  token: string
): Promise<GoogleWorkspaceResult> {
  try {
    const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        state: 'PUBLISHED',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to post announcement to Google Classroom (${res.status})`);
    }

    const data = await res.json();
    return {
      success: true,
      id: data.id,
      url: data.alternateLink,
      title: 'Announcement posted to Google Classroom',
    };
  } catch (err: any) {
    console.error('Error in postClassroomAttendanceAnnouncement:', err);
    return {
      success: false,
      error: err.message || 'Failed to post announcement',
    };
  }
}
