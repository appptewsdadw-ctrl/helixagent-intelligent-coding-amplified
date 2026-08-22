import { cn } from "@/lib/utils";
import { useMemo } from "react";

const KEYWORDS =
  /\b(import|from|export|const|let|var|function|return|async|await|class|interface|type|extends|implements|new|if|else|for|of|in|try|catch|throw|private|readonly|public|constructor|this|null|undefined|true|false)\b/;

type Tok = { t: string; c?: string };

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  const re =
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`[^`]*`|"[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s\w$])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ t: m[1], c: "text-syn-com" });
    else if (m[2]) out.push({ t: m[2], c: "text-syn-str" });
    else if (m[3]) out.push({ t: m[3], c: "text-syn-num" });
    else if (m[4]) {
      const w = m[4];
      const after = line.slice(re.lastIndex, re.lastIndex + 1);
      if (KEYWORDS.test(w)) out.push({ t: w, c: "text-syn-key" });
      else if (after === "(") out.push({ t: w, c: "text-syn-fn" });
      else if (/^[A-Z]/.test(w)) out.push({ t: w, c: "text-syn-type" });
      else out.push({ t: w });
    } else out.push({ t: m[0], c: m[6] ? "text-muted-foreground" : undefined });
  }
  return out;
}

export function CodeView({
  code,
  diagnostics = {},
  className,
}: {
  code: string;
  diagnostics?: Record<number, { level: "warn" | "error" | "info"; message: string }>;
  className?: string;
}) {
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);
  return (
    <div className={cn("min-h-full font-mono text-[12.5px] leading-[1.65]", className)}>
      {lines.map((line, i) => {
        const n = i + 1;
        const diag = diagnostics[n];
        return (
          <div key={n}>
            <div className="group flex hover:bg-accent/30">
              <span className="w-12 shrink-0 select-none pr-3 text-right text-muted-foreground/50 tabular-nums">
                {n}
              </span>
              <code className="whitespace-pre pr-8">
                {tokenize(line).map((tk, j) => (
                  <span key={j} className={tk.c}>
                    {tk.t}
                  </span>
                ))}
              </code>
            </div>
            {diag && (
              <div className="flex">
                <span className="w-12 shrink-0" />
                <span
                  className={cn(
                    "my-0.5 rounded-[3px] px-2 py-0.5 text-[11px]",
                    diag.level === "error"
                      ? "bg-destructive/10 text-destructive"
                      : diag.level === "warn"
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  {diag.message}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
