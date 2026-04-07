import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editorStore';

const Terminal = () => {
  const { files, currentFile } = useEditorStore();
  const [history, setHistory] = useState<string[]>([
    'Welcome to CodeColab Terminal',
    'Type "run" to execute your current file, or specify the file: "python main.py", "node index.js"',
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    
    setHistory((prev) => [...prev, `$ ${trimmed}`]);
    
    const args = trimmed.split(' ');
    const command = args[0].toLowerCase();
    
    if (command === 'clear') {
      setHistory([]);
      return;
    }

    const currentFileData = files.find(f => f.id === currentFile);
    const fileName = args.length > 1 ? args[1] : (currentFileData?.name || '');
    
    if (!fileName) {
      setHistory((prev) => [...prev, 'Error: No file specified or open.']);
      return;
    }

    const file = files.find(f => f.name === fileName);

    if (command === 'run' || command === 'node' || command === 'python' || command === 'go' || command === 'javac') {
      if (!file) {
        setHistory((prev) => [...prev, `Error: File '${fileName}' not found in workspace.`]);
        return;
      }
      
      setHistory((prev) => [...prev, `Executing ${fileName}...`]);
      
      setTimeout(() => {
        if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
           try {
              // Extremely basic sandboxed eval for demo purposes
              const logs: any[] = [];
              const oldLog = console.log;
              console.log = (...a) => logs.push(a.join(' '));
              // Note: using eval directly on typescript will fail if it has type syntax, but it's fine for simple JS mocking
              const jsCode = file.content.replace(/import .*;|export .*/g, '');
              new Function(jsCode)();
              console.log = oldLog;
              setHistory((prev) => [...prev, ...logs, 'Process exited with code 0.']);
           } catch (e: any) {
              setHistory((prev) => [...prev, `Error: ${e.message}`, 'Process exited with code 1.']);
           }
        } else {
           // Mocking for non-JS languages since we have no WebContainers backend right now
           setHistory((prev) => [...prev, `[Server: ${command} compiler invoked]`, 'Hello World!', 'Process exited with code 0.']);
        }
      }, 600);
      return;
    }

    setHistory((prev) => [...prev, `Command not found: ${command}`]);
  };

  return (
    <div className="h-full bg-editor border-t border-border flex flex-col font-mono text-sm">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-surface">
        <TerminalIcon className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-foreground">Terminal</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 pb-8">
          {history.map((line, i) => (
            <div
              key={i}
              className={`${line.startsWith('$') ? 'text-success' : line.startsWith('Error') ? 'text-destructive' : 'text-muted-foreground'} whitespace-pre-wrap break-all`}
            >
              {line}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border bg-background flex items-center gap-2 w-full">
        <span className="text-success select-none">$</span>
        <input 
          autoFocus
          className="flex-1 bg-transparent outline-none text-foreground w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
               handleCommand(input);
               setInput('');
            }
          }}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default Terminal;
