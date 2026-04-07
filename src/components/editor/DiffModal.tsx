import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiffEditor } from '@monaco-editor/react';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  modifiedContent: string;
  language?: string;
  label?: string;
}

const DiffModal = ({ isOpen, onClose, originalContent, modifiedContent, language = 'javascript', label }: DiffModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[80vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Compare with {label || 'Previous Version'}
          </DialogTitle>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Checkpoint Version</span>
            <span>Current Live Version</span>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 border border-border rounded-md overflow-hidden">
          <DiffEditor
            original={originalContent}
            modified={modifiedContent}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              renderSideBySide: true,
              automaticLayout: true,
              fontSize: 13,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiffModal;
