import { FileText, MessageSquare, Sparkles, Settings } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import FileExplorer from './FileExplorer';

const Sidebar = () => {
  const { leftSidebarTab, setLeftSidebarTab } = useEditorStore();

  const tabs = [
    { id: 'files' as const, icon: FileText, label: 'Files' },
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'ai' as const, icon: Sparkles, label: 'AI' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-12 bg-surface border-r border-border flex flex-col items-center py-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="icon"
              onClick={() => setLeftSidebarTab(tab.id)}
              className={`w-10 h-10 ${
                leftSidebarTab === tab.id ? 'bg-muted text-primary' : 'text-muted-foreground'
              }`}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
            </Button>
          );
        })}
      </div>

      <div className="w-56 h-full">
        {leftSidebarTab === 'files' && <FileExplorer />}
        {leftSidebarTab === 'chat' && (
          <div className="h-full bg-surface border-r border-border p-4">
            <p className="text-sm text-muted-foreground">Team chat coming soon...</p>
          </div>
        )}
        {leftSidebarTab === 'ai' && (
          <div className="h-full bg-surface border-r border-border p-4">
            <p className="text-sm text-muted-foreground">AI features coming soon...</p>
          </div>
        )}
        {leftSidebarTab === 'settings' && (
          <div className="h-full bg-surface border-r border-border p-4">
            <p className="text-sm text-muted-foreground">Settings coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
