import { useState } from 'react';
import { Share2, Users } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import ShareModal from './ShareModal';

const TopBar = () => {
  const { collaborators } = useEditorStore();
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">demo-project.tsx</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Collaborators:</span>
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

          <Button
            onClick={() => setShowShareModal(true)}
            size="sm"
            className="bg-gradient-primary hover:bg-gradient-hover"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <ShareModal open={showShareModal} onOpenChange={setShowShareModal} />
    </>
  );
};

export default TopBar;
