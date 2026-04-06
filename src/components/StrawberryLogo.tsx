export default function StrawberryLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Leaves */}
      <path
        d="M32 8C28 4 22 6 20 10C24 8 28 10 32 14"
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth="1"
      />
      <path
        d="M32 8C36 4 42 6 44 10C40 8 36 10 32 14"
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth="1"
      />
      <path
        d="M32 10C30 5 32 2 32 2C32 2 34 5 32 10"
        fill="#16a34a"
      />
      {/* Berry body */}
      <ellipse cx="32" cy="38" rx="18" ry="22" fill="#e11d48" />
      <ellipse cx="32" cy="38" rx="16" ry="20" fill="#f43f5e" />
      {/* Seeds */}
      <ellipse cx="26" cy="30" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(-15 26 30)" />
      <ellipse cx="38" cy="30" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(15 38 30)" />
      <ellipse cx="24" cy="40" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(-10 24 40)" />
      <ellipse cx="40" cy="40" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(10 40 40)" />
      <ellipse cx="32" cy="35" rx="1.5" ry="2" fill="#fbbf24" />
      <ellipse cx="28" cy="48" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(-5 28 48)" />
      <ellipse cx="36" cy="48" rx="1.5" ry="2" fill="#fbbf24" transform="rotate(5 36 48)" />
      {/* Happy face */}
      <circle cx="27" cy="36" r="2" fill="#881337" />
      <circle cx="37" cy="36" r="2" fill="#881337" />
      <circle cx="27.5" cy="35.5" r="0.7" fill="white" />
      <circle cx="37.5" cy="35.5" r="0.7" fill="white" />
      <path
        d="M27 42C29 45 35 45 37 42"
        stroke="#881337"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cheek blush */}
      <ellipse cx="23" cy="40" rx="3" ry="2" fill="#fb7185" opacity="0.5" />
      <ellipse cx="41" cy="40" rx="3" ry="2" fill="#fb7185" opacity="0.5" />
    </svg>
  );
}
