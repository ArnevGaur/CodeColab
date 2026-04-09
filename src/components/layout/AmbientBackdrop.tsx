import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AmbientBackdropProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "soft";
}

const AmbientBackdrop = ({ children, className, tone = "default" }: AmbientBackdropProps) => {
  const isSoft = tone === "soft";

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background text-foreground", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_100%/_0.02),transparent_18rem)]",
          isSoft && "opacity-70",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full blur-3xl",
          isSoft ? "bg-primary/8" : "bg-primary/15",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-24 h-[28rem] w-[28rem] rounded-full blur-3xl",
          isSoft ? "bg-accent/8" : "bg-accent/14",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute bottom-[-10rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl",
          isSoft ? "bg-primary/6" : "bg-primary/10",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:96px_96px] [mask-image:linear-gradient(180deg,white,transparent_90%)]",
          isSoft ? "opacity-16" : "opacity-30",
        )}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AmbientBackdrop;
