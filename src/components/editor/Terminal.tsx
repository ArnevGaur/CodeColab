import { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch, getAccessTokenPayload } from "@/lib/auth";
import { useEditorStore } from "@/store/editorStore";

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

    const file = files.find((entry) => entry.name === fileName);

    if (command === "run" || command === "node" || command === "python" || command === "go" || command === "javac") {
      if (!file) {
        setHistory((prev) => [...prev, `Error: file '${fileName}' not found in workspace.`]);
        return;
      }

      const execute = async () => {
        setIsExecuting(true);
        setHistory((prev) => [...prev, `Executing ${fileName}...`]);

        let codeToExecute = file.content;
        if (file.id === currentFile && doc) {
          codeToExecute = doc.getText(`file:${currentFile}`).toString();
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

          const data = await res.json();

          if (data.error) {
            setHistory((prev) => [...prev, `Error (${data.error}): ${data.stderr ? data.stderr : ""}`]);
          } else {
            const outLines = (data.stdout || "").split("\n").filter(Boolean);
            const errLines = (data.stderr || "").split("\n").filter(Boolean);
            const compLines = (data.compile_output || "").split("\n").filter(Boolean);

            setHistory((prev) => [
              ...prev,
              ...compLines.map((line: string) => `Compiler: ${line}`),
              ...outLines,
              ...errLines.map((line: string) => `Error: ${line}`),
              `Process exited with code ${data.code !== undefined ? data.code : "unknown"}`,
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
    <div className="flex h-full min-h-0 flex-col bg-editor text-xs font-mono text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-surface/85 px-3 py-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
            <TerminalIcon className="h-4 w-4 text-primary" />
            Terminal
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Run the active file or specify one directly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showStdin ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowStdin(!showStdin)}
            className="h-7 rounded-full px-2.5 text-[11px]"
          >
            {showStdin ? "Hide stdin" : "Program input"}
          </Button>
          {isExecuting ? (
            <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Running...
            </div>
          ) : null}
        </div>
      </div>

      {showStdin ? (
        <div className="border-b border-white/8 bg-surface/70 p-3">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Program Input Buffer
          </p>
          <Textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder={"One line per input call\nEx: Arnev\n25"}
            className="min-h-[64px] font-mono text-xs"
          />
        </div>
      ) : null}

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-3">
          {history.map((line, index) => (
            <div
              key={`${line}-${index}`}
              className={`whitespace-pre-wrap break-all ${
                line.startsWith("$")
                  ? "text-primary"
                  : line.startsWith("Error")
                    ? "text-destructive"
                    : "text-foreground/82"
              }`}
            >
              {line}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-white/8 bg-surface/85 px-3 py-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <span className="select-none text-primary">$</span>
          <input
            autoFocus
            className="w-full flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
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
