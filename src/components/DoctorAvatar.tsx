import React, { useState } from 'react';
import { DoctorIllustration } from './DoctorIllustration';

interface DoctorAvatarProps {
  photo?: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
  theme?: 'light' | 'dark' | 'card';
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  photo,
  name,
  className = 'w-20 h-24 sm:w-28 sm:h-32 rounded-2xl',
  imgClassName = 'w-full h-full object-cover object-top',
  theme = 'light'
}) => {
  const [imgError, setImgError] = useState(false);
  const hasValidPhoto = Boolean(photo && photo.trim() !== '' && !imgError);

  // Compute a simple hash from doctor name to vary fallback theme accents
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const themeVariants: ('light' | 'dark' | 'card' | 'gold')[] = ['light', 'dark', 'card', 'gold'];
  const fallbackTheme = themeVariants[nameHash % themeVariants.length];

  return (
    <div className={`relative overflow-hidden shrink-0 ${className}`}>
      {hasValidPhoto ? (
        <img
          src={photo!}
          alt={name}
          onError={() => setImgError(true)}
          className={imgClassName}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-end justify-center overflow-hidden p-1 pt-2 ${
          theme === 'dark' ? 'bg-[#022122]' : 'bg-[#FAF7EE]'
        }`}>
          <DoctorIllustration
            theme={fallbackTheme}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};
