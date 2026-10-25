const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const studentList = [
  { rollNo: '2610001', name: 'ABHIJEET SHARMA', gender: 'Male' },
  { rollNo: '2610002', name: 'ABHINAV SINGH', gender: 'Male' },
  { rollNo: '2610003', name: 'ADITYA KUMAR', gender: 'Male' },
  { rollNo: '2610004', name: 'AKSHAT EKAGRA', gender: 'Male' },
  { rollNo: '2610005', name: 'AKSHAT KUNAL', gender: 'Male' },
  { rollNo: '2610006', name: 'AMAN KUMAR', gender: 'Male' },
  { rollNo: '2610007', name: 'AMIT KUMAR', gender: 'Male' },
  { rollNo: '2610008', name: 'ANEERUDH SINGH', gender: 'Male' },
  { rollNo: '2610009', name: 'ANIKET ANAND', gender: 'Male' },
  { rollNo: '2610010', name: 'ANKIT KUMAR DUBEY', gender: 'Male' },
  { rollNo: '2610011', name: 'ANKUSH KUMAR RAJAK', gender: 'Male' },
  { rollNo: '2610012', name: 'ANSHU KUMAR', gender: 'Male' },
  { rollNo: '2610013', name: 'ANUPAM KUMAR', gender: 'Male' },
  { rollNo: '2610014', name: 'ANURAG KUMAR SINGH', gender: 'Male' },
  { rollNo: '2610015', name: 'ARPIT PANDEY', gender: 'Male' },
  { rollNo: '2610016', name: 'ARYAN KUMAR BHAGAT', gender: 'Male' },
  { rollNo: '2610017', name: 'ASHISH KUMAR SINGH', gender: 'Male' },
  { rollNo: '2610018', name: 'ASHUTOSH KUMAR', gender: 'Male' },
  { rollNo: '2610019', name: 'CHANDAN KUMAR MAHTO', gender: 'Male' },
  { rollNo: '2610020', name: 'FAISAL KHALID', gender: 'Male' },
  { rollNo: '2610021', name: 'GAURAV KRISHNA TIRKEY', gender: 'Male' },
  { rollNo: '2610022', name: 'GOTAM MANDAL', gender: 'Male' },
  { rollNo: '2610023', name: 'GOUTAM KUMAR SOREN', gender: 'Male' },
  { rollNo: '2610024', name: 'HARSH PANDEY', gender: 'Male' },
  { rollNo: '2610025', name: 'HIMANSHU KUMAR GOND', gender: 'Male' },
  { rollNo: '2610026', name: 'HITESH ANAND', gender: 'Male' },
  { rollNo: '2610027', name: 'KANCHAN HEMBROM', gender: 'Female' },
  { rollNo: '2610028', name: 'KESHAV AGARWAL', gender: 'Male' },
  { rollNo: '2610029', name: 'KOUSHIK DUTTA', gender: 'Male' },
  { rollNo: '2610031', name: 'KUMAR SABYASACHI', gender: 'Male' },
  { rollNo: '2610032', name: 'MANIDIP RAJ', gender: 'Male' },
  { rollNo: '2610033', name: 'MANKI SAWAIYAN', gender: 'Male' },
  { rollNo: '2610034', name: 'MATA SUREN', gender: 'Female' },
  { rollNo: '2610035', name: 'MAX HANSDA', gender: 'Male' },
  { rollNo: '2610036', name: 'MAYANK KUMAR', gender: 'Male' },
  { rollNo: '2610037', name: 'MRIDUL KRISHNA', gender: 'Male' },
  { rollNo: '2610038', name: 'NISHIKANT SINGH', gender: 'Male' },
  { rollNo: '2610039', name: 'NITIN GUPTA', gender: 'Male' },
  { rollNo: '2610040', name: 'NITIN MOHAN RAWANI', gender: 'Male' },
  { rollNo: '2610041', name: 'PARTH PRASAD', gender: 'Male' },
  { rollNo: '2610042', name: 'PRANAV KUMAR PRASAD', gender: 'Male' },
  { rollNo: '2610043', name: 'PRIYA KUMARI', gender: 'Female' },
  { rollNo: '2610044', name: 'PRIYANSHU SHEKHAR', gender: 'Male' },
  { rollNo: '2610045', name: 'PUJAN DAS', gender: 'Male' },
  { rollNo: '2610046', name: 'REHAN ANSARI', gender: 'Male' },
  { rollNo: '2610047', name: 'RITIK KHALKHO', gender: 'Male' },
  { rollNo: '2610048', name: 'ROHIT HEMROM', gender: 'Male' },
  { rollNo: '2610049', name: 'SAGAR KUMAR VERMA', gender: 'Male' },
  { rollNo: '2610050', name: 'SAMSH KAMAR ANSARI', gender: 'Male' },
  { rollNo: '2610051', name: 'SANSKAR KUMAR SINHA', gender: 'Male' },
  { rollNo: '2610052', name: 'SAURAV PANDEY', gender: 'Male' },
  { rollNo: '2610053', name: 'SHINAN SHAZAD', gender: 'Male' },
  { rollNo: '2610054', name: 'SHIV SOREN', gender: 'Male' },
  { rollNo: '2610055', name: 'SOUVIK DAS GUPTA', gender: 'Male' },
  { rollNo: '2610056', name: 'SUBHAM TIRKEY', gender: 'Male' },
  { rollNo: '2610058', name: 'SUMIT KUMAR YADAV', gender: 'Male' },
  { rollNo: '2610059', name: 'TEJASEWINI RANJAN SINGH', gender: 'Female' },
  { rollNo: '2610060', name: 'UTSAV CHOUDHARY', gender: 'Male' },
  { rollNo: '2610061', name: 'VEER VIKRAM MURMU', gender: 'Male' },
  { rollNo: '2610062', name: 'ADITYA RAJ GUPTA', gender: 'Male' },
  { rollNo: '2610063', name: 'ANAND PRAKASH MAHTO', gender: 'Male' },
  { rollNo: '2610064', name: 'ATUL BHARTI', gender: 'Male' },
  { rollNo: '2610065', name: 'KAJAL KUMARI', gender: 'Female' },
  { rollNo: '2610066', name: 'NIDHI KUMARI', gender: 'Female' },
  { rollNo: '2610067', name: 'PRINCE KUMAR BASKI', gender: 'Male' },
  { rollNo: '2610068', name: 'RESHAM KUMARI', gender: 'Female' },
  { rollNo: '2610069', name: 'SAMIR RAJ', gender: 'Male' },
  { rollNo: '2610070', name: 'SUFI SULTANA', gender: 'Female' },
  { rollNo: '2610071', name: 'TANVI', gender: 'Female' },
  { rollNo: '2610072', name: 'YASHWANT KUMAR', gender: 'Male' }
];

const outDir = path.resolve('public/cyber-students');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const srcImg = path.resolve('public/assets/aistudio/image_528f9dbb.png');

console.log(`Starting extraction of ${studentList.length} student photos...`);

const col0_x = 44;
const delta_x = 152.2;

const row0_y = 96;
const delta_y = 133.0;

const crop_w = 94;
const crop_h = 61;

studentList.forEach((std, i) => {
  const row = Math.floor(i / 10);
  const col = i % 10;

  const x = Math.round(col0_x + col * delta_x);
  const y = Math.round(row0_y + row * delta_y);

  const outFile = path.join(outDir, `${std.rollNo}.jpg`);
  const cmd = `convert "${srcImg}" -crop ${crop_w}x${crop_h}+${x}+${y} +repage -quality 95 "${outFile}"`;
  execSync(cmd);
});

console.log(`Extracted all 70 photos cleanly to ${outDir}`);
