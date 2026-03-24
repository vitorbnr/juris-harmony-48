import { useState, useEffect } from "react";
import { Bell, Search, MapPin, ChevronDown, Check, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { unidades } from "@/data/mockData";
import { useUnidade } from "@/context/UnidadeContext";
import { useAuth } from "@/context/AuthContext";
import { notificacoesApi } from "@/services/api";
import type { Notificacao } from "@/types";

const getSectionTitles = (userName: string): Record<string, { title: string; subtitle: string }> => ({
  dashboard:    { title: `Bom dia, ${userName}`, subtitle: "Aqui está o resumo do seu escritório hoje." },
  processos:    { title: "Processos",          subtitle: "Gerencie todos os processos do escritório." },
  clientes:     { title: "Clientes",           subtitle: "Carteira de clientes do escritório." },
  prazos:       { title: "Prazos & Tarefas",   subtitle: "Acompanhe prazos processuais, audiências e tarefas." },
  documentos:   { title: "Documentos",         subtitle: "Repositório central de arquivos e documentos." },
  configuracoes:{ title: "Configurações",      subtitle: "Gerencie perfil, equipe e preferências do sistema." },
});

const tipoCor: Record<string, string> = {
  prazo:      "bg-red-500/15 text-red-400",
  financeiro: "bg-yellow-500/15 text-yellow-400",
  documento:  "bg-blue-500/15 text-blue-400",
  sistema:    "bg-muted text-muted-foreground",
};

interface Props {
  activeItem: string;
  onNavigate?: (id: string) => void;
}

export const DashboardHeader = ({ activeItem, onNavigate }: Props) => {
  const { user, logout } = useAuth();
  const sectionTitles = getSectionTitles(user?.nome?.split(" ").slice(0, 2).join(" ") ?? "");
  const section = sectionTitles[activeItem] ?? sectionTitles.dashboard;
  const { unidadeSelecionada, setUnidadeSelecionada } = useUnidade();
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);

  useEffect(() => {
    notificacoesApi.listar({ size: 10 })
      .then((data) => {
        const items = data.content ?? data;
        setNotifs(Array.isArray(items) ? items : []);
      })
      .catch(() => setNotifs([]));
  }, []);

  const naoLidas = notifs.filter(n => !n.lida).length;
  const unidadeLabel = unidadeSelecionada === "todas"
    ? "Todas as Unidades"
    : unidades.find(u => u.id === unidadeSelecionada)?.nome ?? "Unidade";

  const marcarLida = (id: string) =>
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));

  const marcarTodasLidas = () =>
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })));

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 gap-3">
      {/* Título */}
      <div className="min-w-0">
        <h2 className="font-heading text-xl font-semibold text-foreground truncate">{section.title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{section.subtitle}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Busca */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 w-56 bg-secondary border-none h-9" />
        </div>

        {/* Filtro de Unidade */}
        <div className="relative">
          <button
            onClick={() => { setUnidadeOpen(!unidadeOpen); setNotifOpen(false); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium border transition-all",
              unidadeSelecionada !== "todas"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{unidadeLabel}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", unidadeOpen && "rotate-180")} />
          </button>

          {unidadeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUnidadeOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                {["todas", ...unidades.map(u => u.id)].map(id => {
                  const label = id === "todas" ? "Todas as Unidades" : unidades.find(u => u.id === id)?.nome;
                  const selecionado = unidadeSelecionada === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setUnidadeSelecionada(id); setUnidadeOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors",
                        selecionado && "text-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={cn("h-3.5 w-3.5", selecionado ? "text-primary" : "text-muted-foreground")} />
                        {label}
                      </div>
                      {selecionado && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Notificações */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => { setNotifOpen(!notifOpen); setUnidadeOpen(false); }}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {naoLidas > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-destructive rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                {naoLidas}
              </span>
            )}
          </Button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm text-foreground">Notificações</p>
                  {naoLidas > 0 && (
                    <button onClick={marcarTodasLidas} className="text-xs text-primary hover:underline">
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifs.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { marcarLida(n.id); setNotifOpen(false); if (n.link && onNavigate) onNavigate(n.link); }}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0",
                          !n.lida && "bg-primary/3"
                        )}
                      >
                        <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5", tipoCor[n.tipo])}>
                          {n.tipo === "prazo" ? "PRAZO" : n.tipo === "financeiro" ? "FIN" : n.tipo === "documento" ? "DOC" : "SIS"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", n.lida ? "text-muted-foreground" : "text-foreground")}>
                            {n.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.descricao}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{n.data} às {n.hora}</p>
                        </div>
                        {!n.lida && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar + Logout */}
        <Avatar className="h-9 w-9 border-2 border-primary/30 cursor-pointer" title={user?.nome}>
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
            {user?.initials ?? "??"}
          </AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout} title="Sair">
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
};
