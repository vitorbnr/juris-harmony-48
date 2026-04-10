import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Inbox,
  Loader2,
  Search,
  UserCheck,
  RefreshCcw,
  ShieldAlert,
  X,
} from "lucide-react";

import { PrazoDateCalculator } from "@/components/prazos/PrazoDateCalculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { eventosJuridicosApi, processosApi, usuariosApi } from "@/services/api";
import type {
  EventoJuridico,
  FonteEventoJuridico,
  PrioridadePrazo,
  Processo,
  StatusEventoJuridico,
  TipoEventoJuridico,
  TipoPrazo,
  Usuario,
} from "@/types";
import { toast } from "sonner";

type FiltroStatus = StatusEventoJuridico | "TODOS";
type FiltroFonte = FonteEventoJuridico | "TODAS";

const statusConfig: Record<StatusEventoJuridico, { label: string; className: string }> = {
  NOVO: {
    label: "Novo",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  },
  EM_TRIAGEM: {
    label: "Em triagem",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
  },
  CONCLUIDO: {
    label: "Concluido",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  ARQUIVADO: {
    label: "Arquivado",
    className: "border-border bg-muted text-muted-foreground",
  },
};

const fonteConfig: Record<FonteEventoJuridico, { label: string; className: string }> = {
  DATAJUD: {
    label: "Datajud",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  DOMICILIO: {
    label: "Domicilio",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  },
  DJEN: {
    label: "DJEN",
    className: "border-purple-500/20 bg-purple-500/10 text-purple-400",
  },
};

const tipoConfig: Record<TipoEventoJuridico, string> = {
  MOVIMENTACAO: "Movimentacao",
  PUBLICACAO: "Publicacao",
  INTIMACAO: "Intimacao",
};

const formatarDataEvento = (value?: string) => {
  if (!value) return "Data nao informada";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data nao informada";

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const inferTipoPrazo = (evento: EventoJuridico): TipoPrazo =>
  evento.tipo === "INTIMACAO" || evento.tipo === "PUBLICACAO" ? "prazo_processual" : "tarefa_interna";

const inferPrioridadePrazo = (evento: EventoJuridico): PrioridadePrazo =>
  evento.tipo === "INTIMACAO" ? "alta" : evento.tipo === "PUBLICACAO" ? "media" : "baixa";

const defaultDataPrazo = (evento: EventoJuridico) => {
  const raw = evento.dataEvento ?? evento.criadoEm;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
};

function CriarPrazoEventoModal({
  evento,
  onClose,
  onSaved,
}: {
  evento: EventoJuridico;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(evento.titulo);
  const [data, setData] = useState(defaultDataPrazo(evento));
  const [hora, setHora] = useState("");
  const [tipo, setTipo] = useState<TipoPrazo>(inferTipoPrazo(evento));
  const [prioridade, setPrioridade] = useState<PrioridadePrazo>(inferPrioridadePrazo(evento));
  const [descricao, setDescricao] = useState(evento.descricao ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!titulo.trim() || !data) {
      toast.error("Titulo e data sao obrigatorios.");
      return;
    }

    setSaving(true);
    try {
      await eventosJuridicosApi.criarPrazo(evento.id, {
        titulo: titulo.trim(),
        data,
        hora: hora || null,
        tipo,
        prioridade,
        descricao: descricao.trim() || null,
        advogadoId: evento.responsavelId ?? null,
      });
      toast.success("Prazo criado a partir do evento.");
      onSaved();
    } catch (error) {
      console.error("Erro ao criar prazo a partir do evento:", error);
      toast.error("Nao foi possivel criar o prazo a partir deste evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center py-4 md:items-center">
        <div className="relative flex w-full max-w-lg max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Criar prazo do evento</h2>
              <p className="text-sm text-muted-foreground">
                O prazo sera criado manualmente, sem qualquer ciencia automatica.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4 overflow-y-auto p-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Titulo</label>
              <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Data</label>
                <Input type="date" value={data} onChange={(event) => setData(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Hora</label>
                <Input type="time" value={hora} onChange={(event) => setHora(event.target.value)} />
              </div>
            </div>

            <PrazoDateCalculator dataInicial={data} onAplicarData={setData} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Tipo</label>
                <select
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value as TipoPrazo)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
                >
                  <option value="prazo_processual">Prazo processual</option>
                  <option value="audiencia">Audiencia</option>
                  <option value="tarefa_interna">Tarefa interna</option>
                  <option value="reuniao">Reuniao</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(event) => setPrioridade(event.target.value as PrioridadePrazo)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Descricao</label>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border px-6 py-4">
            <Button type="button" className="flex-1 gap-2" onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              Criar prazo
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const InboxJuridicaView = () => {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<EventoJuridico[]>([]);
  const [usuariosResponsaveis, setUsuariosResponsaveis] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDomicilio, setSyncingDomicilio] = useState(false);
  const [assumindoId, setAssumindoId] = useState<string | null>(null);
  const [eventoEmVinculo, setEventoEmVinculo] = useState<string | null>(null);
  const [eventoEmAtribuicao, setEventoEmAtribuicao] = useState<string | null>(null);
  const [buscaProcessoPorEvento, setBuscaProcessoPorEvento] = useState<Record<string, string>>({});
  const [resultadosProcessoPorEvento, setResultadosProcessoPorEvento] = useState<Record<string, Processo[]>>({});
  const [responsavelSelecionadoPorEvento, setResponsavelSelecionadoPorEvento] = useState<Record<string, string>>({});
  const [buscandoProcessoId, setBuscandoProcessoId] = useState<string | null>(null);
  const [vinculandoProcessoId, setVinculandoProcessoId] = useState<string | null>(null);
  const [atribuindoResponsavelId, setAtribuindoResponsavelId] = useState<string | null>(null);
  const [eventoPrazo, setEventoPrazo] = useState<EventoJuridico | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("TODOS");
  const [filtroFonte, setFiltroFonte] = useState<FiltroFonte>("TODAS");
  const [somenteMeus, setSomenteMeus] = useState(false);

  const carregarEventos = useCallback(async () => {
    setLoading(true);

    try {
      const data = await eventosJuridicosApi.listar({
        size: 100,
        status: filtroStatus === "TODOS" ? undefined : filtroStatus,
        fonte: filtroFonte === "TODAS" ? undefined : filtroFonte,
        responsavelId: somenteMeus ? user?.id : undefined,
      });

      const items = data.content ?? data;
      setEventos(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Erro ao carregar inbox juridica:", error);
      toast.error("Nao foi possivel carregar a Inbox Juridica.");
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [filtroFonte, filtroStatus, somenteMeus, user?.id]);

  useEffect(() => {
    void carregarEventos();
  }, [carregarEventos]);

  useEffect(() => {
    usuariosApi
      .listar()
      .then((res: { content?: Usuario[] } | Usuario[]) => {
        const items = (res as { content?: Usuario[] }).content ?? res;
        const usuarios = (Array.isArray(items) ? items : [])
          .filter((item) => item.ativo !== false)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
        setUsuariosResponsaveis(usuarios);
      })
      .catch(() => setUsuariosResponsaveis([]));
  }, []);

  const atualizarStatus = async (id: string, status: StatusEventoJuridico) => {
    try {
      const atualizado = await eventosJuridicosApi.atualizarStatus(id, status);
      setEventos((current) => current.map((evento) => (evento.id === id ? atualizado : evento)));
      toast.success("Status do evento atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar status do evento juridico:", error);
      toast.error("Nao foi possivel atualizar o status do evento.");
    }
  };

  const totalNovos = eventos.filter((evento) => evento.status === "NOVO").length;
  const totalTriagem = eventos.filter((evento) => evento.status === "EM_TRIAGEM").length;
  const totalConcluidos = eventos.filter((evento) => evento.status === "CONCLUIDO").length;

  const podeSincronizarDomicilio = user?.papel === "ADMINISTRADOR" || user?.papel === "ADVOGADO";

  const sincronizarDomicilio = async () => {
    setSyncingDomicilio(true);
    try {
      const resultado = await eventosJuridicosApi.sincronizarDomicilio();
      toast.success(
        `Sincronizacao read-only concluida: ${resultado.eventosNovos} novo(s) evento(s) do Domicilio.`,
      );
      await carregarEventos();
    } catch (error) {
      console.error("Erro ao sincronizar Domicilio:", error);
      toast.error("Nao foi possivel sincronizar o Domicilio agora.");
    } finally {
      setSyncingDomicilio(false);
    }
  };

  const assumirEvento = async (id: string) => {
    setAssumindoId(id);
    try {
      const atualizado = await eventosJuridicosApi.assumir(id);
      setEventos((current) => current.map((evento) => (evento.id === id ? atualizado : evento)));
      toast.success("Item assumido com sucesso.");
    } catch (error) {
      console.error("Erro ao assumir evento:", error);
      toast.error("Nao foi possivel assumir este item.");
    } finally {
      setAssumindoId(null);
    }
  };

  const abrirAtribuicao = (evento: EventoJuridico) => {
    setEventoEmAtribuicao((current) => (current === evento.id ? null : evento.id));
    setResponsavelSelecionadoPorEvento((current) => ({
      ...current,
      [evento.id]: current[evento.id] ?? evento.responsavelId ?? "",
    }));
  };

  const atribuirResponsavel = async (eventoId: string) => {
    setAtribuindoResponsavelId(eventoId);
    try {
      const atualizado = await eventosJuridicosApi.atribuirResponsavel(
        eventoId,
        responsavelSelecionadoPorEvento[eventoId] || null,
      );
      setEventos((current) => current.map((evento) => (evento.id === eventoId ? atualizado : evento)));
      setEventoEmAtribuicao(null);
      toast.success(
        atualizado.responsavelNome
          ? `Item atribuido para ${atualizado.responsavelNome}.`
          : "Responsavel removido do item.",
      );
    } catch (error) {
      console.error("Erro ao atribuir responsavel:", error);
      toast.error("Nao foi possivel atualizar o responsavel deste item.");
    } finally {
      setAtribuindoResponsavelId(null);
    }
  };

  const abrirVinculo = (evento: EventoJuridico) => {
    setEventoEmVinculo((current) => (current === evento.id ? null : evento.id));
    setBuscaProcessoPorEvento((current) => ({
      ...current,
      [evento.id]:
        current[evento.id] ??
        evento.processoNumero ??
        "",
    }));
  };

  const buscarProcessos = async (evento: EventoJuridico) => {
    const busca = (buscaProcessoPorEvento[evento.id] ?? "").trim();
    if (!busca) {
      toast.error("Informe um numero CNJ, cliente ou termo para buscar o processo.");
      return;
    }

    setBuscandoProcessoId(evento.id);
    try {
      const data = await processosApi.listar({ busca, size: 8, sort: "criadoEm,desc" });
      const items = data.content ?? data;
      setResultadosProcessoPorEvento((current) => ({
        ...current,
        [evento.id]: Array.isArray(items) ? items : [],
      }));
    } catch (error) {
      console.error("Erro ao buscar processos para vinculo:", error);
      toast.error("Nao foi possivel buscar processos para vincular.");
    } finally {
      setBuscandoProcessoId(null);
    }
  };

  const vincularAoProcesso = async (eventoId: string, processoId: string) => {
    setVinculandoProcessoId(eventoId);
    try {
      const atualizado = await eventosJuridicosApi.vincularProcesso(eventoId, processoId);
      setEventos((current) => current.map((evento) => (evento.id === eventoId ? atualizado : evento)));
      setEventoEmVinculo(null);
      toast.success("Evento vinculado ao processo com sucesso.");
    } catch (error) {
      console.error("Erro ao vincular evento ao processo:", error);
      toast.error("Nao foi possivel vincular este evento ao processo.");
    } finally {
      setVinculandoProcessoId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-orange-300">Guardrail processual</p>
            <p className="text-sm text-orange-100/80">
              Esta inbox apenas coleta e organiza eventos. O sistema nao registra ciencia, nao abre
              comunicacoes sensiveis e nao pratica nenhum ato que possa iniciar prazo automaticamente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Eventos novos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalNovos}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Em triagem</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalTriagem}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Concluidos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalConcluidos}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros
        </div>

        <select
          value={filtroStatus}
          onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="NOVO">Novo</option>
          <option value="EM_TRIAGEM">Em triagem</option>
          <option value="CONCLUIDO">Concluido</option>
          <option value="ARQUIVADO">Arquivado</option>
        </select>

        <select
          value={filtroFonte}
          onChange={(event) => setFiltroFonte(event.target.value as FiltroFonte)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
        >
          <option value="TODAS">Todas as fontes</option>
          <option value="DATAJUD">Datajud</option>
          <option value="DOMICILIO">Domicilio</option>
          <option value="DJEN">DJEN</option>
        </select>

        <Button
          type="button"
          variant={somenteMeus ? "default" : "outline"}
          className="gap-2"
          onClick={() => setSomenteMeus((current) => !current)}
        >
          <UserCheck className="h-4 w-4" />
          {somenteMeus ? "Mostrando meus itens" : "Somente meus"}
        </Button>

        {podeSincronizarDomicilio && (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={sincronizarDomicilio}
            disabled={syncingDomicilio}
          >
            {syncingDomicilio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Sincronizar Domicilio
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}

      {!loading && eventos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Nenhum evento encontrado</p>
            <p className="text-sm text-muted-foreground">
              Quando novas movimentacoes, publicacoes ou intimacoes forem importadas, elas aparecerao aqui.
            </p>
          </div>
        </div>
      )}

      {!loading && eventos.length > 0 && (
        <div className="space-y-4">
          {eventos.map((evento) => (
            <div key={evento.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-xs", fonteConfig[evento.fonte].className)}>
                      {fonteConfig[evento.fonte].label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tipoConfig[evento.tipo]}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusConfig[evento.status].className)}>
                      {statusConfig[evento.status].label}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground">{evento.titulo}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{evento.descricao}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Processo:</span>{" "}
                      {evento.processoNumero ?? "Nao vinculado"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Cliente:</span>{" "}
                      {evento.clienteNome ?? "Nao identificado"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Data do evento:</span>{" "}
                      {formatarDataEvento(evento.dataEvento ?? evento.criadoEm)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Orgao julgador:</span>{" "}
                      {evento.orgaoJulgador ?? "Nao informado"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Responsavel:</span>{" "}
                      {evento.responsavelNome ?? "Nao atribuido"}
                    </div>
                    {evento.destinatario && (
                      <div>
                        <span className="font-medium text-foreground">Destinatario:</span>{" "}
                        {evento.destinatario}
                      </div>
                    )}
                    {evento.parteRelacionada && (
                      <div>
                        <span className="font-medium text-foreground">Parte relacionada:</span>{" "}
                        {evento.parteRelacionada}
                      </div>
                    )}
                  </div>

                  {evento.fonte === "DATAJUD" && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                      Evento publico sincronizado do Datajud. Serve para acompanhamento e triagem, sem
                      automatizar ciencia ou abertura de comunicacao.
                    </div>
                  )}

                  {!evento.processoId && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      Evento ainda nao vinculado a um processo do sistema. Use o vinculo manual para
                      centralizar a triagem no painel correto.
                    </div>
                  )}

                  {evento.parteRelacionada && evento.responsavelNome && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                      Distribuicao sugerida automaticamente com base na estrutura de partes do processo.
                    </div>
                  )}

                  {eventoEmVinculo === evento.id && (
                    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Input
                          placeholder="Buscar por CNJ, cliente ou numero"
                          value={buscaProcessoPorEvento[evento.id] ?? ""}
                          onChange={(event) =>
                            setBuscaProcessoPorEvento((current) => ({
                              ...current,
                              [evento.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => buscarProcessos(evento)}
                          disabled={buscandoProcessoId === evento.id}
                        >
                          {buscandoProcessoId === evento.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Buscar processo
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(resultadosProcessoPorEvento[evento.id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum processo carregado para este vinculo ainda.
                          </p>
                        ) : (
                          (resultadosProcessoPorEvento[evento.id] ?? []).map((processo) => (
                            <div
                              key={processo.id}
                              className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">{processo.numero}</p>
                                <p className="text-xs text-muted-foreground">
                                  {processo.clienteNome} • {processo.tribunal} • {processo.vara}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="gap-2"
                                onClick={() => vincularAoProcesso(evento.id, processo.id)}
                                disabled={vinculandoProcessoId === evento.id}
                              >
                                {vinculandoProcessoId === evento.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowRightLeft className="h-4 w-4" />
                                )}
                                Vincular
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {eventoEmAtribuicao === evento.id && (
                    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Atribuir responsavel</p>
                        <p className="text-xs text-muted-foreground">
                          Esta distribuicao e interna ao escritorio. Ela nao registra ciencia nem pratica qualquer ato no sistema oficial.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 md:flex-row">
                        <select
                          value={responsavelSelecionadoPorEvento[evento.id] ?? ""}
                          onChange={(event) =>
                            setResponsavelSelecionadoPorEvento((current) => ({
                              ...current,
                              [evento.id]: event.target.value,
                            }))
                          }
                          className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
                        >
                          <option value="">Sem responsavel</option>
                          {usuariosResponsaveis.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                              {usuario.unidadeNome ? ` - ${usuario.unidadeNome}` : ""}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          className="gap-2"
                          onClick={() => atribuirResponsavel(evento.id)}
                          disabled={atribuindoResponsavelId === evento.id}
                        >
                          {atribuindoResponsavelId === evento.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Salvar atribuicao
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:w-[240px] lg:justify-end">
                  {!evento.processoId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => abrirVinculo(evento)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Vincular processo
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => abrirAtribuicao(evento)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Atribuir
                  </Button>
                  {evento.responsavelId !== user?.id && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => assumirEvento(evento.id)}
                      disabled={assumindoId === evento.id}
                    >
                      {assumindoId === evento.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                      Assumir item
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setEventoPrazo(evento)}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Criar prazo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => atualizarStatus(evento.id, "EM_TRIAGEM")}
                    disabled={evento.status === "EM_TRIAGEM"}
                  >
                    <Clock3 className="h-4 w-4" />
                    Em triagem
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => atualizarStatus(evento.id, "CONCLUIDO")}
                    disabled={evento.status === "CONCLUIDO"}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Concluir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => atualizarStatus(evento.id, "ARQUIVADO")}
                    disabled={evento.status === "ARQUIVADO"}
                  >
                    <Archive className="h-4 w-4" />
                    Arquivar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {eventoPrazo && (
        <CriarPrazoEventoModal
          evento={eventoPrazo}
          onClose={() => setEventoPrazo(null)}
          onSaved={async () => {
            setEventoPrazo(null);
            await carregarEventos();
          }}
        />
      )}
    </div>
  );
};
