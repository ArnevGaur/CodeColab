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

const dashboardStats = [
  { label: "Open rooms", value: "03" },
  { label: "Collaborators", value: "09" },
  { label: "Checkpoint saves", value: "27" },
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
        <div className="container flex flex-col gap-2 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact quiet subtitle="Project dashboard" />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="text-[12px]" onClick={handleImport}>
              <FolderGit2 className="h-4 w-4" />
              Import repo
            </Button>
            <Button size="sm" className="accent-ring text-[12px]" onClick={handleNewProject}>
              <Plus className="h-4 w-4" />
              New room
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 pb-8 pt-4 sm:px-6 lg:pb-10 lg:pt-5">
        <section className="grid gap-2.5 lg:grid-cols-[1.16fr_0.84fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="panel-glass p-3.5 sm:p-4"
          >
            <div className="eyebrow w-fit">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Studio dashboard
            </div>
            <div className="mt-3 flex flex-col gap-4">
              <div className="max-w-2xl">
                <h1 className="font-display text-[1.55rem] font-bold text-foreground sm:text-[1.9rem]">
                  {firstName}, your collaborative workspace is looking sharper now.
                </h1>
                <p className="mt-2 max-w-xl text-[12px] leading-5 text-muted-foreground">
                  Project cards, quick actions, and join flow now sit inside a single dark product shell rather than a
                  pile of default panels.
                </p>
              </div>
              <div className="panel-subtle grid gap-px overflow-hidden sm:grid-cols-3">
                {dashboardStats.map((item, index) => (
                  <div
                    key={item.label}
                    className={`bg-white/[0.02] px-3 py-2.5 ${index !== 0 ? "border-l border-white/6" : ""}`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1.5 font-display text-[1.15rem] font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="panel-glass p-3.5"
          >
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Users className="h-4 w-4 text-accent" />
              Join existing session
            </div>
            <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
              Jump straight into an existing room with a code. This stays visible so the dashboard works as an actual
              launchpad, not just a card list.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="h-8 pl-10 text-[13px]"
                />
              </div>
              <Button size="sm" className="text-[12px]" onClick={handleJoin}>
                Join room
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="panel-subtle p-2.5">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                  <Terminal className="h-4 w-4 text-primary" />
                  Runtime ready
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Run code in place without leaving the room.</p>
              </div>
              <div className="panel-subtle p-2.5">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                  <Clock3 className="h-4 w-4 text-accent" />
                  Save history
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">Checkpoint recovery stays one panel away.</p>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="mt-4 grid gap-2.5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-2">
            {projects.map((project, index) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                onClick={() => handleOpenProject(project.id)}
                className="panel-glass group block w-full p-3.5 text-left transition hover:-translate-y-1"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/12 text-primary">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{project.language}</p>
                        <h2 className="font-display text-[15px] font-semibold text-foreground">{project.name}</h2>
                      </div>
                    </div>
                    <p className="max-w-xl text-[12px] leading-5 text-muted-foreground">
                      The workspace card now carries enough hierarchy to scan team activity, stack, and freshness in one pass.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-4">
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-foreground">
                      {project.status}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {project.collaborators} collaborators
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {project.updatedAt}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <aside className="space-y-2.5">
            <div className="panel-glass p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent focus</p>
              <h2 className="mt-2 font-display text-[15px] font-semibold text-foreground">Work the room, not the UI.</h2>
              <div className="mt-2.5 space-y-1.5">
                {[
                  "Files, AI, terminal, and checkpoints are all one interaction away.",
                  "Surface contrast now separates navigation, content, and status layers properly.",
                  "Mobile sizing is tighter so cards do not feel inflated on smaller screens.",
                ].map((item) => (
                  <div key={item} className="panel-subtle flex items-start gap-2.5 p-2.5">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-[12px] leading-5 text-foreground/88">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-glass p-3.5">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick actions
              </div>
              <div className="mt-2.5 grid gap-1.5">
                <Button variant="outline" size="sm" className="justify-between text-[12px]" onClick={handleNewProject}>
                  Start new project
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="justify-between text-[12px]" onClick={handleImport}>
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
