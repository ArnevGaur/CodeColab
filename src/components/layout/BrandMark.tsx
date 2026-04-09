import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
  subtitle?: string;
  withText?: boolean;
}

const BrandMark = ({
  className,
  compact = false,
  subtitle,
  withText = true,
}: BrandMarkProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] shadow-card",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.35),transparent_55%),radial-gradient(circle_at_70%_75%,hsl(var(--accent)/0.28),transparent_45%)]" />
        <img
          src="/logo.png"
          alt="CodeColab Logo"
          className={cn("relative z-10 object-contain", compact ? "h-5 w-5" : "h-7 w-7")}
        />
      </div>
      {withText ? (
        <div className="min-w-0">
          <div className={cn("font-display text-lg font-bold leading-none", compact ? "text-base" : "text-xl")}>
            <span className="brand-gradient">CodeColab</span>
          </div>
          {subtitle ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default BrandMark;
