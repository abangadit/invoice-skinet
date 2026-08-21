import React from "react";

interface LogoIconProps {
  className?: string;
  color?: string;
}

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function LogoIcon({ className = "w-8 h-8", color = "#005bf6" }: LogoIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoFoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8ab4ff" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      {/* Document Outline */}
      <path
        d="M 330,90 L 150,90 A 40 40 0 0 0 110,130 L 110,382 A 40 40 0 0 0 150,422 L 362,422 A 40 40 0 0 0 402,382 L 402,162 Z"
        stroke={color}
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Fold Triangle */}
      <path
        d="M 330,90 L 330,162 L 402,162 Z"
        fill="url(#logoFoldGrad)"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Horizontal lines */}
      <rect x="155" y="220" width="130" height="38" rx="19" fill={color} />
      <rect x="155" y="295" width="210" height="38" rx="19" fill={color} />
    </svg>
  );
}

export default function Logo({
  className = "flex items-center gap-2",
  iconClassName = "w-8 h-8",
  textClassName = "text-lg font-bold tracking-tight text-slate-900",
  showText = true,
}: LogoProps) {
  return (
    <div className={className}>
      <LogoIcon className={iconClassName} />
      {showText && (
        <span className={textClassName}>
          invoice<span className="text-blue-600">.co.id</span>
        </span>
      )}
    </div>
  );
}
