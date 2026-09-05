export function MineCameraScene() {
  return (
    <svg
      viewBox="0 0 1600 900"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a9098" />
          <stop offset="38%" stopColor="#6a717a" />
          <stop offset="62%" stopColor="#4d545c" />
          <stop offset="100%" stopColor="#2c3036" />
        </linearGradient>
        <linearGradient id="pit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c534a" />
          <stop offset="100%" stopColor="#2a2723" />
        </linearGradient>
        <linearGradient id="haul" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e675e" />
          <stop offset="100%" stopColor="#3a372f" />
        </linearGradient>
        <radialGradient id="fog" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#d5d8dc" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#9aa1a8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1a1c20" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id="beam" cx="50%" cy="100%" r="58%">
          <stop offset="0%" stopColor="#f0ead8" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#cfc6b0" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#horizon)" />
      <ellipse cx="800" cy="390" rx="720" ry="160" fill="#9aa3ad" opacity="0.35" />

      <path d="M0 430 L420 410 L540 470 L0 620 Z" fill="url(#pit)" />
      <path d="M1600 430 L1180 410 L1060 470 L1600 620 Z" fill="url(#pit)" />

      <path d="M180 900 L700 455 L900 455 L1420 900 Z" fill="url(#haul)" />
      <path
        d="M800 455 L792 900 M800 455 L808 900"
        stroke="#c5c0b4"
        strokeWidth="2"
        strokeDasharray="18 22"
        opacity="0.35"
      />

      <ellipse cx="800" cy="448" rx="90" ry="16" fill="#b7bcc2" opacity="0.5" />
      <rect x="0" y="0" width="1600" height="900" fill="url(#fog)" />
      <rect x="0" y="0" width="1600" height="900" fill="url(#beam)" />
      <rect x="0" y="760" width="1600" height="140" fill="#121417" opacity="0.55" />
    </svg>
  );
}
