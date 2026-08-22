/**
 * HelixAgent — core domain contracts.
 *
 * These interfaces are the extension surface of the platform: new model
 * providers, agents and tools plug in here without touching the runtime.
 */

/* ------------------------------------------------------------------ models */

export type ProviderId = "ollama" | "openai" | "local" | "qwen" | "llama" | "mistral" | (string & {});

export type ProviderStatus = "connected" | "disconnected" | "error" | "detecting";

export interface ModelDescriptor {
  id: string;
  label: string;
  contextWindow: number;
  /** rough capability tags used by the orchestrator when routing subtasks */
  capabilities: Array<"code" | "reasoning" | "fast" | "long-context" | "vision" | "embedding">;
  sizeGb?: number | undefined;
}

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  streaming: boolean;
  systemPrompt: string;
  /** provider-specific knobs (top_p, num_ctx, mirostat, ...) */
  extra: Record<string, string | number | boolean>;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  kind: "local" | "remote";
  baseUrl: string;
  apiKeyRef?: string | undefined;
  status: ProviderStatus;
  autoDiscover: boolean;
  models: ModelDescriptor[];
}

/** Contract every provider adapter implements. */
export interface ModelProviderAdapter {
  config: ProviderConfig;
  listModels(): Promise<ModelDescriptor[]>;
  chat(req: {
    model: string;
    messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
    params: ModelParameters;
    signal?: AbortSignal | undefined;
  }): AsyncIterable<string>;
}

/* ------------------------------------------------------------------- tools */

export type ToolRisk = "safe" | "elevated" | "destructive";

export interface ToolDescriptor {
  id: string;
  label: string;
  group: "filesystem" | "search" | "shell" | "git" | "project" | "web";
  risk: ToolRisk;
  description: string;
  /** destructive + elevated tools always route through the approval queue */
  requiresApproval: boolean;
}

export interface ToolCall {
  id: string;
  toolId: string;
  agentId: string;
  input: string;
  output?: string | undefined;
  status: "pending-approval" | "running" | "success" | "error" | "denied";
  startedAt: number;
  durationMs?: number | undefined;
}

/* ------------------------------------------------------------------ agents */

export type AgentStatus = "idle" | "thinking" | "running" | "waiting" | "success" | "error";

export type AgentRole =
  | "architect"
  | "coding"
  | "debug"
  | "testing"
  | "review"
  | "research"
  | "docs"
  | "devops";

export interface AgentPermissions {
  readFiles: boolean;
  writeFiles: boolean;
  executeCommands: boolean;
  network: boolean;
  git: boolean;
  /** glob scopes bounding what the agent may touch */
  pathScopes: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  accent: "primary" | "violet" | "success" | "warning" | "destructive";
  providerId: ProviderId;
  model: string;
  systemPrompt: string;
  tools: string[];
  permissions: AgentPermissions;
  params: ModelParameters;
}

export interface AgentRuntimeState {
  agentId: string;
  status: AgentStatus;
  currentAction?: string | undefined;
  tokensUsed: number;
  memory: string[];
}

/* ------------------------------------------------------------------- tasks */

export type TaskStatus = "queued" | "running" | "blocked" | "done" | "failed";

export interface SubTask {
  id: string;
  title: string;
  agentId: string;
  status: TaskStatus;
  detail: string;
  toolCalls: ToolCall[];
  files: string[];
  startedAt?: number | undefined;
  durationMs?: number | undefined;
}

export interface OrchestratedTask {
  id: string;
  title: string;
  createdAt: number;
  status: TaskStatus;
  subtasks: SubTask[];
}

/* ------------------------------------------------------------ project / fs */

export interface FileNode {
  path: string;
  name: string;
  kind: "file" | "dir";
  language?: string | undefined;
  children?: FileNode[] | undefined;
  gitStatus?: "modified" | "added" | "deleted" | "untracked" | undefined;
  content?: string | undefined;
}

export interface ProjectIntelligence {
  language: string;
  framework: string;
  packageManager: string;
  testRunner: string;
  scripts: string[];
  dependencies: number;
  indexedFiles: number;
  totalFiles: number;
  architecture: string;
}

/* --------------------------------------------------------------------- git */

export interface GitFileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  additions: number;
  deletions: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  relative: string;
}

/* ---------------------------------------------------------------- terminal */

export interface TerminalLine {
  id: string;
  kind: "command" | "stdout" | "stderr" | "system";
  text: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  agentId?: string | undefined;
  running: boolean;
  lines: TerminalLine[];
}

/* ------------------------------------------------------------------- chat */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  agentId?: string | undefined;
  content: string;
  streaming?: boolean | undefined;
  toolCalls?: ToolCall[] | undefined;
}

export interface ContextItem {
  path: string;
  tokens: number;
  pinned: boolean;
  reason: "manual" | "auto" | "open-editor";
}
