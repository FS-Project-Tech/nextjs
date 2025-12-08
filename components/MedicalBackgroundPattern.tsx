"use client";

export default function MedicalBackgroundPattern() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Pattern definition for seamless repeat */}
          <pattern
            id="medicalPattern"
            x="0"
            y="0"
            width="400"
            height="400"
            patternUnits="userSpaceOnUse"
          >
            {/* Background gradient */}
            <rect width="400" height="400" fill="url(#bgGradient)" />
            
            {/* Gradient definitions */}
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdfa" stopOpacity="1" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f0fdfa" stopOpacity="1" />
            </linearGradient>
            
            <linearGradient id="iconGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b2f5ea" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.15" />
            </linearGradient>
            
            <linearGradient id="iconGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.12" />
            </linearGradient>

            {/* Stethoscope - top left */}
            <g transform="translate(50, 80) rotate(-15)" opacity="0.4">
              <path
                d="M0,20 Q0,10 10,10 L30,10 Q40,10 40,20 L40,35 Q40,45 30,45 L10,45 Q0,45 0,35 Z"
                fill="url(#iconGradient1)"
                stroke="#7dd3fc"
                strokeWidth="1.5"
              />
              <circle cx="20" cy="27" r="3" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
              <path d="M40,27 L50,27 M50,27 L55,22" stroke="#7dd3fc" strokeWidth="1.5" fill="none" />
            </g>

            {/* Syringe - center left */}
            <g transform="translate(100, 200) rotate(10)" opacity="0.35">
              <rect x="0" y="5" width="8" height="25" rx="2" fill="url(#iconGradient2)" stroke="#a7f3d0" strokeWidth="1.5" />
              <rect x="2" y="7" width="4" height="20" fill="#b2f5ea" opacity="0.3" />
              <path d="M4,0 L4,5 M2,2 L6,2" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />
              <path d="M4,30 L4,35 M2,33 L6,33" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />
            </g>

            {/* Pill - top center */}
            <g transform="translate(200, 60) rotate(-5)" opacity="0.3">
              <rect x="0" y="8" width="20" height="8" rx="4" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <line x1="10" y1="12" x2="10" y2="12" stroke="#7dd3fc" strokeWidth="1" />
            </g>

            {/* First Aid Box - top right */}
            <g transform="translate(300, 50) rotate(8)" opacity="0.4">
              <rect x="0" y="0" width="35" height="30" rx="3" fill="url(#iconGradient2)" stroke="#a7f3d0" strokeWidth="1.5" />
              <rect x="5" y="5" width="25" height="20" rx="2" fill="none" stroke="#a7f3d0" strokeWidth="1.5" />
              <line x1="17.5" y1="5" x2="17.5" y2="25" stroke="#a7f3d0" strokeWidth="1.5" />
              <line x1="5" y1="15" x2="30" y2="15" stroke="#a7f3d0" strokeWidth="1.5" />
            </g>

            {/* Thermometer - center */}
            <g transform="translate(180, 180) rotate(-12)" opacity="0.35">
              <rect x="8" y="0" width="4" height="30" rx="2" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <circle cx="10" cy="25" r="4" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <path d="M10,5 L10,20" stroke="#7dd3fc" strokeWidth="1" opacity="0.5" />
            </g>

            {/* Bandage - bottom left */}
            <g transform="translate(60, 300) rotate(15)" opacity="0.3">
              <rect x="0" y="10" width="40" height="8" rx="4" fill="url(#iconGradient2)" stroke="#a7f3d0" strokeWidth="1.5" />
              <line x1="10" y1="14" x2="30" y2="14" stroke="#a7f3d0" strokeWidth="1" />
              <circle cx="20" cy="14" r="3" fill="none" stroke="#a7f3d0" strokeWidth="1" />
            </g>

            {/* Gloves - bottom center */}
            <g transform="translate(200, 320) rotate(-8)" opacity="0.35">
              <ellipse cx="12" cy="8" rx="8" ry="6" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <path d="M4,8 Q4,15 8,18 Q12,15 12,8" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <path d="M12,8 Q12,15 16,18 Q20,15 20,8" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
            </g>

            {/* Mask - center right */}
            <g transform="translate(320, 200) rotate(5)" opacity="0.3">
              <path
                d="M0,15 Q0,5 15,5 L20,5 Q35,5 35,15 Q35,25 20,25 L15,25 Q0,25 0,15 Z"
                fill="url(#iconGradient2)"
                stroke="#a7f3d0"
                strokeWidth="1.5"
              />
              <ellipse cx="10" cy="15" rx="3" ry="2" fill="none" stroke="#a7f3d0" strokeWidth="1" />
              <ellipse cx="25" cy="15" rx="3" ry="2" fill="none" stroke="#a7f3d0" strokeWidth="1" />
            </g>

            {/* Test Tubes - bottom right */}
            <g transform="translate(320, 280) rotate(-10)" opacity="0.35">
              <rect x="0" y="0" width="6" height="25" rx="3" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <rect x="10" y="3" width="6" height="22" rx="3" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
              <rect x="20" y="1" width="6" height="24" rx="3" fill="url(#iconGradient1)" stroke="#7dd3fc" strokeWidth="1.5" />
            </g>
          </pattern>
        </defs>
        
        {/* Apply pattern to full viewport */}
        <rect width="100%" height="100%" fill="url(#medicalPattern)" />
      </svg>
    </div>
  );
}

