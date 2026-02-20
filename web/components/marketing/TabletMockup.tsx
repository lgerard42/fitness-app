export default function TabletMockup() {
  return (
    <div className="relative" style={{ width: 160, height: 210 }}>
      <div className="absolute inset-0 bg-gray-900 rounded-2xl shadow-xl border-2 border-gray-700 overflow-hidden">
        {/* Screen */}
        <div className="absolute inset-[4px] rounded-xl bg-gray-800 p-3 flex flex-col">
          {/* Mini chart header */}
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-1.5 bg-gray-600 rounded" />
            <div className="w-4 h-1.5 bg-accent rounded" />
          </div>
          {/* Bar chart */}
          <div className="flex-1 flex items-end gap-1.5 pb-1">
            {[0.35, 0.55, 0.75, 0.5, 0.65, 0.85, 0.7, 0.9].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h * 100}%`,
                  background: i === 7 ? '#FF6B35' : i >= 5 ? '#10B981' : '#4B5563',
                }}
              />
            ))}
          </div>
          {/* Bottom line labels */}
          <div className="flex justify-between mt-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S', ''].map((d, i) => (
              <span key={i} className="text-[6px] text-gray-500 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
