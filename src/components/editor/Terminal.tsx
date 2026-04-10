import { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, X } from "lucide-react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch, getAccessTokenPayload } from "@/lib/auth";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

interface TerminalProps {
  doc?: Y.Doc | null;
}

const Terminal = ({ doc }: TerminalProps) => {
  const { projectId } = useParams();
  const { files, currentFile } = useEditorStore();
  const [history, setHistory] = useState<string[]>([
    "CodeColab terminal ready.",
    'Use "run" to execute the active file, or target one directly: "python main.py", "node index.js".',
  ]);
  const [input, setInput] = useState("");
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, `$ ${trimmed}`]);

    const args = trimmed.split(" ");
    const command = args[0].toLowerCase();

    if (command === "clear") {
      setHistory([]);
      return;
    }

    const currentFileData = files.find((file) => file.id === currentFile);
    const fileName = args.length > 1 ? args[1] : currentFileData?.name || "";

    if (!fileName) {
      setHistory((prev) => [...prev, "Error: no file specified or active."]);
      return;
    }

    const file = files.find((entry) => entry.name === fileName) || currentFileData;

    if (command === "run" || command === "node" || command === "python" || command === "go" || command === "javac") {
      if (!file) {
        setHistory((prev) => [...prev, `Error: file '${fileName}' not found in workspace.`]);
        return;
      }

      const execute = async () => {
        setIsExecuting(true);
        setHistory((prev) => [...prev, `Executing ${fileName}...`]);

        let codeToExecute = file.content || "";
        if (doc && file?.id) {
          const liveText = doc.getText(`file:${file.id}`).toString();
          if (liveText.length > 0 || file.id === currentFile) {
            codeToExecute = liveText;
          }
        }

        if (codeToExecute === undefined || codeToExecute === null) {
          codeToExecute = "";
        }

        try {
          const payload = getAccessTokenPayload();
          const username = payload?.username || "User";

          await authenticatedFetch("/api/checkpoints", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomId: projectId,
              content: codeToExecute,
              type: "pre-execution",
              label: `Before run by ${username}`,
            }),
          });
        } catch (e) {
          console.error("Failed to save pre-execution checkpoint", e);
        }

        const ext = fileName.split(".").pop()?.toLowerCase();
        let execLang = "javascript";
        if (ext === "py") execLang = "python";
        else if (ext === "cpp" || ext === "c") execLang = "cpp";
        else if (ext === "java") execLang = "java";
        else if (ext === "ts") execLang = "typescript";
        else if (ext === "cs") execLang = "csharp";

        try {
          const res = await authenticatedFetch("/api/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              language: execLang,
              content: codeToExecute,
              stdin,
            }),
          });

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            const errorMessage = data?.error || `Execution failed with status ${res.status}`;
            const stderrMessage = data?.stderr ? ` ${data.stderr}` : "";
            setHistory((prev) => [...prev, `Error: ${errorMessage}${stderrMessage}`]);
          } else if (data?.error) {
            setHistory((prev) => [...prev, `Error: ${data.error}${data.stderr ? ` ${data.stderr}` : ""}`]);
          } else {
            const outLines = (data?.stdout || "").split("\n").filter(Boolean);
            const errLines = (data?.stderr || "").split("\n").filter(Boolean);
            const compLines = (data?.compile_output || "").split("\n").filter(Boolean);
            const hasVisibleOutput = outLines.length > 0 || errLines.length > 0 || compLines.length > 0;

            setHistory((prev) => [
              ...prev,
              ...compLines.map((line: string) => `Compiler: ${line}`),
              ...(hasVisibleOutput ? [] : ["Execution completed with no output."]),
              ...outLines,
              ...errLines.map((line: string) => `Error: ${line}`),
              `Process exited with code ${data?.code !== undefined ? data.code : "unknown"}`,
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
    <div className="flex h-full min-h-0 flex-col bg-[#0B1220] text-[13px] font-mono text-foreground/90 selection:bg-primary/20">
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-white/[0.01] px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
            <TerminalIcon className="h-3.5 w-3.5" />
            <span>Terminal</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          {isExecuting ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-200/80">Running...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500/80"></span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80">Ready</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStdin(!showStdin)}
            className={cn(
               "h-6 rounded-md px-2 font-mono text-[9px] uppercase tracking-wider transition-all",
               showStdin 
                ? "bg-white/[0.08] text-foreground" 
                : "text-muted-foreground/60 hover:bg-white/[0.05] hover:text-foreground"
            )}
          >
            {showStdin ? "Close Input" : "Program Input"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistory([])}
            className="h-6 rounded-md px-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 hover:bg-white/[0.05] hover:text-foreground"
          >
            Clear
          </Button>

          <div className="h-3 w-px bg-white/10 mx-0.5" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={useEditorStore.getState().toggleTerminal}
            className="h-6 w-6 rounded-md p-0 text-muted-foreground/60 hover:bg-white/[0.06] hover:text-foreground/90 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showStdin ? (
        <div className="border-b border-white/5 bg-white/[0.005] p-3">
          <p className="mb-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">
            Buffer for standard input
          </p>
          <Textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder={"Enter input here (one line per prompt)..."}
            className="min-h-[72px] border-white/5 bg-white/[0.01] font-mono text-[13px] text-foreground/80 placeholder:text-muted-foreground/30 focus-visible:ring-primary/20"
          />
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4 font-mono leading-relaxed">
          {history.map((line, index) => {
            const isCommand = line.startsWith("$");
            const isError = line.startsWith("Error");
            const isSuccess = line.startsWith("Process exited with code 0");

            return (
              <div
                key={`${line}-${index}`}
                className={cn(
                  "whitespace-pre-wrap break-all transition-colors",
                  isCommand ? "text-primary/90 font-bold" :
                  isError ? "text-rose-400/90" :
                  isSuccess ? "text-emerald-400/90" :
                  "text-foreground/70"
                )}
              >
                {line}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-white/5 bg-white/[0.005] px-4 py-2.5">
        <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] px-3 py-1.5 focus-within:border-primary/30 focus-within:bg-white/[0.02] transition-all">
          <span className="select-none text-[11px] font-bold text-primary/50">$</span>
          <input
            autoFocus
            className="w-full flex-1 bg-transparent text-[13px] text-foreground/90 outline-none placeholder:text-muted-foreground/30"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommand(input);
                setInput("");
              }
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder='run or node index.js'
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
