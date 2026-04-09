import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  FolderGit2,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import AmbientBackdrop from "@/components/layout/AmbientBackdrop";
import BrandMark from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";

const primaryFeatures = [
  {
    icon: Sparkles,
    title: "AI where you need it",
    description: "Explain, debug, and reshape code in the same workspace instead of bouncing between tools.",
  },
  {
    icon: Users,
    title: "Real-time by default",
    description: "Presence, cursors, and live document sync are treated as first-class workflow primitives.",
  },
  {
    icon: ShieldCheck,
    title: "Version safety built in",
    description: "Manual and automatic checkpoints keep risky execution from turning into lost work.",
  },
];

const workspacePreview = [
  { label: "Latency", value: "32ms", hint: "editor sync" },
  { label: "Sessions", value: "128", hint: "active today" },
  { label: "Recovery", value: "100%", hint: "checkpointed" },
];

const Home = () => {
  return (
    <AmbientBackdrop>
      <header className="border-b border-white/6 bg-[hsl(var(--background)/0.5)] backdrop-blur-xl">
        <div className="container flex items-center justify-between px-4 py-5 sm:px-6">
          <BrandMark compact subtitle="Collaborative coding workspace" />

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#product" className="transition hover:text-foreground">
              Product
            </a>
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#workspace" className="transition hover:text-foreground">
              Workspace
            </a>
          </nav>

          <div className="flex items-center gap-3">
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

      <main className="container px-4 pb-12 pt-8 sm:px-6 lg:pb-16 lg:pt-12">
        <section
          id="product"
          className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="eyebrow w-fit">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              A darker, sharper workspace for teams
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold leading-[0.96] text-foreground sm:text-5xl xl:text-[4.2rem]">
              Rebuild collaboration around a workspace people actually want to stay in.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              CodeColab combines the clarity of premium product dashboards with a real-time editor, inline AI,
              and recoverable execution flow. The result should feel closer to Linear and Raycast than a starter
              template with random cards.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg" className="accent-ring">
                <Link to="/signup">
                  Launch workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">
                  <Play className="h-4 w-4" />
                  Enter demo dashboard
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {workspacePreview.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
                  className="panel-subtle p-3.5"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2.5 font-display text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.hint}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="panel-glass panel-grid p-3.5 sm:p-4"
            id="workspace"
          >
            <div className="rounded-[1.1rem] border border-white/8 bg-editor p-3.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/_0.03)]">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Room Preview</p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-foreground">Design System Refactor</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-foreground">
                  <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_14px_hsl(var(--success)/0.8)]" />
                  6 collaborators live
                </div>
              </div>

              <div className="mt-3.5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="panel-subtle p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FolderGit2 className="h-4 w-4 text-primary" />
                      Workspace Tree
                    </div>
                    <div className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      TS + Node
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {[
                      "src/pages/Home.tsx",
                      "src/components/editor/TopBar.tsx",
                      "src/index.css",
                      "server/routes/room.js",
                    ].map((file, index) => (
                      <div
                        key={file}
                        className={`flex items-center gap-3 rounded-xl px-3 py-1.5 ${
                          index === 0 ? "bg-primary/12 text-foreground" : "bg-white/[0.03] text-muted-foreground"
                        }`}
                      >
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <span>{file}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="panel-subtle p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Users className="h-4 w-4 text-accent" />
                        Presence
                      </div>
                      <span className="text-xs text-muted-foreground">Realtime awareness</span>
                    </div>
                    <div className="mt-3 flex -space-x-2">
                      {["AR", "JM", "SK", "LN"].map((name, index) => (
                        <div
                          key={name}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-editor text-[11px] font-bold text-background"
                          style={{
                            backgroundColor: ["#e2e2e2", "#cfcfcf", "#b6b6b6", "#8f8f8f"][index],
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Who is active, what file they are editing, and whether the session is healthy should be visible at
                      a glance.
                    </p>
                  </div>

                  <div className="panel-subtle p-3.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Terminal className="h-4 w-4 text-primary" />
                      AI + Runtime
                    </div>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3 text-xs text-muted-foreground">
                        Suggested refactor: compress auth shell into one reusable layout and tighten contrast ratios.
                      </div>
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-foreground">
                        Output: build finished in 1.4s. Zero type errors. Session checkpoint saved.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="mt-10 grid gap-3 lg:mt-14 lg:grid-cols-3">
          {primaryFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 + index * 0.08 }}
              className="panel-glass p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-10 grid gap-3 lg:mt-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel-glass p-5 sm:p-6">
            <div className="eyebrow w-fit">
              <Clock3 className="h-3.5 w-3.5 text-accent" />
              What changed in the redesign
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
              Stronger contrast, fewer meaningless panels, and a UI that reads faster.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              The updated direction leans into a studio-grade dark shell: layered depth, warmer call-to-action color,
              better spacing rhythm, and surfaces that feel intentional instead of generated.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Navigation, auth, dashboard, and editor now share one visual system.",
              "Glass surfaces and restrained accent use replace flat grayscale filler.",
              "Key status information is easier to scan without reading every label.",
              "The interface stays dark-first while remaining readable on smaller screens.",
            ].map((point) => (
              <div key={point} className="panel-subtle flex items-start gap-3 p-4">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm leading-6 text-foreground/88">{point}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AmbientBackdrop>
  );
};

export default Home;
