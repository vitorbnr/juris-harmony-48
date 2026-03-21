import {
  LayoutDashboard,
  Users,
  Scale,
  CalendarClock,
  FileText,
  DollarSign,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Scale, label: "Processos", id: "processos" },
  { icon: Users, label: "Clientes", id: "clientes" },
  { icon: CalendarClock, label: "Prazos & Tarefas", id: "prazos" },
  { icon: FileText, label: "Documentos", id: "documentos" },
  { icon: DollarSign, label: "Financeiro", id: "financeiro" },
  { icon: MessageSquare, label: "Comunicação", id: "comunicacao" },
  { icon: Shield, label: "Segurança", id: "seguranca" },
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
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Scale className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-heading text-lg font-semibold text-sidebar-foreground leading-tight">
              Viana
            </h1>
            <p className="text-[11px] text-sidebar-muted tracking-wider uppercase">
              Advocacia
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
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
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all">
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </button>
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-muted hover:text-sidebar-foreground transition-colors p-2"
          >
            <LogOut className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
    </aside>
  );
};
