import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '@/store/editorStore';
import * as Y from 'yjs';
import { useParams } from 'react-router-dom';

interface TerminalProps {
  doc?: Y.Doc | null;
}

const Terminal = ({ doc }: TerminalProps) => {
  const { projectId } = useParams();
  const { files, currentFile } = useEditorStore();
  const [history, setHistory] = useState<string[]>([
    'Welcome to CodeColab Terminal',
    'Type "run" to execute your current file, or specify the file: "python main.py", "node index.js"',
  ]);
  const [input, setInput] = useState('');
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
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
      
      const execute = async () => {
        setIsExecuting(true);
        setHistory((prev) => [...prev, `⚙️ Executing ${fileName}...`]);
        
        let codeToExecute = file.content;
        if (file.id === currentFile && doc) {
          codeToExecute = doc.getText(`file:${currentFile}`).toString();
        }

        const token = localStorage.getItem('token');
        
        // 1. Critical: Save pre-execution checkpoint
        try {
          // Decode username from token for the label
          let username = 'User';
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              username = payload.username || 'User';
            } catch (e) {}
          }

          await fetch('/api/checkpoints', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              roomId: projectId,
              content: codeToExecute,
              type: 'pre-execution',
              label: `Before run by ${username}`
            })
          });
        } catch (e) {
          console.error('Failed to save pre-execution checkpoint', e);
        }

        // 2. Execute code
        const ext = fileName.split('.').pop()?.toLowerCase();
        let execLang = 'javascript';
        if (ext === 'py') execLang = 'python';
        else if (ext === 'cpp' || ext === 'c') execLang = 'cpp';
        else if (ext === 'java') execLang = 'java';
        else if (ext === 'ts') execLang = 'typescript';
        else if (ext === 'cs') execLang = 'csharp';

        try {
          const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              language: execLang, 
              content: codeToExecute,
              stdin: stdin // Include the provided stdin buffer
            })
          });
          
          const data = await res.json();
          
          if (data.error) {
            setHistory((prev) => [...prev, `Error (${data.error}): ${data.stderr ? data.stderr : ''}`]);
          } else {
            const outLines = (data.stdout || '').split('\n').filter(Boolean);
            const errLines = (data.stderr || '').split('\n').filter(Boolean);
            const compLines = (data.compile_output || '').split('\n').filter(Boolean);
            
            setHistory((prev) => [
              ...prev,
              ...compLines.map((l: string) => `Compiler: ${l}`),
              ...outLines,
              ...errLines.map((e: string) => `Error: ${e}`),
              `Process exited with code ${data.code !== undefined ? data.code : 'unknown'}`
            ]);
          }
        } catch (err: any) {
          setHistory((prev) => [...prev, `Error connecting to execution server: ${err.message}`]);
        } finally {
          setIsExecuting(false);
        }
      };

      execute();
      return;
    }

    setHistory((prev) => [...prev, `Command not found: ${command}`]);
  };

  return (
    <div className="h-full bg-editor border-t border-border flex flex-col font-mono text-sm">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-foreground">Terminal</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowStdin(!showStdin)}
          className={`h-6 text-[10px] px-2 ${showStdin ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
        >
          {showStdin ? 'Hide Input Buffer' : 'Program Input (stdin)'}
        </Button>
      </div>

      <AnimatePresence>
        {showStdin && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-card/50 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase px-1 font-bold">
                Program Input Buffer (One line per input call)
              </div>
              <textarea 
                className="w-full bg-editor border border-border rounded p-2 text-xs text-foreground focus:outline-none focus:border-primary min-h-[60px] resize-none font-mono"
                placeholder="Ex: Arnev&#10;25"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
