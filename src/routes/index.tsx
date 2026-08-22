import { createFileRoute } from "@tanstack/react-router";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { HelixProvider, useHelix } from "@/lib/helix/store";
import { ActivityRail, SidebarPanel } from "@/components/helix/Sidebar";
import { EditorPane } from "@/components/helix/EditorPane";
import { AgentPanel } from "@/components/helix/AgentPanel";
import { TerminalPane } from "@/components/helix/TerminalPane";
import { CommandPalette } from "@/components/helix/CommandPalette";
import { StatusBar, TitleBar } from "@/components/helix/Chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HelixAgent — AI Development Command Center" },
      {
        name: "description",
        content:
          "HelixAgent is a desktop-class AI development command center: multi-agent orchestration, code editor, terminal, git client and local/remote model management in one dark, high-density workspace.",
      },
      { property: "og:title", content: "HelixAgent — AI Development Command Center" },
      {
        property: "og:description",
        content:
          "Multi-agent orchestration, editor, terminal, git and model management in a single premium dark workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

function WorkspaceShell() {
  const { bottomOpen } = useHelix();
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ActivityRail />
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="19%" minSize="12%" maxSize="32%">
            <SidebarPanel />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="53%" minSize="30%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize={bottomOpen ? "66%" : "100%"} minSize="25%">
                <EditorPane />
              </ResizablePanel>
              {bottomOpen && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize="34%" minSize="12%">
                    <TerminalPane />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="28%" minSize="18%" maxSize="44%">
            <AgentPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  );
}

function Workspace() {
  return (
    <HelixProvider>
      <h1 className="sr-only">HelixAgent — AI Development Command Center</h1>
      <WorkspaceShell />
    </HelixProvider>
  );
}
