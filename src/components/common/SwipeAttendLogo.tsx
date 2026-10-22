import React from 'react';

interface SwipeAttendLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'glyph' | 'squircle' | 'full';
  showText?: boolean;
  subtext?: string;
  onClick?: () => void;
}

/**
 * Glossy SwipeAttend 'S' Logo Component
 * High-fidelity vector recreation of the glossy 3D ribbon S mark with specular highlights,
 * vibrant violet-indigo-cyan gradients, and glassmorphic depth.
 */
export const SwipeAttendLogo: React.FC<SwipeAttendLogoProps> = ({
  className = '',
  size = 36,
  variant = 'squircle',
  showText = false,
  subtext,
  onClick,
}) => {
  const isNumeric = typeof size === 'number';
  const dimensionStyle = isNumeric ? { width: size, height: size } : {};

  // Pure Glyph SVG
  const GlyphSVG = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full select-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Main Ribbon Gradient 1: Top loop (Violet to Electric Blue) */}
        <linearGradient id="sa-grad-top" x1="15%" y1="10%" x2="85%" y2="55%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="25%" stopColor="#A855F7" />
          <stop offset="60%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Main Ribbon Gradient 2: Bottom loop & Swipe fold (Electric Blue to Cyan/Teal) */}
        <linearGradient id="sa-grad-bottom" x1="20%" y1="45%" x2="90%" y2="95%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="40%" stopColor="#3B82F6" />
          <stop offset="75%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>

        {/* Gloss Specular Highlight 1 (Top arch) */}
        <linearGradient id="sa-gloss-top" x1="20%" y1="5%" x2="50%" y2="40%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#E9D5FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>

        {/* Gloss Specular Highlight 2 (Bottom arch crest) */}
        <linearGradient id="sa-gloss-bottom" x1="45%" y1="65%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#A5F3FC" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </linearGradient>

        {/* Center Twist Shadow for 3D depth */}
        <linearGradient id="sa-depth-shadow" x1="30%" y1="45%" x2="70%" y2="55%">
          <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.65" />
          <stop offset="60%" stopColor="#0F172A" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#312E81" stopOpacity="0" />
        </linearGradient>

        {/* Glass Sheen Arc */}
        <linearGradient id="sa-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Ambient Neon Glow Filter */}
        <filter id="sa-neon-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Soft Drop Shadow for Ribbon */}
        <filter id="sa-ribbon-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Background Ambient Glow Halo */}
      <circle cx="100" cy="100" r="68" fill="#7C3AED" opacity="0.22" filter="url(#sa-neon-glow)" />
      <circle cx="115" cy="120" r="50" fill="#06B6D4" opacity="0.18" filter="url(#sa-neon-glow)" />

      {/* Main Stylized Glossy S Group */}
      <g filter="url(#sa-ribbon-shadow)">
        {/* Bottom Loop / Tail of the 'S' Ribbon */}
        <path
          d="M 105 102
             C 125 110, 158 122, 158 148
             C 158 172, 134 186, 102 186
             C 66 186, 44 168, 42 144
             C 42 136, 48 132, 56 132
             C 64 132, 69 137, 72 144
             C 77 157, 88 166, 103 166
             C 121 166, 134 156, 134 144
             C 134 130, 114 122, 94 112
             C 86 108, 80 104, 76 98
             Z"
          fill="url(#sa-grad-bottom)"
        />

        {/* Top Loop / Head of the 'S' Ribbon */}
        <path
          d="M 96 98
             C 74 90, 42 78, 42 52
             C 42 28, 66 14, 98 14
             C 134 14, 156 32, 158 56
             C 158 64, 152 68, 144 68
             C 136 68, 131 63, 128 56
             C 123 43, 112 34, 97 34
             C 79 34, 66 44, 66 56
             C 66 70, 86 78, 106 88
             C 114 92, 120 96, 124 102
             Z"
          fill="url(#sa-grad-top)"
        />

        {/* Central Connecting Sweep (The dynamic swipe fold crossing the waist) */}
        <path
          d="M 66 56
             C 66 72, 88 82, 108 92
             C 128 102, 152 114, 152 138
             C 152 148, 146 156, 136 160
             C 128 146, 120 134, 104 124
             C 84 112, 66 100, 66 74
             Z"
          fill="url(#sa-grad-top)"
          opacity="0.9"
        />

        {/* Depth Shadow in the inner fold waist */}
        <path
          d="M 88 94
             C 98 99, 110 105, 120 112
             C 110 114, 98 110, 88 104
             Z"
          fill="url(#sa-depth-shadow)"
        />

        {/* Gloss Overlay 1: Top Arch Specular Reflection */}
        <path
          d="M 98 18
             C 128 18, 146 32, 149 52
             C 142 42, 126 34, 102 34
             C 78 34, 66 44, 66 56
             C 66 52, 70 38, 98 18
             Z"
          fill="url(#sa-gloss-top)"
        />

        {/* Gloss Overlay 2: Top Arch Bright Edge Rim */}
        <path
          d="M 75 22
             C 85 16, 95 15, 110 16
             C 125 18, 142 26, 150 40"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
          fill="none"
        />

        {/* Gloss Overlay 3: Bottom Arch Specular Reflection */}
        <path
          d="M 102 182
             C 72 182, 54 168, 51 148
             C 58 158, 74 166, 98 166
             C 122 166, 134 156, 134 144
             C 134 148, 130 162, 102 182
             Z"
          fill="url(#sa-gloss-bottom)"
        />

        {/* Gloss Overlay 4: Bottom Arch Bright Rim */}
        <path
          d="M 125 178
             C 115 184, 105 185, 90 184
             C 75 182, 58 174, 50 160"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
          fill="none"
        />

        {/* Central Glossy Sheen Streak across the S body */}
        <ellipse
          cx="100"
          cy="92"
          rx="18"
          ry="38"
          transform="rotate(-28 100 92)"
          fill="url(#sa-sheen)"
        />

        {/* Sparkle Accent Dot on the S apex */}
        <circle cx="152" cy="46" r="3" fill="#FFFFFF" opacity="0.9" filter="url(#sa-neon-glow)" />
        <circle cx="48" cy="154" r="2.5" fill="#A5F3FC" opacity="0.8" filter="url(#sa-neon-glow)" />
      </g>
    </svg>
  );

  // Squircle Container for Navbar, Buttons, App Icon Cards
  const SquircleLogo = (
    <div
      onClick={onClick}
      style={dimensionStyle}
      className={`relative rounded-2xl bg-gradient-to-br from-[#13192B] via-[#0E1322] to-[#0A0D18] p-1.5 border border-white/15 shadow-lg shadow-violet-950/40 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:border-violet-500/40 shrink-0 ${className}`}
    >
      {/* Glassmorphism Inner Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
      <div className="absolute -top-6 -left-6 w-16 h-16 bg-violet-500/20 rounded-full blur-lg pointer-events-none" />
      <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-cyan-500/15 rounded-full blur-lg pointer-events-none" />

      {/* Centered S Glyph */}
      <div className="relative w-full h-full flex items-center justify-center">
        {GlyphSVG}
      </div>
    </div>
  );

  if (variant === 'glyph') {
    return (
      <div style={dimensionStyle} className={`shrink-0 ${className}`} onClick={onClick}>
        {GlyphSVG}
      </div>
    );
  }

  if (showText || variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none ${className}`}
      >
        {SquircleLogo}
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans'] whitespace-nowrap">
              Swipe<span className="text-violet-400">Attend</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
              BIT Sindri
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block tracking-wide">
            {subtext || 'Attendance. Just Swipe.'}
          </p>
        </div>
      </div>
    );
  }

  return SquircleLogo;
};
