import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  agents as agentDefs,
  findFile,
  initialContext,
  initialMessages,
  initialTerminals,
  providers as providerDefs,
  tools as toolDefs,
} from "./data";
import type {
  AgentRuntimeState,
  ChatMessage,
  ContextItem,
  OrchestratedTask,
  SubTask,
  TerminalSession,
  ToolCall,
} from "./types";

export type SidebarView =
  | "explorer"
  | "search"
  | "agents"
  | "tasks"
  | "git"
  | "models"
  | "settings";

const uid = () => Math.random().toString(36).slice(2, 10);

/** Deterministic-ish plan builder — the orchestrator's decomposition pass. */
function planTask(prompt: string): SubTask[] {
  const p = prompt.toLowerCase();
  const wantsTests = /test|spec|cover/.test(p) || true;
  const wantsReview = true;

  const steps: Array<Omit<SubTask, "id" | "toolCalls">> = [
    {
      title: "Analyse repository & decompose",
      agentId: "architect",
      status: "queued",
      detail: "Reading project index, dependency graph and affected modules to produce an implementation plan.",
      files: ["src/index.ts", "src/auth/types.ts"],
    },
    {
      title: "Implement changes",
      agentId: "coder",
      status: "queued",
      detail: "Applying minimal diffs to the target files, respecting existing conventions.",
      files: ["src/auth/service.ts", "src/agents/orchestrator.ts"],
    },
  ];

  if (/debug|bug|fix|error|crash/.test(p)) {
    steps.splice(1, 0, {
      title: "Reproduce & isolate failure",
      agentId: "debugger",
      status: "queued",
      detail: "Running the failing path and narrowing the fault to a single call site.",
      files: ["src/auth/service.ts"],
    });
  }
  if (/doc|readme|changelog/.test(p)) {
    steps.push({
      title: "Update documentation",
      agentId: "scribe",
      status: "queued",
      detail: "Regenerating developer docs from the modified public surface.",
      files: ["README.md"],
    });
  }
  if (wantsTests) {
    steps.push({
      title: "Write & run tests",
      agentId: "tester",
      status: "queued",
      detail: "Extending the suite to cover the new behaviour, then executing the runner.",
      files: ["tests/auth.test.ts"],
    });
  }
  if (wantsReview) {
    steps.push({
      title: "Review generated changes",
      agentId: "reviewer",
      status: "queued",
      detail: "Auditing the diff for correctness, security and regressions before consolidation.",
      files: ["src/auth/service.ts", "tests/auth.test.ts"],
    });
  }

  return steps.map((s) => ({ ...s, id: uid(), toolCalls: [] }));
}

const toolForAgent = (agentId: string): string => {
  const agent = agentDefs.find((a) => a.id === agentId);
  const risky = agent?.tools.find((t) => toolDefs.find((d) => d.id === t)?.requiresApproval);
  return risky ?? agent?.tools[0] ?? "fs.read";
};

interface HelixState {
  view: SidebarView;
  setView: (v: SidebarView) => void;
  rightPanelTab: string;
  setRightPanelTab: (t: string) => void;

  openTabs: string[];
  activeTab: string | null;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  selection: string | null;
  setSelection: (s: string | null) => void;

  agentState: Record<string, AgentRuntimeState>;
  tasks: OrchestratedTask[];
  activeTaskId: string | null;
  runTask: (prompt: string) => void;

  approvals: ToolCall[];
  approve: (id: string) => void;
  deny: (id: string) => void;

  messages: ChatMessage[];
  contextItems: ContextItem[];
  toggleContextPin: (path: string) => void;
  removeContext: (path: string) => void;
  addContext: (path: string) => void;

  terminals: TerminalSession[];
  activeTerminal: string;
  setActiveTerminal: (id: string) => void;
  runCommand: (cmd: string) => void;
  newTerminal: () => void;

  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  bottomOpen: boolean;
  setBottomOpen: (v: boolean) => void;

  activeModel: string;
  setActiveModel: (m: string) => void;
  providers: typeof providerDefs;
  agents: typeof agentDefs;
  tools: typeof toolDefs;
}

const Ctx = createContext<HelixState | null>(null);

export function HelixProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<SidebarView>("explorer");
  const [rightPanelTab, setRightPanelTab] = useState("chat");
  const [openTabs, setOpenTabs] = useState<string[]>([
    "src/auth/service.ts",
    "src/agents/orchestrator.ts",
  ]);
  const [activeTab, setActiveTab] = useState<string | null>("src/auth/service.ts");
  const [selection, setSelection] = useState<string | null>(null);
  const [tasks, setTasks] = useState<OrchestratedTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ToolCall[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [contextItems, setContextItems] = useState<ContextItem[]>(initialContext);
  const [terminals, setTerminals] = useState<TerminalSession[]>(initialTerminals);
  const [activeTerminal, setActiveTerminal] = useState("t1");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [activeModel, setActiveModel] = useState("qwen2.5-coder:14b");
  const [agentState, setAgentState] = useState<Record<string, AgentRuntimeState>>(() =>
    Object.fromEntries(
      agentDefs.map((a) => [a.id, { agentId: a.id, status: "idle", tokensUsed: 0, memory: [] }]),
    ),
  );

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const openFile = useCallback((path: string) => {
    setOpenTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActiveTab(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenTabs((t) => {
      const next = t.filter((p) => p !== path);
      setActiveTab((cur) => (cur === path ? (next[next.length - 1] ?? null) : cur));
      return next;
    });
  }, []);

  const patchSubtask = useCallback(
    (taskId: string, subId: string, patch: Partial<SubTask>) => {
      setTasks((all) =>
        all.map((t) =>
          t.id !== taskId
            ? t
            : { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, ...patch } : s)) },
        ),
      );
    },
    [],
  );

  const setAgent = useCallback((agentId: string, patch: Partial<AgentRuntimeState>) => {
    setAgentState((s) => ({ ...s, [agentId]: { ...s[agentId], ...patch } }));
  }, []);

  const runTask = useCallback(
    (prompt: string) => {
      const task: OrchestratedTask = {
        id: uid(),
        title: prompt.slice(0, 90),
        createdAt: Date.now(),
        status: "running",
        subtasks: planTask(prompt),
      };
      setTasks((t) => [task, ...t]);
      setActiveTaskId(task.id);
      setMessages((m) => [...m, { id: uid(), role: "user", content: prompt }]);

      let delay = 350;
      task.subtasks.forEach((sub, i) => {
        const agent = agentDefs.find((a) => a.id === sub.agentId)!;
        later(() => {
          setAgent(sub.agentId, { status: "thinking", currentAction: sub.title });
          patchSubtask(task.id, sub.id, { status: "running", startedAt: Date.now() });
        }, delay);

        later(() => {
          setAgent(sub.agentId, { status: "running", currentAction: sub.detail });
          const call: ToolCall = {
            id: uid(),
            toolId: toolForAgent(sub.agentId),
            agentId: sub.agentId,
            input: sub.files[0] ?? "workspace",
            status: "running",
            startedAt: Date.now(),
          };
          patchSubtask(task.id, sub.id, { toolCalls: [call] });
        }, delay + 700);

        later(
          () => {
            patchSubtask(task.id, sub.id, {
              status: "done",
              durationMs: 1400 + i * 300,
              toolCalls: [
                {
                  id: uid(),
                  toolId: toolForAgent(sub.agentId),
                  agentId: sub.agentId,
                  input: sub.files[0] ?? "workspace",
                  output: `${sub.files.length} file(s) touched`,
                  status: "success",
                  startedAt: Date.now(),
                  durationMs: 1400,
                },
              ],
            });
            setAgent(sub.agentId, {
              status: "success",
              currentAction: undefined,
              tokensUsed: (agentState[sub.agentId]?.tokensUsed ?? 0) + 1200 + i * 400,
            });
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: "assistant",
                agentId: agent.id,
                content: `${sub.title} — ${sub.detail}`,
              },
            ]);
            later(() => setAgent(sub.agentId, { status: "idle" }), 2200);
          },
          delay + 1900,
        );

        delay += 2400;
      });

      later(() => {
        setTasks((all) => all.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)));
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            agentId: "architect",
            content: "Consolidated result: all subtasks validated, diff ready for review in the Git panel.",
          },
        ]);
      }, delay);
    },
    [agentState, patchSubtask, setAgent],
  );

  /** Seeded approval request so the permission system is visible from the start. */
  useEffect(() => {
    setApprovals([
      {
        id: "ap1",
        toolId: "shell.exec",
        agentId: "devops",
        input: "pnpm install @opentelemetry/api",
        status: "pending-approval",
        startedAt: Date.now(),
      },
      {
        id: "ap2",
        toolId: "fs.write",
        agentId: "coder",
        input: "src/auth/audit.ts",
        status: "pending-approval",
        startedAt: Date.now(),
      },
    ]);
  }, []);

  const approve = useCallback((id: string) => {
    setApprovals((a) => a.filter((c) => c.id !== id));
  }, []);
  const deny = useCallback((id: string) => {
    setApprovals((a) => a.filter((c) => c.id !== id));
  }, []);

  const toggleContextPin = useCallback((path: string) => {
    setContextItems((c) => c.map((i) => (i.path === path ? { ...i, pinned: !i.pinned } : i)));
  }, []);
  const removeContext = useCallback((path: string) => {
    setContextItems((c) => c.filter((i) => i.path !== path));
  }, []);
  const addContext = useCallback((path: string) => {
    const file = findFile(path);
    setContextItems((c) =>
      c.some((i) => i.path === path)
        ? c
        : [
            ...c,
            {
              path,
              tokens: Math.max(80, Math.round((file?.content?.length ?? 400) / 3.6)),
              pinned: false,
              reason: "manual",
            },
          ],
    );
  }, []);

  const runCommand = useCallback(
    (cmd: string) => {
      const id = activeTerminal;
      setTerminals((ts) =>
        ts.map((t) =>
          t.id !== id
            ? t
            : {
                ...t,
                running: true,
                lines: [...t.lines, { id: uid(), kind: "command", text: cmd }],
              },
        ),
      );
      later(() => {
        setTerminals((ts) =>
          ts.map((t) =>
            t.id !== id
              ? t
              : {
                  ...t,
                  running: false,
                  lines: [
                    ...t.lines,
                    {
                      id: uid(),
                      kind: cmd.startsWith("git") ? "stdout" : "stdout",
                      text: cmd.startsWith("git status")
                        ? "On branch feat/session-audit\nChanges not staged for commit:\n  modified:   src/auth/service.ts"
                        : `${cmd.split(" ")[0]}: completed in 0.8s`,
                    },
                  ],
                },
          ),
        );
      }, 700);
    },
    [activeTerminal],
  );

  const newTerminal = useCallback(() => {
    const id = uid();
    setTerminals((ts) => [
      ...ts,
      {
        id,
        name: `zsh ${ts.length + 1}`,
        cwd: "~/dev/helix-core",
        running: false,
        lines: [{ id: uid(), kind: "system", text: "HelixAgent terminal · new session" }],
      },
    ]);
    setActiveTerminal(id);
    setBottomOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "`") {
        e.preventDefault();
        setBottomOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<HelixState>(
    () => ({
      view,
      setView,
      rightPanelTab,
      setRightPanelTab,
      openTabs,
      activeTab,
      openFile,
      closeTab,
      setActiveTab,
      selection,
      setSelection,
      agentState,
      tasks,
      activeTaskId,
      runTask,
      approvals,
      approve,
      deny,
      messages,
      contextItems,
      toggleContextPin,
      removeContext,
      addContext,
      terminals,
      activeTerminal,
      setActiveTerminal,
      runCommand,
      newTerminal,
      paletteOpen,
      setPaletteOpen,
      bottomOpen,
      setBottomOpen,
      activeModel,
      setActiveModel,
      providers: providerDefs,
      agents: agentDefs,
      tools: toolDefs,
    }),
    [
      view,
      rightPanelTab,
      openTabs,
      activeTab,
      selection,
      agentState,
      tasks,
      activeTaskId,
      approvals,
      messages,
      contextItems,
      terminals,
      activeTerminal,
      paletteOpen,
      bottomOpen,
      activeModel,
      openFile,
      closeTab,
      runTask,
      approve,
      deny,
      toggleContextPin,
      removeContext,
      addContext,
      runCommand,
      newTerminal,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHelix() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHelix must be used inside HelixProvider");
  return ctx;
}
