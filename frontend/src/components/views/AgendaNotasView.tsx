import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MoreHorizontal,
  MoveLeft,
  MoveRight,
  NotebookPen,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditarPrazoModal } from "@/components/modals/EditarPrazoModal";
import { PrazoDetalheSheet } from "@/components/prazos/PrazoDetalheSheet";
import { AtividadeModal } from "@/components/produtividade/AtividadeModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { notasPessoaisApi, prazosApi } from "@/services/api";
import { toast } from "sonner";
import type { EtapaPrazo, NotaPessoal, Prazo } from "@/types";

type AgendaModo = "mensal" | "semanal";
type SaveStatus = "idle" | "typing" | "saving" | "saved" | "error";
type FiltroTipoAtividade = "todos" | "tarefa_interna" | "prazo_processual" | "reuniao" | "audiencia";
type FiltroAtribuicao = "todos" | "responsavel" | "participante";
type AgendaPrazoCardProps = {
  prazo: Prazo;
  userId?: string;
  userRole?: string;
  onPrazoAtualizado: (prazo: Prazo) => void;
  onRefresh: () => void;
  onSelect: () => void;
};

function getAgendaRange(modo: AgendaModo, referencia: Date) {
  if (modo === "semanal") {
    return {
      inicio: startOfWeek(referencia, { weekStartsOn: 1 }),
      fim: endOfWeek(referencia, { weekStartsOn: 1 }),
    };
  }

  return {
    inicio: startOfMonth(referencia),
    fim: endOfMonth(referencia),
  };
}

function sortPrazosByDate(prazos: Prazo[]) {
  return [...prazos].sort((a, b) => {
    const dateCompare = a.data.localeCompare(b.data);
    if (dateCompare !== 0) return dateCompare;
    return (a.hora ?? "").localeCompare(b.hora ?? "");
  });
}

function buildMonthDays(referencia: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(referencia), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(referencia), { weekStartsOn: 1 }),
  });
}

function getTipoLabel(tipo: Prazo["tipo"]) {
  return {
    tarefa_interna: "Tarefa",
    prazo_processual: "Prazo",
    reuniao: "Evento",
    audiencia: "Audiencia",
  }[tipo];
}

function getTipoClass(tipo: Prazo["tipo"]) {
  return {
    tarefa_interna: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    prazo_processual: "border-red-500/30 bg-red-500/10 text-red-200",
    reuniao: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    audiencia: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  }[tipo];
}

function getPrazoTimeLabel(prazo: Prazo) {
  return prazo.diaInteiro ? "Dia todo" : prazo.hora ? prazo.hora.slice(0, 5) : "Sem hora";
}

const etapaLabel: Record<EtapaPrazo, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em andamento",
  concluido: "Concluido",
};

function normalizeEtapa(prazo: Prazo): EtapaPrazo {
  if (prazo.etapa) return prazo.etapa;
  return prazo.concluido ? "concluido" : "a_fazer";
}

function isPrazoParticipant(prazo: Prazo, userId?: string) {
  return Boolean(userId && prazo.participantes?.some((participante) => participante.id === userId));
}

function canEditPrazo(prazo: Prazo, userId?: string, userRole?: string) {
  if (!userId) return false;
  if (userRole?.toLowerCase() === "administrador") return true;
  return prazo.advogadoId === userId;
}

function canOperatePrazo(prazo: Prazo, userId?: string, userRole?: string) {
  return canEditPrazo(prazo, userId, userRole) || isPrazoParticipant(prazo, userId);
}

function mergePrazoAtualizado(prazos: Prazo[], prazoAtualizado: Prazo) {
  const existe = prazos.some((prazo) => prazo.id === prazoAtualizado.id);
  const next = existe
    ? prazos.map((prazo) => (prazo.id === prazoAtualizado.id ? prazoAtualizado : prazo))
    : [...prazos, prazoAtualizado];
  return sortPrazosByDate(next);
}

function SaveIndicator({ status, dataAtualizacao }: { status: SaveStatus; dataAtualizacao?: string | null }) {
  if (status === "saving") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        A guardar...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-red-400">
        <AlertCircle className="h-3.5 w-3.5" />
        Erro ao guardar
      </div>
    );
  }

  if (status === "typing") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Save className="h-3.5 w-3.5" />
        A escrever...
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <Check className="h-3.5 w-3.5" />
        Guardado{dataAtualizacao ? ` - ${new Date(dataAtualizacao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Save className="h-3.5 w-3.5" />
      Pronto
    </div>
  );
}

function AgendaPrazoCard({
  prazo,
  userId,
  userRole,
  onPrazoAtualizado,
  onRefresh,
  onSelect,
}: AgendaPrazoCardProps) {
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const atrasado = !prazo.concluido && prazo.data < new Date().toISOString().slice(0, 10);
  const etapaAtual = normalizeEtapa(prazo);
  const canEdit = canEditPrazo(prazo, userId, userRole);
  const canOperate = canOperatePrazo(prazo, userId, userRole);

  const mover = async (etapa: EtapaPrazo) => {
    setLoading(true);
    try {
      const prazoAtualizado = await prazosApi.atualizarEtapaKanban(prazo.id, etapa.toUpperCase());
      onPrazoAtualizado(prazoAtualizado);
      toast.success(`Atividade movida para ${etapaLabel[etapa]}.`);
    } catch {
      toast.error("Não foi possível atualizar o andamento desta atividade.");
    } finally {
      setLoading(false);
    }
  };

  const acaoPrimaria =
    etapaAtual === "a_fazer"
      ? { label: "Iniciar", etapa: "em_andamento" as EtapaPrazo, icon: MoveRight }
      : etapaAtual === "em_andamento"
        ? { label: "Concluir", etapa: "concluido" as EtapaPrazo, icon: CheckCircle2 }
        : { label: "Reabrir", etapa: "em_andamento" as EtapaPrazo, icon: MoveLeft };
  const AcaoPrimariaIcon = acaoPrimaria.icon;

  return (
    <>
      <article
        onClick={onSelect}
        className={cn(
          "cursor-pointer rounded-xl border px-3 py-3",
          atrasado ? "border-red-500/30 bg-red-500/5" : "border-border bg-card/80",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{prazo.titulo}</p>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", getTipoClass(prazo.tipo))}>
                {getTipoLabel(prazo.tipo)}
              </span>
              {!canEdit && canOperate && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Participante
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {prazo.processoNumero && <p className="truncate font-mono">{prazo.processoNumero}</p>}
              {prazo.advogadoNome && <p>{prazo.advogadoNome}</p>}
              {prazo.local && <p>{prazo.local}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                atrasado
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {getPrazoTimeLabel(prazo)}
            </span>
            {(canOperate || canEdit) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={loading}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="sr-only">Mais ações</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canOperate &&
                    (["a_fazer", "em_andamento", "concluido"] as EtapaPrazo[]).map((etapa) => (
                      <DropdownMenuItem
                        key={etapa}
                        disabled={loading || etapa === etapaAtual}
                        onSelect={() => {
                          void mover(etapa);
                        }}
                      >
                        Mover para {etapaLabel[etapa]}
                      </DropdownMenuItem>
                    ))}
                  {canEdit && (
                    <DropdownMenuItem
                      disabled={loading}
                      onSelect={() => {
                        setEditando(true);
                      }}
                    >
                      Editar atividade
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {etapaLabel[etapaAtual]}
          </span>
          {prazo.concluido && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Finalizado
            </span>
          )}
        </div>

        {(canOperate || canEdit) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            {canOperate && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={(event) => { event.stopPropagation(); void mover(acaoPrimaria.etapa); }} disabled={loading}>
                <AcaoPrimariaIcon className="h-3.5 w-3.5" />
                {acaoPrimaria.label}
              </Button>
            )}
            {canOperate && etapaAtual !== "a_fazer" && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground" onClick={(event) => { event.stopPropagation(); void mover("a_fazer"); }} disabled={loading}>
                <MoveLeft className="h-3.5 w-3.5" />
                Voltar para A Fazer
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground" onClick={(event) => { event.stopPropagation(); setEditando(true); }} disabled={loading}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
          </div>
        )}
      </article>

      {editando && canEdit && (
        <EditarPrazoModal
          prazo={prazo}
          onClose={() => setEditando(false)}
          onSaved={() => {
            setEditando(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

function AgendaPrazoPreviewCard({ prazo }: { prazo: Prazo }) {
  return (
    <div className={cn("rounded-lg border px-2 py-1.5 text-[10px] md:text-[11px]", getTipoClass(prazo.tipo))}>
      <div className="line-clamp-2 font-medium leading-4">{prazo.titulo}</div>
      <div className="mt-1 opacity-80">{getPrazoTimeLabel(prazo)}</div>
    </div>
  );
}

export const AgendaNotasView = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();
  const [modo, setModo] = useState<AgendaModo>("mensal");
  const [referencia, setReferencia] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(new Date());
  const [prazoSelecionadoId, setPrazoSelecionadoId] = useState<string | null>(null);
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoAtividade>("todos");
  const [filtroAtribuicao, setFiltroAtribuicao] = useState<FiltroAtribuicao>("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoInicialModal, setTipoInicialModal] = useState<Prazo["tipo"]>("tarefa_interna");

  const [nota, setNota] = useState("");
  const [notaHydrated, setNotaHydrated] = useState(false);
  const [ultimoConteudoSalvo, setUltimoConteudoSalvo] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const latestSaveSeq = useRef(0);

  const range = useMemo(() => getAgendaRange(modo, referencia), [modo, referencia]);

  const carregarAgenda = useCallback(() => {
    setLoadingAgenda(true);
    prazosApi
      .calendario({
        inicio: format(range.inicio, "yyyy-MM-dd"),
        fim: format(range.fim, "yyyy-MM-dd"),
        unidadeId: unidadeSelecionada !== "todas" ? unidadeSelecionada : undefined,
      })
      .then((items: Prazo[]) => {
        setPrazos(sortPrazosByDate(items));
      })
      .catch(() => {
        setPrazos([]);
        toast.error("Não foi possível carregar a agenda de prazos.");
      })
      .finally(() => setLoadingAgenda(false));
  }, [range.fim, range.inicio, unidadeSelecionada]);

  const atualizarPrazoLocal = useCallback((prazoAtualizado: Prazo) => {
    setPrazos((current) => mergePrazoAtualizado(current, prazoAtualizado));
  }, []);

  useEffect(() => {
    carregarAgenda();
  }, [carregarAgenda]);

  useEffect(() => {
    let active = true;

    notasPessoaisApi
      .buscarMinhaNota()
      .then((response: NotaPessoal) => {
        if (!active) return;
        const conteudo = response.conteudo ?? "";
        setNota(conteudo);
        setUltimoConteudoSalvo(conteudo);
        setUltimaAtualizacao(response.dataAtualizacao ?? null);
        setSaveStatus("saved");
      })
      .catch(() => {
        if (!active) return;
        setSaveStatus("error");
        toast.error("Não foi possível carregar a sua nota pessoal.");
      })
      .finally(() => {
        if (active) setNotaHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notaHydrated) return;
    if (nota === ultimoConteudoSalvo) return;

    setSaveStatus("typing");
    const saveSeq = ++latestSaveSeq.current;
    const timeout = window.setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const response = await notasPessoaisApi.salvarMinhaNota(nota);
        if (latestSaveSeq.current !== saveSeq) return;

        setUltimoConteudoSalvo(response.conteudo ?? "");
        setUltimaAtualizacao(response.dataAtualizacao ?? null);
        setSaveStatus("saved");
      } catch {
        if (latestSaveSeq.current === saveSeq) {
          setSaveStatus("error");
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [nota, notaHydrated, ultimoConteudoSalvo]);

  const prazosFiltrados = useMemo(
    () =>
      sortPrazosByDate(
        prazos.filter((prazo) => {
          const matchTipo = filtroTipo === "todos" || prazo.tipo === filtroTipo;
          const souParticipante = Boolean(user?.id && prazo.participantes?.some((participante) => participante.id === user.id));
          const matchAtribuicao =
            filtroAtribuicao === "todos"
              ? true
              : filtroAtribuicao === "responsavel"
              ? prazo.advogadoId === user?.id
              : souParticipante && prazo.advogadoId !== user?.id;

          return matchTipo && matchAtribuicao;
        }),
      ),
    [filtroAtribuicao, filtroTipo, prazos, user?.id],
  );

  const diasDoMes = useMemo(() => buildMonthDays(referencia), [referencia]);
  const diasDaSemana = modo === "semanal"
    ? Array.from({ length: 7 }, (_, index) => addDays(range.inicio, index))
    : [];
  const dataSelecionadaAtiva = useMemo(() => {
    if (!dataSelecionada) {
      return modo === "semanal" ? diasDaSemana[0] : undefined;
    }

    if (modo === "semanal" && diasDaSemana.length > 0 && !diasDaSemana.some((dia) => isSameDay(dia, dataSelecionada))) {
      return diasDaSemana[0];
    }

    return dataSelecionada;
  }, [dataSelecionada, diasDaSemana, modo]);
  const prazosDoDiaSelecionado = sortPrazosByDate(
    prazosFiltrados.filter((prazo) => dataSelecionadaAtiva && isSameDay(parseISO(prazo.data), dataSelecionadaAtiva)),
  );

  const moverPeriodo = (direction: "prev" | "next") => {
    if (modo === "semanal") {
      setReferencia((current) => (direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1)));
      return;
    }

    setReferencia((current) => (direction === "prev" ? subMonths(current, 1) : addMonths(current, 1)));
  };

  const agendaContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <Button
              variant={modo === "mensal" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setModo("mensal")}
            >
              Mensal
            </Button>
            <Button
              variant={modo === "semanal" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setModo("semanal")}
            >
              Semanal
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filtroTipo} onValueChange={(value) => setFiltroTipo(value as FiltroTipoAtividade)}>
              <SelectTrigger className="h-9 min-w-[190px] rounded-lg">
                <SelectValue placeholder="Todas as atividades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as atividades</SelectItem>
                <SelectItem value="tarefa_interna">Tarefas</SelectItem>
                <SelectItem value="prazo_processual">Prazos</SelectItem>
                <SelectItem value="reuniao">Eventos</SelectItem>
                <SelectItem value="audiencia">Audiências</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filtroAtribuicao} onValueChange={(value) => setFiltroAtribuicao(value as FiltroAtribuicao)}>
            <SelectTrigger className="h-9 min-w-[190px] rounded-lg">
              <SelectValue placeholder="Todas as atribuicoes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as atribuicoes</SelectItem>
              <SelectItem value="responsavel">Sou responsavel</SelectItem>
              <SelectItem value="participante">Sou participante</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => moverPeriodo("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setReferencia(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => moverPeriodo("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          {modo === "mensal"
            ? format(referencia, "MMMM 'de' yyyy", { locale: ptBR })
            : `${format(range.inicio, "dd MMM", { locale: ptBR })} - ${format(range.fim, "dd MMM yyyy", { locale: ptBR })}`}
          <Badge variant="outline" className="ml-2 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            {prazosFiltrados.length} atividade(s)
          </Badge>
        </div>
      </div>

      <div className="scroll-subtle flex-1 overflow-auto p-5">
        {loadingAgenda ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modo === "mensal" ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card/60 p-3 md:p-4">
              <div className="mb-2 grid grid-cols-7 gap-2 md:mb-3 md:gap-3">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => (
                  <div key={label} className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:px-2 md:text-[11px]">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {diasDoMes.map((dia) => {
                  const atividadesDoDia = sortPrazosByDate(
                    prazosFiltrados.filter((prazo) => isSameDay(parseISO(prazo.data), dia)),
                  );

                  return (
                    <button
                      key={dia.toISOString()}
                      type="button"
                      onClick={() => setDataSelecionada(dia)}
                      className={cn(
                        "min-h-[92px] rounded-xl border px-2.5 py-2 text-left transition-all md:min-h-[104px] md:rounded-2xl md:p-3",
                        isSameMonth(dia, referencia)
                          ? "border-border bg-background/70 hover:border-primary/40"
                          : "border-border/60 bg-background/30 text-muted-foreground",
                        dataSelecionadaAtiva && isSameDay(dia, dataSelecionadaAtiva) && "ring-2 ring-primary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-semibold md:text-base", !isSameMonth(dia, referencia) && "opacity-60")}>
                          {format(dia, "dd")}
                        </span>
                        {atividadesDoDia.length > 0 && (
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                            {atividadesDoDia.length}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {atividadesDoDia.slice(0, 1).map((prazo) => (
                          <div
                            key={prazo.id}
                            className={cn(
                              "rounded-lg border px-2 py-1 text-[10px] md:text-[11px]",
                              getTipoClass(prazo.tipo),
                            )}
                          >
                            <div className="truncate font-medium">{prazo.titulo}</div>
                            <div className="mt-1 truncate opacity-80">
                              {getPrazoTimeLabel(prazo)}
                            </div>
                          </div>
                        ))}
                        {atividadesDoDia.length > 1 && (
                          <div className="rounded-lg border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground md:text-[11px]">
                            +{atividadesDoDia.length - 1} atividade(s)
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="scroll-subtle rounded-2xl border border-border bg-card/50 p-4 max-h-[280px] overflow-y-auto">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {dataSelecionada
                    ? format(dataSelecionadaAtiva ?? dataSelecionada, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : "Selecione um dia"}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prazosDoDiaSelecionado.length} atividade(s) para a data selecionada.
                </p>
              </div>

              <div className="space-y-3">
                {prazosDoDiaSelecionado.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Nenhuma atividade para este dia.
                  </div>
                ) : (
                  prazosDoDiaSelecionado.map((prazo) => (
                    <AgendaPrazoCard
                      key={prazo.id}
                      prazo={prazo}
                      userId={user?.id}
                      userRole={user?.papel}
                      onPrazoAtualizado={atualizarPrazoLocal}
                      onRefresh={carregarAgenda}
                      onSelect={() => setPrazoSelecionadoId(prazo.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card/60 p-3 md:p-4">
              <div className="mb-2 grid grid-cols-7 gap-2 md:mb-3 md:gap-3">
                {diasDaSemana.map((dia) => (
                  <div
                    key={`header-${dia.toISOString()}`}
                    className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:px-2 md:text-[11px]"
                  >
                    {format(dia, "EEE", { locale: ptBR }).replace(".", "")}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-3">
                {diasDaSemana.map((dia) => {
                  const prazosDoDia = sortPrazosByDate(
                    prazosFiltrados.filter((prazo) => isSameDay(parseISO(prazo.data), dia)),
                  );

                  return (
                    <button
                      key={dia.toISOString()}
                      type="button"
                      onClick={() => setDataSelecionada(dia)}
                      className={cn(
                        "min-h-[160px] rounded-xl border px-2 py-2 text-left transition-all md:min-h-[176px] md:rounded-2xl md:px-2.5 md:py-3",
                        "border-border bg-background/70 hover:border-primary/40",
                        dataSelecionadaAtiva && isSameDay(dia, dataSelecionadaAtiva) && "ring-2 ring-primary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-foreground md:text-lg">
                          {format(dia, "dd")}
                        </span>
                        {prazosDoDia.length > 0 && (
                          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                            {prazosDoDia.length}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {prazosDoDia.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border px-2 py-3 text-[10px] text-muted-foreground md:text-[11px]">
                            Sem atividades.
                          </div>
                        ) : (
                          <>
                            {prazosDoDia.slice(0, 1).map((prazo) => (
                              <AgendaPrazoPreviewCard key={prazo.id} prazo={prazo} />
                            ))}
                            {prazosDoDia.length > 1 && (
                              <div className="rounded-lg border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground md:text-[11px]">
                                +{prazosDoDia.length - 1} atividade(s)
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="scroll-subtle rounded-2xl border border-border bg-card/50 p-4 max-h-[320px] overflow-y-auto">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {dataSelecionadaAtiva
                    ? format(dataSelecionadaAtiva, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : "Selecione um dia"}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {prazosDoDiaSelecionado.length} atividade(s) para a data selecionada.
                </p>
              </div>

              <div className="space-y-3">
                {prazosDoDiaSelecionado.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Nenhuma atividade para este dia.
                  </div>
                ) : (
                  prazosDoDiaSelecionado.map((prazo) => (
                    <AgendaPrazoCard
                      key={prazo.id}
                      prazo={prazo}
                      userId={user?.id}
                      userRole={user?.papel}
                      onPrazoAtualizado={atualizarPrazoLocal}
                      onRefresh={carregarAgenda}
                      onSelect={() => setPrazoSelecionadoId(prazo.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const notesContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Notas pessoais</h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bloco privado com auto-save silencioso a cada 1.5s de pausa.
            </p>
          </div>
          <SaveIndicator status={saveStatus} dataAtualizacao={ultimaAtualizacao} />
        </div>
      </div>

      <div className="scroll-subtle flex-1 overflow-auto p-5">
        <Textarea
          value={nota}
          onChange={(event) => setNota(event.target.value)}
          placeholder="Escreva apontamentos livres, teses, proximos passos ou lembretes privados..."
          className="scroll-subtle h-full min-h-[420px] resize-none rounded-2xl border-border bg-background/60 p-4 text-sm leading-6"
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full flex-col gap-6 p-6 md:h-full md:min-h-0 md:overflow-hidden md:p-8">
      <div className="flex items-center justify-end gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {([
              { tipo: "tarefa_interna", label: "Nova tarefa" },
              { tipo: "prazo_processual", label: "Novo prazo" },
              { tipo: "reuniao", label: "Novo evento" },
              { tipo: "audiencia", label: "Nova audiencia" },
            ] as const).map((item) => (
              <DropdownMenuItem
                key={item.tipo}
                onSelect={() => {
                  setTipoInicialModal(item.tipo);
                  setModalAberto(true);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isMobile ? (
        <div className="grid gap-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">{agendaContent}</div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">{notesContent}</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-45px_rgba(0,0,0,0.65)]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={modo === "semanal" ? 74 : 68} minSize={modo === "semanal" ? 58 : 50}>
              {agendaContent}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={modo === "semanal" ? 26 : 32} minSize={22}>
              {notesContent}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      <AtividadeModal
        open={modalAberto}
        initialTipo={tipoInicialModal}
        dataInicial={dataSelecionadaAtiva ? format(dataSelecionadaAtiva, "yyyy-MM-dd") : undefined}
        onClose={() => setModalAberto(false)}
        onSaved={() => {
          carregarAgenda();
        }}
      />

      <PrazoDetalheSheet
        open={Boolean(prazoSelecionadoId)}
        prazoId={prazoSelecionadoId}
        onClose={() => setPrazoSelecionadoId(null)}
        onPrazoAtualizado={atualizarPrazoLocal}
        onPrazoExcluido={(prazoId) => {
          setPrazos((current) => current.filter((prazo) => prazo.id !== prazoId));
          setPrazoSelecionadoId((current) => (current === prazoId ? null : current));
        }}
      />
    </div>
  );
};
