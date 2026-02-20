export default function AppleWatchMockup() {
  return (
    <div className="relative" style={{ width: 130, height: 160 }}>
      {/* Watch band top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-5 bg-gray-800 rounded-t-md" />
      {/* Watch body */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[100px] h-[110px] bg-gray-900 rounded-[1.4rem] shadow-xl border-2 border-gray-700 overflow-hidden">
        {/* Crown button */}
        <div className="absolute top-6 -right-[3px] w-[4px] h-5 bg-gray-600 rounded-r" />
        {/* Screen */}
        <div className="absolute inset-[4px] rounded-[1.1rem] bg-black flex flex-col items-center justify-center">
          <svg width="70" height="70" viewBox="0 0 80 80">
            {/* Track ring */}
            <circle cx="40" cy="40" r="32" fill="none" stroke="#333" strokeWidth="5" />
            {/* Progress ring */}
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="#FF6B35"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32 * 0.72} ${2 * Math.PI * 32}`}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <span className="absolute text-white text-xl font-bold" style={{ top: '50%', transform: 'translateY(-50%)' }}>
            325
          </span>
        </div>
      </div>
      {/* Watch band bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-5 bg-gray-800 rounded-b-md" />
    </div>
  );
}
