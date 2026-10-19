type ChevronDownProps = {
  open: boolean;
  className?: string;
};

export function ChevronDown({ open, className = "" }: ChevronDownProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`text-muted transition-transform duration-150 ${open ? "rotate-180" : ""} ${className}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
