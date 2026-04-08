import { useState } from 'react';
import { Share2, Users, Circle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import ShareModal from './ShareModal';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TopBar = () => {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const { role, setRole, onlineUsers, files } = useEditorStore();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login'; // Force full refresh to clear all states
  };

  // Helper: get a file name from its ID
  const getFileName = (fileId?: string) => {
    if (!fileId) return 'No file';
    const file = files.find(f => f.id === fileId);
    return file?.name || fileId;
  };

  return (
    <>
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">CodeMate</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {onlineUsers.length} online
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Role selector */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-background border border-border text-xs rounded px-2 py-1 outline-none text-muted-foreground"
          >
            <option value="owner">Owner (Full Access)</option>
            <option value="editor">Editor (Can Type)</option>
            <option value="viewer">Viewer (Read Only)</option>
          </select>

          {/* Live user avatars */}
          <div className="flex items-center -space-x-2">
            {onlineUsers.map((user, i) => (
              <Tooltip key={user.clientId}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    className="relative w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-xs font-bold text-white cursor-default shadow-md"
                    style={{ backgroundColor: user.color, zIndex: onlineUsers.length - i }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                    {/* Pulsing green dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card">
                      <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                    </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border text-xs">
                  <div className="font-medium" style={{ color: user.color }}>{user.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    Editing: {getFileName(user.currentFile)}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Share button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setShowShareModal(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-4"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </motion.div>

          {/* Logout button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Log Out
            </TooltipContent>
          </Tooltip>
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
