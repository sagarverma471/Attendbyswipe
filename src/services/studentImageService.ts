import { Student } from '../types/attendance';

export const TOTAL_PORTRAITS = 72;
export const MOSAIC_COLUMNS = 10;
export const MOSAIC_ROWS = 6;

export const DEFAULT_MOSAIC_URL = '/Diverse Young Faces Portrait Mosaic.png';

/**
 * Returns the local path to a pre-generated student portrait (0 to 71).
 */
export const getPortraitPathByIndex = (index: number): string => {
  const safeIndex = Math.abs(index) % TOTAL_PORTRAITS;
  return `/student-portraits/student_${safeIndex}.jpg`;
};

/**
 * Deterministic hash function for consistent avatar assignment
 */
export const hashStringToNumber = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Specific index mapping for B.Tech CSE Section A students
 * Roll 26CY1001 maps to index 0, Roll 26CY1002 to index 1, ..., 26CY1072 to index 71.
 */
export const getCSEStudentPortraitIndex = (rollNo: string | number): number => {
  if (typeof rollNo === 'string') {
    const match26CY = rollNo.match(/26CY(\d+)/i);
    if (match26CY) {
      const num = parseInt(match26CY[1], 10);
      if (num >= 1001 && num <= 1072) {
        return num - 1001; // 26CY1001 -> 0, 26CY1072 -> 71
      }
    }
  }
  const numeric = typeof rollNo === 'string' ? parseInt(rollNo.replace(/\D/g, ''), 10) : rollNo;
  if (!isNaN(numeric)) {
    if (numeric >= 1001 && numeric <= 1072) {
      return numeric - 1001;
    }
    if (numeric >= 261001 && numeric <= 261072) {
      return numeric - 261001;
    }
    // Direct 1-to-1 mapping for 72 students: Roll 1 -> index 0, Roll 72 -> index 71
    if (numeric >= 1 && numeric <= 72) {
      return numeric - 1;
    }
    return (numeric - 1 + TOTAL_PORTRAITS) % TOTAL_PORTRAITS;
  }
  return 0;
};

/**
 * Returns the consistent portrait URL for any student record.
 * Prioritizes custom cropped avatar URLs, then pre-sliced student portraits.
 */
export const getStudentPortraitUrl = (
  student: { id: string; rollNo: string; avatarUrl?: string; classroomId?: string },
  fallbackIndex?: number
): string => {
  // Check if student already has a valid sliced or local portrait (excluding svg drawings)
  if (
    student.avatarUrl &&
    !student.avatarUrl.endsWith('.svg') &&
    (student.avatarUrl.startsWith('/student-portraits/') ||
      student.avatarUrl.startsWith('data:image/') ||
      student.avatarUrl.startsWith('blob:'))
  ) {
    return student.avatarUrl;
  }

  // If in BEE classroom (class-cse-3b)
  if (student.classroomId === 'class-cse-3b' || (student.id && student.id.includes('bee'))) {
    const num = parseInt(student.rollNo.replace(/\D/g, ''), 10) || 1;
    const safeNum = Math.min(Math.max(num, 1), 72);
    return `/student-portraits/bee/bee_${String(safeNum).padStart(2, '0')}.jpg`;
  }

  // If in Physics classroom (class-phy-1a)
  if (student.classroomId === 'class-phy-1a' || (student.id && student.id.includes('phy'))) {
    const num = parseInt(student.rollNo.replace(/\D/g, ''), 10) || 1;
    const safeNum = Math.min(Math.max(num, 1), 60);
    return `/student-portraits/physics/phy_${String(safeNum).padStart(2, '0')}.jpg`;
  }

  // If in classroom class-cse-3a (B.Tech CSE Mathematics)
  if (student.classroomId === 'class-cse-3a') {
    const idx = getCSEStudentPortraitIndex(student.rollNo);
    return getPortraitPathByIndex(idx);
  }

  // Use fallback index or hash student id / roll number
  if (fallbackIndex !== undefined && fallbackIndex >= 0) {
    return getPortraitPathByIndex(fallbackIndex);
  }

  const num = parseInt(student.rollNo.replace(/\D/g, ''), 10);
  if (!isNaN(num)) {
    return getPortraitPathByIndex(num % TOTAL_PORTRAITS);
  }

  const hash = hashStringToNumber(student.id || student.rollNo);
  return getPortraitPathByIndex(hash % TOTAL_PORTRAITS);
};

/**
 * Calculates CSS background sprite coordinates for cropping directly from
 * a 10-column x 6-row collage mosaic image.
 */
export const getMosaicSpriteStyle = (
  portraitIndex: number,
  mosaicUrl: string = DEFAULT_MOSAIC_URL,
  cols: number = MOSAIC_COLUMNS,
  rows: number = MOSAIC_ROWS
): React.CSSProperties => {
  const idx = Math.abs(portraitIndex) % (cols * rows);
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;

  return {
    backgroundImage: `url("${mosaicUrl}")`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: 'no-repeat',
  };
};

/**
 * Client-Side Canvas Cropper:
 * Crops an uploaded or loaded collage image into individual student portrait data URLs.
 */
export const cropCollageToPortraits = async (
  imageSource: string | File,
  cols: number = MOSAIC_COLUMNS,
  rows: number = MOSAIC_ROWS,
  targetWidth: number = 320,
  targetHeight: number = 320
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;

    img.onload = () => {
      try {
        const totalPortraits = cols * rows;
        const cellWidth = img.naturalWidth / cols;
        const cellHeight = img.naturalHeight / rows;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        const croppedPortraits: string[] = [];

        for (let i = 0; i < totalPortraits; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);

          const sx = col * cellWidth;
          const sy = row * cellHeight;

          ctx.clearRect(0, 0, targetWidth, targetHeight);
          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, sx, sy, cellWidth, cellHeight, 0, 0, targetWidth, targetHeight);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          croppedPortraits.push(dataUrl);
        }

        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
        }

        resolve(croppedPortraits);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error('Failed to load collage image for cropping: ' + String(err)));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      objectUrlToRevoke = URL.createObjectURL(imageSource);
      img.src = objectUrlToRevoke;
    }
  });
};
