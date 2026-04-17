import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { useState } from "react";

import { appSections, configuracoesSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ThemeToggle";

interface AppSidebarProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export const AppSidebar = ({ activeItem, onNavigate }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sidebar-gradient sticky top-0 flex h-screen flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border transition-all duration-300",
          collapsed ? "justify-center px-0 py-4" : "px-4 py-4",
        )}
      >
        {collapsed ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="flex w-full items-center justify-center px-3 py-2">
            <img
              src="/logo.png"
              alt="Viana Advocacia"
              style={{
                width: "170px",
                height: "auto",
                display: "block",
                filter: "invert(1) hue-rotate(180deg) brightness(1.1)",
                mixBlendMode: "screen",
              }}
            />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {appSections.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              collapsed && "justify-center",
              activeItem === item.id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        <button
          onClick={() => onNavigate(configuracoesSection.id)}
          title={collapsed ? configuracoesSection.label : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            collapsed && "justify-center",
            activeItem === configuracoesSection.id
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          )}
        >
          <configuracoesSection.icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>{configuracoesSection.label}</span>}
        </button>

        <div className={cn("mt-2 flex items-center px-1", collapsed ? "flex-col gap-2" : "justify-between")}>
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
