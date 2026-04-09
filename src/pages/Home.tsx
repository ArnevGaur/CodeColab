import { motion } from "framer-motion";
import { ArrowRight, Play, ShieldCheck, Sparkles, Terminal, Users } from "lucide-react";
import { Link } from "react-router-dom";

import AmbientBackdrop from "@/components/layout/AmbientBackdrop";
import BrandMark from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Realtime rooms",
    description: "Presence, shared files, and live edits stay in one quiet workspace.",
  },
  {
    icon: Sparkles,
    title: "Inline AI",
    description: "Ask for explanations, fixes, or refactors without leaving the editor.",
  },
  {
    icon: ShieldCheck,
    title: "Safe recovery",
    description: "Checkpoints and restore flow keep experiments reversible.",
  },
];

const Home = () => {
  return (
    <AmbientBackdrop tone="soft">
      <header className="border-b border-white/6 bg-[hsl(var(--background)/0.42)] backdrop-blur-xl">
        <div className="container flex items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark compact subtitle="Collaborative coding workspace" />

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 pb-14 pt-10 sm:px-6 lg:pb-20 lg:pt-16">
        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-2xl"
          >
            <div className="eyebrow w-fit">Minimal, dark, collaborative</div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1] text-foreground sm:text-5xl xl:text-[4.5rem]">
              A calmer workspace for teams writing code together.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              CodeColab keeps collaboration, AI help, execution, and recovery inside one restrained interface so the
              code stays central and the UI stays out of the way.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg" className="accent-ring">
                <Link to="/signup">
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">
                  <Play className="h-4 w-4" />
                  View dashboard
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="panel-glass p-4 sm:p-5"
          >
            <div className="rounded-[1.2rem] border border-white/8 bg-editor/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace preview</p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-foreground">Design System Refactor</h2>
                </div>
                <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
                  6 collaborators live
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-2">
                  {[
                    "src/pages/Home.tsx",
                    "src/components/editor/TopBar.tsx",
                    "src/components/editor/AIChat.tsx",
                    "server/routes/checkpoint.js",
                  ].map((file, index) => (
                    <div
                      key={file}
                      className={`rounded-xl border px-3 py-2.5 text-sm ${
                        index === 0
                          ? "border-primary/16 bg-primary/10 text-foreground"
                          : "border-white/6 bg-white/[0.02] text-muted-foreground"
                      }`}
                    >
                      {file}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="panel-subtle p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Presence
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      See who is active and what file they are editing without opening another view.
                    </p>
                  </div>

                  <div className="panel-subtle p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      Runtime
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Run the active file, save a pre-run checkpoint, and keep the output inside the room.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </section>

        <section className="mt-12 border-t border-white/6 pt-8 lg:mt-16 lg:pt-10">
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">What it gives you</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">Less chrome, more working room.</h2>
            </div>
            <div className="divide-y divide-white/6 border-y border-white/6">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-4 py-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-muted-foreground">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AmbientBackdrop>
  );
};

export default Home;
