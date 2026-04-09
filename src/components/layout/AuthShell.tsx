import { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react";

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
  "Shared editing with live cursors and room presence",
  "Inline AI help, execution, and version checkpoints",
  "Fast onboarding flow without the usual dashboard clutter",
];

const AuthShell = ({ title, description, eyebrow, children, footer }: AuthShellProps) => {
  return (
    <AmbientBackdrop>
      <div className="container flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="panel-glass panel-grid hidden min-h-[38rem] flex-col justify-between p-6 lg:flex xl:p-8">
            <div className="space-y-8">
              <BrandMark quiet subtitle="Realtime code collaboration, rebuilt with sharper contrast." />

              <div className="max-w-xl space-y-4">
                <div className="eyebrow">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Workspace Feel, Not Template Feel
                </div>
                <div className="space-y-4">
                  <h1 className="font-display text-3xl font-bold leading-tight text-foreground xl:text-[2.7rem]">
                    Dark, focused surfaces for teams that want the editor to feel like the product.
                  </h1>
                  <p className="max-w-lg text-sm leading-6 text-muted-foreground xl:text-base">
                    CodeColab is positioned like a premium workspace: less generic SaaS chrome, more intentional hierarchy,
                    and faster context scanning while you collaborate.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="panel-subtle p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active Sessions</p>
                  <p className="mt-2.5 font-display text-2xl font-bold text-foreground">128</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Warm starts, live sync, persistent history.</p>
                </div>
                <div className="panel-subtle p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Response</p>
                  <p className="mt-2.5 font-display text-2xl font-bold text-foreground">1.2s</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Assistive actions without leaving the editor.</p>
                </div>
                <div className="panel-subtle p-3.5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Restore Points</p>
                  <p className="mt-2.5 font-display text-2xl font-bold text-foreground">24/7</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Checkpoint history that stays usable under pressure.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="panel-subtle p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session Feed</p>
                    <h2 className="mt-2 font-display text-lg font-semibold text-foreground">What the product promises</h2>
                  </div>
                  <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Live
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Users, title: "Presence-aware collaboration", text: "See who is in the room and what file they are working on." },
                    { icon: ShieldCheck, title: "Safe execution flow", text: "Checkpoints are saved before risky runs and easy to restore." },
                    { icon: ArrowUpRight, title: "Less friction per task", text: "Search, create, run, and ask AI from one workspace." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 rounded-xl border border-white/6 bg-white/[0.03] p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-subtle p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Core Value</p>
                <div className="mt-4 space-y-4">
                  {valueProps.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
                      <p className="text-xs leading-5 text-foreground/88">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="panel-glass mx-auto w-full max-w-[34rem] p-5 sm:p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <BrandMark compact quiet subtitle="Collaborative workspace" />
                <div className="space-y-2.5">
                  <div className="eyebrow w-fit">{eyebrow}</div>
                  <div>
                    <h1 className="font-display text-[1.9rem] font-bold text-foreground sm:text-[2.15rem]">{title}</h1>
                    <p className="mt-2.5 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">{children}</div>

              <div className="border-t border-white/8 pt-5 text-sm text-muted-foreground">{footer}</div>
            </div>
          </section>
        </div>
      </div>
    </AmbientBackdrop>
  );
};

export default AuthShell;
