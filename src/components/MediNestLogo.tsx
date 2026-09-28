import React from 'react';

interface MediNestLogoProps {
  className?: string;
  variant?: 'gold' | 'dark' | 'white' | 'blue';
}

export const MediNestLogo: React.FC<MediNestLogoProps> = ({
  className = 'w-9 h-9',
  variant = 'gold'
}) => {
  const colorMap = {
    gold: '#FAE58D',
    dark: '#032F31',
    white: '#FFFFFF',
    blue: '#3B5998'
  };

  const fill = colorMap[variant] || '#FAE58D';

  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MediNest Emblem"
    >
      <g>
        {/* Central Staff Head */}
        <ellipse cx="250" cy="110" rx="44" ry="48" />

        {/* Central Staff Pillar */}
        <path d="M236 150 L264 150 L256 420 L244 420 Z" />

        {/* Left Upper 'M' Arch */}
        <path d="M110 180 C125 150 160 130 195 190 C220 232 250 280 250 280 C240 270 215 220 180 185 C150 155 125 165 110 180 Z" />

        {/* Right Upper 'M' Arch */}
        <path d="M390 180 C375 150 340 130 305 190 C280 232 250 280 250 280 C260 270 285 220 320 185 C350 155 375 165 390 180 Z" />

        {/* Left Outer 'M' Leg */}
        <path d="M85 395 C110 320 130 250 145 200 C155 235 145 300 120 380 C110 410 95 415 85 395 Z" />

        {/* Right Outer 'M' Leg */}
        <path d="M415 395 C390 320 370 250 355 200 C345 235 355 300 380 380 C390 410 405 415 415 395 Z" />

        {/* Serpentine Caduceus Coil 1 */}
        <path d="M175 250 C210 275 260 305 295 325 C330 345 345 370 330 395 C315 420 280 430 255 425 C280 415 295 395 285 375 C270 345 225 315 195 295 C170 275 160 260 175 250 Z" />

        {/* Serpentine Caduceus Coil 2 */}
        <path d="M325 250 C290 275 240 305 205 325 C170 345 155 370 170 395 C185 420 220 430 245 425 C220 415 205 395 215 375 C230 345 275 315 305 295 C330 275 340 260 325 250 Z" />

        {/* Staff Base Accents */}
        <path d="M236 410 C234 430 225 445 215 448 C225 435 235 425 242 410 Z" />
        <path d="M264 410 C266 430 275 445 285 448 C275 435 265 425 258 410 Z" />
        <path d="M246 415 L254 415 L250 452 Z" />
      </g>
    </svg>
  );
};
