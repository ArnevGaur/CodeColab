import { ReactNode } from "react";
import { Clock3, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

import AmbientBackdrop from "@/components/layout/AmbientBackdrop";
import BrandMark from "@/components/layout/BrandMark";

interface AuthShellProps {
  title: string;
  description: string;
  eyebrow: string;
  children: ReactNode;
  footer: ReactNode;
}

const valueProps = [
  {
    icon: Users,
    title: "Realtime collaboration",
    text: "Rooms, cursors, and presence stay visible without crowding the surface.",
  },
  {
    icon: Sparkles,
    title: "Inline assistance",
    text: "AI stays in the workspace instead of pushing the flow into separate tools.",
  },
  {
    icon: ShieldCheck,
    title: "Safe iteration",
    text: "Execution and restore points remain available when you need to move quickly.",
  },
];

const AuthShell = ({ title, description, eyebrow, children, footer }: AuthShellProps) => {
  return (
    <AmbientBackdrop tone="soft">
      <div className="container flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <section className="hidden max-w-xl lg:block">
            <Link to="/" className="inline-flex">
              <BrandMark quiet subtitle="Collaborative workspace" />
            </Link>

            <div className="mt-16 space-y-5">
              <div className="eyebrow w-fit">{eyebrow}</div>
              <h1 className="font-display text-4xl font-bold leading-[1.02] text-foreground xl:text-[3.35rem]">
                {title}
              </h1>
              <p className="max-w-lg text-base leading-7 text-muted-foreground">{description}</p>
            </div>

            <div className="mt-12 border-y border-white/6">
              {valueProps.map((item, index) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-4 py-4 ${index !== valueProps.length - 1 ? "border-b border-white/6" : ""}`}
                >
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Quiet surfaces, faster sign-in, same dark workspace tone.
            </div>
          </section>

          <section className="panel-glass mx-auto w-full max-w-[28.5rem] p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/6 pb-4">
              <BrandMark compact quiet subtitle="Collaborative workspace" />
              <Link to="/" className="text-sm text-muted-foreground transition hover:text-foreground">
                Home
              </Link>
            </div>

            <div className="mt-6 space-y-3 lg:hidden">
              <div className="eyebrow w-fit">{eyebrow}</div>
              <div>
                <h1 className="font-display text-[1.9rem] font-bold leading-tight text-foreground">{title}</h1>
                <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>

            <div className="mt-6 hidden lg:block">
              <div className="eyebrow w-fit">{eyebrow}</div>
            </div>

            <div className="mt-6 space-y-5">{children}</div>

            <div className="mt-6 border-t border-white/6 pt-5 text-sm text-muted-foreground">{footer}</div>
          </section>
        </div>
      </div>
    </AmbientBackdrop>
  );
};

export default AuthShell;
