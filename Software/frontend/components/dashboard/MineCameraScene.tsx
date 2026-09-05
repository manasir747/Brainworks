export function MineCameraScene() {
  return (
    <svg
      viewBox="0 0 1600 900"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7d858e" />
          <stop offset="28%" stopColor="#6a727b" />
          <stop offset="55%" stopColor="#585f67" />
          <stop offset="100%" stopColor="#3e444b" />
        </linearGradient>
        <linearGradient id="bench" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6a5f52" />
          <stop offset="100%" stopColor="#3a342c" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a7368" />
          <stop offset="100%" stopColor="#4a453c" />
        </linearGradient>
        <radialGradient id="mist" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#e4e7ea" stopOpacity="0.62" />
          <stop offset="40%" stopColor="#b7bdc4" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#1c1f24" stopOpacity="0.05" />
        </radialGradient>
        <radialGradient id="headlight" cx="50%" cy="108%" r="62%">
          <stop offset="0%" stopColor="#efe6cc" stopOpacity="0.28" />
          <stop offset="42%" stopColor="#cfc6ae" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#sky)" />

      <path d="M0 390 L260 360 L390 430 L180 470 L0 500 Z" fill="url(#bench)" />
      <path d="M1600 390 L1340 360 L1210 430 L1420 470 L1600 500 Z" fill="url(#bench)" />
      <path d="M0 500 L210 455 L480 520 L0 640 Z" fill="#4d463d" />
      <path d="M1600 500 L1390 455 L1120 520 L1600 640 Z" fill="#4d463d" />

      <path d="M210 900 L690 448 L910 448 L1390 900 Z" fill="url(#road)" />
      <path
        d="M800 450 L794 900"
        stroke="#d2cdc2"
        strokeWidth="3"
        strokeDasharray="16 26"
        opacity="0.28"
      />

      <ellipse cx="800" cy="442" rx="118" ry="18" fill="#c5cbd2" opacity="0.45" />
      <rect x="0" y="0" width="1600" height="900" fill="url(#mist)" />
      <rect x="0" y="0" width="1600" height="900" fill="url(#headlight)" />
      <rect x="0" y="780" width="1600" height="120" fill="#101214" opacity="0.5" />
    </svg>
  );
}
