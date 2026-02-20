export default function AirPodsMockup() {
  return (
    <div className="relative" style={{ width: 90, height: 105 }}>
      {/* Case body */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70px] h-[85px] bg-gradient-to-b from-white to-gray-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Lid line */}
        <div className="absolute top-[38%] left-0 right-0 h-px bg-gray-200" />
        {/* Status light */}
        <div className="absolute top-[32%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent/60" />
        {/* Hinge */}
        <div className="absolute top-[36%] left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />
        {/* Subtle inner shadow */}
        <div className="absolute inset-x-3 bottom-3 top-[42%] bg-gray-50 rounded-lg" />
      </div>
    </div>
  );
}
