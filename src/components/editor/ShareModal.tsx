import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareModal = ({ open, onOpenChange }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState('edit');
  const { toast } = useToast();
  const { projectId } = useParams();
  const shareLink = `${window.location.origin}/editor/${projectId || 'demo-project'}`;


  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({
      title: 'Link copied!',
      description: 'Share link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/8 bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share Project</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Copy a room link or set a basic share mode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Project Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                size="icon"
                variant="outline"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Permissions</Label>
            <RadioGroup value={permission} onValueChange={setPermission}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="view" id="view" />
                <Label htmlFor="view" className="text-muted-foreground font-normal">
                  View only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="edit" />
                <Label htmlFor="edit" className="text-muted-foreground font-normal">
                  Can edit
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Invite via Email</Label>
            <div className="flex gap-2">
              <Input
                placeholder="colleague@example.com"
              />
              <Button>Invite</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
