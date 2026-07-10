import React from "react";

export function SafeSphereIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. Outer Dark Shield */}
      <path
        d="M 50,9 C 67,9 81,14 86,22 C 86,52 74,78 50,91 C 26,78 14,52 14,22 C 19,14 33,9 50,9 Z"
        fill="#0D1117"
      />
      {/* 2. Inner White Shield */}
      <path
        d="M 50,15 C 64,15 75,19 79,26 C 79,50 69,72 50,83 C 31,72 21,50 21,26 C 25,19 36,15 50,15 Z"
        fill="#FFFFFF"
      />
      {/* 3. Black Inner Circle */}
      <circle cx="50" cy="50" r="24" fill="#0D1117" />
      {/* 4. Green S-wave Yin-Yang Shape */}
      <path
        d="M 50,26 A 12,12 0 0,0 50,50 A 12,12 0 0,1 50,74 A 24,24 0 0,1 50,26 Z"
        fill="#1ED760"
      />
    </svg>
  );
}

export function SafeSphereLogo({
  className = "",
  light = false,
  logoHeightClass = "h-8 w-8",
}: {
  className?: string;
  light?: boolean;
  logoHeightClass?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SafeSphereIcon className={logoHeightClass} />
      <span className={`font-sans text-xl font-bold tracking-tight ${light ? "text-white" : "text-[#0D1117]"}`}>
        safe<span className="text-[#1ED760]">sphere</span>
      </span>
    </div>
  );
}
