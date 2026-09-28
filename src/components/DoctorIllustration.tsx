import React from 'react';

interface DoctorIllustrationProps {
  className?: string;
  theme?: 'dark' | 'light' | 'gold' | 'card';
  badgeLabel?: string;
}

export const DoctorIllustration: React.FC<DoctorIllustrationProps> = ({
  className = 'w-full h-full',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const strokeColor = isDark ? '#EAE5D8' : '#032F31';
  const bodyFill = isDark ? '#052A2C' : '#FFFFFF';
  const tieFill = isDark ? '#FAE58D' : '#032F31';
  const accentFill = isDark ? '#114A4E' : '#F4EFE2';

  return (
    <svg
      viewBox="0 0 500 550"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Doctor Illustration"
    >
      <g stroke={strokeColor} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {/* Head Silhouette & Hair */}
        <path
          d="M205 140 C195 125 195 95 210 75 C228 50 265 42 300 48 C330 55 352 75 355 102 C356 120 350 135 342 148"
          fill={bodyFill}
        />
        {/* Hair parting lines */}
        <path d="M215 75 C232 65 268 65 288 80 C308 92 325 80 345 85" fill="none" strokeWidth="6" />
        <path d="M200 95 C210 88 222 84 238 88" fill="none" strokeWidth="5" />

        {/* Ears */}
        <path d="M198 135 C188 138 185 158 195 170 C200 176 206 176 210 170" fill={bodyFill} />
        <path d="M352 135 C362 138 365 158 355 170 C350 176 344 176 340 170" fill={bodyFill} />

        {/* Jaw & Chin */}
        <path
          d="M205 138 C208 175 220 205 235 220 C252 236 298 236 315 220 C330 205 342 175 345 138"
          fill={bodyFill}
        />

        {/* Neck */}
        <path d="M232 220 L228 252" fill="none" />
        <path d="M318 220 L322 252" fill="none" />

        {/* Shirt Collar */}
        <path d="M225 252 L256 295 L275 260 L294 295 L325 252" fill={accentFill} />

        {/* Tie Knot */}
        <path d="M265 265 L285 265 L281 288 L275 292 L269 288 Z" fill={tieFill} stroke={tieFill} />
        {/* Tie Length */}
        <path d="M269 292 L262 380 L275 400 L288 380 L281 292 Z" fill={tieFill} stroke={tieFill} />

        {/* Left Lapel */}
        <path d="M224 252 L160 310 L200 365 L252 435" fill={bodyFill} />
        <path d="M160 310 L205 318" fill="none" />

        {/* Right Lapel */}
        <path d="M326 252 L390 310 L350 365 L298 435" fill={bodyFill} />
        <path d="M390 310 L345 318" fill="none" />

        {/* Coat Outer Body & Shoulders */}
        <path
          d="M224 252 C180 260 138 280 110 322 C82 365 72 425 68 490 C66 515 70 540 75 550"
          fill={bodyFill}
        />
        <path
          d="M326 252 C370 260 412 280 440 322 C468 365 478 425 482 490 C484 515 480 540 475 550"
          fill={bodyFill}
        />

        {/* Coat Center Seam */}
        <path d="M275 435 L275 550" fill="none" strokeWidth="5" />

        {/* Stethoscope Left Side (Tubing + Binaural + Chestpiece) */}
        <path
          d="M205 245 C182 268 170 310 178 355 C185 390 200 420 215 420 C225 420 230 395 225 365 C220 338 208 322 195 318"
          fill="none"
          strokeWidth="8"
        />
        <circle cx="218" cy="355" r="16" fill={accentFill} strokeWidth="6" />
        <circle cx="218" cy="355" r="7" fill={strokeColor} strokeWidth="2" />

        {/* Stethoscope Right Side (Tubing + Earpiece Bell) */}
        <path
          d="M345 245 C365 268 375 305 370 345 C364 378 358 395 358 412"
          fill="none"
          strokeWidth="8"
        />
        <ellipse cx="358" cy="422" rx="16" ry="15" fill={accentFill} strokeWidth="6" />
        <circle cx="358" cy="422" r="7" fill={strokeColor} strokeWidth="2" />

        {/* Folded Arms & Hands */}
        <path
          d="M102 460 C125 490 168 525 240 525 C275 525 320 512 355 485"
          fill={bodyFill}
        />
        <path
          d="M448 460 C425 490 382 525 310 525"
          fill={bodyFill}
        />

        {/* Right Hand resting on left arm */}
        <path
          d="M365 465 C388 465 410 472 435 492 C438 502 430 512 415 512 C392 512 370 498 355 485"
          fill={accentFill}
        />
        <path d="M375 480 C395 480 415 485 428 498" fill="none" strokeWidth="5" />
        <path d="M385 495 C400 495 415 500 422 508" fill="none" strokeWidth="5" />

        {/* Left hand sleeve cuff lines */}
        <path d="M185 505 C170 520 155 535 150 550" fill="none" strokeWidth="5" />
      </g>
    </svg>
  );
};
