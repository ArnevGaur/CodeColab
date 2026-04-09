import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  compact?: boolean;
  subtitle?: string;
  withText?: boolean;
  quiet?: boolean;
}

const BrandMark = ({
  className,
  compact = false,
  subtitle,
  withText = true,
  quiet = false,
}: BrandMarkProps) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden border border-white/8 bg-white/[0.02]",
          quiet ? "shadow-none" : "shadow-card",
          compact ? "h-8 w-8 rounded-xl" : "h-11 w-11 rounded-2xl",
        )}
      >
        {!quiet ? (
          <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.12),transparent_55%),radial-gradient(circle_at_70%_75%,hsl(var(--accent)/0.1),transparent_45%)]" />
        ) : null}
        <img
          src="/logo.png"
          alt="CodeColab Logo"
          className={cn(
            "relative z-10 object-contain saturate-0 mix-blend-screen",
            quiet ? "opacity-52 contrast-70 brightness-125" : "opacity-78 contrast-90 brightness-110",
            compact ? "h-4 w-4" : "h-6 w-6",
          )}
        />
      </div>
      {withText ? (
        <div className="min-w-0">
          <div className={cn("font-display font-bold leading-none", compact ? "text-[0.95rem]" : "text-lg")}>
            <span className="brand-gradient">CodeColab</span>
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default BrandMark;
