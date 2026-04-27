import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { ElementType } from "react";
import {
  AlertCircle,
  Archive,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Lock,
  MapPin,
  Pause,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { CasoDetalheModal } from "@/components/modals/CasoDetalheModal";
import { NovoCasoModal } from "@/components/modals/NovoCasoModal";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
import { ProcessoDossieModal } from "@/components/modals/ProcessoDossieModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { cn } from "@/lib/utils";
import { casosApi, processosApi } from "@/services/api";
import type { Caso, Processo, StatusProcesso, TipoProcesso } from "@/types";
import { toast } from "sonner";

const statusConfig: Record<StatusProcesso, { label: string; className: string; icon: ElementType }> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    icon: Clock,
  },
  AGUARDANDO: {
    label: "Aguardando",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    icon: Clock,
  },
  URGENTE: {
    label: "Urgente",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
    icon: AlertCircle,
  },
  CONCLUIDO: {
    label: "Concluido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: CheckCircle,
  },
  SUSPENSO: {
    label: "Suspenso",
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
    icon: Pause,
  },
  ARQUIVADO: {
    label: "Arquivado",
    className: "border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300",
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

const acessoCasoConfig: Record<string, { label: string; className: string; icon: ElementType }> = {
  PUBLICO: {
    label: "Publico",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: ShieldCheck,
  },
  PRIVADO: {
    label: "Privado",
    className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
    icon: Lock,
  },
  EQUIPE: {
    label: "Equipe",
    className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    icon: Users,
  },
};

function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D+/g, "");
}

function maskNpu(value?: string | null) {
  if (!value) return "NPU não informado";

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
  if (!value) return "Sem atualizacao";

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
      return tipo || "Tipo não informado";
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

function resolveCasoRecencyTimestamp(caso: Caso) {
  const candidates = [caso.dataAtualizacao, caso.dataCriacao]
    .filter(Boolean)
    .map((value) => {
      const parsed = new Date(String(value).length <= 10 ? `${String(value)}T00:00:00` : String(value));
      return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
    });

  return candidates.length > 0 ? Math.max(...candidates) : Number.NEGATIVE_INFINITY;
}

function compareCasosByRecency(a: Caso, b: Caso) {
  const diff = resolveCasoRecencyTimestamp(b) - resolveCasoRecencyTimestamp(a);
  if (diff !== 0) return diff;

  return a.titulo.localeCompare(b.titulo, "pt-BR");
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

interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const PAGE_SIZE = 40;
type ViewTab = "processos" | "casos";

function createEmptyPageResponse<T>(): PageResponse<T> {
  return {
    content: [],
    number: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };
}

export const ProcessosView = () => {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();

  const [abaAtiva, setAbaAtiva] = useState<ViewTab>("processos");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProcesso | "Todos">("Todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoProcesso | "Todos">("Todos");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("Todas");
  const [page, setPage] = useState(0);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState<string | null>(null);
  const [casoSelecionadoId, setCasoSelecionadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [syncingDatajud, setSyncingDatajud] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [modalCasoAberto, setModalCasoAberto] = useState(false);
  const [resultado, setResultado] = useState<PageResponse<Processo>>(createEmptyPageResponse<Processo>());
  const [resultadoCasos, setResultadoCasos] = useState<PageResponse<Caso>>(createEmptyPageResponse<Caso>());
  const buscaDeferred = useDeferredValue(busca);

  const isSecretaria = user?.papel?.toUpperCase() === "SECRETARIA";

  const carregarProcessos = useCallback(() => {
    setLoading(true);

    const buscaNorm = buscaDeferred.trim();
    const params: {
      unidadeId?: string;
      busca?: string;
      etiqueta?: string;
      status?: string;
      tipo?: string;
      page: number;
      size: number;
    } = {
      page,
      size: PAGE_SIZE,
    };

    if (unidadeSelecionada && unidadeSelecionada !== "todas") {
      params.unidadeId = unidadeSelecionada;
    }

    if (buscaNorm) {
      params.busca = buscaNorm;
    }

    if (filtroEtiqueta !== "Todas") {
      params.etiqueta = filtroEtiqueta;
    }

    if (filtroStatus !== "Todos") {
      params.status = filtroStatus;
    }

    if (filtroTipo !== "Todos") {
      params.tipo = filtroTipo;
    }

    processosApi
      .listar(params)
      .then((data: PageResponse<Processo> | Processo[]) => {
        const items = Array.isArray(data) ? data : data.content ?? [];
        const content = Array.isArray(items) ? items : [];
        setProcessos(content);
        setResultado({
          content,
          number: Array.isArray(data) ? page : data.number ?? page,
          size: Array.isArray(data) ? PAGE_SIZE : data.size ?? PAGE_SIZE,
          totalElements: Array.isArray(data) ? content.length : data.totalElements ?? content.length,
          totalPages: Array.isArray(data) ? (content.length > 0 ? 1 : 0) : data.totalPages ?? 0,
          first: Array.isArray(data) ? page === 0 : data.first ?? page === 0,
          last: Array.isArray(data) ? true : data.last ?? true,
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar processos:", error);
        toast.error("Erro ao carregar processos.");
        setProcessos([]);
        setResultado(createEmptyPageResponse<Processo>());
      })
      .finally(() => setLoading(false));
  }, [buscaDeferred, filtroEtiqueta, filtroStatus, filtroTipo, page, unidadeSelecionada]);

  const carregarCasos = useCallback(() => {
    setLoadingCasos(true);

    const buscaNorm = buscaDeferred.trim();
    const params: {
      unidadeId?: string;
      busca?: string;
      page: number;
      size: number;
    } = {
      page,
      size: PAGE_SIZE,
    };

    if (unidadeSelecionada && unidadeSelecionada !== "todas") {
      params.unidadeId = unidadeSelecionada;
    }

    if (buscaNorm) {
      params.busca = buscaNorm;
    }

    casosApi
      .listar(params)
      .then((data: PageResponse<Caso> | Caso[]) => {
        const items = Array.isArray(data) ? data : data.content ?? [];
        const content = Array.isArray(items) ? items : [];
        setCasos(content);
        setResultadoCasos({
          content,
          number: Array.isArray(data) ? page : data.number ?? page,
          size: Array.isArray(data) ? PAGE_SIZE : data.size ?? PAGE_SIZE,
          totalElements: Array.isArray(data) ? content.length : data.totalElements ?? content.length,
          totalPages: Array.isArray(data) ? (content.length > 0 ? 1 : 0) : data.totalPages ?? 0,
          first: Array.isArray(data) ? page === 0 : data.first ?? page === 0,
          last: Array.isArray(data) ? true : data.last ?? true,
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar casos:", error);
        toast.error("Erro ao carregar casos.");
        setCasos([]);
        setResultadoCasos(createEmptyPageResponse<Caso>());
      })
      .finally(() => setLoadingCasos(false));
  }, [buscaDeferred, page, unidadeSelecionada]);

  useEffect(() => {
    if (abaAtiva === "processos") {
      carregarProcessos();
      return;
    }

    carregarCasos();
  }, [abaAtiva, carregarCasos, carregarProcessos]);

  useEffect(() => {
    setPage(0);
  }, [abaAtiva, buscaDeferred, filtroEtiqueta, filtroStatus, filtroTipo, unidadeSelecionada]);

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
      toast.error("Não foi possível sincronizar as movimentações do Datajud agora.");
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

  const processosFiltrados = [...processos].sort(compareProcessosByRecency);
  const casosFiltrados = [...casos].sort(compareCasosByRecency);
  const loadingAtivo = abaAtiva === "processos" ? loading : loadingCasos;
  const resultadoAtivo = abaAtiva === "processos" ? resultado : resultadoCasos;
  const placeholderBusca =
    abaAtiva === "processos"
      ? "Buscar por numero ou cliente..."
      : "Buscar por titulo, cliente ou descricao do caso...";
  const unidadeInicialCaso =
    unidadeSelecionada && unidadeSelecionada !== "todas" ? unidadeSelecionada : user?.unidadeId;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Tabs value={abaAtiva} onValueChange={(value) => setAbaAtiva(value as ViewTab)}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="processos" className="gap-2">
                <Scale className="h-4 w-4" />
                Processos
              </TabsTrigger>
              <TabsTrigger value="casos" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Casos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {!isSecretaria && (
          <div className="flex flex-wrap items-center gap-2">
            {abaAtiva === "processos" && (
              <Button variant="outline" className="gap-2" onClick={sincronizarMovimentacoes} disabled={syncingDatajud}>
                {syncingDatajud ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Sincronizar movimentacoes
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" aria-label="Criar processo ou caso">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem className="gap-2" onClick={() => setModalProcessoAberto(true)}>
                  <Scale className="h-4 w-4 text-primary" />
                  Processo
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setModalCasoAberto(true)}>
                  <Briefcase className="h-4 w-4 text-primary" />
                  Caso
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Card className="border-border bg-card shadow-[0_16px_34px_-28px_rgba(15,23,42,0.24)]">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={placeholderBusca}
                className="border-border bg-card pl-9"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            {abaAtiva === "processos" && (
              <div className="flex flex-1 flex-wrap gap-3">
                <select
                  value={filtroStatus}
                  onChange={(event) => setFiltroStatus(event.target.value as StatusProcesso | "Todos")}
                  className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
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
                  className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
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
                  className="h-10 min-w-[190px] cursor-pointer rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
                >
                  <option value="Todas">Todas as etiquetas</option>
                  {opcoesEtiqueta.map((etiqueta) => (
                    <option key={etiqueta} value={etiqueta}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {abaAtiva === "processos" ? (
              <div className="flex flex-wrap gap-2">
                {todoStatus.map((status) => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      filtroStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted",
                    )}
                  >
                    {status === "Todos" ? status : statusConfig[status as StatusProcesso]?.label || status}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-6 text-muted-foreground">
                Casos agrupam contexto, envolvidos e classificacao operacional para o escritorio.
              </p>
            )}

            {!loadingAtivo && (
              <p className="text-right text-xs text-muted-foreground">
                {resultadoAtivo.totalElements} {abaAtiva === "processos" ? "processos" : "casos"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {loadingAtivo ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : abaAtiva === "processos" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_56px_-42px_rgba(15,23,42,0.3)]">
          {processosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Filter className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_160px] gap-5 border-b border-border bg-muted/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>Título</span>
                <span>Cliente / Pasta</span>
                <span>Acao / Foro</span>
                <span className="text-right">Ult. mov.</span>
              </div>

              <div className="divide-y divide-border/70">
                {processosFiltrados.map((processo) => {
                  const conf =
                    statusConfig[processo.status] ??
                    { className: "bg-muted text-foreground border-border", icon: AlertCircle, label: processo.status };
                  const titulo = buildProcessoTitulo(processo);
                  const foro =
                    [processo.vara, processo.tribunal].filter(Boolean).join(" / ") || processo.unidadeNome || "Foro não informado";

                  return (
                    <button
                      key={processo.id}
                      type="button"
                      onClick={() => setProcessoSelecionadoId(processo.id)}
                      className="group w-full text-left transition-colors hover:bg-muted/45"
                    >
                      <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_160px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border text-[11px]", conf.className)}>{conf.label}</Badge>
                            {processo.etiquetas?.slice(0, 2).map((etiqueta) => (
                              <Badge
                                key={etiqueta}
                                variant="outline"
                                className="border-primary/25 bg-primary/10 text-[11px] text-primary"
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
                          <p className="mt-1 text-xs text-muted-foreground">{processo.unidadeNome || "Pasta não informada"}</p>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {casosFiltrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-muted-foreground shadow-[0_24px_56px_-42px_rgba(15,23,42,0.3)]">
              <Filter className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum caso encontrado.</p>
            </div>
          ) : (
            casosFiltrados.map((caso) => {
              const acesso = acessoCasoConfig[caso.acesso] ?? acessoCasoConfig.EQUIPE;
              const AcessoIcon = acesso.icon;
              const envolvidosLabel =
                caso.envolvidos.length === 1 ? "1 envolvido adicional" : `${caso.envolvidos.length} envolvidos adicionais`;

              return (
                <button
                  key={caso.id}
                  type="button"
                  onClick={() => setCasoSelecionadoId(caso.id)}
                  className="group text-left"
                >
                  <Card className="h-full border-border bg-card transition-colors hover:border-primary/30 hover:bg-muted/35">
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border text-[11px]", acesso.className)}>{acesso.label}</Badge>
                            {caso.etiquetas?.slice(0, 2).map((etiqueta) => (
                              <Badge
                                key={etiqueta}
                                variant="outline"
                                className="border-primary/20 bg-primary/10 text-[11px] text-primary"
                              >
                                {etiqueta}
                              </Badge>
                            ))}
                          </div>

                          <p className="mt-3 line-clamp-2 text-base font-semibold leading-7 text-foreground">
                            {caso.titulo}
                          </p>
                        </div>

                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>

                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {caso.descricao?.trim() || "Caso sem descricao resumida registada ate ao momento."}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-muted/35 p-3">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 text-primary" />
                            Cliente
                          </p>
                          <p className="mt-2 truncate text-sm font-medium text-foreground">{caso.clienteNome}</p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/35 p-3">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            Pasta
                          </p>
                          <p className="mt-2 truncate text-sm font-medium text-foreground">{caso.unidadeNome}</p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/35 p-3">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5 text-primary" />
                            Responsavel
                          </p>
                          <p className="mt-2 truncate text-sm font-medium text-foreground">{caso.responsavelNome}</p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/35 p-3">
                          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <AcessoIcon className="h-3.5 w-3.5 text-primary" />
                            Atualizado
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {formatDate(caso.dataAtualizacao ?? caso.dataCriacao)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground">{envolvidosLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(caso.dataAtualizacao ?? caso.dataCriacao)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Pagina {resultadoAtivo.totalPages === 0 ? 0 : resultadoAtivo.number + 1} de {resultadoAtivo.totalPages}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resultadoAtivo.first || loadingAtivo}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={resultadoAtivo.last || loadingAtivo || resultadoAtivo.totalPages === 0}
            onClick={() => setPage((current) => current + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>

      <ProcessoDossieModal
        open={Boolean(processoSelecionadoId)}
        processoId={processoSelecionadoId}
        onClose={() => setProcessoSelecionadoId(null)}
        onAtualizado={carregarProcessos}
      />

      <CasoDetalheModal
        open={Boolean(casoSelecionadoId)}
        casoId={casoSelecionadoId}
        onClose={() => setCasoSelecionadoId(null)}
      />

      {modalProcessoAberto && (
        <NovoProcessoModal onClose={() => setModalProcessoAberto(false)} onSaved={carregarProcessos} />
      )}

      {modalCasoAberto && (
        <NovoCasoModal
          onClose={() => setModalCasoAberto(false)}
          onSaved={() => {
            carregarCasos();
          }}
          initialUnidadeId={unidadeInicialCaso}
          initialResponsavelId={user?.id}
        />
      )}
    </div>
  );
};
