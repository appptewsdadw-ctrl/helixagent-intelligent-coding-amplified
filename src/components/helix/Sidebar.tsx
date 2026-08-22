import { useHelix, type SidebarView } from "@/lib/helix/store";
import { fileTree, gitChanges, gitLog, projectIntel, flattenFiles } from "@/lib/helix/data";
import type { FileNode } from "@/lib/helix/types";
import { Chip, Icon, IconButton, PanelHeader, StatusDot, accentBg } from "./primitives";
import { cn } from "@/lib/utils";
import { useState } from "react";

const rail: Array<{ id: SidebarView; icon: string; label: string }> = [
  { id: "explorer", icon: "Files", label: "Explorer" },
  { id: "search", icon: "Search", label: "Search" },
  { id: "agents", icon: "Bot", label: "Agents" },
  { id: "tasks", icon: "ListChecks", label: "Tasks" },
  { id: "git", icon: "GitBranch", label: "Source control" },
  { id: "models", icon: "Cpu", label: "Models & providers" },
  { id: "settings", icon: "Settings2", label: "Settings" },
];

export function ActivityRail() {
  const { view, setView, approvals } = useHelix();
  return (
    <div className="hairline-r flex w-11 shrink-0 flex-col items-center gap-1 bg-sidebar py-2">
      <div className="mb-2 grid size-7 place-items-center rounded-md bg-primary/15 glow-ring">
        <Icon name="Hexagon" className="size-4 text-primary" />
      </div>
      {rail.map((r) => (
        <button
          key={r.id}
          type="button"
          title={r.label}
          onClick={() => setView(r.id)}
          className={cn(
            "relative grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            view === r.id && "bg-accent text-primary",
          )}
        >
          <Icon name={r.icon} className="size-4" />
          {r.id === "agents" && approvals.length > 0 && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" />
          )}
        </button>
      ))}
    </div>
  );
}

function Tree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  const { openFile, activeTab } = useHelix();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return (
    <>
      {nodes.map((n) => {
        if (n.kind === "dir") {
          const isCollapsed = collapsed[n.path];
          return (
            <div key={n.path}>
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [n.path]: !c[n.path] }))}
                className="flex w-full items-center gap-1 py-[3px] pr-2 text-[12.5px] text-foreground/85 hover:bg-accent/50"
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                <Icon
                  name={isCollapsed ? "ChevronRight" : "ChevronDown"}
                  className="size-3 text-muted-foreground"
                />
                <Icon name="Folder" className="size-3.5 text-primary/70" />
                {n.name}
              </button>
              {!isCollapsed && n.children && <Tree nodes={n.children} depth={depth + 1} />}
            </div>
          );
        }
        return (
          <button
            key={n.path}
            type="button"
            onClick={() => openFile(n.path)}
            className={cn(
              "flex w-full items-center gap-1.5 py-[3px] pr-2 text-[12.5px] hover:bg-accent/50",
              activeTab === n.path ? "bg-accent text-foreground" : "text-foreground/75",
            )}
            style={{ paddingLeft: 20 + depth * 12 }}
          >
            <Icon name="FileCode2" className="size-3.5 text-muted-foreground" />
            <span className="truncate">{n.name}</span>
            {n.gitStatus && (
              <span
                className={cn(
                  "ml-auto font-mono text-[10px]",
                  n.gitStatus === "modified" && "text-warning",
                  n.gitStatus === "added" && "text-success",
                  n.gitStatus === "untracked" && "text-muted-foreground",
                )}
              >
                {n.gitStatus.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function Explorer() {
  return (
    <>
      <PanelHeader
        title="helix-core"
        actions={
          <>
            <IconButton icon="FilePlus2" label="New file" />
            <IconButton icon="RefreshCw" label="Refresh index" />
          </>
        }
      />
      <div className="flex-1 overflow-auto py-1">
        <Tree nodes={fileTree} />
      </div>
      <div className="hairline-t space-y-1.5 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          Project intelligence
        </div>
        <div className="flex flex-wrap gap-1">
          <Chip tone="primary">{projectIntel.language}</Chip>
          <Chip tone="violet">{projectIntel.framework}</Chip>
          <Chip>{projectIntel.packageManager}</Chip>
          <Chip>{projectIntel.testRunner}</Chip>
        </div>
        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <Icon name="Database" className="size-3" />
          Index {projectIntel.indexedFiles}/{projectIntel.totalFiles} files
          <span className="ml-auto text-success">ready</span>
        </div>
      </div>
    </>
  );
}

function SearchView() {
  const { openFile } = useHelix();
  const [q, setQ] = useState("session");
  const results = flattenFiles().filter(
    (f) => f.content?.toLowerCase().includes(q.toLowerCase()) && q.length > 1,
  );
  return (
    <>
      <PanelHeader title="Search" />
      <div className="space-y-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search code…"
          className="h-7 w-full rounded-sm border border-input bg-background px-2 font-mono text-[12px] outline-none focus:border-primary/60"
        />
        <div className="flex gap-1">
          <Chip tone="primary">semantic</Chip>
          <Chip>symbols</Chip>
          <Chip>regex</Chip>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {results.map((f) => (
          <button
            key={f.path}
            type="button"
            onClick={() => openFile(f.path)}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent/50"
          >
            <div className="truncate font-mono text-[11.5px] text-primary">{f.path}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {f.content?.split("\n").find((l) => l.toLowerCase().includes(q.toLowerCase()))?.trim()}
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-3 py-2 text-[11.5px] text-muted-foreground">No matches in index.</p>
        )}
      </div>
    </>
  );
}

function AgentsView() {
  const { agents, agentState, approvals, approve, deny, tools } = useHelix();
  return (
    <>
      <PanelHeader title="Agents" actions={<IconButton icon="Plus" label="New agent" />} />
      {approvals.length > 0 && (
        <div className="hairline-b space-y-2 bg-warning/5 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-warning">
            <Icon name="ShieldAlert" className="size-3" /> Approvals required
          </div>
          {approvals.map((a) => {
            const tool = tools.find((t) => t.id === a.toolId);
            return (
              <div key={a.id} className="rounded-sm border border-warning/25 bg-background/60 p-2">
                <div className="text-[11.5px]">
                  <span className="capitalize text-foreground">{a.agentId}</span> wants to run{" "}
                  <span className="font-mono text-warning">{tool?.label ?? a.toolId}</span>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {a.input}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => approve(a.id)}
                    className="rounded-sm bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => deny(a.id)}
                    className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                  >
                    Deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {agents.map((a) => {
          const st = agentState[a.id];
          return (
            <div key={a.id} className="hairline-b px-3 py-2 hover:bg-accent/30">
              <div className="flex items-center gap-2">
                <span className={cn("grid size-6 place-items-center rounded-md", accentBg[a.accent])}>
                  <Icon name={a.icon} className="size-3.5" />
                </span>
                <span className="text-[12.5px] font-medium">{a.name}</span>
                <span className="ml-auto">
                  <StatusDot status={st?.status ?? "idle"} withLabel />
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 pl-8">
                <Chip>{a.model}</Chip>
                <Chip tone="muted">{a.providerId}</Chip>
                <Chip>{a.tools.length} tools</Chip>
              </div>
              {st?.currentAction && (
                <p className="mt-1 truncate pl-8 text-[11px] text-muted-foreground">
                  {st.currentAction}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TasksView() {
  const { tasks, agents } = useHelix();
  return (
    <>
      <PanelHeader title="Tasks" />
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 && (
          <p className="p-3 text-[11.5px] leading-relaxed text-muted-foreground">
            No orchestrated tasks yet. Send a goal in the AI Command Center and the Orchestrator will
            decompose it into agent subtasks.
          </p>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="hairline-b p-3">
            <div className="flex items-start gap-2">
              <Icon
                name={t.status === "done" ? "CheckCircle2" : "Loader"}
                className={cn("mt-0.5 size-3.5", t.status === "done" ? "text-success" : "text-primary")}
              />
              <span className="text-[12px] leading-snug">{t.title}</span>
            </div>
            <div className="mt-2 space-y-1 pl-5">
              {t.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[11.5px]">
                  <StatusDot
                    status={
                      s.status === "done" ? "success" : s.status === "running" ? "running" : "idle"
                    }
                  />
                  <span className="truncate text-muted-foreground">{s.title}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
                    {agents.find((a) => a.id === s.agentId)?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function GitView() {
  const { openFile, runCommand, setBottomOpen } = useHelix();
  return (
    <>
      <PanelHeader
        title="Source control"
        actions={<IconButton icon="RefreshCw" label="Refresh" onClick={() => runCommand("git status")} />}
      />
      <div className="hairline-b flex items-center gap-1.5 px-3 py-2 text-[12px]">
        <Icon name="GitBranch" className="size-3.5 text-primary" />
        <span className="font-mono">feat/session-audit</span>
        <Chip tone="primary" className="ml-auto">
          ↑2 ↓0
        </Chip>
      </div>
      <div className="p-2">
        <div className="rounded-sm border border-border bg-background/60 p-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-violet">
            <Icon name="Sparkles" className="size-3" /> AI Git assistant
          </div>
          <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-foreground/80">
            feat(auth): emit audit events on session rotation
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button className="rounded-sm bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
              Commit
            </button>
            <button className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">
              Regenerate
            </button>
            <button className="rounded-sm border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">
              Explain diff
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          Changes
        </div>
        {gitChanges.map((c) => (
          <button
            key={c.path}
            type="button"
            onClick={() => {
              openFile(c.path);
              setBottomOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-1 text-left hover:bg-accent/50"
          >
            <span className="truncate font-mono text-[11.5px]">{c.path}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px]">
              <span className="text-success">+{c.additions}</span>{" "}
              <span className="text-destructive">−{c.deletions}</span>
            </span>
          </button>
        ))}
        <div className="mt-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          History
        </div>
        {gitLog.map((c) => (
          <div key={c.hash} className="px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] text-primary">{c.hash}</span>
              <span className="truncate text-[11.5px]">{c.message}</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {c.author} · {c.relative}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ModelsView() {
  const { providers, activeModel, setActiveModel } = useHelix();
  return (
    <>
      <PanelHeader title="Models & providers" actions={<IconButton icon="Plus" label="Add provider" />} />
      <div className="flex-1 overflow-auto">
        {providers.map((p) => (
          <div key={p.id} className="hairline-b p-3">
            <div className="flex items-center gap-2">
              <Icon
                name={p.kind === "local" ? "HardDrive" : "Cloud"}
                className="size-3.5 text-muted-foreground"
              />
              <span className="text-[12.5px] font-medium">{p.label}</span>
              <span className="ml-auto">
                <Chip tone={p.status === "connected" ? "success" : "muted"}>{p.status}</Chip>
              </span>
            </div>
            <div className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">
              {p.baseUrl}
              {p.apiKeyRef ? " · key stored in OS keychain" : ""}
              {p.autoDiscover ? " · auto-discovery on" : ""}
            </div>
            <div className="mt-2 space-y-1">
              {p.models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveModel(m.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-accent/50",
                    activeModel === m.id && "bg-accent",
                  )}
                >
                  <Icon
                    name={activeModel === m.id ? "CircleDot" : "Circle"}
                    className={cn("size-3", activeModel === m.id ? "text-primary" : "text-muted-foreground/50")}
                  />
                  <span className="truncate font-mono text-[11.5px]">{m.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                    {Math.round(m.contextWindow / 1000)}k
                    {m.sizeGb ? ` · ${m.sizeGb}GB` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const settingSections = [
  { icon: "SlidersHorizontal", label: "General", hint: "Startup, workspace, telemetry" },
  { icon: "Palette", label: "Appearance", hint: "Theme, density, font" },
  { icon: "Cpu", label: "Models", hint: "Defaults, params, streaming" },
  { icon: "Plug", label: "Providers", hint: "Endpoints, keys, discovery" },
  { icon: "Bot", label: "Agents", hint: "Roles, prompts, memory" },
  { icon: "Wrench", label: "Tools", hint: "Enabled tools, approvals" },
  { icon: "ShieldCheck", label: "Security", hint: "Boundaries, sandbox, secrets" },
  { icon: "SquareTerminal", label: "Terminal", hint: "Shell, profiles, env" },
  { icon: "GitBranch", label: "Git", hint: "Identity, hooks, AI commits" },
  { icon: "Keyboard", label: "Keybindings", hint: "Shortcuts and chords" },
  { icon: "Gauge", label: "Performance", hint: "Concurrency, workers, cache" },
  { icon: "Database", label: "Storage", hint: "Index, history, cache size" },
];

function SettingsView() {
  return (
    <>
      <PanelHeader title="Settings" />
      <div className="flex-1 overflow-auto py-1">
        {settingSections.map((s) => (
          <button
            key={s.label}
            type="button"
            className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-accent/50"
          >
            <Icon name={s.icon} className="mt-0.5 size-3.5 text-muted-foreground" />
            <span>
              <span className="block text-[12.5px]">{s.label}</span>
              <span className="block text-[11px] text-muted-foreground">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

export function SidebarPanel() {
  const { view } = useHelix();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {view === "explorer" && <Explorer />}
      {view === "search" && <SearchView />}
      {view === "agents" && <AgentsView />}
      {view === "tasks" && <TasksView />}
      {view === "git" && <GitView />}
      {view === "models" && <ModelsView />}
      {view === "settings" && <SettingsView />}
    </div>
  );
}
