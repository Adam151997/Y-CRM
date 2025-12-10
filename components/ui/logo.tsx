interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className = "", size = 32, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5757" />
            <stop offset="100%" stopColor="#FF3D3D" />
          </linearGradient>
          <linearGradient id="logoShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        
        {/* Rounded square background */}
        <rect
          x="0"
          y="0"
          width="40"
          height="40"
          rx="10"
          fill="url(#logoGradient)"
        />
        
        {/* Subtle shine overlay */}
        <rect
          x="0"
          y="0"
          width="40"
          height="20"
          rx="10"
          fill="url(#logoShine)"
        />
        
        {/* Stylized Y shape - representing connections/flow */}
        <path
          d="M12 11L20 21L28 11"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M20 21V29"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Connection nodes - representing CRM relationships */}
        <circle cx="12" cy="11" r="2" fill="white" />
        <circle cx="28" cy="11" r="2" fill="white" />
        <circle cx="20" cy="29" r="2" fill="white" />
      </svg>
      
      {showText && (
        <span className="font-semibold text-lg tracking-tight">
          CRM
        </span>
      )}
    </div>
  );
}

// Icon-only version for favicon/smaller uses
export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5757" />
          <stop offset="100%" stopColor="#FF3D3D" />
        </linearGradient>
      </defs>
      
      <rect
        x="0"
        y="0"
        width="40"
        height="40"
        rx="10"
        fill="url(#logoGradientIcon)"
      />
      
      <path
        d="M12 11L20 21L28 11"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 21V29"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      
      <circle cx="12" cy="11" r="2" fill="white" />
      <circle cx="28" cy="11" r="2" fill="white" />
      <circle cx="20" cy="29" r="2" fill="white" />
    </svg>
  );
}
