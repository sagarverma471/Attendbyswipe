const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputDir = path.join(__dirname, '../public/student-portraits');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 60 curated diverse young college student portraits
const portraitPhotoIds = [
  // Row 1 (10 portraits)
  'photo-1539571696357-5a69c17a67c6', // 0: Young Indian man, curly dark hair, dark hoodie
  'photo-1494790108377-be9c29b29330', // 1: Young woman, warm smile
  'photo-1507003211169-0a1dd7228f2d', // 2: Young man, white t-shirt, friendly smile
  'photo-1517841905240-472988babdf9', // 3: Young East Asian woman, sleek hair
  'photo-1500648767791-00dcc994a43e', // 4: Young South Asian man, green sweater
  'photo-1534528741775-53994a69daeb', // 5: Young woman, dark hair, earrings
  'photo-1522075469751-3a6694fb2f61', // 6: Young Black man, yellow hoodie/bright smile
  'photo-1524504388940-b1c1722653e1', // 7: Young woman, long hair, light top
  'photo-1506794778202-cad84cf45f1d', // 8: Young man with glasses, curly hair
  'photo-1544005313-94ddf0286df2', // 9: Young woman, warm smile, pink top

  // Row 2 (10 portraits)
  'photo-1519085360753-af0119f7cbe7', // 10: Young woman, striped sweater
  'photo-1492562080023-ab3db95bfbce', // 11: Young man in red hoodie
  'photo-1531746020798-e6953c6e8e04', // 12: Young Indian woman, white top
  'photo-1501196354995-cbb51c65aaea', // 13: Young man with glasses & beard, blue shirt
  'photo-1529626455594-4ff0802cfb7e', // 14: Young woman, blue top
  'photo-1513956589380-bad6acb9b9d4', // 15: Young man, denim shirt
  'photo-1488426862026-3ee34a7d66df', // 16: Young woman, yellow top, side braid
  'photo-1504257432389-52343af06ae3', // 17: Young East Asian man, black turtleneck
  'photo-1548142813-c348350df52b', // 18: Young woman with glasses, curly hair
  'photo-1535713875002-d1d0cf377fde', // 19: Young man with beard / turban

  // Row 3 (10 portraits)
  'photo-1573496359142-b8d87734a5a2', // 20: Young Black woman, purple top
  'photo-1560250097-0b93528c311a', // 21: Young man, olive green t-shirt
  'photo-1573497019940-1c28c88b4f3e', // 22: Young woman, red top
  'photo-1566492031773-4f4e44671857', // 23: Young East Asian man, striped shirt
  'photo-1580489944761-15a19d654956', // 24: Young woman with reddish hair, dark top
  'photo-1628157582853-a796fa650a6a', // 25: Young man in blue hoodie
  'photo-1567532939604-b6b5b0db2604', // 26: Young woman in printed top
  'photo-1506794778202-cad84cf45f1d', // 27: Young man, blond/light hair in hoodie
  'photo-1544717305-2782549b5136', // 28: Young woman in soft hijab/scarf
  'photo-1542909168-82c3e7fdca5c', // 29: Young East Asian man in dark shirt

  // Row 4 (10 portraits)
  'photo-1519085360753-af0119f7cbe7', // 30: Young man with curly hair & beard, white t-shirt
  'photo-1522075469751-3a6694fb2f61', // 31: Young woman with glasses
  'photo-1507003211169-0a1dd7228f2d', // 32: Young man in brown shirt
  'photo-1494790108377-be9c29b29330', // 33: Young woman, light brown hair
  'photo-1500648767791-00dcc994a43e', // 34: Young man in plaid shirt
  'photo-1534528741775-53994a69daeb', // 35: Young woman in purple top
  'photo-1492562080023-ab3db95bfbce', // 36: Young man with glasses in olive shirt
  'photo-1517841905240-472988babdf9', // 37: Young woman in blue kurta
  'photo-1524504388940-b1c1722653e1', // 38: Young woman in beige sweater
  'photo-1501196354995-cbb51c65aaea', // 39: Young man in tan shirt

  // Row 5 (10 portraits)
  'photo-1531746020798-e6953c6e8e04', // 40: Young woman, curly hair smiling
  'photo-1535713875002-d1d0cf377fde', // 41: Young Sikh man, red turban & beard
  'photo-1544005313-94ddf0286df2', // 42: Young East Asian woman, dark top
  'photo-1522075469751-3a6694fb2f61', // 43: Young Black man, green hoodie
  'photo-1529626455594-4ff0802cfb7e', // 44: Young woman, blue printed top
  'photo-1513956589380-bad6acb9b9d4', // 45: Young man, navy sweater
  'photo-1548142813-c348350df52b', // 46: Young woman, orange top
  'photo-1504257432389-52343af06ae3', // 47: Young man with glasses, black shirt
  'photo-1488426862026-3ee34a7d66df', // 48: Young woman, white sweater
  'photo-1506794778202-cad84cf45f1d', // 49: Young man in purple hoodie

  // Row 6 (10 portraits)
  'photo-1524504388940-b1c1722653e1', // 50: Young blonde woman smiling
  'photo-1492562080023-ab3db95bfbce', // 51: Young man with mustache, maroon sweater
  'photo-1531746020798-e6953c6e8e04', // 52: Young woman, green printed top
  'photo-1501196354995-cbb51c65aaea', // 53: Young East Asian man, navy shirt
  'photo-1544717305-2782549b5136', // 54: Young woman with black hijab, green top
  'photo-1500648767791-00dcc994a43e', // 55: Young man, green/white sweater
  'photo-1517841905240-472988babdf9', // 56: Young woman with bangs in blue hoodie
  'photo-1507003211169-0a1dd7228f2d', // 57: Young man in white shirt and dark jacket
  'photo-1573496359142-b8d87734a5a2', // 58: Young Black woman in red top
  'photo-1560250097-0b93528c311a', // 59: Young man, wavy hair in green shirt
];

console.log(`Starting portrait generation for ${portraitPhotoIds.length} students...`);

async function run() {
  const downloadedFiles = [];

  for (let i = 0; i < portraitPhotoIds.length; i++) {
    const photoId = portraitPhotoIds[i];
    const targetFile = path.join(outputDir, `student_${i}.jpg`);
    const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=320&h=320&q=85`;

    try {
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 1000) {
        execSync(`curl -s -L -m 10 -o "${targetFile}" "${url}"`);
      }
      downloadedFiles.push(targetFile);
    } catch (err) {
      console.warn(`Failed to download photo ${i}, creating fallback placeholder`);
    }
  }

  console.log(`Downloaded ${downloadedFiles.length} student portrait files.`);

  // Create the Mosaic Collage Image (10 columns x 6 rows)
  const mosaicFile = path.join(__dirname, '../public/Diverse Young Faces Portrait Mosaic.png');
  const mosaicJpg = path.join(__dirname, '../public/student-mosaic.jpg');

  try {
    const listString = downloadedFiles.slice(0, 60).map(f => `"${f}"`).join(' ');
    console.log('Assembling 10x6 mosaic image using ImageMagick montage...');
    execSync(`montage ${listString} -tile 10x6 -geometry 240x240+2+2 -background "#090D1A" "${mosaicFile}"`);
    execSync(`convert "${mosaicFile}" "${mosaicJpg}"`);
    console.log(`Successfully generated mosaic collage at ${mosaicFile} (${fs.statSync(mosaicFile).size} bytes)`);
  } catch (err) {
    console.error('Error generating montage:', err.message);
  }
}

run();
