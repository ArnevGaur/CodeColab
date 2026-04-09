import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, FolderGit2, LogOut, Plus, Search, Users } from "lucide-react";
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
  { label: "Checkpoints", value: "27" },
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
    <AmbientBackdrop tone="soft">
      <header className="border-b border-white/6 bg-[hsl(var(--background)/0.42)] backdrop-blur-xl">
        <div className="container flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <BrandMark compact quiet subtitle="Project dashboard" />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <FolderGit2 className="h-4 w-4" />
              Import repo
            </Button>
            <Button size="sm" className="accent-ring" onClick={handleNewProject}>
              <Plus className="h-4 w-4" />
              New room
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 pb-10 pt-8 sm:px-6 lg:pb-14 lg:pt-10">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <div className="eyebrow w-fit">Workspace overview</div>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              {firstName}, pick up work without sorting through noise.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              Open an existing room, create a new one, or jump into a shared session with a code. The dashboard is now
              a simple launch point instead of a stack of competing cards.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {dashboardStats.map((item) => (
                <div key={item.label} className="border-t border-white/6 pt-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="panel-glass p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Join a room</p>
            <h2 className="mt-3 font-display text-xl font-semibold text-foreground">Enter a code and continue.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use a room ID to go straight into a shared editor session.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code"
                  className="pl-10"
                />
              </div>
              <Button onClick={handleJoin}>
                Join
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.aside>
        </section>

        <section className="mt-10 border-t border-white/6 pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent rooms</p>
              <h2 className="mt-2 font-display text-xl font-semibold text-foreground">Continue where you left off.</h2>
            </div>
          </div>

          <div className="divide-y divide-white/6 rounded-[1.25rem] border border-white/6 bg-white/[0.02]">
            {projects.map((project, index) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                onClick={() => handleOpenProject(project.id)}
                className="flex w-full flex-col gap-4 px-4 py-4 text-left transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-muted-foreground">
                      <FolderGit2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{project.language}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full border border-white/8 px-2.5 py-1">{project.status}</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {project.collaborators}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {project.updatedAt}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    </AmbientBackdrop>
  );
};

export default Dashboard;
