import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/helix/types";
import * as Icons from "lucide-react";
import type { ComponentType } from "react";

export const accentText: Record<string, string> = {
  primary: "text-primary",
  violet: "text-violet",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export const accentBg: Record<string, string> = {
  primary: "bg-primary/12 text-primary",
  violet: "bg-violet/12 text-violet",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  destructive: "bg-destructive/12 text-destructive",
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string | undefined;
}) {
  const map = Icons as unknown as Record<string, ComponentType<{ className?: string }>>;
  const Cmp = map[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}

export function PanelHeader({
  title,
  actions,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hairline-b flex h-8 shrink-0 items-center justify-between gap-2 px-3",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {title}
      </span>
      <div className="flex items-center gap-1">{actions}</div>
    </div>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
  className,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
        className,
      )}
    >
      <Icon name={icon} className="size-3.5" />
    </button>
  );
}

const statusStyles: Record<AgentStatus, { dot: string; label: string }> = {
  idle: { dot: "bg-muted-foreground/60", label: "Idle" },
  thinking: { dot: "bg-violet pulse-dot", label: "Thinking" },
  running: { dot: "bg-primary pulse-dot", label: "Running" },
  waiting: { dot: "bg-warning pulse-dot", label: "Waiting" },
  success: { dot: "bg-success", label: "Success" },
  error: { dot: "bg-destructive", label: "Error" },
};

export function StatusDot({ status, withLabel }: { status: AgentStatus; withLabel?: boolean }) {
  const s = statusStyles[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} />
      {withLabel && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
      )}
    </span>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "violet" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    violet: "bg-violet/12 text-violet",
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    destructive: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] px-1.5 py-px font-mono text-[10px] leading-4 tracking-tight",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
