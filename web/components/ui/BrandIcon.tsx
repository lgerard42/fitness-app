import { cn } from "@/lib/utils";

interface BrandIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const containerSizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const svgSizes = {
  sm: 18,
  md: 22,
  lg: 28,
};

export default function BrandIcon({ size = "sm", className }: BrandIconProps) {
  const s = svgSizes[size];

  return (
    <div
      className={cn(
        "bg-primary rounded-xl flex items-center justify-center relative overflow-hidden",
        containerSizes[size],
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
        aria-hidden="true"
      >
        <g transform="rotate(-45 16 16)">
          {/* Outer plates */}
          <rect x="3" y="9.5" width="5" height="13" rx="2.5" fill="white" />
          <rect x="24" y="9.5" width="5" height="13" rx="2.5" fill="white" />
          {/* Inner plates */}
          <rect x="7.5" y="11.5" width="4" height="9" rx="2" fill="white" opacity="0.9" />
          <rect x="20.5" y="11.5" width="4" height="9" rx="2" fill="white" opacity="0.9" />
          {/* Bar */}
          <rect x="11" y="14" width="10" height="4" rx="2" fill="white" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}
