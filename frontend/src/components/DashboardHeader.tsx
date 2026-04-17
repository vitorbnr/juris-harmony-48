import { useEffect, useState } from "react";
import { Bell, Check, ChevronDown, LogOut, MapPin } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { getSectionMeta } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { notificacoesApi, unidadesApi } from "@/services/api";
import type { Notificacao, Unidade } from "@/types";

const tipoCor: Record<string, string> = {
  prazo: "bg-red-500/15 text-red-400",
  financeiro: "bg-yellow-500/15 text-yellow-400",
  documento: "bg-blue-500/15 text-blue-400",
  sistema: "bg-muted text-muted-foreground",
};

interface Props {
  activeItem: string;
  onNavigate?: (id: string) => void;
}

export const DashboardHeader = ({ activeItem, onNavigate }: Props) => {
  const { user, logout } = useAuth();
  const { unidadeSelecionada, setUnidadeSelecionada } = useUnidade();

  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unidades, setUnidades] = useState<Unidade[]>([]);

  const section = getSectionMeta(activeItem, user?.nome?.split(" ").slice(0, 2).join(" ") ?? "");

  useEffect(() => {
    unidadesApi
      .listar()
      .then((data: Unidade[] | { content?: Unidade[] }) => {
        const items = (data as { content?: Unidade[] }).content ?? data;
        setUnidades(Array.isArray(items) ? (items as Unidade[]) : []);
      })
      .catch(() => setUnidades([]));
  }, []);

  useEffect(() => {
    let ativo = true;

    const carregarNotificacoes = () => {
      notificacoesApi
        .listar({ size: 10 })
        .then((data) => {
          if (!ativo) return;
          const items = data.content ?? data;
          setNotifs(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          if (ativo) setNotifs([]);
        });

      notificacoesApi
        .contarNaoLidas()
        .then((count) => {
          if (ativo) setUnreadCount(count);
        })
        .catch(() => {
          if (ativo) setUnreadCount(0);
        });
    };

    carregarNotificacoes();
    const interval = window.setInterval(carregarNotificacoes, 60000);

    return () => {
      ativo = false;
      window.clearInterval(interval);
    };
  }, []);

  const unidadeLabel =
    unidadeSelecionada === "todas"
      ? "Todas as Unidades"
      : unidades.find((unidade) => unidade.id === unidadeSelecionada)?.nome ?? "Unidade";

  const normalizarTipoNotificacao = (tipo: string) => tipo.toLowerCase();

  const marcarLida = (id: string) => {
    notificacoesApi
      .marcarLida(id)
      .then(() => {
        setNotifs((prev) => prev.map((notificacao) => (notificacao.id === id ? { ...notificacao, lida: true } : notificacao)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      })
      .catch((err) => console.error("Erro ao marcar notificacao como lida:", err));
  };

  const marcarTodasLidas = () => {
    notificacoesApi
      .marcarTodasLidas()
      .then(() => {
        setNotifs((prev) => prev.map((notificacao) => ({ ...notificacao, lida: true })));
        setUnreadCount(0);
      })
      .catch((err) => console.error("Erro ao marcar todas as notificacoes como lidas:", err));
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/50 px-6 py-3.5 backdrop-blur-sm">
      <div className="min-w-0">
        <h2 className="truncate font-heading text-xl font-semibold text-foreground">{section.title}</h2>
        <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{section.subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setUnidadeOpen(!unidadeOpen);
              setNotifOpen(false);
            }}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all",
              unidadeSelecionada !== "todas"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{unidadeLabel}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", unidadeOpen && "rotate-180")} />
          </button>

          {unidadeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUnidadeOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                {["todas", ...unidades.map((unidade) => unidade.id)].map((id) => {
                  const label = id === "todas" ? "Todas as Unidades" : unidades.find((unidade) => unidade.id === id)?.nome;
                  const selecionado = unidadeSelecionada === id;

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setUnidadeSelecionada(id);
                        setUnidadeOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                        selecionado && "bg-primary/5 text-primary",
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

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUnidadeOpen(false);
            }}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Notificacoes</p>
                  {unreadCount > 0 && (
                    <button onClick={marcarTodasLidas} className="text-xs text-primary hover:underline">
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      Nenhuma notificacao
                    </div>
                  ) : (
                    notifs.map((notificacao) => {
                      const tipoNormalizado = normalizarTipoNotificacao(notificacao.tipo);

                      return (
                        <button
                          key={notificacao.id}
                          onClick={() => {
                            marcarLida(notificacao.id);
                            setNotifOpen(false);
                            if (notificacao.link && onNavigate) onNavigate(notificacao.link);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40",
                            !notificacao.lida && "bg-primary/3",
                          )}
                        >
                          <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", tipoCor[tipoNormalizado] ?? tipoCor.sistema)}>
                            {tipoNormalizado === "prazo"
                              ? "PRAZO"
                              : tipoNormalizado === "financeiro"
                                ? "FIN"
                                : tipoNormalizado === "documento"
                                  ? "DOC"
                                  : "SIS"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-sm font-medium", notificacao.lida ? "text-muted-foreground" : "text-foreground")}>
                              {notificacao.titulo}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notificacao.descricao}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {notificacao.criadaEm
                                ? new Date(notificacao.criadaEm).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </p>
                          </div>
                          {!notificacao.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Avatar className="h-9 w-9 cursor-pointer border-2 border-primary/30" title={user?.nome}>
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
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
