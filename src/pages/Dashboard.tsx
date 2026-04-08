import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Plus, FolderGit2, LogOut, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  updatedAt: string;
  collaborators: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects] = useState<Project[]>([
    { id: '1', name: 'My First Project', updatedAt: '2 hours ago', collaborators: 3 },
    { id: '2', name: 'React Dashboard', updatedAt: '1 day ago', collaborators: 1 },
    { id: '3', name: 'TypeScript Utils', updatedAt: '3 days ago', collaborators: 2 },
  ]);

  const handleNewProject = () => {
    toast({
      title: 'Creating project...',
      description: 'Opening editor',
    });
    navigate('/editor/demo-project');
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleLogout = () => {
    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="CodeColab Logo" className="w-8 h-8 object-contain" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CodeColab
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleNewProject} className="bg-gradient-primary hover:bg-gradient-hover">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
            <Button variant="outline" className="bg-surface border-border">
              <FolderGit2 className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Your Projects</h2>
            <p className="text-muted-foreground">
              Create, manage, and collaborate on your projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <button
                  onClick={() => handleOpenProject(project.id)}
                  className="w-full bg-card border border-border rounded-lg p-6 hover:border-primary transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Code2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{project.collaborators}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 text-left group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Updated {project.updatedAt}</span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={handleNewProject}
                variant="outline"
                className="w-full justify-start bg-surface border-border hover:bg-muted"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Project
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-surface border-border hover:bg-muted"
              >
                <FolderGit2 className="w-4 h-4 mr-2" />
                Import from GitHub
              </Button>
              <div className="pt-2">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Join Existing Session
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter session code..."
                    className="bg-surface border-border"
                  />
                  <Button className="bg-gradient-primary hover:bg-gradient-hover">Join</Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
