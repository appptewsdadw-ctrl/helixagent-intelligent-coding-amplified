import type {
  AgentDefinition,
  ChatMessage,
  ContextItem,
  FileNode,
  GitCommit,
  GitFileChange,
  ModelParameters,
  ProjectIntelligence,
  ProviderConfig,
  TerminalSession,
  ToolDescriptor,
} from "./types";

export const defaultParams = (over: Partial<ModelParameters> = {}): ModelParameters => ({
  temperature: 0.2,
  maxTokens: 4096,
  contextWindow: 32768,
  streaming: true,
  systemPrompt: "",
  extra: {},
  ...over,
});

export const providers: ProviderConfig[] = [
  {
    id: "ollama",
    label: "Ollama",
    kind: "local",
    baseUrl: "http://127.0.0.1:11434",
    status: "connected",
    autoDiscover: true,
    models: [
      { id: "qwen2.5-coder:14b", label: "Qwen2.5 Coder 14B", contextWindow: 32768, capabilities: ["code", "reasoning"], sizeGb: 9.1 },
      { id: "llama3.3:8b", label: "Llama 3.3 8B", contextWindow: 131072, capabilities: ["reasoning", "long-context"], sizeGb: 4.7 },
      { id: "mistral-nemo:12b", label: "Mistral Nemo 12B", contextWindow: 128000, capabilities: ["fast", "code"], sizeGb: 7.1 },
      { id: "nomic-embed-text", label: "Nomic Embed", contextWindow: 8192, capabilities: ["embedding"], sizeGb: 0.27 },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "remote",
    baseUrl: "https://api.openai.com/v1",
    apiKeyRef: "keychain://helix/openai",
    status: "connected",
    autoDiscover: false,
    models: [
      { id: "gpt-5.1", label: "GPT-5.1", contextWindow: 400000, capabilities: ["reasoning", "code", "long-context"] },
      { id: "gpt-5-mini", label: "GPT-5 mini", contextWindow: 200000, capabilities: ["fast", "code"] },
    ],
  },
  {
    id: "local",
    label: "Local runtime (llama.cpp)",
    kind: "local",
    baseUrl: "http://127.0.0.1:8080",
    status: "disconnected",
    autoDiscover: true,
    models: [
      { id: "deepseek-coder-v2", label: "DeepSeek Coder V2 (GGUF)", contextWindow: 65536, capabilities: ["code"], sizeGb: 12.4 },
    ],
  },
];

export const tools: ToolDescriptor[] = [
  { id: "fs.read", label: "Read file", group: "filesystem", risk: "safe", requiresApproval: false, description: "Read a file inside workspace boundaries." },
  { id: "fs.write", label: "Write file", group: "filesystem", risk: "elevated", requiresApproval: true, description: "Create or overwrite a file." },
  { id: "fs.edit", label: "Edit file", group: "filesystem", risk: "elevated", requiresApproval: true, description: "Apply a patch to an existing file." },
  { id: "fs.delete", label: "Delete file", group: "filesystem", risk: "destructive", requiresApproval: true, description: "Remove a file from disk." },
  { id: "search.files", label: "Search files", group: "search", risk: "safe", requiresApproval: false, description: "Glob-based file lookup." },
  { id: "search.code", label: "Search code", group: "search", risk: "safe", requiresApproval: false, description: "Ripgrep + semantic index search." },
  { id: "shell.exec", label: "Execute command", group: "shell", risk: "destructive", requiresApproval: true, description: "Run a shell command in the workspace." },
  { id: "shell.test", label: "Run tests", group: "shell", risk: "elevated", requiresApproval: true, description: "Execute the project test runner." },
  { id: "shell.build", label: "Run build", group: "shell", risk: "elevated", requiresApproval: true, description: "Execute the project build script." },
  { id: "git.status", label: "Git status", group: "git", risk: "safe", requiresApproval: false, description: "Read working tree state." },
  { id: "git.diff", label: "Git diff", group: "git", risk: "safe", requiresApproval: false, description: "Read staged/unstaged diffs." },
  { id: "git.commit", label: "Git commit", group: "git", risk: "elevated", requiresApproval: true, description: "Create a commit." },
  { id: "git.branch", label: "Git branch", group: "git", risk: "elevated", requiresApproval: true, description: "Create or switch branches." },
  { id: "project.analyze", label: "Project analysis", group: "project", risk: "safe", requiresApproval: false, description: "Inspect structure, deps and scripts." },
  { id: "web.search", label: "Browser / search", group: "web", risk: "safe", requiresApproval: false, description: "Fetch documentation from the web." },
];

const scoped = (paths: string[]) => paths;

export const agents: AgentDefinition[] = [
  {
    id: "architect",
    name: "Architect",
    role: "architect",
    icon: "Compass",
    accent: "violet",
    providerId: "openai",
    model: "gpt-5.1",
    systemPrompt:
      "You are the Architect. Analyse repository structure, decompose work into subtasks and produce an implementation plan with explicit file targets.",
    tools: ["project.analyze", "search.code", "fs.read", "git.status"],
    permissions: { readFiles: true, writeFiles: false, executeCommands: false, network: true, git: true, pathScopes: scoped(["**/*"]) },
    params: defaultParams({ temperature: 0.3, contextWindow: 400000 }),
  },
  {
    id: "coder",
    name: "Coder",
    role: "coding",
    icon: "Code2",
    accent: "primary",
    providerId: "ollama",
    model: "qwen2.5-coder:14b",
    systemPrompt: "You are the Coding agent. Implement changes precisely, minimal diffs, respect existing conventions.",
    tools: ["fs.read", "fs.write", "fs.edit", "search.code", "shell.build"],
    permissions: { readFiles: true, writeFiles: true, executeCommands: false, network: false, git: false, pathScopes: scoped(["src/**", "tests/**"]) },
    params: defaultParams({ temperature: 0.15 }),
  },
  {
    id: "debugger",
    name: "Debugger",
    role: "debug",
    icon: "Bug",
    accent: "warning",
    providerId: "ollama",
    model: "mistral-nemo:12b",
    systemPrompt: "You are the Debug agent. Reproduce, isolate and explain failures before proposing a fix.",
    tools: ["fs.read", "search.code", "shell.exec", "shell.test"],
    permissions: { readFiles: true, writeFiles: false, executeCommands: true, network: false, git: false, pathScopes: scoped(["**/*"]) },
    params: defaultParams({ temperature: 0.1 }),
  },
  {
    id: "tester",
    name: "Tester",
    role: "testing",
    icon: "FlaskConical",
    accent: "success",
    providerId: "ollama",
    model: "qwen2.5-coder:14b",
    systemPrompt: "You are the Testing agent. Write and run tests, report coverage gaps.",
    tools: ["fs.read", "fs.write", "shell.test"],
    permissions: { readFiles: true, writeFiles: true, executeCommands: true, network: false, git: false, pathScopes: scoped(["tests/**", "src/**/*.test.ts"]) },
    params: defaultParams({ temperature: 0.1 }),
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "review",
    icon: "ShieldCheck",
    accent: "violet",
    providerId: "openai",
    model: "gpt-5-mini",
    systemPrompt: "You are the Code Review agent. Audit diffs for correctness, security and regressions.",
    tools: ["git.diff", "git.status", "fs.read", "search.code"],
    permissions: { readFiles: true, writeFiles: false, executeCommands: false, network: false, git: true, pathScopes: scoped(["**/*"]) },
    params: defaultParams({ temperature: 0.2 }),
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "research",
    icon: "Telescope",
    accent: "primary",
    providerId: "openai",
    model: "gpt-5-mini",
    systemPrompt: "You are the Research agent. Gather external documentation and summarise precise, cited findings.",
    tools: ["web.search", "search.code", "fs.read"],
    permissions: { readFiles: true, writeFiles: false, executeCommands: false, network: true, git: false, pathScopes: scoped(["**/*"]) },
    params: defaultParams({ temperature: 0.4 }),
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "docs",
    icon: "BookText",
    accent: "success",
    providerId: "ollama",
    model: "llama3.3:8b",
    systemPrompt: "You are the Documentation agent. Produce concise developer-facing docs from real code.",
    tools: ["fs.read", "fs.write", "search.code"],
    permissions: { readFiles: true, writeFiles: true, executeCommands: false, network: false, git: false, pathScopes: scoped(["docs/**", "README.md"]) },
    params: defaultParams({ temperature: 0.35 }),
  },
  {
    id: "devops",
    name: "DevOps",
    role: "devops",
    icon: "Container",
    accent: "warning",
    providerId: "ollama",
    model: "llama3.3:8b",
    systemPrompt: "You are the DevOps agent. Own CI, build pipelines, containers and release automation.",
    tools: ["shell.exec", "shell.build", "git.branch", "fs.read"],
    permissions: { readFiles: true, writeFiles: true, executeCommands: true, network: true, git: true, pathScopes: scoped([".github/**", "docker/**", "*.yml"]) },
    params: defaultParams({ temperature: 0.2 }),
  },
];

/* ----------------------------------------------------------------- project */

const authService = `import { createHash, randomBytes } from "node:crypto";
import type { Session, User } from "./types";
import { sessionStore } from "./session-store";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

/**
 * Issues a session for a verified user and persists it in the store.
 * Rotates the session id on every privilege change.
 */
export async function createSession(user: User): Promise<Session> {
  const id = randomBytes(32).toString("hex");
  const session: Session = {
    id,
    userId: user.id,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    fingerprint: fingerprint(user),
  };

  await sessionStore.put(session);
  return session;
}

function fingerprint(user: User): string {
  return createHash("sha256").update(user.id + user.email).digest("hex").slice(0, 16);
}

export async function revoke(sessionId: string): Promise<void> {
  // TODO: emit audit event for revoked sessions
  await sessionStore.delete(sessionId);
}
`;

const orchestrator = `import type { AgentDefinition, OrchestratedTask } from "./types";

export interface PlanStep {
  agent: AgentDefinition;
  goal: string;
  dependsOn: string[];
}

export class Orchestrator {
  constructor(private readonly agents: AgentDefinition[]) {}

  plan(task: string): PlanStep[] {
    return this.route(task).map((agent, i, all) => ({
      agent,
      goal: task,
      dependsOn: i === 0 ? [] : [all[i - 1].id],
    }));
  }

  private route(task: string): AgentDefinition[] {
    const wants = (k: string) => task.toLowerCase().includes(k);
    return this.agents.filter((a) =>
      a.role === "architect" || (wants("test") && a.role === "testing") || a.role === "coding",
    );
  }
}
`;

const readme = `# Helix Core

Runtime for the HelixAgent platform.

- \`src/agents\` — agent runtime and orchestration
- \`src/providers\` — model provider adapters
- \`src/tools\` — sandboxed tool layer
`;

export const fileTree: FileNode[] = [
  {
    path: "src",
    name: "src",
    kind: "dir",
    children: [
      {
        path: "src/auth",
        name: "auth",
        kind: "dir",
        children: [
          { path: "src/auth/service.ts", name: "service.ts", kind: "file", language: "typescript", gitStatus: "modified", content: authService },
          { path: "src/auth/session-store.ts", name: "session-store.ts", kind: "file", language: "typescript", content: "export const sessionStore = {\n  async put() {},\n  async delete() {},\n};\n" },
          { path: "src/auth/types.ts", name: "types.ts", kind: "file", language: "typescript", content: "export interface User {\n  id: string;\n  email: string;\n}\n\nexport interface Session {\n  id: string;\n  userId: string;\n  issuedAt: number;\n  expiresAt: number;\n  fingerprint: string;\n}\n" },
        ],
      },
      {
        path: "src/agents",
        name: "agents",
        kind: "dir",
        children: [
          { path: "src/agents/orchestrator.ts", name: "orchestrator.ts", kind: "file", language: "typescript", gitStatus: "added", content: orchestrator },
          { path: "src/agents/runtime.ts", name: "runtime.ts", kind: "file", language: "typescript", content: "export const runtime = { concurrency: 3 };\n" },
        ],
      },
      {
        path: "src/providers",
        name: "providers",
        kind: "dir",
        children: [
          { path: "src/providers/ollama.ts", name: "ollama.ts", kind: "file", language: "typescript", content: "export const OLLAMA_URL = \"http://127.0.0.1:11434\";\n" },
          { path: "src/providers/openai.ts", name: "openai.ts", kind: "file", language: "typescript", content: "export const OPENAI_URL = \"https://api.openai.com/v1\";\n" },
        ],
      },
      { path: "src/index.ts", name: "index.ts", kind: "file", language: "typescript", content: "export * from \"./agents/orchestrator\";\n" },
    ],
  },
  {
    path: "tests",
    name: "tests",
    kind: "dir",
    children: [
      { path: "tests/auth.test.ts", name: "auth.test.ts", kind: "file", language: "typescript", gitStatus: "untracked", content: "import { describe, expect, it } from \"vitest\";\nimport { createSession } from \"../src/auth/service\";\n\ndescribe(\"createSession\", () => {\n  it(\"issues a session with a ttl\", async () => {\n    const s = await createSession({ id: \"u1\", email: \"a@b.c\" });\n    expect(s.expiresAt).toBeGreaterThan(s.issuedAt);\n  });\n});\n" },
    ],
  },
  { path: "README.md", name: "README.md", kind: "file", language: "markdown", content: readme },
  { path: "package.json", name: "package.json", kind: "file", language: "json", content: "{\n  \"name\": \"helix-core\",\n  \"version\": \"0.4.2\",\n  \"scripts\": {\n    \"dev\": \"tsx watch src/index.ts\",\n    \"build\": \"tsup src/index.ts\",\n    \"test\": \"vitest run\"\n  }\n}\n" },
];

export const projectIntel: ProjectIntelligence = {
  language: "TypeScript",
  framework: "Node · tsup",
  packageManager: "pnpm",
  testRunner: "vitest",
  scripts: ["dev", "build", "test"],
  dependencies: 42,
  indexedFiles: 1284,
  totalFiles: 1284,
  architecture: "Modular runtime · agents / providers / tools",
};

export const gitChanges: GitFileChange[] = [
  { path: "src/auth/service.ts", status: "modified", additions: 24, deletions: 6 },
  { path: "src/agents/orchestrator.ts", status: "added", additions: 63, deletions: 0 },
  { path: "tests/auth.test.ts", status: "untracked", additions: 18, deletions: 0 },
];

export const gitLog: GitCommit[] = [
  { hash: "8f2c1ab", message: "feat(agents): add orchestrator planning pass", author: "you", relative: "12 min ago" },
  { hash: "b41d9e0", message: "refactor(auth): rotate session id on privilege change", author: "you", relative: "2 hours ago" },
  { hash: "3ca77f5", message: "chore: bump provider adapters to v0.4", author: "m.silva", relative: "yesterday" },
  { hash: "9de10c4", message: "fix(tools): enforce workspace boundary on fs.write", author: "you", relative: "2 days ago" },
];

export const initialTerminals: TerminalSession[] = [
  {
    id: "t1",
    name: "zsh",
    cwd: "~/dev/helix-core",
    running: false,
    lines: [
      { id: "l1", kind: "system", text: "HelixAgent terminal · session t1 · zsh 5.9" },
      { id: "l2", kind: "command", text: "pnpm test" },
      { id: "l3", kind: "stdout", text: "✓ tests/auth.test.ts (3) 412ms" },
      { id: "l4", kind: "stdout", text: "Test Files  1 passed (1)   Tests  3 passed (3)" },
    ],
  },
  {
    id: "t2",
    name: "agent · devops",
    cwd: "~/dev/helix-core",
    agentId: "devops",
    running: true,
    lines: [
      { id: "m1", kind: "system", text: "attached to agent DevOps · approvals required for shell.exec" },
      { id: "m2", kind: "command", text: "docker compose up -d --build" },
      { id: "m3", kind: "stdout", text: "[+] Building 12.4s (14/14) FINISHED" },
      { id: "m4", kind: "stdout", text: "helix-core  Started" },
    ],
  },
];

export const initialContext: ContextItem[] = [
  { path: "src/auth/service.ts", tokens: 1240, pinned: true, reason: "open-editor" },
  { path: "src/auth/types.ts", tokens: 210, pinned: false, reason: "auto" },
  { path: "src/agents/orchestrator.ts", tokens: 890, pinned: false, reason: "auto" },
  { path: "tests/auth.test.ts", tokens: 340, pinned: false, reason: "manual" },
];

export const initialMessages: ChatMessage[] = [
  {
    id: "c1",
    role: "user",
    content: "Session rotation is missing an audit trail. Plan and implement it across the auth module, with tests.",
  },
  {
    id: "c2",
    role: "assistant",
    agentId: "architect",
    content:
      "Repository indexed (1284 files). Auth module has 3 files, no audit sink. Plan:\n1. Add `AuditEvent` type + `auditSink` port in src/auth\n2. Emit on createSession/revoke\n3. Cover rotation + revoke paths in tests/auth.test.ts\nRouting steps 2–3 to Coder and Tester.",
  },
];

export const flattenFiles = (nodes: FileNode[] = fileTree, acc: FileNode[] = []): FileNode[] => {
  for (const n of nodes) {
    if (n.kind === "file") acc.push(n);
    else if (n.children) flattenFiles(n.children, acc);
  }
  return acc;
};

export const findFile = (path: string): FileNode | undefined =>
  flattenFiles().find((f) => f.path === path);
