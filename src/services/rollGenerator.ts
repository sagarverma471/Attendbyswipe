import { Student } from '../types/attendance';

export interface RollGeneratorConfig {
  prompt?: string;
  patternType: 'sequential' | 'institutional' | 'lateral' | 'custom' | 'simple';
  rollPrefix: string;
  startNum: number;
  count: number;
  endNum?: number;
  customList?: string[] | string;
  padding: number;
  step: number;
  suffix?: string;
  customFormat?: string; // e.g. "BIT/{YEAR}/{BRANCH}/{NUM}"
  year?: string;
  department: string;
  section: string;
  semester: string;
  classroomId: string;
}

export interface GeneratedRollsResult {
  rolls: string[];
  students: Omit<Student, 'id'>[];
  explanation: string;
  source: 'gemini' | 'rule-engine';
}

const INDIAN_SAMPLE_NAMES = [
  'Aarav Sharma',
  'Aditi Verma',
  'Akash Singh',
  'Ananya Gupta',
  'Ankit Mishra',
  'Ayush Kumar',
  'Deepak Tiwari',
  'Divya Patel',
  'Harsh Pandey',
  'Isha Roy',
  'Kavya Sengupta',
  'Manish Yadav',
  'Neha Kumari',
  'Nikhil Jha',
  'Pooja Das',
  'Prateek Rao',
  'Priya Raj',
  'Rahul Sinha',
  'Rhea Mehra',
  'Rohan Dutta',
  'Rohit Choubey',
  'Sakshi Agarwal',
  'Sameer Ansari',
  'Sanjay Mahato',
  'Shreya Paul',
  'Sneha Murmu',
  'Sourabh Keshri',
  'Tanvi Mathur',
  'Utkarsh Srivastava',
  'Vikas Soren',
  'Vivek Burnwal',
  'Yashvardhan K',
  'Zoya Parveen',
  'Amit Ranjan',
  'Rishi Kaushik',
];

const AVATAR_SEEDS = Array.from(
  { length: 28 },
  (_, i) => `/student-portraits/portrait-${i + 1}.svg`
);

/**
 * Generate sequence using deterministic rule algorithms
 */
export function generateLocalSequence(config: RollGeneratorConfig): GeneratedRollsResult {
  const {
    patternType,
    rollPrefix,
    startNum,
    count,
    endNum,
    customList,
    padding,
    step = 1,
    suffix = '',
    customFormat,
    year = '2026',
    department,
    section,
    semester,
    classroomId,
  } = config;

  let parsedCustomRolls: string[] = [];
  if (Array.isArray(customList)) {
    parsedCustomRolls = customList.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof customList === 'string' && customList.trim().length > 0) {
    parsedCustomRolls = customList
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const effectiveCount =
    parsedCustomRolls.length > 0
      ? parsedCustomRolls.length
      : endNum && Number(endNum) >= Number(startNum)
      ? Number(endNum) - Number(startNum) + 1
      : count;

  const branchCode = department.includes('Computer')
    ? 'CSE'
    : department.includes('Electrical')
    ? 'EE'
    : department.includes('Mechanical')
    ? 'ME'
    : 'GEN';

  const rolls: string[] = [];
  const students: Omit<Student, 'id'>[] = [];

  for (let i = 0; i < effectiveCount; i++) {
    const numVal = startNum + i * step;
    const padded = padding > 0 ? String(numVal).padStart(padding, '0') : String(numVal);
    let roll = '';

    if (parsedCustomRolls.length > 0) {
      roll = parsedCustomRolls[i];
    } else {

    switch (patternType) {
      case 'institutional':
        // e.g. BIT/2026/CSE/001
        roll = `BIT/${year}/${branchCode}/${padded}${suffix ? `-${suffix}` : ''}`;
        break;

      case 'lateral':
        // e.g. 26-LE-CSE-01
        roll = `${year.slice(-2)}-LE-${branchCode}-${padded}${suffix ? `-${suffix}` : ''}`;
        break;

      case 'custom':
        if (customFormat && customFormat.includes('{NUM}')) {
          roll = customFormat
            .replace('{PREFIX}', rollPrefix)
            .replace('{YEAR}', year)
            .replace('{BRANCH}', branchCode)
            .replace('{SEC}', section.replace('Section ', ''))
            .replace('{NUM}', padded);
        } else {
          roll = `${rollPrefix}${padded}${suffix}`;
        }
        break;

      case 'simple':
        // e.g. 1, 2, 3...
        roll = `${numVal}`;
        break;

      case 'sequential':
      default:
        // e.g. 26CSE001
        roll = `${rollPrefix}${padded}${suffix}`;
        break;
    }
    }

    rolls.push(roll);

    const nameIdx = i % INDIAN_SAMPLE_NAMES.length;
    const nameExt = i >= INDIAN_SAMPLE_NAMES.length ? ` ${Math.floor(i / INDIAN_SAMPLE_NAMES.length) + 1}` : '';
    const name = `${INDIAN_SAMPLE_NAMES[nameIdx]}${nameExt}`;

    students.push({
      rollNo: roll,
      name,
      studentId: `ST${1000 + numVal}`,
      department,
      classroomId,
      semester,
      section,
      attendancePercentage: 85,
      totalClassesHeld: 20,
      totalClassesAttended: 17,
      avatarUrl: AVATAR_SEEDS[i % AVATAR_SEEDS.length],
      email: `${roll.toLowerCase().replace(/[^a-z0-9]/g, '')}@bitsindri.ac.in`,
    });
  }

  return {
    rolls,
    students,
    explanation: `Generated ${rolls.length} roll numbers from ${rolls[0]} to ${rolls[rolls.length - 1]} using ${patternType} template.`,
    source: 'rule-engine',
  };
}

/**
 * Request Gemini AI via server-side endpoint /api/generate-rolls
 * Falls back to generateLocalSequence if server call is unavailable.
 */
export async function generateRollsWithGemini(
  config: RollGeneratorConfig
): Promise<GeneratedRollsResult> {
  try {
    const response = await fetch('/api/generate-rolls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data.rolls) && data.rolls.length > 0) {
      const generatedStudents: Omit<Student, 'id'>[] = (data.students || []).map(
        (std: any, idx: number) => ({
          rollNo: std.rollNo || data.rolls[idx],
          name: std.name || INDIAN_SAMPLE_NAMES[idx % INDIAN_SAMPLE_NAMES.length],
          studentId: std.studentId || `ST${1000 + idx + 1}`,
          department: std.department || config.department,
          classroomId: config.classroomId,
          semester: std.semester || config.semester,
          section: std.section || config.section,
          attendancePercentage: 85,
          totalClassesHeld: 20,
          totalClassesAttended: 17,
          avatarUrl: AVATAR_SEEDS[idx % AVATAR_SEEDS.length],
          email: `${String(std.rollNo || data.rolls[idx]).toLowerCase().replace(/[^a-z0-9]/g, '')}@bitsindri.ac.in`,
        })
      );

      // If Gemini returned rolls but not enough student objects, supplement them
      if (generatedStudents.length < data.rolls.length) {
        for (let i = generatedStudents.length; i < data.rolls.length; i++) {
          const r = data.rolls[i];
          generatedStudents.push({
            rollNo: r,
            name: INDIAN_SAMPLE_NAMES[i % INDIAN_SAMPLE_NAMES.length],
            studentId: `ST${1000 + i + 1}`,
            department: config.department,
            classroomId: config.classroomId,
            semester: config.semester,
            section: config.section,
            attendancePercentage: 85,
            totalClassesHeld: 20,
            totalClassesAttended: 17,
            avatarUrl: AVATAR_SEEDS[i % AVATAR_SEEDS.length],
            email: `${r.toLowerCase().replace(/[^a-z0-9]/g, '')}@bitsindri.ac.in`,
          });
        }
      }

      return {
        rolls: data.rolls,
        students: generatedStudents,
        explanation: data.explanation || `AI generated ${data.rolls.length} roll numbers successfully.`,
        source: 'gemini',
      };
    }

    return generateLocalSequence(config);
  } catch (err) {
    console.warn('Gemini roll generation server fallback active:', err);
    return generateLocalSequence(config);
  }
}

/**
 * Download rolls & student list as CSV
 */
export function downloadRollsCsv(
  rolls: string[],
  students: Omit<Student, 'id'>[],
  fileName = 'generated_roll_numbers.csv'
) {
  const headers = ['Roll No', 'Full Name', 'Student ID', 'Department', 'Section', 'Semester', 'Email'];
  const rows = students.map((s) => [
    `"${s.rollNo}"`,
    `"${s.name}"`,
    `"${s.studentId}"`,
    `"${s.department}"`,
    `"${s.section}"`,
    `"${s.semester}"`,
    `"${s.email || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
