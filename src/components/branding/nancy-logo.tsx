import Image from "next/image";
import { cn } from "@/lib/utils";

export interface NancyLogoProps {
  className?: string;
  priority?: boolean;
  sizes?: string;
  alt?: string;
}

export function NancyLogo({
  className,
  priority = false,
  sizes = "64px",
  alt = "Logo Nancy Finance",
}: NancyLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-emerald-50 ring-1 ring-emerald-400/40 shadow-sm",
        className
      )}
    >
      <Image
        src="/branding/nancy-finance-mark-v3.svg"
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        priority={priority}
      />
    </span>
  );
}
