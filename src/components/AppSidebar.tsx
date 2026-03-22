import {
  LayoutDashboard,
  Users,
  Scale,
  CalendarClock,
  FileText,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",     id: "dashboard" },
  { icon: Scale,           label: "Processos",     id: "processos" },
  { icon: Users,           label: "Clientes",      id: "clientes" },
  { icon: CalendarClock,   label: "Prazos & Tarefas", id: "prazos" },
  { icon: FileText,        label: "Documentos",    id: "documentos" },
];

interface AppSidebarProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export const AppSidebar = ({ activeItem, onNavigate }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sidebar-gradient flex flex-col border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border transition-all duration-300",
        collapsed ? "justify-center px-0 py-4" : "px-4 py-4"
      )}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
        ) : (
          /* Logo real — invert+screen: branco vira preto (transparente no screen), cores aparecem */
          <div className="w-full flex items-center justify-center px-3 py-2">
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

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              collapsed && "justify-center",
              activeItem === item.id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
        <button
          onClick={() => onNavigate("configuracoes")}
          title={collapsed ? "Configurações" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all",
            collapsed && "justify-center",
            activeItem === "configuracoes" && "bg-sidebar-accent text-sidebar-primary"
          )}
        >
          <Settings2 className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </button>

        <div className={cn(
          "flex items-center px-1 mt-2",
          collapsed ? "flex-col gap-2" : "justify-between"
        )}>
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-muted hover:text-sidebar-foreground transition-colors p-2 rounded-lg hover:bg-sidebar-accent/40"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </button>
        </div>
      </div>
    </aside>
  );
};
