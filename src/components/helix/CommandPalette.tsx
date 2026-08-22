import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useHelix } from "@/lib/helix/store";
import { flattenFiles } from "@/lib/helix/data";
import { Icon } from "./primitives";

export function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    openFile,
    setView,
    runTask,
    runCommand,
    setBottomOpen,
    agents,
    providers,
    setActiveModel,
    tools,
  } = useHelix();

  const close = () => setPaletteOpen(false);
  const files = flattenFiles();

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <CommandInput placeholder="Search files, commands, agents, tasks, git, models…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Files">
          {files.map((f) => (
            <CommandItem
              key={f.path}
              value={`file ${f.path}`}
              onSelect={() => {
                openFile(f.path);
                close();
              }}
            >
              <Icon name="FileCode2" className="size-3.5 text-primary/70" />
              <span className="font-mono text-[12px]">{f.path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="AI actions">
          {[
            ["Explain current file", "Explain the current file and its responsibilities"],
            ["Generate tests", "Generate tests for the current module"],
            ["Refactor selection", "Refactor the selected code for clarity"],
            ["Review changes", "Review the working tree changes"],
            ["Generate commit message", "Generate a commit message for staged changes"],
          ].map(([label, prompt]) => (
            <CommandItem
              key={label}
              value={`ai ${label}`}
              onSelect={() => {
                runTask(prompt);
                close();
              }}
            >
              <Icon name="Sparkles" className="size-3.5 text-violet" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Agents">
          {agents.map((a) => (
            <CommandItem
              key={a.id}
              value={`agent ${a.name}`}
              onSelect={() => {
                setView("agents");
                close();
              }}
            >
              <Icon name={a.icon} className="size-3.5 text-primary" />
              {a.name}
              <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{a.model}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Models">
          {providers.flatMap((p) =>
            p.models.map((m) => (
              <CommandItem
                key={`${p.id}-${m.id}`}
                value={`model ${p.label} ${m.label}`}
                onSelect={() => {
                  setActiveModel(m.id);
                  close();
                }}
              >
                <Icon name="Cpu" className="size-3.5 text-muted-foreground" />
                {m.label}
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{p.label}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Git & terminal">
          {["git status", "git diff", "git log --oneline", "pnpm test", "pnpm build"].map((c) => (
            <CommandItem
              key={c}
              value={`run ${c}`}
              onSelect={() => {
                setBottomOpen(true);
                runCommand(c);
                close();
              }}
            >
              <Icon name="SquareTerminal" className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[12px]">{c}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tools">
          {tools.map((t) => (
            <CommandItem key={t.id} value={`tool ${t.label}`} onSelect={close}>
              <Icon name="Wrench" className="size-3.5 text-muted-foreground" />
              {t.label}
              <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
                {t.requiresApproval ? "approval" : "auto"}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
