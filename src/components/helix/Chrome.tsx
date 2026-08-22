import { useHelix } from "@/lib/helix/store";
import { projectIntel } from "@/lib/helix/data";
import { Chip, Icon, IconButton } from "./primitives";
import { cn } from "@/lib/utils";

export function TitleBar() {
  const { setPaletteOpen, activeModel, approvals, setView } = useHelix();
  return (
    <div className="hairline-b flex h-10 shrink-0 items-center gap-3 bg-sidebar px-3">
      <div className="flex items-center gap-2">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </span>
        <span className="ml-2 text-[12.5px] font-semibold tracking-tight">
          Helix<span className="text-primary">Agent</span>
        </span>
        <Chip tone="muted">v0.4.2</Chip>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="mx-auto flex h-6 w-[420px] max-w-[45vw] items-center gap-2 rounded-md border border-border bg-background/60 px-2 text-[11.5px] text-muted-foreground transition-colors hover:border-border-strong"
      >
        <Icon name="Search" className="size-3" />
        <span className="truncate">helix-core — search files, agents, commands</span>
        <kbd className="ml-auto rounded-[3px] border border-border px-1 font-mono text-[10px]">⌘K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        {approvals.length > 0 && (
          <button
            type="button"
            onClick={() => setView("agents")}
            className="flex items-center gap-1 rounded-sm bg-warning/12 px-2 py-0.5 text-[11px] text-warning"
          >
            <Icon name="ShieldAlert" className="size-3" />
            {approvals.length} approvals
          </button>
        )}
        <Chip tone="primary">
          <Icon name="Cpu" className="size-3" />
          {activeModel}
        </Chip>
        <IconButton icon="PanelBottom" label="Toggle terminal" />
        <IconButton icon="Settings2" label="Settings" onClick={() => setView("settings")} />
      </div>
    </div>
  );
}

export function StatusBar() {
  const { agentState, agents, contextItems, setBottomOpen, bottomOpen } = useHelix();
  const busy = agents.filter((a) => ["thinking", "running"].includes(agentState[a.id]?.status ?? ""));
  const tokens = contextItems.reduce((n, c) => n + c.tokens, 0);
  return (
    <div className="hairline-t flex h-6 shrink-0 items-center gap-3 bg-sidebar px-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1 text-foreground/80">
        <Icon name="GitBranch" className="size-3 text-primary" />
        feat/session-audit
      </span>
      <span className="flex items-center gap-1">
        <Icon name="CircleDot" className="size-3" />3 changes
      </span>
      <span className="flex items-center gap-1">
        <Icon name="Database" className="size-3" />
        index {projectIntel.indexedFiles} files
      </span>
      <span
        className={cn(
          "flex items-center gap-1",
          busy.length > 0 ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon name="Bot" className="size-3" />
        {busy.length > 0 ? `${busy.length} agent(s) working` : "agents idle"}
      </span>
      <span className="ml-auto flex items-center gap-3">
        <span>{tokens.toLocaleString()} ctx tokens</span>
        <span>RAM 214 MB</span>
        <button type="button" onClick={() => setBottomOpen(!bottomOpen)} className="hover:text-foreground">
          Terminal ⌃`
        </button>
        <span>UTF-8 · TypeScript</span>
      </span>
    </div>
  );
}
