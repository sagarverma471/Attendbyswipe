import fs from 'fs';
import path from 'path';

const NAMES_72 = [
  'Aarav Sharma',      // 01
  'Aditi Verma',       // 02
  'Akash Singh',       // 03
  'Ananya Gupta',      // 04
  'Ankit Mishra',      // 05
  'Ayush Kumar',       // 06
  'Deepak Tiwari',     // 07
  'Divya Patel',       // 08
  'Harsh Pandey',      // 09
  'Isha Roy',          // 10
  'Kavya Sengupta',    // 11
  'Manish Yadav',      // 12
  'Nikhil Jha',        // 13
  'Pooja Das',         // 14
  'Prateek Rao',       // 15
  'Priya Raj',         // 16
  'Rahul Sinha',       // 17
  'Rhea Mehra',        // 18
  'Rohan Dutta',       // 19
  'Rohit Choubey',     // 20
  'Sakshi Agarwal',    // 21
  'Sameer Ansari',     // 22
  'Rahul Kumar',       // 23
  'Aman Kumar',        // 24
  'Rohit Singh',       // 25
  'Priya Sharma',      // 26
  'Neha Kumari',       // 27
  'Ankit Kumar',       // 28
  'Vivek Raj',         // 29
  'Sneha Gupta',       // 30
  'Saurav Verma',      // 31
  'Pooja Rani',        // 32
  'Deepak Mehta',      // 33
  'Kavita Kumari',     // 34
  'Manish Das',        // 35
  'Shreya Ghosh',      // 36
  'Aditya Roy',        // 37
  'Simran Kaur',       // 38
  'Sanjay Mahato',     // 39
  'Shreya Paul',       // 40
  'Sneha Murmu',       // 41
  'Sourabh Keshri',    // 42
  'Tanvi Mathur',      // 43
  'Utkarsh Srivastava',// 44
  'Vikas Soren',       // 45
  'Vivek Burnwal',     // 46
  'Yashvardhan K',     // 47
  'Zoya Parveen',      // 48
  'Amit Ranjan',       // 49
  'Rishi Kaushik',     // 50
  'Abhishek Pandey',   // 51
  'Tanvi Agarwal',     // 52
  'Karan Mehra',       // 53
  'Arpita Sen',        // 54
  'Kunal Kishore',     // 55
  'Megha Swaraj',      // 56
  'Alok Ranjan',       // 57
  'Payal Kumari',      // 58
  'Shubham Barnwal',   // 59
  'Sandeep Marandi',   // 60
  'Rashi Keshri',      // 61
  'Vikash Hembrom',    // 62
  'Anisha Soren',      // 63
  'Gaurav Dubey',      // 64
  'Swati Mishra',      // 65
  'Tarun Karmakar',    // 66
  'Pallavi Mahato',    // 67
  'Ashish Baski',      // 68
  'Jyoti Hansda',      // 69
  'Vikram Murmu',      // 70
  'Manoj Tudu',        // 71
  'Priyanka Murmu',    // 72
];

const mockDataPath = path.resolve(process.cwd(), 'src/data/mockData.ts');
let content = fs.readFileSync(mockDataPath, 'utf8');

// Update class-cse-3a studentCount to 72
content = content.replace(
  /(id:\s*'class-cse-3a'[\s\S]*?studentCount:\s*)\d+/,
  '$172'
);

// Generate 72 complete CSE students
const cseStudents = NAMES_72.map((name, i) => {
  const roll = i + 1;
  const rollStr = String(roll).padStart(2, '0');
  const attendancePct = 65 + ((i * 7 + 13) % 31); // 65% to 95%
  const classesHeld = 50;
  const classesAttended = Math.round((classesHeld * attendancePct) / 100);
  const emailName = name.toLowerCase().replace(/[^a-z0-9]/g, '.');

  return `  {
    id: 'std-cse-${rollStr}',
    name: '${name}',
    rollNo: '${rollStr}',
    studentId: 'ST10${rollStr}',
    avatarUrl: '/student-portraits/student_${i}.jpg',
    department: 'B.Tech Computer Science',
    classroomId: 'class-cse-3a',
    semester: '3rd Year • 5th Semester',
    section: 'Section A',
    attendancePercentage: ${attendancePct},
    totalClassesHeld: ${classesHeld},
    totalClassesAttended: ${classesAttended},
    email: '${emailName}${rollStr}@bitsindri.ac.in',
  }`;
}).join(',\n');

// Replace CSE section in mockStudents
const startMarker = "export const mockStudents: Student[] = [\n";
const endMarker = "  // Section B Students";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex + startMarker.length) + cseStudents + ',\n  ' + content.slice(endIndex);
  fs.writeFileSync(mockDataPath, content, 'utf8');
  console.log('Successfully updated mockData.ts with all 72 CSE students from roll 01 to roll 72!');
} else {
  console.error('Failed to locate markers in mockData.ts');
}
