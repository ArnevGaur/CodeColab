import { FileText, MessageSquare, Sparkles, Settings, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import FileExplorer from './FileExplorer';
import HistoryPanel from './HistoryPanel';
import * as Y from 'yjs';

interface SidebarProps {
  doc: Y.Doc | null;
}

const Sidebar = ({ doc }: SidebarProps) => {
  const { leftSidebarTab, setLeftSidebarTab } = useEditorStore();

  const tabs = [
    { id: 'files' as const, icon: FileText, label: 'Files' },
    { id: 'history' as const, icon: History, label: 'History' },
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
            <motion.div
              key={tab.id}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const isCurrentlyActive = leftSidebarTab === tab.id;
                  const { leftSidebarOpen, toggleLeftSidebar } = useEditorStore.getState();
                  
                  if (isCurrentlyActive && leftSidebarOpen) {
                    toggleLeftSidebar();
                  } else {
                    setLeftSidebarTab(tab.id);
                    if (!leftSidebarOpen) {
                      toggleLeftSidebar();
                    }
                  }
                }}
                className={`w-10 h-10 ${
                  leftSidebarTab === tab.id
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={tab.label}
              >
                <Icon className="w-5 h-5" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="flex-1 h-full min-w-0 flex flex-col">
        {leftSidebarTab === 'files' && <FileExplorer doc={doc} />}
        {leftSidebarTab === 'history' && <HistoryPanel doc={doc} />}
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
