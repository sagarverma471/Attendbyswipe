import fs from 'fs';
import path from 'path';

const mockDataPath = path.resolve(process.cwd(), 'src/data/mockData.ts');
let content = fs.readFileSync(mockDataPath, 'utf8');

// Replace teacher avatar
content = content.replace(
  /avatarUrl:\s*'https:\/\/images\.unsplash\.com\/photo-1534528741775-53994a69daeb\?[^']*'/,
  "avatarUrl: '/student-portraits/portrait-1.svg'"
);

// Match and replace each student avatarUrl
let index = 1;
content = content.replace(/avatarUrl:\s*'https:\/\/images\.unsplash\.com\/[^']*'/g, (match) => {
  const replacement = `avatarUrl: '/student-portraits/portrait-${((index - 1) % 28) + 1}.svg'`;
  index++;
  return replacement;
});

// Update session-qr-today date to use real-time or getTodayIsoDate
content = content.replace(
  /date:\s*'2026-10-08',(\s*period:\s*2,\s*markedBy:\s*'Dr\. Ankit Sharma',\s*status:\s*'completed')/,
  "date: '2026-10-12',$1"
);

// Update lastAttendanceDate in mockClassrooms to 2026-10-12
content = content.replace(
  /lastAttendanceDate:\s*'2026-10-07'/g,
  "lastAttendanceDate: '2026-10-12'"
);

fs.writeFileSync(mockDataPath, content, 'utf8');
console.log(`Replaced ${index - 1} avatarUrls with local student portraits in mockData.ts`);
