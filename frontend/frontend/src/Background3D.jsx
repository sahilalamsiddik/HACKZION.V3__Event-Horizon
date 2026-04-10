export default function Background3D({ activeTab, isIrrigating, isSurfaceOpen }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 0, pointerEvents: 'none', overflow: 'hidden'
    }}>
      {/* Base gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8f2 40%, #e3f2fd 100%)'
      }} />

      {/* Subtle grid pattern */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}
        xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#388e3c" strokeWidth="0.7" />
          </pattern>
          <radialGradient id="fade" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#fade)" />
      </svg>

      {/* Decorative blobs */}
      <svg style={{ position: 'absolute', top: '-10%', right: '-5%', width: '520px', opacity: 0.22 }}
        viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <path d="M320,180 C360,100 400,60 360,20 C320,-20 240,40 180,80 C120,120 60,100 40,160 C20,220 60,310 140,340 C220,370 300,300 340,240 C360,200 280,260 320,180Z"
          fill="#a5d6a7" />
      </svg>

      <svg style={{ position: 'absolute', bottom: '-8%', left: '-6%', width: '480px', opacity: 0.18 }}
        viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <path d="M80,200 C40,120 20,60 60,20 C100,-20 200,20 260,80 C320,140 380,160 380,240 C380,320 300,380 200,360 C100,340 120,280 80,200Z"
          fill="#81d4fa" />
      </svg>

      {/* Greenhouse silhouette illustration */}
      <svg style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '800px', opacity: 0.10 }}
        viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="290" width="800" height="30" fill="#388e3c" />
        <rect x="140" y="130" width="520" height="160" fill="#4caf50" />
        <polygon points="120,130 400,20 680,130" fill="#2e7d32" />
        <rect x="350" y="210" width="100" height="80" rx="6" fill="#1b5e20" />
        <rect x="170" y="160" width="80" height="60" rx="4" fill="#b3e5fc" opacity="0.8" />
        <rect x="280" y="160" width="80" height="60" rx="4" fill="#b3e5fc" opacity="0.8" />
        <rect x="470" y="160" width="80" height="60" rx="4" fill="#b3e5fc" opacity="0.8" />
        <rect x="580" y="160" width="80" height="60" rx="4" fill="#b3e5fc" opacity="0.8" />
        <line x1="260" y1="75" x2="300" y2="130" stroke="#1b5e20" strokeWidth="3" opacity="0.5" />
        <line x1="400" y1="20" x2="400" y2="130" stroke="#1b5e20" strokeWidth="3" opacity="0.5" />
        <line x1="540" y1="75" x2="500" y2="130" stroke="#1b5e20" strokeWidth="3" opacity="0.5" />
        <ellipse cx="180" cy="286" rx="20" ry="24" fill="#66bb6a" />
        <ellipse cx="195" cy="276" rx="14" ry="18" fill="#81c784" />
        <rect x="177" y="285" width="6" height="15" fill="#5d4037" />
        <ellipse cx="620" cy="286" rx="18" ry="22" fill="#66bb6a" />
        <ellipse cx="634" cy="278" rx="12" ry="16" fill="#a5d6a7" />
        <rect x="617" y="286" width="6" height="14" fill="#5d4037" />
      </svg>

      {/* Decorative dots cluster top-left */}
      <svg style={{ position: 'absolute', top: '8%', left: '3%', opacity: 0.2 }}
        width="120" height="120" viewBox="0 0 120 120">
        {[0,1,2,3,4].map(row =>
          [0,1,2,3,4].map(col => (
            <circle key={`${row}-${col}`}
              cx={col * 24 + 12} cy={row * 24 + 12} r="3"
              fill="#388e3c" opacity={(row + col) % 2 === 0 ? 1 : 0.4}
            />
          ))
        )}
      </svg>

      {/* Decorative dots cluster bottom-right */}
      <svg style={{ position: 'absolute', bottom: '12%', right: '2%', opacity: 0.18 }}
        width="100" height="100" viewBox="0 0 100 100">
        {[0,1,2,3].map(row =>
          [0,1,2,3].map(col => (
            <circle key={`${row}-${col}`}
              cx={col * 25 + 12} cy={row * 25 + 12} r="3.5"
              fill="#1976d2" opacity={(row + col) % 2 === 0 ? 1 : 0.4}
            />
          ))
        )}
      </svg>

      {/* Leaf decoration top-right */}
      <svg style={{ position: 'absolute', top: '5%', right: '2%', width: '180px', opacity: 0.15 }}
        viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M100,180 C60,150 20,100 40,50 C60,0 140,10 160,60 C180,110 140,160 100,180Z"
          fill="#388e3c" />
        <path d="M100,180 L100,60" stroke="#2e7d32" strokeWidth="3" fill="none" />
        <path d="M100,120 C80,110 60,105 50,90" stroke="#2e7d32" strokeWidth="1.5" fill="none" />
        <path d="M100,140 C120,130 140,125 150,110" stroke="#2e7d32" strokeWidth="1.5" fill="none" />
        <path d="M100,100 C85,90 70,82 65,68" stroke="#2e7d32" strokeWidth="1.5" fill="none" />
      </svg>

      {/* Pump active indicator bar */}
      {isIrrigating && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, #388e3c 30%, #81d4fa 50%, #388e3c 70%, transparent 100%)',
          opacity: 0.7
        }} />
      )}
    </div>
  )
}
