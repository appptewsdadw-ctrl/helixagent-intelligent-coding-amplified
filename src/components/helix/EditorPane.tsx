import { useHelix } from "@/lib/helix/store";
import { findFile } from "@/lib/helix/data";
import { CodeView } from "./CodeView";
import { Chip, Icon, IconButton } from "./primitives";
import { cn } from "@/lib/utils";
import { useState } from "react";

const diagnostics = {
  27: { level: "warn" as const, message: "TODO left in code — Debug Agent flagged missing audit event" },
  12: { level: "info" as const, message: "AI suggestion: extract SESSION_TTL_MS into config module" },
};

const diffLines = [
  { k: " ", t: "export async function createSession(user: User): Promise<Session> {" },
  { k: "-", t: "  const id = randomBytes(16).toString(\"hex\");" },
  { k: "+", t: "  const id = randomBytes(32).toString(\"hex\");" },
  { k: "+", t: "  await auditSink.emit({ type: \"session.created\", userId: user.id });" },
  { k: " ", t: "  return session;" },
  { k: " ", t: "}" },
];

export function EditorPane() {
  const { openTabs, activeTab, setActiveTab, closeTab, selection, setSelection } = useHelix();
  const [mode, setMode] = useState<"code" | "diff">("code");
  const file = activeTab ? findFile(activeTab) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* tabs */}
      <div className="hairline-b flex h-9 shrink-0 items-stretch bg-surface">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {openTabs.map((path) => {
            const f = findFile(path);
            const active = path === activeTab;
            return (
              <div
                key={path}
                className={cn(
                  "hairline-r group flex items-center gap-2 px-3 text-[12px]",
                  active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute" />}
                <button type="button" onClick={() => setActiveTab(path)} className="flex items-center gap-1.5">
                  <Icon name="FileCode2" className="size-3.5 text-primary/70" />
                  <span className="whitespace-nowrap">{f?.name ?? path}</span>
                  {f?.gitStatus === "modified" && <span className="size-1.5 rounded-full bg-warning" />}
                </button>
                <button
                  type="button"
                  onClick={() => closeTab(path)}
                  aria-label={`Close ${f?.name}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Icon name="X" className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 px-2">
          <IconButton
            icon="Code2"
            label="Code view"
            active={mode === "code"}
            onClick={() => setMode("code")}
          />
          <IconButton
            icon="GitCompare"
            label="Diff view"
            active={mode === "diff"}
            onClick={() => setMode("diff")}
          />
          <IconButton icon="Columns2" label="Split editor" />
        </div>
      </div>

      {/* breadcrumbs */}
      <div className="hairline-b flex h-7 shrink-0 items-center gap-1.5 px-3 font-mono text-[11px] text-muted-foreground">
        {(activeTab ?? "").split("/").map((seg, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={i === arr.length - 1 ? "text-foreground/80" : ""}>{seg}</span>
            {i < arr.length - 1 && <Icon name="ChevronRight" className="size-3" />}
          </span>
        ))}
        {file?.language && <Chip className="ml-auto">{file.language}</Chip>}
      </div>

      {/* body */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {!file && (
          <div className="grid h-full place-items-center text-[12px] text-muted-foreground">
            No file open — press ⌘K to search the workspace
          </div>
        )}
        {file && mode === "code" && (
          <div
            onMouseUp={() => {
              const sel = window.getSelection()?.toString() ?? "";
              setSelection(sel.trim() ? sel.trim() : null);
            }}
            className="py-2"
          >
            <CodeView code={file.content ?? ""} diagnostics={diagnostics} />
          </div>
        )}
        {file && mode === "diff" && (
          <div className="py-2 font-mono text-[12.5px] leading-[1.65]">
            {diffLines.map((l, i) => (
              <div
                key={i}
                className={cn(
                  "flex px-3",
                  l.k === "+" && "bg-success/10 text-success",
                  l.k === "-" && "bg-destructive/10 text-destructive",
                )}
              >
                <span className="w-4 select-none text-muted-foreground/60">{l.k}</span>
                <span className="whitespace-pre">{l.t}</span>
              </div>
            ))}
          </div>
        )}

        {selection && (
          <div className="glass-panel fade-up absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md px-1.5 py-1 shadow-lg">
            <span className="px-1.5 text-[11px] text-muted-foreground">Selection</span>
            {["Explain", "Refactor", "Fix", "Tests", "Docs"].map((a) => (
              <button
                key={a}
                type="button"
                className="rounded-sm px-2 py-1 text-[11.5px] hover:bg-accent"
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="rounded-sm px-1.5 py-1 text-muted-foreground hover:bg-accent"
            >
              <Icon name="X" className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
