const fs = require('fs');
const path = require('path');

function createSimplePdf(title, subtitle, headers, rows) {
  let content = 'BT\n/F1 16 Tf\n50 740 Td\n(' + escapePdfText(title) + ') Tj\n';
  content += '/F1 10 Tf\n0 -18 Td\n(' + escapePdfText(subtitle) + ') Tj\n';
  content += '0 -24 Td\n';
  content += '/F1 11 Tf\n';

  // Header
  const headerLine = headers.map(h => h.padEnd(16)).join('  ');
  content += '(' + escapePdfText(headerLine) + ') Tj\n';
  content += '0 -6 Td\n';
  content += '(' + escapePdfText('-'.repeat(75)) + ') Tj\n';
  content += '/F1 9 Tf\n';

  // Rows
  let yOffset = -14;
  for (const row of rows) {
    content += `0 ${yOffset} Td\n`;
    const line = row.map((cell, idx) => {
      const len = idx === 0 ? 8 : idx === 1 ? 20 : idx === 2 ? 10 : 25;
      return String(cell).padEnd(len);
    }).join(' ');
    content += '(' + escapePdfText(line) + ') Tj\n';
  }
  content += 'ET\n';

  const streamLength = Buffer.byteLength(content, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`5 0 obj\n<< /Length ${streamLength} >>\nstream\n${content}\nendstream\nendobj`);

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n';
  pdf += '0 6\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 0; i < 5; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n';
  pdf += '<< /Size 6 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return pdf;
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Mech 1 Bully Students
const mechStudents = [
  ['01', 'Gaurav Mishra', 'ST4001', 'gaurav.mishra01@bitsindri.ac.in'],
  ['02', 'Ritu Tiwari', 'ST4002', 'ritu.tiwari02@bitsindri.ac.in'],
  ['03', 'Aditya Raj', 'ST4003', 'aditya.raj03@bitsindri.ac.in'],
  ['04', 'Ayush Sharma', 'ST4004', 'ayush.sharma04@bitsindri.ac.in'],
  ['05', 'Manish Kumar', 'ST4005', 'manish.kumar05@bitsindri.ac.in'],
  ['06', 'Vikash Singh', 'ST4006', 'vikash.singh06@bitsindri.ac.in'],
  ['07', 'Saurabh Tiwari', 'ST4007', 'saurabh.tiwari07@bitsindri.ac.in'],
  ['08', 'Rohit Ranjan', 'ST4008', 'rohit.ranjan08@bitsindri.ac.in'],
  ['09', 'Shubham Mishra', 'ST4009', 'shubham.mishra09@bitsindri.ac.in'],
  ['10', 'Deepak Kumar', 'ST4010', 'deepak.kumar10@bitsindri.ac.in'],
  ['11', 'Ankit Rawat', 'ST4011', 'ankit.rawat11@bitsindri.ac.in'],
  ['12', 'Priyanshu Gupta', 'ST4012', 'priyanshu.gupta12@bitsindri.ac.in'],
  ['13', 'Vishal Yadav', 'ST4013', 'vishal.yadav13@bitsindri.ac.in'],
  ['14', 'Harsh Vardhan', 'ST4014', 'harsh.vardhan14@bitsindri.ac.in'],
  ['15', 'Aman Verma', 'ST4015', 'aman.verma15@bitsindri.ac.in'],
  ['16', 'Abhay Pandey', 'ST4016', 'abhay.pandey16@bitsindri.ac.in'],
  ['17', 'Nitish Kumar', 'ST4017', 'nitish.kumar17@bitsindri.ac.in'],
  ['18', 'Rishabh Sinha', 'ST4018', 'rishabh.sinha18@bitsindri.ac.in'],
  ['19', 'Saksham Jha', 'ST4019', 'saksham.jha19@bitsindri.ac.in'],
  ['20', 'Kunal Singh', 'ST4020', 'kunal.singh20@bitsindri.ac.in'],
  ['21', 'Alok Dubey', 'ST4021', 'alok.dubey21@bitsindri.ac.in'],
  ['22', 'Prashant Ranjan', 'ST4022', 'prashant.ranjan22@bitsindri.ac.in'],
  ['23', 'Sandeep Soren', 'ST4023', 'sandeep.soren23@bitsindri.ac.in'],
  ['24', 'Manoj Murmu', 'ST4024', 'manoj.murmu24@bitsindri.ac.in'],
  ['25', 'Rajesh Hansda', 'ST4025', 'rajesh.hansda25@bitsindri.ac.in']
];

// EE Bully Students
const eeStudents = [
  ['01', 'Siddharth Roy', 'ST3001', 'siddharth.roy01@bitsindri.ac.in'],
  ['02', 'Ananya Sen', 'ST3002', 'ananya.sen02@bitsindri.ac.in'],
  ['03', 'Abhishek Banerjee', 'ST3003', 'abhishek.banerjee03@bitsindri.ac.in'],
  ['04', 'Sourav Mondal', 'ST3004', 'sourav.mondal04@bitsindri.ac.in'],
  ['05', 'Riya Mukherjee', 'ST3005', 'riya.mukherjee05@bitsindri.ac.in'],
  ['06', 'Sneha Ghosh', 'ST3006', 'sneha.ghosh06@bitsindri.ac.in'],
  ['07', 'Amit Paul', 'ST3007', 'amit.paul07@bitsindri.ac.in'],
  ['08', 'Debjit Das', 'ST3008', 'debjit.das08@bitsindri.ac.in'],
  ['09', 'Puja Bhattacharya', 'ST3009', 'puja.bhattacharya09@bitsindri.ac.in'],
  ['10', 'Subhashish Roy', 'ST3010', 'subhashish.roy10@bitsindri.ac.in'],
  ['11', 'Tanmay Dutta', 'ST3011', 'tanmay.dutta11@bitsindri.ac.in'],
  ['12', 'Priyanka Sarkar', 'ST3012', 'priyanka.sarkar12@bitsindri.ac.in'],
  ['13', 'Arpan Chakraborty', 'ST3013', 'arpan.chakraborty13@bitsindri.ac.in'],
  ['14', 'Sayani Chatterjee', 'ST3014', 'sayani.chatterjee14@bitsindri.ac.in'],
  ['15', 'Anirban Saha', 'ST3015', 'anirban.saha15@bitsindri.ac.in'],
  ['16', 'Moumita Dey', 'ST3016', 'moumita.dey16@bitsindri.ac.in'],
  ['17', 'Subhankar Bose', 'ST3017', 'subhankar.bose17@bitsindri.ac.in'],
  ['18', 'Indranil Majumder', 'ST3018', 'indranil.majumder18@bitsindri.ac.in'],
  ['19', 'Debolina Biswas', 'ST3019', 'debolina.biswas19@bitsindri.ac.in'],
  ['20', 'Kaushik Nandi', 'ST3020', 'kaushik.nandi20@bitsindri.ac.in'],
  ['21', 'Swagata Samanta', 'ST3021', 'swagata.samanta21@bitsindri.ac.in'],
  ['22', 'Pritam Ghosh', 'ST3022', 'pritam.ghosh22@bitsindri.ac.in'],
  ['23', 'Sayan Halder', 'ST3023', 'sayan.halder23@bitsindri.ac.in'],
  ['24', 'Barnali Pal', 'ST3024', 'barnali.pal24@bitsindri.ac.in'],
  ['25', 'Niladri Sekhar Das', 'ST3025', 'niladri.das25@bitsindri.ac.in']
];

const headers = ['Roll No', 'Student Name', 'Student ID', 'Institutional Email'];

const mechPdf = createSimplePdf(
  'BIT Sindri - Department of Mechanical Engineering',
  'Mech 1st Year (Section F) Student Bully / Roster 2026-2027',
  headers,
  mechStudents
);

const eePdf = createSimplePdf(
  'BIT Sindri - Department of Electrical Engineering',
  'EE 1st Year (Section J) Student Bully / Roster 2026-2027',
  headers,
  eeStudents
);

fs.writeFileSync(path.join(process.cwd(), 'public', 'Mech 1 bully.pdf'), mechPdf, 'binary');
fs.writeFileSync(path.join(process.cwd(), 'public', 'EE bully.pdf'), eePdf, 'binary');
console.log('Created Mech 1 bully.pdf and EE bully.pdf successfully in public/');
