import React from 'react';

const activities = [
  { id: 1, location: 'San Francisco', status: 'called 12s ago', type: 'HOT', color: '#10B981' },
  { id: 2, location: 'New York', status: 'qualifying now', type: 'WARM', color: '#F59E0B' },
  { id: 3, location: 'Austin', status: 'scored 42', type: 'COLD', color: '#6B7280' },
  { id: 4, location: 'London', status: 'instantly called', type: 'HOT', color: '#10B981' },
  { id: 5, location: 'Miami', status: 'talking to AI', type: 'WARM', color: '#F59E0B' },
  { id: 6, location: 'Seattle', status: 'awaiting pickup', type: 'COLD', color: '#6B7280' },
];

export default function LiveActivity() {
  // We double the list to create a seamless infinite scroll loop
  const displayActivities = [...activities, ...activities];

  return (
    <div className="w-full max-w-[400px] border border-[#333A47] bg-[#1E2129]/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl mt-12">
      <div className="px-6 py-4 border-b border-[#333A47] flex items-center justify-between">
        <span className="label-mono opacity-60">LIVE ACTIVITY</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 status-dot-pulse"></div>
          <span className="text-[10px] font-mono font-bold text-red-500 tracking-wider">LIVE</span>
        </div>
      </div>
      
      <div className="h-[210px] overflow-hidden relative">
        <div className="activity-loop-container px-6 py-2">
          {displayActivities.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className="flex items-center justify-between py-3 border-b border-[#333A47]/30 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                ></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white" style={{ fontFamily: 'var(--font-body)' }}>
                    Lead from {item.location}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] font-mono">
                     — {item.status}
                  </span>
                </div>
              </div>
              
              <div className={`badge-status ${
                item.type === 'HOT' ? 'badge-hot' : 
                item.type === 'WARM' ? 'badge-warm' : 'badge-cold'
              }`}>
                {item.type}
              </div>
            </div>
          ))}
        </div>
        
        {/* Fades for smooth entry/exit */}
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#1E2129] to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#1E2129] to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
