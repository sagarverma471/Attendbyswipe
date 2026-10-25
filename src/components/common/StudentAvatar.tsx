import React, { useState, useMemo } from 'react';

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string;
  rollNo?: string;
  studentId?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'deck';
  alt?: string;
  priority?: boolean;
}

export function getLocalPortraitUrl(rollNo?: string, name?: string, studentId?: string): string {
  if (rollNo && rollNo.startsWith('26100')) {
    return `/cyber-students/${rollNo}.jpg`;
  }
  if (studentId && studentId.startsWith('26100')) {
    return `/cyber-students/${studentId}.jpg`;
  }
  if (studentId && (studentId.includes('bee') || studentId.includes('ST2'))) {
    const num = parseInt((rollNo || studentId).replace(/\D/g, ''), 10) || 1;
    const safeNum = Math.min(Math.max(num, 1), 72);
    return `/student-portraits/bee/bee_${String(safeNum).padStart(2, '0')}.jpg`;
  }
  if (studentId && (studentId.includes('phy') || studentId.includes('ST3'))) {
    const num = parseInt((rollNo || studentId).replace(/\D/g, ''), 10) || 1;
    const safeNum = Math.min(Math.max(num, 1), 60);
    return `/student-portraits/physics/phy_${String(safeNum).padStart(2, '0')}.jpg`;
  }
  const num = parseInt((rollNo || '').replace(/\D/g, ''), 10);
  if (!isNaN(num) && num >= 1 && num <= 72) {
    return `/student-portraits/student_${num - 1}.jpg`;
  }
  let hash = 0;
  const str = (rollNo || '') + (name || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 72;
  return `/student-portraits/student_${index}.jpg`;
}

// Initials extractor
function getInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// Deterministic vibrant gradient pairs for initials fallback
const GRADIENTS = [
  'from-violet-600 to-indigo-600',
  'from-blue-600 to-cyan-600',
  'from-emerald-600 to-teal-600',
  'from-rose-600 to-pink-600',
  'from-amber-600 to-orange-600',
  'from-fuchsia-600 to-purple-600',
];

export const StudentAvatar: React.FC<StudentAvatarProps> = React.memo(({
  name,
  avatarUrl,
  rollNo,
  studentId,
  className = '',
  size = 'md',
  alt,
  priority = false,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Reset load failures whenever the student identity or avatar changes
  React.useEffect(() => {
    setLoadFailed(false);
    setFallbackFailed(false);
  }, [avatarUrl, rollNo, name]);

  // Determine local SVG portrait fallback URL
  const localPortrait = useMemo(() => {
    return getLocalPortraitUrl(rollNo, name, studentId);
  }, [rollNo, name, studentId]);

  // Primary URL: If avatarUrl is present and NOT failed and NOT an svg placeholder, use it; otherwise local portrait
  const effectiveSrc = useMemo(() => {
    if (!avatarUrl || avatarUrl.endsWith('.svg') || loadFailed) {
      return localPortrait;
    }
    return avatarUrl;
  }, [avatarUrl, loadFailed, localPortrait]);

  const initials = useMemo(() => getInitials(name), [name]);

  const gradientClass = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash += name.charCodeAt(i);
    }
    return GRADIENTS[hash % GRADIENTS.length];
  }, [name]);

  // Size styling maps
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-full',
    sm: 'w-8 h-8 text-xs rounded-full',
    md: 'w-10 h-10 text-sm rounded-full',
    lg: 'w-14 h-14 text-base rounded-xl',
    xl: 'w-20 h-20 text-xl rounded-2xl',
    deck: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-2xl sm:text-3xl rounded-2xl',
  }[size];

  if (fallbackFailed) {
    // Elegant initials with gradient
    return (
      <div
        className={`flex items-center justify-center font-bold font-mono text-white bg-gradient-to-br ${gradientClass} select-none shadow-md ${sizeClasses} ${className}`}
        title={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-slate-800 shrink-0 ${sizeClasses} ${className}`}
    >
      <img
        src={effectiveSrc}
        alt={alt || name}
        draggable={false}
        className="w-full h-full object-cover select-none pointer-events-none transition-opacity duration-200"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => {
          if (!loadFailed && avatarUrl && effectiveSrc !== localPortrait) {
            // First failure: switch to local portrait
            setLoadFailed(true);
          } else {
            // Second failure: switch to initials
            setFallbackFailed(true);
          }
        }}
      />
    </div>
  );
});
