const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');

const studentList = [
  { rollNo: '2610001', name: 'ABHIJEET SHARMA', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610002', name: 'ABHINAV SINGH', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610003', name: 'ADITYA KUMAR', gender: 'male', pct: 90, held: 50, att: 45 },
  { rollNo: '2610004', name: 'AKSHAT EKAGRA', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610005', name: 'AKSHAT KUNAL', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610006', name: 'AMAN KUMAR', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610007', name: 'AMIT KUMAR', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610008', name: 'ANEERUDH SINGH', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610009', name: 'ANIKET ANAND', gender: 'male', pct: 80, held: 50, att: 40 },
  { rollNo: '2610010', name: 'ANKIT KUMAR DUBEY', gender: 'male', pct: 94, held: 50, att: 47 },
  { rollNo: '2610011', name: 'ANKUSH KUMAR RAJAK', gender: 'male', pct: 78, held: 50, att: 39 },
  { rollNo: '2610012', name: 'ANSHU KUMAR', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610013', name: 'ANUPAM KUMAR', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610014', name: 'ANURAG KUMAR SINGH', gender: 'male', pct: 90, held: 50, att: 45 },
  { rollNo: '2610015', name: 'ARPIT PANDEY', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610016', name: 'ARYAN KUMAR BHAGAT', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610017', name: 'ASHISH KUMAR SINGH', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610018', name: 'ASHUTOSH KUMAR', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610019', name: 'CHANDAN KUMAR MAHTO', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610020', name: 'FAISAL KHALID', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610021', name: 'GAURAV KRISHNA TIRKEY', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610022', name: 'GOTAM MANDAL', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610023', name: 'GOUTAM KUMAR SOREN', gender: 'male', pct: 80, held: 50, att: 40 },
  { rollNo: '2610024', name: 'HARSH PANDEY', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610025', name: 'HIMANSHU KUMAR GOND', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610026', name: 'HITESH ANAND', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610027', name: 'KANCHAN HEMBROM', gender: 'female', pct: 90, held: 50, att: 45 },
  { rollNo: '2610028', name: 'KESHAV AGARWAL', gender: 'male', pct: 94, held: 50, att: 47 },
  { rollNo: '2610029', name: 'KOUSHIK DUTTA', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610031', name: 'KUMAR SABYASACHI', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610032', name: 'MANIDIP RAJ', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610033', name: 'MANKI SAWAIYAN', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610034', name: 'MATA SUREN', gender: 'female', pct: 88, held: 50, att: 44 },
  { rollNo: '2610035', name: 'MAX HANSDA', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610036', name: 'MAYANK KUMAR', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610037', name: 'MRIDUL KRISHNA', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610038', name: 'NISHIKANT SINGH', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610039', name: 'NITIN GUPTA', gender: 'male', pct: 90, held: 50, att: 45 },
  { rollNo: '2610040', name: 'NITIN MOHAN RAWANI', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610041', name: 'PARTH PRASAD', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610042', name: 'PRANAV KUMAR PRASAD', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610043', name: 'PRIYA KUMARI', gender: 'female', pct: 96, held: 50, att: 48 },
  { rollNo: '2610044', name: 'PRIYANSHU SHEKHAR', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610045', name: 'PUJAN DAS', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610046', name: 'REHAN ANSARI', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610047', name: 'RITIK KHALKHO', gender: 'male', pct: 80, held: 50, att: 40 },
  { rollNo: '2610048', name: 'ROHIT HEMROM', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610049', name: 'SAGAR KUMAR VERMA', gender: 'male', pct: 90, held: 50, att: 45 },
  { rollNo: '2610050', name: 'SAMSH KAMAR ANSARI', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610051', name: 'SANSKAR KUMAR SINHA', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610052', name: 'SAURAV PANDEY', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610053', name: 'SHINAN SHAZAD', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610054', name: 'SHIV SOREN', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610055', name: 'SOUVIK DAS GUPTA', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610056', name: 'SUBHAM TIRKEY', gender: 'male', pct: 80, held: 50, att: 40 },
  { rollNo: '2610058', name: 'SUMIT KUMAR YADAV', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610059', name: 'TEJASEWINI RANJAN SINGH', gender: 'female', pct: 94, held: 50, att: 47 },
  { rollNo: '2610060', name: 'UTSAV CHOUDHARY', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610061', name: 'VEER VIKRAM MURMU', gender: 'male', pct: 82, held: 50, att: 41 },
  { rollNo: '2610062', name: 'ADITYA RAJ GUPTA', gender: 'male', pct: 92, held: 50, att: 46 },
  { rollNo: '2610063', name: 'ANAND PRAKASH MAHTO', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610064', name: 'ATUL BHARTI', gender: 'male', pct: 88, held: 50, att: 44 },
  { rollNo: '2610065', name: 'KAJAL KUMARI', gender: 'female', pct: 92, held: 50, att: 46 },
  { rollNo: '2610066', name: 'NIDHI KUMARI', gender: 'female', pct: 90, held: 50, att: 45 },
  { rollNo: '2610067', name: 'PRINCE KUMAR BASKI', gender: 'male', pct: 84, held: 50, att: 42 },
  { rollNo: '2610068', name: 'RESHAM KUMARI', gender: 'female', pct: 88, held: 50, att: 44 },
  { rollNo: '2610069', name: 'SAMIR RAJ', gender: 'male', pct: 86, held: 50, att: 43 },
  { rollNo: '2610070', name: 'SUFI SULTANA', gender: 'female', pct: 94, held: 50, att: 47 },
  { rollNo: '2610071', name: 'TANVI', gender: 'female', pct: 96, held: 50, att: 48 },
  { rollNo: '2610072', name: 'YASHWANT KUMAR', gender: 'male', pct: 88, held: 50, att: 44 }
];

console.log(`Prepared ${studentList.length} cyber security students.`);

// Construct TypeScript Student objects
const cyberStudentObjects = studentList.map((s) => ({
  id: `std-cs-${s.rollNo}`,
  name: s.name,
  rollNo: s.rollNo,
  studentId: s.rollNo,
  avatarUrl: `/cyber-students/${s.rollNo}.jpg`,
  department: 'B.Tech Computer Science and Engineering (Cyber Security)',
  classroomId: 'class-cse-3a',
  semester: '1st Year • 1st Semester',
  section: 'Cyber Security',
  attendancePercentage: s.pct,
  totalClassesHeld: s.held,
  totalClassesAttended: s.att,
  email: `${s.rollNo.toLowerCase()}@bitsindri.ac.in`,
  gender: s.gender,
}));

// Save to a standalone JSON file for easy hydration
fs.writeFileSync('src/data/cyberSecurityStudents.json', JSON.stringify(cyberStudentObjects, null, 2));
console.log('Saved src/data/cyberSecurityStudents.json');

// Now update mockData.ts
const mockDataPath = path.resolve('src/data/mockData.ts');
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// 1. Update classroom class-cse-3a
mockDataContent = mockDataContent.replace(
  /\{\s*id:\s*'class-cse-3a',[\s\S]*?lastAttendanceDate:\s*'2026-10-12',\s*\}/,
  `{
    id: 'class-cse-3a',
    name: 'B.Tech Computer Science and Engineering (Cyber Security)',
    institutionType: 'College',
    department: 'Computer Science and Engineering (Cyber Security)',
    academicYear: '2026-2027',
    year: '1st Year',
    semester: '1st Semester',
    section: 'Cyber Security',
    attendanceThreshold: 75,
    studentCount: 70,
    lastAttendanceDate: '2026-10-12',
  }`
);

// 2. Replace student array slice for class-cse-3a
// Find where mockStudents starts
const studentsStartIdx = mockDataContent.indexOf('export const mockStudents: Student[] = [');
const beeStartIdx = mockDataContent.indexOf("id: 'std-bee-01'");

if (studentsStartIdx !== -1 && beeStartIdx !== -1) {
  // Find the opening brace of std-bee-01
  const prevBrace = mockDataContent.lastIndexOf('{', beeStartIdx);
  const beforeStudents = mockDataContent.substring(0, studentsStartIdx + 'export const mockStudents: Student[] = ['.length);
  const afterStudents = mockDataContent.substring(prevBrace);

  let cyberStudentsCode = '\n';
  cyberStudentObjects.forEach((s) => {
    cyberStudentsCode += `  {
    id: '${s.id}',
    name: '${s.name}',
    rollNo: '${s.rollNo}',
    studentId: '${s.studentId}',
    avatarUrl: '${s.avatarUrl}',
    department: '${s.department}',
    classroomId: '${s.classroomId}',
    semester: '${s.semester}',
    section: '${s.section}',
    attendancePercentage: ${s.attendancePercentage},
    totalClassesHeld: ${s.totalClassesHeld},
    totalClassesAttended: ${s.totalClassesAttended},
    email: '${s.email}',
    gender: '${s.gender}',
  },\n`;
  });

  mockDataContent = beforeStudents + cyberStudentsCode + '  ' + afterStudents;
  console.log('Replaced class-cse-3a mock students in mockData.ts');
}

// 3. Update session-qr-today-math
mockDataContent = mockDataContent.replace(
  /id:\s*'session-qr-today-math',[\s\S]*?records:\s*\{[\s\S]*?\},/,
  (match) => {
    let recs = {};
    cyberStudentObjects.forEach((s, idx) => {
      recs[s.id] = idx < 63 ? 'present' : 'absent';
    });
    return `id: 'session-qr-today-math',
    classroomId: 'class-cse-3a',
    classroomName: 'B.Tech Computer Science and Engineering (Cyber Security)',
    subjectId: 'sub-dbms',
    subjectName: 'Mathematics',
    date: '2026-10-12',
    period: 2,
    markedBy: 'Dr. Ankit Sharma',
    status: 'completed',
    sessionType: 'qr',
    totalStudents: 70,
    presentCount: 63,
    absentCount: 7,
    unmarkedCount: 0,
    createdAt: '2026-10-12T10:55:00Z',
    completedAt: '2026-10-12T11:00:00Z',
    records: ${JSON.stringify(recs, null, 6)},`;
  }
);

fs.writeFileSync(mockDataPath, mockDataContent);
console.log('Updated src/data/mockData.ts successfully');
