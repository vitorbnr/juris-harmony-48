import { useCallback, useEffect, useState } from "react";
import type { ElementType } from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Pause,
  Plus,
  RefreshCcw,
  Scale,
  Search,
} from "lucide-react";

import { ProcessoDossieModal } from "@/components/modals/ProcessoDossieModal";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { cn } from "@/lib/utils";
import { processosApi } from "@/services/api";
import type { Processo, StatusProcesso, TipoProcesso } from "@/types";
import { toast } from "sonner";

const statusConfig: Record<StatusProcesso, { label: string; className: string; icon: ElementType }> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    className: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    icon: Clock,
  },
  AGUARDANDO: {
    label: "Aguardando",
    className: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
    icon: Clock,
  },
  URGENTE: {
    label: "Urgente",
    className: "bg-red-500/15 text-red-300 border-red-500/20",
    icon: AlertCircle,
  },
  CONCLUIDO: {
    label: "Concluido",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    icon: CheckCircle,
  },
  SUSPENSO: {
    label: "Suspenso",
    className: "bg-orange-500/15 text-orange-300 border-orange-500/20",
    icon: Pause,
  },
  ARQUIVADO: {
    label: "Arquivado",
    className: "bg-muted text-muted-foreground border-border",
    icon: Archive,
  },
};

const tiposProcesso: TipoProcesso[] = [
  "CIVEL",
  "TRABALHISTA",
  "CRIMINAL",
  "FAMILIA",
  "TRIBUTARIO",
  "EMPRESARIAL",
  "PREVIDENCIARIO",
  "ADMINISTRATIVO",
];

function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D+/g, "");
}

function maskNpu(value?: string | null) {
  if (!value) return "NPU nao informado";

  const digits = normalizeDigits(value);
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
  }

  return value;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";

  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "Sem movimentacao";

  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return "Data invalida";

  const diffMs = parsed.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(diffDays) < 1) {
    return "Hoje";
  }

  return rtf.format(diffDays, "day");
}

function formatTipoProcesso(tipo?: string | null) {
  switch ((tipo ?? "").toUpperCase()) {
    case "CIVEL":
      return "Processo Civel";
    case "TRABALHISTA":
      return "Acao Trabalhista";
    case "CRIMINAL":
      return "Processo Criminal";
    case "FAMILIA":
      return "Processo de Familia";
    case "TRIBUTARIO":
      return "Execucao Tributaria";
    case "EMPRESARIAL":
      return "Processo Empresarial";
    case "PREVIDENCIARIO":
      return "Acao Previdenciaria";
    case "ADMINISTRATIVO":
      return "Procedimento Administrativo";
    default:
      return tipo || "Tipo nao informado";
  }
}

function resolveProcessoRecencyTimestamp(processo: Processo) {
  const candidates = [processo.ultimaMovimentacao, processo.dataDistribuicao]
    .filter(Boolean)
    .map((value) => {
      const parsed = new Date(String(value).length <= 10 ? `${String(value)}T00:00:00` : String(value));
      return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
    });

  return candidates.length > 0 ? Math.max(...candidates) : Number.NEGATIVE_INFINITY;
}

function compareProcessosByRecency(a: Processo, b: Processo) {
  const diff = resolveProcessoRecencyTimestamp(b) - resolveProcessoRecencyTimestamp(a);
  if (diff !== 0) return diff;

  return 0;
}

function buildProcessoTitulo(processo: Processo) {
  const partes = processo.partes ?? [];
  const partesAtivas = partes.filter((parte) => (parte.polo ?? "").toUpperCase() === "ATIVO");
  const partesPassivas = partes.filter((parte) => (parte.polo ?? "").toUpperCase() === "PASSIVO");

  const autor = partesAtivas[0]?.nome || processo.clienteNome || "Parte autora";
  const reu = partesPassivas[0]?.nome || "Parte passiva";
  const complemento = partesPassivas.length > 1 ? ` +${partesPassivas.length - 1}` : "";

  return `${autor} x ${reu}${complemento}`;
}

function buildAdvogadoResumo(processo: Processo) {
  const advogados =
    processo.advogados && processo.advogados.length > 0
      ? processo.advogados
      : processo.advogadoNome
        ? [{ id: processo.advogadoId ?? "", nome: processo.advogadoNome }]
        : [];

  if (advogados.length === 0) return "Sem advogado definido";
  if (advogados.length === 1) return advogados[0].nome;

  return `${advogados[0].nome} +${advogados.length - 1}`;
}

export const ProcessosView = () => {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProcesso | "Todos">("Todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoProcesso | "Todos">("Todos");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("Todas");
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingDatajud, setSyncingDatajud] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const isSecretaria = user?.papel?.toUpperCase() === "SECRETARIA";

  const carregarProcessos = useCallback(() => {
    setLoading(true);

    const buscaNorm = busca.trim();
    const params: { unidadeId?: string; busca?: string; etiqueta?: string; size?: number } = { size: 1000 };

    if (unidadeSelecionada && unidadeSelecionada !== "todas") {
      params.unidadeId = unidadeSelecionada;
    }

    if (buscaNorm) {
      params.busca = buscaNorm;
    }

    if (filtroEtiqueta !== "Todas") {
      params.etiqueta = filtroEtiqueta;
    }

    processosApi
      .listar(params)
      .then((data) => {
        const items = data.content ?? data;
        setProcessos(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        console.error("Erro ao carregar processos:", error);
        toast.error("Erro ao carregar processos.");
        setProcessos([]);
      })
      .finally(() => setLoading(false));
  }, [busca, filtroEtiqueta, unidadeSelecionada]);

  useEffect(() => {
    carregarProcessos();
  }, [carregarProcessos]);

  const sincronizarMovimentacoes = async () => {
    setSyncingDatajud(true);
    try {
      const resumo = await processosApi.sincronizarDatajudEmLote();
      toast.success(
        `Datajud sincronizado: ${resumo.movimentacoesNovas} nova(s) movimentacao(oes) em ${resumo.processosComNovidade} processo(s).`,
      );
      carregarProcessos();
    } catch (error) {
      console.error("Erro ao sincronizar Datajud em lote:", error);
      toast.error("Nao foi possivel sincronizar as movimentacoes do Datajud agora.");
    } finally {
      setSyncingDatajud(false);
    }
  };

  const todoStatus: Array<StatusProcesso | "Todos"> = [
    "Todos",
    "EM_ANDAMENTO",
    "URGENTE",
    "AGUARDANDO",
    "SUSPENSO",
    "CONCLUIDO",
    "ARQUIVADO",
  ];

  const etiquetasDisponiveis = Array.from(new Set(processos.flatMap((processo) => processo.etiquetas ?? []))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const opcoesEtiqueta =
    filtroEtiqueta !== "Todas" && !etiquetasDisponiveis.includes(filtroEtiqueta)
      ? [filtroEtiqueta, ...etiquetasDisponiveis]
      : etiquetasDisponiveis;

  const processosFiltrados = processos
    .filter((processo) => {
      const matchStatus = filtroStatus === "Todos" || processo.status === filtroStatus;
      const matchTipo = filtroTipo === "Todos" || processo.tipo === filtroTipo;
      return matchStatus && matchTipo;
    })
    .sort(compareProcessosByRecency);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Contencioso</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Processos e casos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Entre no modulo ja com leitura executiva do processo: titulo consolidado, cliente, acao ou foro e a data da
            ultima movimentacao.
          </p>
        </div>

        {!isSecretaria && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={sincronizarMovimentacoes} disabled={syncingDatajud}>
              {syncingDatajud ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Sincronizar movimentacoes
            </Button>
            <Button className="gap-2" onClick={() => setModalAberto(true)}>
              <Plus className="h-4 w-4" />
              Novo Processo
            </Button>
          </div>
        )}
      </div>

      <Card className="border-border/70 bg-card/95">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero ou cliente..."
                className="border-border/60 bg-background/60 pl-9"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            <div className="flex flex-1 flex-wrap gap-3">
              <select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value as StatusProcesso | "Todos")}
                className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground outline-none"
              >
                {todoStatus.map((status) => (
                  <option key={status} value={status}>
                    {status === "Todos" ? "Todos os status" : statusConfig[status as StatusProcesso]?.label || status}
                  </option>
                ))}
              </select>

              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value as TipoProcesso | "Todos")}
                className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground outline-none"
              >
                <option value="Todos">Todos os tipos</option>
                {tiposProcesso.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>

              <select
                value={filtroEtiqueta}
                onChange={(event) => setFiltroEtiqueta(event.target.value)}
                className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border/60 bg-background/60 px-3 text-sm text-foreground outline-none"
              >
                <option value="Todas">Todas as etiquetas</option>
                {opcoesEtiqueta.map((etiqueta) => (
                  <option key={etiqueta} value={etiqueta}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {todoStatus.map((status) => {
                const count =
                  status === "Todos" ? processos.length : processos.filter((processo) => processo.status === status).length;

                return (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      filtroStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {status === "Todos" ? status : statusConfig[status as StatusProcesso]?.label || status}{" "}
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {!loading && (
              <p className="text-right text-xs text-muted-foreground">
                {processosFiltrados.length} de {processos.length} processos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card/95 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.36)]">
          {processosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Filter className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_160px] gap-5 border-b border-border/70 bg-muted/20 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>Titulo</span>
                <span>Cliente / Pasta</span>
                <span>Acao / Foro</span>
                <span className="text-right">Ult. mov.</span>
              </div>

              <div className="divide-y divide-border/60">
                {processosFiltrados.map((processo) => {
                  const conf =
                    statusConfig[processo.status] ??
                    { className: "bg-muted text-foreground border-border", icon: AlertCircle, label: processo.status };
                  const titulo = buildProcessoTitulo(processo);
                  const foro = [processo.vara, processo.tribunal].filter(Boolean).join(" / ") || processo.unidadeNome || "Foro nao informado";

                  return (
                    <button
                      key={processo.id}
                      type="button"
                      onClick={() => setProcessoSelecionadoId(processo.id)}
                      className="group w-full text-left transition-colors hover:bg-muted/25"
                    >
                      <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_160px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border text-[11px]", conf.className)}>{conf.label}</Badge>
                            {processo.etiquetas?.slice(0, 2).map((etiqueta) => (
                              <Badge
                                key={etiqueta}
                                variant="outline"
                                className="border-primary/20 bg-primary/10 text-[11px] text-primary"
                              >
                                {etiqueta}
                              </Badge>
                            ))}
                          </div>

                          <p className="mt-3 truncate text-base font-semibold text-foreground">{titulo}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-mono text-primary/90">{maskNpu(processo.numero)}</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {processo.unidadeNome ?? "Sem unidade"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{processo.clienteNome}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{processo.unidadeNome || "Pasta nao informada"}</p>
                          <p className="mt-3 truncate text-xs text-muted-foreground">{buildAdvogadoResumo(processo)}</p>
                        </div>

                        <div className="min-w-0">
                          <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                            <Scale className="h-3.5 w-3.5 text-primary" />
                            {formatTipoProcesso(processo.tipo)}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{foro}</p>
                        </div>

                        <div className="flex items-start justify-between gap-3 md:justify-end">
                          <div className="md:text-right">
                            <p className="text-sm font-medium text-foreground">
                              {formatDate(processo.ultimaMovimentacao || processo.dataDistribuicao)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatRelativeDate(processo.ultimaMovimentacao || processo.dataDistribuicao)}
                            </p>
                          </div>
                          <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <ProcessoDossieModal
        open={Boolean(processoSelecionadoId)}
        processoId={processoSelecionadoId}
        onClose={() => setProcessoSelecionadoId(null)}
        onAtualizado={carregarProcessos}
      />

      {modalAberto && <NovoProcessoModal onClose={() => setModalAberto(false)} onSaved={carregarProcessos} />}
    </div>
  );
};
