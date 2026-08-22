import { useHelix } from "@/lib/helix/store";
import { Chip, Icon, IconButton, PanelHeader, StatusDot, accentBg } from "./primitives";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tabs = [
  { id: "chat", label: "Chat" },
  { id: "timeline", label: "Timeline" },
  { id: "context", label: "Context" },
  { id: "logs", label: "Logs" },
];

function Composer() {
  const { runTask, agents, activeModel } = useHelix();
  const [text, setText] = useState("");
  return (
    <div className="hairline-t bg-surface p-2">
      <div className="rounded-md border border-border bg-background focus-within:border-primary/50">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) {
                runTask(text.trim());
                setText("");
              }
            }
          }}
          rows={3}
          placeholder="Describe a goal — the Orchestrator will plan, route and validate it…"
          className="w-full resize-none bg-transparent p-2 text-[12.5px] outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center gap-1.5 px-2 pb-1.5">
          <Chip tone="primary">
            <Icon name="Cpu" className="size-3" />
            {activeModel}
          </Chip>
          <Chip tone="violet">
            <Icon name="Workflow" className="size-3" />
            orchestrator
          </Chip>
          <Chip>{agents.length} agents</Chip>
          <button
            type="button"
            onClick={() => {
              if (text.trim()) {
                runTask(text.trim());
                setText("");
              }
            }}
            className="ml-auto flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[11.5px] font-medium text-primary-foreground hover:opacity-90"
          >
            Run <Icon name="CornerDownLeft" className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Chat() {
  const { messages, agents } = useHelix();
  return (
    <div className="flex-1 space-y-3 overflow-auto p-3">
      {messages.map((m) => {
        const agent = agents.find((a) => a.id === m.agentId);
        return (
          <div key={m.id} className="fade-up">
            <div className="mb-1 flex items-center gap-1.5">
              {m.role === "user" ? (
                <>
                  <span className="grid size-5 place-items-center rounded-md bg-muted">
                    <Icon name="User" className="size-3 text-muted-foreground" />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">You</span>
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-md",
                      accentBg[agent?.accent ?? "primary"],
                    )}
                  >
                    <Icon name={agent?.icon ?? "Bot"} className="size-3" />
                  </span>
                  <span className="text-[11px] font-medium">{agent?.name ?? "Assistant"}</span>
                  <Chip>{agent?.model}</Chip>
                </>
              )}
            </div>
            <div
              className={cn(
                "whitespace-pre-wrap rounded-md border border-border px-2.5 py-2 text-[12.5px] leading-relaxed",
                m.role === "user" ? "bg-muted/40" : "bg-surface",
              )}
            >
              {m.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline() {
  const { tasks, agents } = useHelix();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const task = tasks[0];

  if (!task)
    return (
      <div className="flex-1 overflow-auto p-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Agent activity will stream here: planning, tool calls, edited files and validation results for
        every step of the run.
      </div>
    );

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="mb-3 text-[12px] leading-snug">{task.title}</div>
      <div className="relative space-y-1 pl-4">
        <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
        {task.subtasks.map((s) => {
          const agent = agents.find((a) => a.id === s.agentId)!;
          const isOpen = open[s.id];
          return (
            <div key={s.id} className="relative">
              <span
                className={cn(
                  "absolute -left-4 top-2 size-[9px] rounded-full border-2 border-background",
                  s.status === "done"
                    ? "bg-success"
                    : s.status === "running"
                      ? "bg-primary pulse-dot"
                      : "bg-muted-foreground/50",
                )}
              />
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-accent/40"
              >
                <span className={cn("grid size-5 place-items-center rounded-md", accentBg[agent.accent])}>
                  <Icon name={agent.icon} className="size-3" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px]">{s.title}</span>
                  <span className="block text-[10.5px] text-muted-foreground">{agent.name}</span>
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {s.durationMs && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {(s.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} className="size-3 text-muted-foreground" />
                </span>
              </button>
              {isOpen && (
                <div className="fade-up ml-7 space-y-1.5 rounded-sm border border-border bg-surface p-2">
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{s.detail}</p>
                  {s.toolCalls.map((c) => (
                    <div key={c.id} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Icon name="Wrench" className="size-3 text-primary" />
                      <span className="text-primary">{c.toolId}</span>
                      <span className="truncate text-muted-foreground">{c.input}</span>
                      <span
                        className={cn(
                          "ml-auto",
                          c.status === "success" ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1">
                    {s.files.map((f) => (
                      <Chip key={f} tone="muted">
                        {f}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContextView() {
  const { contextItems, toggleContextPin, removeContext, activeModel, providers } = useHelix();
  const model = providers.flatMap((p) => p.models).find((m) => m.id === activeModel);
  const used = contextItems.reduce((n, c) => n + c.tokens, 0);
  const window_ = model?.contextWindow ?? 32768;
  const pct = Math.min(100, (used / window_) * 100);

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Context usage</span>
          <span className="font-mono">
            {used.toLocaleString()} / {window_.toLocaleString()} tok
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Chip tone="primary">{activeModel}</Chip>
          <Chip>{contextItems.length} files</Chip>
          <Chip tone="success">index warm</Chip>
        </div>
      </div>
      <div className="space-y-1">
        {contextItems.map((c) => (
          <div key={c.path} className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-accent/40">
            <Icon name="FileCode2" className="size-3.5 text-muted-foreground" />
            <span className="truncate font-mono text-[11.5px]">{c.path}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
              {c.tokens}t · {c.reason}
            </span>
            <IconButton
              icon={c.pinned ? "Pin" : "PinOff"}
              label="Pin to context"
              active={c.pinned}
              onClick={() => toggleContextPin(c.path)}
            />
            <IconButton icon="X" label="Remove" onClick={() => removeContext(c.path)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Logs() {
  const { tasks, agents } = useHelix();
  const rows = tasks.flatMap((t) =>
    t.subtasks.flatMap((s) =>
      s.toolCalls.map((c) => ({
        id: c.id,
        agent: agents.find((a) => a.id === c.agentId)?.name ?? c.agentId,
        tool: c.toolId,
        input: c.input,
        status: c.status,
      })),
    ),
  );
  return (
    <div className="flex-1 overflow-auto p-2 text-mono-xs">
      {rows.length === 0 && (
        <p className="p-1 text-muted-foreground">Structured execution log — empty until a run starts.</p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="flex gap-2 px-1 py-0.5 hover:bg-accent/30">
          <span className="text-muted-foreground/60">›</span>
          <span className="text-violet">{r.agent}</span>
          <span className="text-primary">{r.tool}</span>
          <span className="truncate text-foreground/70">{r.input}</span>
          <span className={cn("ml-auto", r.status === "success" ? "text-success" : "text-warning")}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AgentPanel() {
  const { rightPanelTab, setRightPanelTab, agents, agentState } = useHelix();
  const active = agents.filter((a) => agentState[a.id]?.status !== "idle");
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <PanelHeader
        title="AI Command Center"
        actions={<IconButton icon="History" label="Conversation history" />}
      />
      {active.length > 0 && (
        <div className="hairline-b flex items-center gap-1.5 overflow-x-auto px-3 py-1.5">
          {active.map((a) => (
            <span
              key={a.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5"
            >
              <StatusDot status={agentState[a.id]?.status ?? "idle"} />
              <span className="text-[11px]">{a.name}</span>
            </span>
          ))}
        </div>
      )}
      <div className="hairline-b flex h-8 shrink-0 items-stretch px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRightPanelTab(t.id)}
            className={cn(
              "relative px-2.5 text-[11.5px] transition-colors",
              rightPanelTab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {rightPanelTab === t.id && (
              <span className="absolute inset-x-2 bottom-0 h-px bg-primary" />
            )}
          </button>
        ))}
      </div>
      {rightPanelTab === "chat" && <Chat />}
      {rightPanelTab === "timeline" && <Timeline />}
      {rightPanelTab === "context" && <ContextView />}
      {rightPanelTab === "logs" && <Logs />}
      {rightPanelTab === "chat" && <Composer />}
    </div>
  );
}
