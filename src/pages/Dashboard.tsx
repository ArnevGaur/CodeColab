import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  FolderGit2,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import AmbientBackdrop from "@/components/layout/AmbientBackdrop";
import BrandMark from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  updatedAt: string;
  collaborators: number;
  language: string;
  status: string;
}

const initialProjects: Project[] = [
  { id: "1", name: "Realtime Design System", updatedAt: "12 minutes ago", collaborators: 4, language: "TypeScript", status: "Reviewing" },
  { id: "2", name: "Editor Presence Layer", updatedAt: "1 hour ago", collaborators: 2, language: "Node + WS", status: "Building" },
  { id: "3", name: "Checkpoint Diff Viewer", updatedAt: "Yesterday", collaborators: 3, language: "React", status: "Stable" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects] = useState<Project[]>(initialProjects);
  const [joinCode, setJoinCode] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const firstName = user?.username?.split(" ")[0] || "Builder";

  const handleNewProject = () => {
    toast({
      title: "Creating project",
      description: "Opening a fresh collaboration room.",
    });
    navigate("/editor/demo-project");
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleImport = () => {
    toast({
      title: "Import flow",
      description: "Git import UI is not implemented yet.",
    });
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (!code) {
      toast({
        title: "Session code missing",
        description: "Enter a room code first.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/editor/${code}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "Your session has been cleared.",
    });
    navigate("/login");
  };

  return (
    <AmbientBackdrop>
      <header className="border-b border-white/6 bg-[hsl(var(--background)/0.56)] backdrop-blur-xl">
        <div className="container flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact subtitle="Project dashboard" />

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleImport}>
              <FolderGit2 className="h-4 w-4" />
              Import repo
            </Button>
            <Button onClick={handleNewProject} className="accent-ring">
              <Plus className="h-4 w-4" />
              New room
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-10">
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="panel-glass p-6 sm:p-8"
          >
            <div className="eyebrow w-fit">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Studio dashboard
            </div>
            <div className="mt-5 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
                  {firstName}, your collaborative workspace is looking sharper now.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Project cards, quick actions, and join flow now sit inside a single dark product shell rather than a
                  pile of default panels.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[22rem]">
                {[
                  { label: "Open rooms", value: "03" },
                  { label: "Collaborators", value: "09" },
                  { label: "Checkpoint saves", value: "27" },
                ].map((item) => (
                  <div key={item.label} className="panel-subtle p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 font-display text-3xl font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="panel-glass p-6"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-accent" />
              Join existing session
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Jump straight into an existing room with a code. This stays visible so the dashboard works as an actual
              launchpad, not just a card list.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="pl-11"
                />
              </div>
              <Button onClick={handleJoin}>
                Join room
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="panel-subtle p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Terminal className="h-4 w-4 text-primary" />
                  Runtime ready
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Run code in place without leaving the room.</p>
              </div>
              <div className="panel-subtle p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock3 className="h-4 w-4 text-accent" />
                  Save history
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Checkpoint recovery stays one panel away.</p>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {projects.map((project, index) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                onClick={() => handleOpenProject(project.id)}
                className="panel-glass group block w-full p-6 text-left transition hover:-translate-y-1"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <FolderGit2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{project.language}</p>
                        <h2 className="font-display text-2xl font-semibold text-foreground">{project.name}</h2>
                      </div>
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                      The workspace card now carries enough hierarchy to scan team activity, stack, and freshness in one pass.
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-foreground">
                      {project.status}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {project.collaborators} collaborators
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {project.updatedAt}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="panel-glass p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent focus</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">Work the room, not the UI.</h2>
              <div className="mt-5 space-y-3">
                {[
                  "Files, AI, terminal, and checkpoints are all one interaction away.",
                  "Surface contrast now separates navigation, content, and status layers properly.",
                  "Mobile sizing is tighter so cards do not feel inflated on smaller screens.",
                ].map((item) => (
                  <div key={item} className="panel-subtle flex items-start gap-3 p-4">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm leading-7 text-foreground/88">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-glass p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick actions
              </div>
              <div className="mt-4 grid gap-3">
                <Button variant="outline" className="justify-between" onClick={handleNewProject}>
                  Start new project
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="justify-between" onClick={handleImport}>
                  Import from GitHub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </AmbientBackdrop>
  );
};

export default Dashboard;
