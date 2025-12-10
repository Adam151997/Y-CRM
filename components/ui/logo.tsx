interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function Logo({ className = "", size = 32, showText = false }: LogoProps) {
  // Scale factor based on size (designed at 32px base)
  const scale = size / 32;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Y shape */}
        <path
          d="M6 4L16 16L26 4"
          stroke="#FF5757"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M16 16V28"
          stroke="#FF5757"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Connection nodes at endpoints */}
        <circle cx="6" cy="4" r="3" fill="#FF5757" />
        <circle cx="26" cy="4" r="3" fill="#FF5757" />
        <circle cx="16" cy="28" r="3" fill="#FF5757" />
      </svg>
      
      {showText && (
        <span className="font-semibold text-lg tracking-tight">
          CRM
        </span>
      )}
    </div>
  );
}

// Icon-only version for smaller uses
export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Y shape */}
      <path
        d="M6 4L16 16L26 4"
        stroke="#FF5757"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 16V28"
        stroke="#FF5757"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Connection nodes */}
      <circle cx="6" cy="4" r="3" fill="#FF5757" />
      <circle cx="26" cy="4" r="3" fill="#FF5757" />
      <circle cx="16" cy="28" r="3" fill="#FF5757" />
    </svg>
  );
}
