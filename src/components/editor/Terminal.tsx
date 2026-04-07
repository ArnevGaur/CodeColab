import { Terminal as TerminalIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const Terminal = () => {
  const terminalOutput = [
    '$ npm run dev',
    '',
    '> codemate@1.0.0 dev',
    '> vite',
    '',
    '  VITE v5.0.0  ready in 324 ms',
    '',
    '  ➜  Local:   http://localhost:5173/',
    '  ➜  Network: use --host to expose',
    '  ➜  press h + enter to show help',
    '',
  ];

  return (
    <div className="h-full bg-editor border-t border-border flex flex-col">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-surface">
        <TerminalIcon className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-foreground">Terminal</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 font-mono text-sm">
          {terminalOutput.map((line, i) => (
            <div
              key={i}
              className={line.startsWith('$') ? 'text-success' : 'text-muted-foreground'}
            >
              {line}
            </div>
          ))}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-success">$</span>
            <span className="bg-foreground w-2 h-4 animate-pulse"></span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Terminal;
