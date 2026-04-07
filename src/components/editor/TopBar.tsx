import { useState } from 'react';
import { Share2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import ShareModal from './ShareModal';

const TopBar = () => {
  const [showShareModal, setShowShareModal] = useState(false);
  const { collaborators, role, setRole, onlineUsers } = useEditorStore();

  return (
    <>
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">demo-project.tsx</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Online: {onlineUsers.length}</span>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-background border border-border text-xs rounded px-2 py-1 outline-none text-muted-foreground mr-6"
            >
              <option value="owner">Owner (Full Access)</option>
              <option value="editor">Editor (Can Type)</option>
              <option value="viewer">Viewer (Read Only)</option>
            </select>
            
            <div className="flex -space-x-2">
              {collaborators.map((collab, i) => (
                <div
                  key={collab.id}
                  className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: collab.color }}
                  title={collab.name}
                >
                  {collab.name[0]}
                </div>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setShowShareModal(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow border border-primary/20 relative overflow-hidden"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </motion.div>
        </div>
      </div>

      <ShareModal 
        open={showShareModal} 
        onOpenChange={setShowShareModal} 
      />
    </>
  );
};

export default TopBar;
