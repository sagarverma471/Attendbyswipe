import fs from 'fs';
import path from 'path';

const outputDir = path.resolve(process.cwd(), 'public/student-portraits');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 28 Distinct, diverse portraits corresponding directly to the 4x7 mosaic
interface PortraitConfig {
  id: number;
  gender: 'm' | 'f';
  name: string;
  bgColor: string;
  skinColor: string;
  skinShadow: string;
  hairColor: string;
  hairStyle: string; // 'wavy-male', 'long-wavy-female', 'curly-male', 'middle-part', 'hijab', 'afro', 'glasses-female', 'glasses-male', 'turban', 'bob', 'bun', etc.
  clothingColor: string;
  clothingStyle: 'hoodie' | 'kurta' | 'sweater' | 'plaid' | 'tshirt' | 'denim' | 'polo' | 'turtleneck' | 'shirt';
  accessories?: 'glasses' | 'turban' | 'hijab' | 'earrings' | 'beard' | 'stubble';
  secondaryClothingColor?: string;
}

const portraits: PortraitConfig[] = [
  // ROW 1
  {
    id: 1,
    gender: 'm',
    name: 'Rahul Kumar',
    bgColor: '#94A3B8', // Grey studio
    skinColor: '#C68642',
    skinShadow: '#A2672B',
    hairColor: '#1A181B',
    hairStyle: 'wavy-male',
    clothingColor: '#1E293B', // Black hoodie
    clothingStyle: 'hoodie',
    accessories: 'stubble',
  },
  {
    id: 2,
    gender: 'f',
    name: 'Priya Sharma',
    bgColor: '#94A3B8',
    skinColor: '#E0AC69',
    skinShadow: '#BD8646',
    hairColor: '#1C1917',
    hairStyle: 'long-wavy-female',
    clothingColor: '#F472B6', // Pink floral kurta
    clothingStyle: 'kurta',
    accessories: 'earrings',
  },
  {
    id: 3,
    gender: 'm',
    name: 'Aman Kumar',
    bgColor: '#60A5FA', // Blue studio
    skinColor: '#D89E5B',
    skinShadow: '#B57C3B',
    hairColor: '#262626',
    hairStyle: 'curly-male',
    clothingColor: '#065F46', // Green knit sweater
    clothingStyle: 'sweater',
  },
  {
    id: 4,
    gender: 'f',
    name: 'Neha Kumari',
    bgColor: '#D6C7B2', // Warm beige
    skinColor: '#E8B578',
    skinShadow: '#C89255',
    hairColor: '#1F1B18',
    hairStyle: 'long-wavy-female',
    clothingColor: '#F8FAFC', // White top
    clothingStyle: 'shirt',
  },
  {
    id: 5,
    gender: 'm',
    name: 'Kenji / Rohit Singh',
    bgColor: '#94A3B8',
    skinColor: '#F3C590',
    skinShadow: '#D29F64',
    hairColor: '#171717',
    hairStyle: 'middle-part',
    clothingColor: '#334155', // Plaid
    clothingStyle: 'plaid',
  },
  {
    id: 6,
    gender: 'f',
    name: 'Zoya Parveen',
    bgColor: '#94A3B8',
    skinColor: '#EAB37E',
    skinShadow: '#C79058',
    hairColor: '#1C1917',
    hairStyle: 'hijab',
    clothingColor: '#0F172A',
    clothingStyle: 'shirt',
    accessories: 'hijab',
  },
  {
    id: 7,
    gender: 'm',
    name: 'David / Ankit Kumar',
    bgColor: '#94A3B8',
    skinColor: '#A76935',
    skinShadow: '#844E20',
    hairColor: '#171717',
    hairStyle: 'afro',
    clothingColor: '#3B82F6', // Bright blue t-shirt
    clothingStyle: 'tshirt',
    accessories: 'stubble',
  },

  // ROW 2
  {
    id: 8,
    gender: 'f',
    name: 'Ananya Gupta',
    bgColor: '#94A3B8',
    skinColor: '#E2AC6E',
    skinShadow: '#BF874B',
    hairColor: '#1A1818',
    hairStyle: 'long-wavy-female',
    clothingColor: '#1E3A8A', // Denim
    clothingStyle: 'denim',
    accessories: 'glasses',
  },
  {
    id: 9,
    gender: 'm',
    name: 'Sourabh Keshri',
    bgColor: '#94A3B8',
    skinColor: '#C68642',
    skinShadow: '#A2672B',
    hairColor: '#1C1917',
    hairStyle: 'wavy-male',
    clothingColor: '#0F172A', // Navy shirt
    clothingStyle: 'shirt',
    accessories: 'glasses',
  },
  {
    id: 10,
    gender: 'f',
    name: 'Mei / Tanvi Mathur',
    bgColor: '#FBCFE8', // Light pink
    skinColor: '#F7D0A4',
    skinShadow: '#D4A877',
    hairColor: '#1A1818',
    hairStyle: 'bangs-female',
    clothingColor: '#C084FC', // Lavender sweater
    clothingStyle: 'sweater',
  },
  {
    id: 11,
    gender: 'm',
    name: 'Ayush Kumar',
    bgColor: '#7DD3FC', // Light blue
    skinColor: '#BE7E3B',
    skinShadow: '#9A5E21',
    hairColor: '#171717',
    hairStyle: 'curly-male',
    clothingColor: '#1E293B',
    clothingStyle: 'hoodie',
  },
  {
    id: 12,
    gender: 'f',
    name: 'Kavya Sengupta',
    bgColor: '#93C5FD',
    skinColor: '#E2AC6E',
    skinShadow: '#BF874B',
    hairColor: '#1F1C19',
    hairStyle: 'wavy-halfup',
    clothingColor: '#DBEAFE', // White/blue patterned kurta
    clothingStyle: 'kurta',
    secondaryClothingColor: '#2563EB',
  },
  {
    id: 13,
    gender: 'm',
    name: 'Deepak Tiwari',
    bgColor: '#D6C7B2', // Warm beige
    skinColor: '#E0AC69',
    skinShadow: '#BD8646',
    hairColor: '#1A1818',
    hairStyle: 'wavy-male',
    clothingColor: '#3F6212', // Olive green
    clothingStyle: 'tshirt',
  },
  {
    id: 14,
    gender: 'f',
    name: 'Rhea Mehra',
    bgColor: '#94A3B8',
    skinColor: '#E8B578',
    skinShadow: '#C89255',
    hairColor: '#171717',
    hairStyle: 'long-wavy-female',
    clothingColor: '#991B1B', // Maroon
    clothingStyle: 'shirt',
    accessories: 'earrings',
  },

  // ROW 3
  {
    id: 15,
    gender: 'm',
    name: 'Nikhil Jha',
    bgColor: '#94A3B8',
    skinColor: '#E0AC69',
    skinShadow: '#BD8646',
    hairColor: '#171717',
    hairStyle: 'wavy-male',
    clothingColor: '#F8FAFC', // Crisp white shirt
    clothingStyle: 'shirt',
  },
  {
    id: 16,
    gender: 'f',
    name: 'Isha Roy',
    bgColor: '#94A3B8',
    skinColor: '#F0BA81',
    skinShadow: '#CD975D',
    hairColor: '#1C1917',
    hairStyle: 'bob',
    clothingColor: '#0F172A', // Black top
    clothingStyle: 'shirt',
    accessories: 'earrings',
  },
  {
    id: 17,
    gender: 'm',
    name: 'Prateek Rao',
    bgColor: '#60A5FA', // Sky blue
    skinColor: '#C68642',
    skinShadow: '#A2672B',
    hairColor: '#171717',
    hairStyle: 'curly-male',
    clothingColor: '#60A5FA', // Light blue polo
    clothingStyle: 'polo',
  },
  {
    id: 18,
    gender: 'f',
    name: 'Shreya Paul',
    bgColor: '#D6C7B2',
    skinColor: '#E2AC6E',
    skinShadow: '#BF874B',
    hairColor: '#1F1B18',
    hairStyle: 'long-wavy-female',
    clothingColor: '#4D7C0F', // Olive green
    clothingStyle: 'shirt',
  },
  {
    id: 19,
    gender: 'm',
    name: 'Manish Yadav',
    bgColor: '#94A3B8',
    skinColor: '#E0AC69',
    skinShadow: '#BD8646',
    hairColor: '#1A1818',
    hairStyle: 'middle-part',
    clothingColor: '#0F172A',
    clothingStyle: 'shirt',
  },
  {
    id: 20,
    gender: 'f',
    name: 'Sneha Murmu',
    bgColor: '#D6C7B2',
    skinColor: '#C98D4F',
    skinShadow: '#A86D31',
    hairColor: '#1C1917',
    hairStyle: 'braid-female',
    clothingColor: '#CA8A04', // Yellow kurta
    clothingStyle: 'kurta',
  },
  {
    id: 21,
    gender: 'm',
    name: 'Rohan Dutta',
    bgColor: '#60A5FA',
    skinColor: '#C68642',
    skinShadow: '#A2672B',
    hairColor: '#171717',
    hairStyle: 'curly-male',
    clothingColor: '#881337', // Maroon
    clothingStyle: 'tshirt',
    accessories: 'glasses',
  },

  // ROW 4
  {
    id: 22,
    gender: 'f',
    name: 'Aditi Verma',
    bgColor: '#94A3B8',
    skinColor: '#F7D0A4',
    skinShadow: '#D4A877',
    hairColor: '#1C1917',
    hairStyle: 'long-wavy-female',
    clothingColor: '#0F172A', // Black turtleneck
    clothingStyle: 'turtleneck',
  },
  {
    id: 23,
    gender: 'm',
    name: 'Harpreet Singh / Vivek Burnwal',
    bgColor: '#94A3B8',
    skinColor: '#C68642',
    skinShadow: '#A2672B',
    hairColor: '#171717',
    hairStyle: 'turban',
    clothingColor: '#1E40AF', // Blue plaid shirt
    clothingStyle: 'plaid',
    accessories: 'turban',
  },
  {
    id: 24,
    gender: 'f',
    name: 'Divya Patel',
    bgColor: '#FBCFE8',
    skinColor: '#E8B578',
    skinShadow: '#C89255',
    hairColor: '#1F1B18',
    hairStyle: 'long-wavy-female',
    clothingColor: '#F8FAFC',
    clothingStyle: 'kurta',
  },
  {
    id: 25,
    gender: 'm',
    name: 'Sameer Ansari',
    bgColor: '#D6C7B2',
    skinColor: '#A76935',
    skinShadow: '#844E20',
    hairColor: '#171717',
    hairStyle: 'afro',
    clothingColor: '#F1F5F9', // Cream crewneck
    clothingStyle: 'sweater',
  },
  {
    id: 26,
    gender: 'f',
    name: 'Sakshi Agarwal',
    bgColor: '#D6C7B2',
    skinColor: '#EAB37E',
    skinShadow: '#C79058',
    hairColor: '#1C1917',
    hairStyle: 'bun',
    clothingColor: '#0F172A', // Black hoodie
    clothingStyle: 'hoodie',
  },
  {
    id: 27,
    gender: 'm',
    name: 'Utkarsh Srivastava',
    bgColor: '#60A5FA',
    skinColor: '#E0AC69',
    skinShadow: '#BD8646',
    hairColor: '#171717',
    hairStyle: 'wavy-male',
    clothingColor: '#1D4ED8', // Blue denim shirt
    clothingStyle: 'denim',
  },
  {
    id: 28,
    gender: 'f',
    name: 'Pooja Das',
    bgColor: '#D6C7B2',
    skinColor: '#E2AC6E',
    skinShadow: '#BF874B',
    hairColor: '#1F1B18',
    hairStyle: 'long-wavy-female',
    clothingColor: '#0F172A', // Striped
    clothingStyle: 'shirt',
    accessories: 'glasses',
  },
];

function generateSvg(p: PortraitConfig): string {
  // Dimension 400x480 for portrait aspect ratio
  const width = 400;
  const height = 480;

  let hairSvg = '';
  let clothesSvg = '';
  let accessoriesSvg = '';

  // Clothing rendering
  if (p.clothingStyle === 'hoodie') {
    clothesSvg = `
      <!-- Hoodie -->
      <path d="M 80 480 Q 90 380 150 350 L 175 390 L 225 390 L 250 350 Q 310 380 320 480 Z" fill="${p.clothingColor}" />
      <!-- Hood edge -->
      <path d="M 120 370 Q 200 420 280 370 Q 250 350 200 350 Q 150 350 120 370 Z" fill="#0B132B" opacity="0.4" />
      <!-- Strings -->
      <path d="M 180 390 L 178 450" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
      <path d="M 220 390 L 222 450" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    `;
  } else if (p.clothingStyle === 'sweater') {
    clothesSvg = `
      <path d="M 80 480 Q 90 370 145 350 Q 200 370 255 350 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <!-- Collar -->
      <path d="M 145 350 Q 200 380 255 350 Q 240 335 200 335 Q 160 335 145 350 Z" fill="#000000" opacity="0.25" />
    `;
  } else if (p.clothingStyle === 'kurta') {
    clothesSvg = `
      <path d="M 80 480 Q 90 370 140 345 L 200 370 L 260 345 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <!-- Kurta neckline & placket -->
      <path d="M 185 365 L 200 390 L 215 365 L 200 450 Z" fill="${p.secondaryClothingColor || '#FFFFFF'}" opacity="0.8" />
      <line x1="200" y1="390" x2="200" y2="450" stroke="#000000" stroke-width="2" opacity="0.3" />
    `;
  } else if (p.clothingStyle === 'plaid') {
    clothesSvg = `
      <path d="M 80 480 Q 90 370 140 345 Q 200 365 260 345 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <!-- White t-shirt underneath -->
      <polygon points="160,345 200,385 240,345" fill="#FFFFFF" />
      <!-- Plaid stripes -->
      <line x1="120" y1="360" x2="120" y2="480" stroke="#FFFFFF" stroke-width="3" opacity="0.4" />
      <line x1="280" y1="360" x2="280" y2="480" stroke="#FFFFFF" stroke-width="3" opacity="0.4" />
      <line x1="90" y1="420" x2="310" y2="420" stroke="#FFFFFF" stroke-width="3" opacity="0.4" />
    `;
  } else if (p.clothingStyle === 'polo') {
    clothesSvg = `
      <path d="M 80 480 Q 90 370 140 345 L 200 365 L 260 345 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <polygon points="150,345 200,375 190,430 170,430 140,350" fill="${p.clothingColor}" filter="brightness(0.9)" />
      <polygon points="250,345 200,375 210,430 230,430 260,350" fill="${p.clothingColor}" filter="brightness(0.9)" />
    `;
  } else if (p.clothingStyle === 'turtleneck') {
    clothesSvg = `
      <path d="M 80 480 Q 90 370 135 340 L 265 340 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <!-- High neck band -->
      <rect x="150" y="300" width="100" height="45" rx="10" fill="${p.clothingColor}" filter="brightness(1.1)" />
    `;
  } else {
    // Default t-shirt / shirt
    clothesSvg = `
      <path d="M 80 480 Q 90 370 140 345 Q 200 375 260 345 Q 310 370 320 480 Z" fill="${p.clothingColor}" />
      <!-- Collar / V-neck -->
      <path d="M 160 350 Q 200 380 240 350" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.3" />
    `;
  }

  // Accessories
  if (p.accessories === 'glasses') {
    accessoriesSvg += `
      <!-- Eyeglasses -->
      <rect x="135" y="195" width="46" height="32" rx="8" fill="none" stroke="#111827" stroke-width="4.5" />
      <rect x="219" y="195" width="46" height="32" rx="8" fill="none" stroke="#111827" stroke-width="4.5" />
      <path d="M 181 210 Q 200 205 219 210" fill="none" stroke="#111827" stroke-width="4" />
      <line x1="135" y1="210" x2="115" y2="202" stroke="#111827" stroke-width="3.5" />
      <line x1="265" y1="210" x2="285" y2="202" stroke="#111827" stroke-width="3.5" />
      <!-- Glass reflection glint -->
      <line x1="145" y1="202" x2="160" y2="218" stroke="#FFFFFF" stroke-width="2" opacity="0.6" stroke-linecap="round" />
      <line x1="229" y1="202" x2="244" y2="218" stroke="#FFFFFF" stroke-width="2" opacity="0.6" stroke-linecap="round" />
    `;
  }

  if (p.accessories === 'earrings') {
    accessoriesSvg += `
      <!-- Gold Earrings -->
      <circle cx="118" cy="245" r="4" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
      <circle cx="282" cy="245" r="4" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
    `;
  }

  if (p.accessories === 'turban') {
    hairSvg = `
      <!-- Royal Blue Turban (Pagri) -->
      <path d="M 105 180 Q 95 85 200 70 Q 305 85 295 180 Q 280 120 200 115 Q 120 120 105 180 Z" fill="#1D4ED8" />
      <path d="M 115 150 Q 200 60 285 150 Q 250 105 200 100 Q 150 105 115 150 Z" fill="#2563EB" />
      <path d="M 130 120 Q 200 80 270 120" stroke="#1E40AF" stroke-width="4" fill="none" />
      <!-- Turban center peak -->
      <path d="M 185 110 Q 200 85 215 110 Z" fill="#3B82F6" />
    `;
  } else if (p.accessories === 'hijab') {
    hairSvg = `
      <!-- Hijab covering hair & neck -->
      <path d="M 100 240 Q 95 100 200 85 Q 305 100 300 240 Q 315 350 200 360 Q 85 350 100 240 Z" fill="#0F172A" />
      <!-- Inner fold -->
      <path d="M 125 155 Q 200 135 275 155 Q 285 240 200 295 Q 115 240 125 155 Z" fill="${p.skinColor}" />
    `;
  } else if (p.hairStyle === 'long-wavy-female') {
    hairSvg = `
      <!-- Hair Back Layer -->
      <path d="M 100 200 Q 90 340 110 400 Q 130 350 120 260 Z" fill="${p.hairColor}" />
      <path d="M 300 200 Q 310 340 290 400 Q 270 350 280 260 Z" fill="${p.hairColor}" />
      <!-- Hair Top Crown & Waves -->
      <path d="M 105 200 Q 95 85 200 80 Q 305 85 295 200 Q 270 110 200 115 Q 130 110 105 200 Z" fill="${p.hairColor}" />
      <path d="M 105 180 Q 120 280 135 340 Q 120 300 115 230 Z" fill="${p.hairColor}" />
      <path d="M 295 180 Q 280 280 265 340 Q 280 300 285 230 Z" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'wavy-male') {
    hairSvg = `
      <path d="M 110 180 Q 100 80 200 75 Q 300 80 290 180 Q 270 110 200 115 Q 130 110 110 180 Z" fill="${p.hairColor}" />
      <path d="M 140 105 Q 180 85 230 100 Q 190 95 140 105 Z" fill="#383232" opacity="0.6" />
    `;
  } else if (p.hairStyle === 'curly-male') {
    hairSvg = `
      <!-- Curly textured crown -->
      <path d="M 105 180 Q 95 70 200 68 Q 305 70 295 180 Q 275 105 200 110 Q 125 105 105 180 Z" fill="${p.hairColor}" />
      <circle cx="130" cy="110" r="14" fill="${p.hairColor}" />
      <circle cx="160" cy="85" r="15" fill="${p.hairColor}" />
      <circle cx="200" cy="78" r="16" fill="${p.hairColor}" />
      <circle cx="240" cy="85" r="15" fill="${p.hairColor}" />
      <circle cx="270" cy="110" r="14" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'middle-part') {
    hairSvg = `
      <path d="M 110 190 Q 105 85 195 80 L 195 130 Q 155 125 110 190 Z" fill="${p.hairColor}" />
      <path d="M 290 190 Q 295 85 205 80 L 205 130 Q 245 125 290 190 Z" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'afro') {
    hairSvg = `
      <ellipse cx="200" cy="140" rx="95" ry="85" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'bangs-female') {
    hairSvg = `
      <path d="M 100 200 Q 90 350 115 410 Q 125 330 120 220 Z" fill="${p.hairColor}" />
      <path d="M 300 200 Q 310 350 285 410 Q 275 330 280 220 Z" fill="${p.hairColor}" />
      <path d="M 110 190 Q 100 85 200 80 Q 300 85 290 190 Z" fill="${p.hairColor}" />
      <!-- Bangs fringe -->
      <path d="M 135 155 Q 200 165 265 155 L 265 135 Q 200 135 135 135 Z" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'bob') {
    hairSvg = `
      <path d="M 105 180 Q 95 85 200 80 Q 305 85 295 180 Q 305 280 280 300 Q 260 260 280 180 Q 200 120 120 180 Q 140 260 120 300 Q 95 280 105 180 Z" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'bun') {
    hairSvg = `
      <!-- Top Bun -->
      <ellipse cx="200" cy="70" rx="35" ry="30" fill="${p.hairColor}" />
      <!-- Slick hair to bun -->
      <path d="M 110 190 Q 105 90 200 90 Q 295 90 290 190 Q 270 120 200 125 Q 130 120 110 190 Z" fill="${p.hairColor}" />
    `;
  } else if (p.hairStyle === 'braid-female') {
    hairSvg = `
      <path d="M 110 190 Q 100 85 200 80 Q 300 85 290 190 Q 270 120 200 125 Q 130 120 110 190 Z" fill="${p.hairColor}" />
      <!-- Side braid coming down shoulder -->
      <path d="M 270 230 Q 285 320 270 420 Q 255 420 255 320 Z" fill="${p.hairColor}" />
    `;
  } else {
    hairSvg = `
      <path d="M 110 180 Q 100 80 200 75 Q 300 80 290 180 Q 270 110 200 115 Q 130 110 110 180 Z" fill="${p.hairColor}" />
    `;
  }

  // Facial features: eyes, nose, mouth, smile, beard/stubble
  let facialDetails = `
    <!-- Neck -->
    <path d="M 165 280 L 165 360 L 235 360 L 235 280 Z" fill="${p.skinShadow}" />
    <path d="M 170 280 L 170 360 L 230 360 L 230 280 Z" fill="${p.skinColor}" />

    <!-- Head / Face Oval -->
    <path d="M 120 200 Q 120 305 200 310 Q 280 305 280 200 Q 280 130 200 130 Q 120 130 120 200 Z" fill="${p.skinColor}" />

    <!-- Ears -->
    <ellipse cx="118" cy="210" rx="9" ry="16" fill="${p.skinColor}" />
    <ellipse cx="119" cy="210" rx="5" ry="10" fill="${p.skinShadow}" opacity="0.6" />
    <ellipse cx="282" cy="210" rx="9" ry="16" fill="${p.skinColor}" />
    <ellipse cx="281" cy="210" rx="5" ry="10" fill="${p.skinShadow}" opacity="0.6" />

    <!-- Eyebrows -->
    <path d="M 145 185 Q 165 178 182 184" stroke="${p.hairColor}" stroke-width="${p.gender === 'm' ? '4' : '3'}" stroke-linecap="round" fill="none" />
    <path d="M 218 184 Q 235 178 255 185" stroke="${p.hairColor}" stroke-width="${p.gender === 'm' ? '4' : '3'}" stroke-linecap="round" fill="none" />

    <!-- Eyes (Expressive, warm) -->
    <ellipse cx="163" cy="204" rx="10" ry="7" fill="#FFFFFF" />
    <circle cx="164" cy="204" r="5" fill="#2E1B0F" />
    <circle cx="166" cy="202" r="1.8" fill="#FFFFFF" />

    <ellipse cx="237" cy="204" rx="10" ry="7" fill="#FFFFFF" />
    <circle cx="236" cy="204" r="5" fill="#2E1B0F" />
    <circle cx="238" cy="202" r="1.8" fill="#FFFFFF" />

    <!-- Upper eyelid lines -->
    <path d="M 152 201 Q 163 196 174 201" stroke="#1F1B18" stroke-width="2" fill="none" />
    <path d="M 226 201 Q 237 196 248 201" stroke="#1F1B18" stroke-width="2" fill="none" />

    <!-- Nose -->
    <path d="M 198 200 L 195 235 Q 200 240 205 235" stroke="${p.skinShadow}" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <!-- Nostril soft hints -->
    <ellipse cx="192" cy="236" rx="2.5" ry="1.5" fill="${p.skinShadow}" opacity="0.6" />
    <ellipse cx="208" cy="236" rx="2.5" ry="1.5" fill="${p.skinShadow}" opacity="0.6" />

    <!-- Mouth / Smile -->
    <path d="M 178 262 Q 200 280 222 262" stroke="#991B1B" stroke-width="2" fill="#FFFFFF" />
    <path d="M 178 262 Q 200 274 222 262" fill="#E11D48" opacity="0.7" />
    <path d="M 183 263 Q 200 269 217 263" fill="#FFFFFF" />
  `;

  if (p.accessories === 'stubble' || (p.gender === 'm' && p.id % 2 === 1)) {
    facialDetails += `
      <!-- Stubble / Beard outline -->
      <path d="M 150 250 Q 155 295 200 300 Q 245 295 250 250 Q 235 285 200 288 Q 165 285 150 250 Z" fill="#262626" opacity="0.22" />
    `;
  }

  if (p.name.includes('Sourabh') || p.name.includes('Rohan') || p.name.includes('Vivek') || p.name.includes('Harpreet')) {
    facialDetails += `
      <!-- Full neat trimmed beard -->
      <path d="M 135 220 Q 140 295 200 305 Q 260 295 265 220 Q 250 280 200 285 Q 150 280 135 220 Z" fill="#1C1917" opacity="0.75" />
      <path d="M 180 252 Q 200 248 220 252" stroke="#1C1917" stroke-width="4" stroke-linecap="round" fill="none" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p.bgColor}" stop-opacity="1" />
      <stop offset="100%" stop-color="${p.bgColor}" stop-opacity="0.85" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Studio Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Lighting Vignette -->
  <radialGradient id="vignette" cx="50%" cy="40%" r="55%">
    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.2" />
    <stop offset="100%" stop-color="#000000" stop-opacity="0.2" />
  </radialGradient>
  <rect width="${width}" height="${height}" fill="url(#vignette)" />

  <g filter="url(#shadow)">
    ${clothesSvg}
    ${facialDetails}
    ${hairSvg}
    ${accessoriesSvg}
  </g>
</svg>`;
}

for (const portrait of portraits) {
  const svgContent = generateSvg(portrait);
  const filePath = path.join(outputDir, `portrait-${portrait.id}.svg`);
  fs.writeFileSync(filePath, svgContent, 'utf8');
}

console.log(`Generated ${portraits.length} student portrait SVGs successfully in ${outputDir}`);
