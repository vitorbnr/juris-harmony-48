import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Scale,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NovoAtendimentoModal } from "@/components/modals/NovoAtendimentoModal";
import { NovoCasoModal } from "@/components/modals/NovoCasoModal";
import { NovoClienteModal } from "@/components/modals/NovoClienteModal";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { getSectionMeta } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { notificacoesApi, unidadesApi } from "@/services/api";
import type { Notificacao, Unidade } from "@/types";

const tipoCor: Record<string, string> = {
  prazo: "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  tarefa: "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  financeiro: "border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  documento: "border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  sistema: "border border-primary/20 bg-primary/10 text-primary",
};

const notificationLabel: Record<string, string> = {
  prazo: "PRAZO",
  tarefa: "TAREFA",
  financeiro: "FIN",
  documento: "DOC",
  sistema: "SIS",
};

interface Props {
  activeItem: string;
  onNavigate?: (id: string) => void;
}

interface QuickCreateAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

const normalizarTipoNotificacao = (tipo: string) => tipo.toLowerCase();

const isUrgentNotification = (notificacao: Notificacao) => {
  const tipoNormalizado = normalizarTipoNotificacao(notificacao.tipo);
  const texto = `${notificacao.titulo} ${notificacao.descricao}`.toLowerCase();

  return tipoNormalizado === "prazo" || tipoNormalizado === "tarefa" || texto.includes("tarefa");
};

export const DashboardHeader = ({ activeItem, onNavigate }: Props) => {
  const { user, logout } = useAuth();
  const { unidadeSelecionada, setUnidadeSelecionada } = useUnidade();

  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalCaso, setModalCaso] = useState(false);
  const [modalProcesso, setModalProcesso] = useState(false);
  const [modalAtendimento, setModalAtendimento] = useState(false);
  const showUnitSelector = activeItem === "clientes";

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
    if (!showUnitSelector && unidadeSelecionada !== "todas") {
      setUnidadeSelecionada("todas");
    }
  }, [showUnitSelector, setUnidadeSelecionada, unidadeSelecionada]);

  useEffect(() => {
    let ativo = true;

    const carregarNotificacoes = () => {
      notificacoesApi
        .listar({ size: 12 })
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

  const urgentNotifications = notifs.filter(isUrgentNotification);
  const systemNotifications = notifs.filter((notificacao) => !isUrgentNotification(notificacao));

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

  const quickCreateActions: QuickCreateAction[] = [
    {
      label: "Processo Manual",
      icon: Scale,
      onClick: () => {
        // TODO: Abrir modal de Processo Manual com estado dedicado do header.
        setModalProcesso(true);
      },
    },
    {
      label: "Caso",
      icon: Briefcase,
      onClick: () => {
        setModalCaso(true);
      },
    },
    {
      label: "Atendimento",
      icon: MessageSquare,
      onClick: () => {
        // TODO: Abrir modal de Atendimento com estado dedicado do header.
        setModalAtendimento(true);
      },
    },
    {
      label: "Tarefa",
      icon: CheckSquare,
      onClick: () => {
        // TODO: Abrir modal de Tarefa.
      },
    },
    {
      label: "Evento",
      icon: Calendar,
      onClick: () => {
        // TODO: Abrir modal de Evento.
      },
    },
    {
      label: "Prazo",
      icon: Clock,
      onClick: () => {
        // TODO: Abrir modal de Prazo.
      },
    },
    {
      label: "Audiencia",
      icon: Users,
      onClick: () => {
        // TODO: Abrir modal de Audiencia.
      },
    },
    {
      label: "Cliente",
      icon: UserPlus,
      onClick: () => {
        // TODO: Abrir modal de Cliente com estado dedicado do header.
        setModalCliente(true);
      },
    },
  ];

  const renderNotificationList = (notifications: Notificacao[]) => {
    if (notifications.length === 0) {
      return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-muted-foreground">
          <BellOff className="h-10 w-10 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">Nenhuma notificacao no momento</p>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 p-2">
        {notifications.map((notificacao) => {
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
                "surface-panel flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-primary/15 hover:bg-accent/55 hover:shadow-sm",
                !notificacao.lida && "border-primary/10 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                  tipoCor[tipoNormalizado] ?? tipoCor.sistema,
                )}
              >
                {notificationLabel[tipoNormalizado] ?? "SIS"}
              </span>

              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", notificacao.lida ? "text-muted-foreground" : "text-foreground")}>
                  {notificacao.titulo}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notificacao.descricao}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  {notificacao.criadaEm
                    ? new Date(notificacao.criadaEm).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--"}
                </p>
              </div>

              {!notificacao.lida && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-xl font-semibold text-foreground">{section.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground/90">{section.subtitle}</p>

            {showUnitSelector && (
              <DropdownMenu open={unidadeOpen} onOpenChange={setUnidadeOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
                      unidadeSelecionada !== "todas"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 bg-card/75 text-muted-foreground shadow-sm hover:bg-accent/70 hover:text-foreground",
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="max-w-[180px] truncate">{unidadeLabel}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", unidadeOpen && "rotate-180")} />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  collisionPadding={16}
                  className="w-56 rounded-lg border-border bg-popover p-1.5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.24)]"
                >
                  <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Unidade ativa
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {["todas", ...unidades.map((unidade) => unidade.id)].map((id) => {
                    const label = id === "todas" ? "Todas as Unidades" : unidades.find((unidade) => unidade.id === id)?.nome;
                    const selecionado = unidadeSelecionada === id;

                    return (
                      <DropdownMenuItem
                        key={id}
                        onClick={() => setUnidadeSelecionada(id, id === "todas" ? undefined : label)}
                        className={cn(
                          "rounded-lg px-3 py-2.5 text-sm",
                          selecionado && "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary",
                        )}
                      >
                        <MapPin className={cn("mr-2 h-4 w-4", selecionado ? "text-primary" : "text-muted-foreground")} />
                        <span className="flex-1 truncate">{label}</span>
                        {selecionado && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <WeatherWidget />

          <ThemeToggle className="border border-border bg-background shadow-sm hover:bg-muted" />

          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg border border-border bg-background shadow-sm hover:bg-muted"
                aria-label="Abrir notificacoes"
              >
                <Bell className="h-4 w-4 text-foreground/70" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={10}
              collisionPadding={16}
              className="w-[min(24rem,calc(100vw-1rem))] rounded-lg border-border bg-popover p-0 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.24)]"
            >
              <div className="border-b border-border/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notificacoes</p>
                    <p className="text-xs text-muted-foreground">Centro de alertas operacionais e do sistema.</p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
              </div>

              <Tabs defaultValue="urgentes" className="w-full">
                <TabsList className="mx-4 mt-4 grid h-auto grid-cols-2 rounded-lg bg-muted p-1">
                  <TabsTrigger value="urgentes" className="rounded-lg text-xs sm:text-sm">
                    Urgentes
                  </TabsTrigger>
                  <TabsTrigger value="sistema" className="rounded-lg text-xs sm:text-sm">
                    Sistema
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="urgentes" className="mt-0">
                  <div className="max-h-80 overflow-y-auto">{renderNotificationList(urgentNotifications)}</div>
                </TabsContent>

                <TabsContent value="sistema" className="mt-0">
                  <div className="max-h-80 overflow-y-auto">{renderNotificationList(systemNotifications)}</div>
                </TabsContent>
              </Tabs>

              <div className="border-t border-border/70 p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-center rounded-lg text-sm text-primary hover:bg-muted hover:text-foreground"
                  onClick={marcarTodasLidas}
                  disabled={unreadCount === 0}
                >
                  Marcar todas como lidas
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                aria-label="Abrir criacao rapida"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              collisionPadding={16}
              className="w-64 rounded-lg border-border bg-popover p-2 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.24)]"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Criacao rapida
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {quickCreateActions.map(({ label, icon: Icon, onClick }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={onClick}
                  className="rounded-lg px-3 py-2.5 text-sm focus:bg-muted focus:text-foreground"
                >
                  <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full border border-border bg-background p-0.5 shadow-sm transition-shadow hover:shadow-md"
                aria-label="Abrir menu do utilizador"
              >
                <Avatar className="h-9 w-9 cursor-pointer border-2 border-primary/30 shadow-sm" title={user?.nome}>
                  <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                    {user?.initials ?? "??"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={10}
              collisionPadding={16}
              className="w-64 rounded-lg border-border bg-popover p-2 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.24)]"
            >
              <DropdownMenuLabel className="px-3 py-3">
                <p className="truncate text-sm font-semibold text-foreground">{user?.nome ?? "Utilizador"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email ?? "Sessao ativa"}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  <MapPin className="h-3 w-3" />
                  {user?.unidadeNome ?? unidadeLabel}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="rounded-xl px-3 py-2.5 text-sm text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Terminar sessao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {modalCliente && <NovoClienteModal onClose={() => setModalCliente(false)} onSaved={() => window.location.reload()} />}
      {modalCaso && <NovoCasoModal onClose={() => setModalCaso(false)} onSaved={() => window.location.reload()} />}
      {modalProcesso && <NovoProcessoModal onClose={() => setModalProcesso(false)} onSaved={() => window.location.reload()} />}
      {modalAtendimento && (
        <NovoAtendimentoModal onClose={() => setModalAtendimento(false)} onSaved={() => window.location.reload()} />
      )}
    </>
  );
};
