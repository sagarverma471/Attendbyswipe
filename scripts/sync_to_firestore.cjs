const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, config.firestoreDatabaseId);

async function syncData() {
  const students = JSON.parse(fs.readFileSync('src/data/cyberSecurityStudents.json', 'utf8'));
  console.log(`Writing classroom and ${students.length} students to Firestore (${config.firestoreDatabaseId})...`);

  // 1. Write Classroom
  const classroomData = {
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
  };

  try {
    // Write in batches of up to 25
    const batchSize = 25;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = writeBatch(db);
      if (i === 0) {
        batch.set(doc(db, 'classrooms', classroomData.id), classroomData);
      }
      const chunk = students.slice(i, i + batchSize);
      chunk.forEach((s) => {
        batch.set(doc(db, 'students', s.id), s);
      });
      await batch.commit();
      console.log(`Committed batch ${Math.floor(i / batchSize) + 1} (${chunk.length} students)`);
    }

    console.log('Successfully saved classroom and all 70 students to Cloud Firestore!');
    process.exit(0);
  } catch (err) {
    console.error('Error saving to Firestore:', err);
    process.exit(1);
  }
}

syncData();
