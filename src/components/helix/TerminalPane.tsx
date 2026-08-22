import { useHelix } from "@/lib/helix/store";
import { Icon, IconButton } from "./primitives";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function TerminalPane() {
  const {
    terminals,
    activeTerminal,
    setActiveTerminal,
    runCommand,
    newTerminal,
    setBottomOpen,
    agents,
  } = useHelix();
  const term = terminals.find((t) => t.id === activeTerminal) ?? terminals[0];
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [term?.lines.length]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="hairline-b flex h-8 shrink-0 items-center gap-1 px-2">
        {terminals.map((t) => {
          const agent = agents.find((a) => a.id === t.agentId);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTerminal(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11.5px]",
                t.id === term?.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Icon name={agent ? "Bot" : "SquareTerminal"} className="size-3" />
              {t.name}
              {t.running && <span className="size-1.5 rounded-full bg-success pulse-dot" />}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <IconButton icon="Plus" label="New terminal" onClick={newTerminal} />
          <IconButton icon="ChevronDown" label="Hide panel" onClick={() => setBottomOpen(false)} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-[1.6]">
        {term?.lines.map((l) => (
          <div
            key={l.id}
            className={cn(
              "whitespace-pre-wrap",
              l.kind === "command" && "text-foreground",
              l.kind === "stdout" && "text-foreground/70",
              l.kind === "stderr" && "text-destructive",
              l.kind === "system" && "text-muted-foreground/70",
            )}
          >
            {l.kind === "command" && <span className="text-primary">❯ </span>}
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="hairline-t flex items-center gap-2 px-3 py-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          runCommand(input.trim());
          setInput("");
        }}
      >
        <span className="font-mono text-[11.5px] text-muted-foreground">{term?.cwd}</span>
        <span className="font-mono text-[12px] text-primary">❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="run a command…"
          className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/50"
        />
      </form>
    </div>
  );
}
