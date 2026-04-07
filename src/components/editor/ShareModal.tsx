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

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareModal = ({ open, onOpenChange }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState('edit');
  const { toast } = useToast();
  const shareLink = `${window.location.origin}/editor/demo-project?share=true`;

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
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share Project</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share this project with your collaborators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Project Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="bg-surface border-border font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                size="icon"
                className="bg-gradient-primary hover:bg-gradient-hover"
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
                className="bg-surface border-border"
              />
              <Button className="bg-gradient-primary hover:bg-gradient-hover">Invite</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
