import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/editorStore';
import * as Y from 'yjs';

interface TerminalProps {
  doc?: Y.Doc | null;
}

const Terminal = ({ doc }: TerminalProps) => {
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
      
      setHistory((prev) => [...prev, `⚙️ Executing ${fileName}...`]);
      
      let codeToExecute = file.content;
      if (file.id === currentFile && doc) {
         codeToExecute = doc.getText('monaco').toString();
      }

      // Map file extension to Piston supported languages
      const ext = fileName.split('.').pop()?.toLowerCase();
      let execLang = 'javascript';
      if (ext === 'py') execLang = 'python';
      else if (ext === 'cpp' || ext === 'c') execLang = 'cpp';
      else if (ext === 'java') execLang = 'java';
      else if (ext === 'ts') execLang = 'typescript';
      else if (ext === 'cs') execLang = 'csharp';

      fetch('/api/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Assuming authorization token exists
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ language: execLang, content: codeToExecute })
      })
      .then(res => res.json())
      .then((data: any) => {
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
      })
      .catch((err: any) => {
        setHistory((prev) => [...prev, `Error connecting to execution server: ${err.message}`]);
      });
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
