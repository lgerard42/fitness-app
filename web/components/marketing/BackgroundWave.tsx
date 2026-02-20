export default function BackgroundWave() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Orange gradient fill covering left ~60% with a smooth white arc on right */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="hero-grad" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#FF6B35" />
            <stop offset="45%" stopColor="#FF8A3D" />
            <stop offset="100%" stopColor="#FFB24A" />
          </linearGradient>
        </defs>
        {/* Full background orange */}
        <rect width="1440" height="900" fill="url(#hero-grad)" />
        {/* Large white arc cut-out on right side */}
        <path
          d="M680,0 Q920,250 880,450 Q840,650 720,900 L1440,900 L1440,0 Z"
          fill="#F7F7F7"
        />
      </svg>

      {/* Soft bottom wave for organic transition to next section */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 80"
        fill="none"
        preserveAspectRatio="none"
        style={{ height: 80 }}
      >
        <path
          d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z"
          fill="#F7F7F7"
        />
      </svg>
    </div>
  );
}
