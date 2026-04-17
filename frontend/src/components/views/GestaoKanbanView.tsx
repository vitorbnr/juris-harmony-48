import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  GripVertical,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Scale,
  SquareKanban,
} from "lucide-react";

import { PrazoDetalheSheet } from "@/components/prazos/PrazoDetalheSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { cn } from "@/lib/utils";
import { prazosApi } from "@/services/api";
import { toast } from "sonner";
import type { EtapaPrazo, Prazo } from "@/types";

type KanbanEtapa = EtapaPrazo;
type KanbanColumnsState = Record<KanbanEtapa, Prazo[]>;
type DragPayload = { prazoId: string; origem: KanbanEtapa } | null;

const EMPTY_COLUMNS: KanbanColumnsState = {
  a_fazer: [],
  em_andamento: [],
  concluido: [],
};

const KANBAN_ORDER: KanbanEtapa[] = ["a_fazer", "em_andamento", "concluido"];

const KANBAN_META: Record<KanbanEtapa, { titulo: string; descricao: string; accent: string }> = {
  a_fazer: {
    titulo: "A Fazer",
    descricao: "Itens prontos para serem atacados.",
    accent: "border-sky-500/20 bg-sky-500/5",
  },
  em_andamento: {
    titulo: "Em Andamento",
    descricao: "Trabalho ativo em execucao.",
    accent: "border-amber-500/20 bg-amber-500/5",
  },
  concluido: {
    titulo: "Concluido",
    descricao: "Demandas finalizadas no fluxo diario.",
    accent: "border-emerald-500/20 bg-emerald-500/5",
  },
};

const PRIORIDADE_CLASS: Record<string, string> = {
  alta: "border-red-500/30 bg-red-500/10 text-red-300",
  media: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  baixa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function sortPrazosByDeadline(prazos: Prazo[]) {
  return [...prazos].sort((a, b) => {
    const dateCompare = a.data.localeCompare(b.data);
    if (dateCompare !== 0) return dateCompare;
    return (a.hora ?? "").localeCompare(b.hora ?? "");
  });
}

function normalizeEtapa(prazo: Prazo): KanbanEtapa {
  if (prazo.etapa) return prazo.etapa;
  return prazo.concluido ? "concluido" : "a_fazer";
}

function buildColumns(prazos: Prazo[]): KanbanColumnsState {
  const next: KanbanColumnsState = {
    a_fazer: [],
    em_andamento: [],
    concluido: [],
  };

  for (const prazo of prazos) {
    next[normalizeEtapa(prazo)].push(prazo);
  }

  return {
    a_fazer: sortPrazosByDeadline(next.a_fazer),
    em_andamento: sortPrazosByDeadline(next.em_andamento),
    concluido: sortPrazosByDeadline(next.concluido),
  };
}

function movePrazoBetweenColumns(
  columns: KanbanColumnsState,
  prazoId: string,
  origem: KanbanEtapa,
  destino: KanbanEtapa,
): KanbanColumnsState {
  const prazo = columns[origem].find((item) => item.id === prazoId);
  if (!prazo) return columns;

  const updatedPrazo: Prazo = {
    ...prazo,
    etapa: destino,
    concluido: destino === "concluido",
  };

  return {
    ...columns,
    [origem]: columns[origem].filter((item) => item.id !== prazoId),
    [destino]: sortPrazosByDeadline([...columns[destino], updatedPrazo]),
  };
}

function replacePrazo(columns: KanbanColumnsState, prazoAtualizado: Prazo): KanbanColumnsState {
  const cleaned: KanbanColumnsState = {
    a_fazer: columns.a_fazer.filter((item) => item.id !== prazoAtualizado.id),
    em_andamento: columns.em_andamento.filter((item) => item.id !== prazoAtualizado.id),
    concluido: columns.concluido.filter((item) => item.id !== prazoAtualizado.id),
  };

  const etapa = normalizeEtapa(prazoAtualizado);
  cleaned[etapa] = sortPrazosByDeadline([...cleaned[etapa], prazoAtualizado]);
  return cleaned;
}

function removePrazo(columns: KanbanColumnsState, prazoId: string): KanbanColumnsState {
  return {
    a_fazer: columns.a_fazer.filter((item) => item.id !== prazoId),
    em_andamento: columns.em_andamento.filter((item) => item.id !== prazoId),
    concluido: columns.concluido.filter((item) => item.id !== prazoId),
  };
}

function isPrazoParticipant(prazo: Prazo, userId?: string) {
  return Boolean(userId && prazo.participantes?.some((participante) => participante.id === userId));
}

function canOperatePrazo(prazo: Prazo, userId?: string, userRole?: string) {
  if (!userId) return false;
  if (userRole?.toLowerCase() === "administrador") return true;
  return prazo.advogadoId === userId || isPrazoParticipant(prazo, userId);
}

export const GestaoKanbanView = () => {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();
  const [columns, setColumns] = useState<KanbanColumnsState>(EMPTY_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [prazoSelecionadoId, setPrazoSelecionadoId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<KanbanEtapa | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const dragRef = useRef<DragPayload>(null);
  const columnsRef = useRef<KanbanColumnsState>(EMPTY_COLUMNS);

  const carregarPrazos = useCallback(() => {
    setLoading(true);
    prazosApi
      .listar({
        size: 1000,
        unidadeId: unidadeSelecionada !== "todas" ? unidadeSelecionada : undefined,
      })
      .then((data) => {
        const items = data.content ?? data;
        const nextColumns = buildColumns(Array.isArray(items) ? items : []);
        columnsRef.current = nextColumns;
        setColumns(nextColumns);
      })
      .catch(() => {
        columnsRef.current = EMPTY_COLUMNS;
        setColumns(EMPTY_COLUMNS);
        toast.error("Nao foi possivel carregar o board Kanban.");
      })
      .finally(() => setLoading(false));
  }, [unidadeSelecionada]);

  useEffect(() => {
    carregarPrazos();
  }, [carregarPrazos]);

  const moverPrazo = async (prazoId: string, origem: KanbanEtapa, destino: KanbanEtapa) => {
    if (origem === destino || updatingIds[prazoId]) {
      return;
    }

    const movedColumns = movePrazoBetweenColumns(columnsRef.current, prazoId, origem, destino);
    if (movedColumns === columnsRef.current) {
      return;
    }

    const etapaRequest = destino.toUpperCase();

    columnsRef.current = movedColumns;
    setColumns(movedColumns);
    setUpdatingIds((current) => ({ ...current, [prazoId]: true }));

    try {
      const prazoAtualizado = await prazosApi.atualizarEtapaKanban(prazoId, etapaRequest);
      setColumns((current) => {
        const next = replacePrazo(current, prazoAtualizado);
        columnsRef.current = next;
        return next;
      });
    } catch {
      setColumns((current) => {
        const reverted = movePrazoBetweenColumns(current, prazoId, destino, origem);
        columnsRef.current = reverted;
        return reverted;
      });
      toast.error("Nao foi possivel mover o prazo no Kanban.");
    } finally {
      setUpdatingIds((current) => {
        const next = { ...current };
        delete next[prazoId];
        return next;
      });
    }
  };

  const handleDrop = async (destino: KanbanEtapa) => {
    const payload = dragRef.current;
    dragRef.current = null;
    setDragOver(null);

    if (!payload) {
      return;
    }

    await moverPrazo(payload.prazoId, payload.origem, destino);
  };

  const totalPrazos = KANBAN_ORDER.reduce((acc, etapa) => acc + columns[etapa].length, 0);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SquareKanban className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Gestao Kanban de Prazos</h3>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Arraste os cards entre as colunas ou use o menu de 3 pontos em cada tarefa para reorganizar o fluxo de
            trabalho. A interface atualiza localmente e sincroniza a etapa em background sem recarregar a lista
            inteira.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs">
            <CalendarClock className="h-3.5 w-3.5" />
            {totalPrazos} prazo(s)
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={carregarPrazos} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {KANBAN_ORDER.map((etapa) => (
            <section
              key={etapa}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(etapa);
              }}
              onDragLeave={() => setDragOver((current) => (current === etapa ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                void handleDrop(etapa);
              }}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                KANBAN_META[etapa].accent,
                dragOver === etapa && "ring-2 ring-primary/40",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{KANBAN_META[etapa].titulo}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{KANBAN_META[etapa].descricao}</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                  {columns[etapa].length}
                </Badge>
              </div>

              <div className="space-y-3">
                {columns[etapa].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
                    Nenhum prazo nesta etapa.
                  </div>
                ) : (
                  columns[etapa].map((prazo) => {
                    const atrasado = !prazo.concluido && prazo.data < hoje;
                    const updating = Boolean(updatingIds[prazo.id]);
                    const canOperate = canOperatePrazo(prazo, user?.id, user?.papel);

                    return (
                      <article
                        key={prazo.id}
                        onClick={() => setPrazoSelecionadoId(prazo.id)}
                        draggable={canOperate && !updating}
                        onDragStart={(event) => {
                          if (!canOperate) {
                            event.preventDefault();
                            return;
                          }
                          dragRef.current = { prazoId: prazo.id, origem: etapa };
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", prazo.id);
                        }}
                        onDragEnd={() => {
                          dragRef.current = null;
                          setDragOver(null);
                        }}
                        className={cn(
                          "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all",
                          canOperate ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                          atrasado && "border-red-500/30 bg-red-500/5",
                          updating && "opacity-70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-foreground">{prazo.titulo}</p>
                            {prazo.processoNumero && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Scale className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate font-mono">{prazo.processoNumero}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {updating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            {canOperate ? (
                              <>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      disabled={updating}
                                      draggable={false}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => event.stopPropagation()}
                                      onDragStart={(event) => event.preventDefault()}
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                      <span className="sr-only">Alterar etapa do prazo</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {KANBAN_ORDER.map((destino) => (
                                      <DropdownMenuItem
                                        key={destino}
                                        disabled={destino === etapa || updating}
                                        onSelect={() => {
                                          void moverPrazo(prazo.id, etapa, destino);
                                        }}
                                      >
                                        Mover para {KANBAN_META[destino].titulo}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </>
                            ) : (
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                                Somente leitura
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                              atrasado
                                ? "border-red-500/40 bg-red-500/10 text-red-300"
                                : "border-border bg-muted/50 text-muted-foreground",
                            )}
                          >
                            {atrasado ? <AlertCircle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                            {new Date(`${prazo.data}T00:00:00`).toLocaleDateString("pt-BR")}
                          </span>

                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                              PRIORIDADE_CLASS[prazo.prioridade] ?? "border-border bg-muted/50 text-muted-foreground",
                            )}
                          >
                            {prazo.prioridade}
                          </span>

                          {prazo.concluido && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Finalizado
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <PrazoDetalheSheet
        open={Boolean(prazoSelecionadoId)}
        prazoId={prazoSelecionadoId}
        onClose={() => setPrazoSelecionadoId(null)}
        onPrazoAtualizado={(prazoAtualizado) => {
          setColumns((current) => {
            const next = replacePrazo(current, prazoAtualizado);
            columnsRef.current = next;
            return next;
          });
        }}
        onPrazoExcluido={(prazoId) => {
          setColumns((current) => {
            const next = removePrazo(current, prazoId);
            columnsRef.current = next;
            return next;
          });
          setPrazoSelecionadoId((current) => (current === prazoId ? null : current));
        }}
      />
    </div>
  );
};
