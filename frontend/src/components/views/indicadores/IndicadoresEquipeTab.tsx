import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Scale,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { indicadoresEquipeApi } from "@/services/api";
import type {
  EvolucaoProdutividade,
  IndicadorResponsavel,
  TipoPeriodoIndicadoresEquipe,
} from "@/types";

const OVERLOAD_LIMIT = 50;
const ON_TIME_COLOR = "hsl(var(--chart-green))";
const LATE_COLOR = "hsl(var(--chart-red))";
const BAR_COLOR = "hsl(var(--chart-blue))";

const PERIODOS: Array<{
  value: TipoPeriodoIndicadoresEquipe;
  label: string;
  helper: string;
}> = [
  {
    value: "ESTE_MES",
    label: "Este mes",
    helper: "Leitura do desempenho no mes corrente.",
  },
  {
    value: "MES_PASSADO",
    label: "Mes passado",
    helper: "Comparacao com a janela imediatamente anterior.",
  },
  {
    value: "ULTIMOS_90_DIAS",
    label: "Ultimos 90 dias",
    helper: "Tendencia mais ampla para planejamento da operacao.",
  },
];

const getPeriodoMeta = (periodo: TipoPeriodoIndicadoresEquipe) =>
  PERIODOS.find((item) => item.value === periodo) ?? PERIODOS[0];

const formatNumber = (value: number) => value.toLocaleString("pt-BR");

const completionTotal = (responsavel: IndicadorResponsavel) =>
  responsavel.prazosConcluidosNoPrazo + responsavel.prazosConcluidosAtrasados;

const completionRate = (responsavel: IndicadorResponsavel) => {
  const total = completionTotal(responsavel);
  if (total === 0) {
    return 0;
  }

  return Math.round((responsavel.prazosConcluidosNoPrazo / total) * 100);
};

const getInitials = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "critical" | "warning";
}) => (
  <div className="rounded-lg border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
      </div>

      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-md border",
          tone === "critical" &&
            "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
          tone === "warning" &&
            "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
          tone === "default" &&
            "border-border bg-background text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </div>
);

const DetailMetric = ({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "critical";
}) => (
  <div className="rounded-lg border border-border bg-background px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-sm leading-6 text-muted-foreground">{helper}</p>
      </div>
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md border",
          tone === "critical"
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            : "border-border bg-card text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    </div>
  </div>
);

const CompletionCell = ({ responsavel }: { responsavel: IndicadorResponsavel }) => {
  const total = completionTotal(responsavel);
  const onTimeWidth = total === 0 ? 0 : (responsavel.prazosConcluidosNoPrazo / total) * 100;
  const lateWidth = total === 0 ? 0 : (responsavel.prazosConcluidosAtrasados / total) * 100;

  return (
    <div className="min-w-[220px] space-y-2.5">
      <div className="flex h-2.5 overflow-hidden rounded-sm bg-muted">
        <div
          className="h-full transition-all"
          style={{ width: `${onTimeWidth}%`, backgroundColor: ON_TIME_COLOR }}
        />
        <div
          className="h-full transition-all"
          style={{ width: `${lateWidth}%`, backgroundColor: LATE_COLOR }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {formatNumber(responsavel.prazosConcluidosNoPrazo)} no prazo
        </Badge>
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
          {formatNumber(responsavel.prazosConcluidosAtrasados)} atrasados
        </Badge>
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, index) => (
      <div
        key={index}
        className="grid grid-cols-[2.2fr_1fr_1fr_2fr_1fr] gap-4 rounded-lg border border-border bg-background px-4 py-4"
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
    ))}
  </div>
);

export const IndicadoresEquipeTab = () => {
  const [periodo, setPeriodo] = useState<TipoPeriodoIndicadoresEquipe>("ESTE_MES");
  const [indicadores, setIndicadores] = useState<IndicadorResponsavel[]>([]);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
  const [evolucao, setEvolucao] = useState<EvolucaoProdutividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvolucao, setLoadingEvolucao] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    setLoading(true);
    setError(null);

    indicadoresEquipeApi
      .listar(periodo)
      .then((data) => {
        if (!ativo) return;

        const normalizados = Array.isArray(data) ? data : [];
        setIndicadores(normalizados);
        setSelectedUsuarioId((atual) =>
          normalizados.some((item) => item.usuarioId === atual)
            ? atual
            : normalizados[0]?.usuarioId ?? "",
        );
      })
      .catch(() => {
        if (!ativo) return;
        setIndicadores([]);
        setSelectedUsuarioId("");
        setError("Não foi possível carregar os indicadores da equipe.");
      })
      .finally(() => {
        if (ativo) {
          setLoading(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [periodo]);

  useEffect(() => {
    if (!selectedUsuarioId) {
      setEvolucao([]);
      return;
    }

    let ativo = true;
    setLoadingEvolucao(true);

    indicadoresEquipeApi
      .evolucao(selectedUsuarioId, periodo)
      .then((data) => {
        if (!ativo) return;
        setEvolucao(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!ativo) return;
        setEvolucao([]);
      })
      .finally(() => {
        if (ativo) {
          setLoadingEvolucao(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [periodo, selectedUsuarioId]);

  const periodoMeta = getPeriodoMeta(periodo);
  const responsavelSelecionado =
    indicadores.find((item) => item.usuarioId === selectedUsuarioId) ?? null;

  const resumo = useMemo(() => {
    const totalPendencias = indicadores.reduce((total, item) => total + item.prazosPendentes, 0);
    const totalMovimentacoes = indicadores.reduce(
      (total, item) => total + item.movimentacoesRegistadas,
      0,
    );
    const sobrecarregados = indicadores.filter(
      (item) => item.prazosPendentes > OVERLOAD_LIMIT,
    ).length;
    const totalConcluidos = indicadores.reduce(
      (total, item) => total + completionTotal(item),
      0,
    );
    const totalNoPrazo = indicadores.reduce(
      (total, item) => total + item.prazosConcluidosNoPrazo,
      0,
    );
    const aderenciaMedia =
      totalConcluidos === 0 ? 0 : Math.round((totalNoPrazo / totalConcluidos) * 100);

    return {
      totalPendencias,
      totalMovimentacoes,
      sobrecarregados,
      aderenciaMedia,
    };
  }, [indicadores]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Responsaveis monitorados"
            value={formatNumber(indicadores.length)}
            helper="Membros com carteira ou atividade consolidada na janela selecionada."
          />
          <SummaryCard
            icon={CalendarClock}
            label="Prazos pendentes"
            value={formatNumber(resumo.totalPendencias)}
            helper="Volume total de pendencias abertas sob acompanhamento da equipe."
            tone="warning"
          />
          <SummaryCard
            icon={Activity}
            label="Aderencia ao prazo"
            value={`${resumo.aderenciaMedia}%`}
            helper="Percentual agregado de conclusoes feitas dentro do prazo."
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Zona critica"
            value={formatNumber(resumo.sobrecarregados)}
            helper={`Responsaveis acima do limite de ${OVERLOAD_LIMIT} pendencias.`}
            tone={resumo.sobrecarregados > 0 ? "critical" : "default"}
          />
        </div>

        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Periodo de analise
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Ajusta a janela da consolidacao para comparacao de carga e ritmo da equipe.
              </p>
            </div>

            <Select
              value={periodo}
              onValueChange={(value) => setPeriodo(value as TipoPeriodoIndicadoresEquipe)}
            >
              <SelectTrigger className="h-11 bg-background">
                <SelectValue placeholder="Selecione o periodo" />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Janela atual
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{periodoMeta.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{periodoMeta.helper}</p>
            </div>

            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Movimentacoes registadas
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatNumber(resumo.totalMovimentacoes)}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Soma de atividades lancadas pela equipe no periodo filtrado.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border bg-card">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-xl">Carga por responsavel</CardTitle>
            <CardDescription>
              Ordenacao pela fila pendente para facilitar redistribuicao e triagem de risco.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
              Clique em uma linha para abrir o detalhe individual
            </Badge>
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              Acima de {OVERLOAD_LIMIT} pendencias exige atencao
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <TableSkeleton />
          ) : indicadores.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum indicador disponivel.</p>
                <p className="text-sm text-muted-foreground">
                  A equipe ainda nao possui dados suficientes para consolidacao.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[980px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Responsavel</TableHead>
                      <TableHead className="text-center">Processos ativos</TableHead>
                      <TableHead className="text-center">Prazos pendentes</TableHead>
                      <TableHead>Concluidos no prazo x atrasados</TableHead>
                      <TableHead className="text-center">Movimentações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {indicadores.map((item) => {
                      const critico = item.prazosPendentes > OVERLOAD_LIMIT;
                      const selecionado = item.usuarioId === selectedUsuarioId;

                      return (
                        <TableRow
                          key={item.usuarioId}
                          onClick={() => setSelectedUsuarioId(item.usuarioId)}
                          className={cn(
                            "cursor-pointer border-border/70",
                            critico &&
                              "bg-red-50/70 hover:bg-red-50 dark:bg-red-500/5 dark:hover:bg-red-500/10",
                            selecionado &&
                              "bg-accent/60 hover:bg-accent/60 dark:bg-accent/50 dark:hover:bg-accent/50",
                            !critico && !selecionado && "hover:bg-muted/40",
                          )}
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-sm font-semibold text-primary">
                                {getInitials(item.nomeUsuario)}
                              </div>

                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{item.nomeUsuario}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      critico
                                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
                                    )}
                                  >
                                    {critico ? "Carga critica" : "Fluxo estavel"}
                                  </Badge>

                                  {selecionado && (
                                    <Badge variant="outline" className="border-border bg-card text-foreground">
                                      Em analise
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center text-base font-semibold text-foreground">
                            {formatNumber(item.processosSobResponsabilidade)}
                          </TableCell>

                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex min-w-16 items-center justify-center rounded-md border px-3 py-1 text-sm font-semibold",
                                critico
                                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                                  : "border-border bg-background text-foreground",
                              )}
                            >
                              {formatNumber(item.prazosPendentes)}
                            </span>
                          </TableCell>

                          <TableCell>
                            <CompletionCell responsavel={item} />
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="inline-flex min-w-16 items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm font-semibold text-foreground">
                              {formatNumber(item.movimentacoesRegistadas)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle className="text-xl">Perfil individual do responsavel</CardTitle>
            <CardDescription>
              Recorte operacional com carteira atual, fila pendente e historico das ultimas quatro
              semanas.
            </CardDescription>
          </div>

          <div className="w-full xl:max-w-[320px]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Selecionar responsavel
            </p>
            <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
              <SelectTrigger className="h-11 bg-background">
                <SelectValue placeholder="Selecione um membro da equipe" />
              </SelectTrigger>
              <SelectContent>
                {indicadores.map((item) => (
                  <SelectItem key={item.usuarioId} value={item.usuarioId}>
                    {item.nomeUsuario}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!responsavelSelecionado ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">Selecione um responsavel.</p>
                <p className="text-sm text-muted-foreground">
                  O detalhe individual aparece aqui assim que um membro da equipe for escolhido.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-lg border border-border bg-background p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card text-base font-semibold text-primary">
                      {getInitials(responsavelSelecionado.nomeUsuario)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {responsavelSelecionado.nomeUsuario}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Leitura consolidada para {periodoMeta.label.toLowerCase()}.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    >
                      {completionRate(responsavelSelecionado)}% de aderencia
                    </Badge>
                    <Badge variant="outline" className="border-border bg-card text-foreground">
                      {formatNumber(completionTotal(responsavelSelecionado))} concluidos
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                      <span className="text-muted-foreground">Movimentações no período</span>
                      <span className="font-semibold text-foreground">
                        {formatNumber(responsavelSelecionado.movimentacoesRegistadas)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                      <span className="text-muted-foreground">Concluidos no prazo</span>
                      <span className="font-semibold text-foreground">
                        {formatNumber(responsavelSelecionado.prazosConcluidosNoPrazo)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Concluidos atrasados</span>
                      <span className="font-semibold text-foreground">
                        {formatNumber(responsavelSelecionado.prazosConcluidosAtrasados)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <DetailMetric
                    icon={Scale}
                    label="Processos em carteira"
                    value={formatNumber(responsavelSelecionado.processosSobResponsabilidade)}
                    helper="Casos ativos sob responsabilidade direta."
                  />
                  <DetailMetric
                    icon={CalendarClock}
                    label="Prazos pendentes"
                    value={formatNumber(responsavelSelecionado.prazosPendentes)}
                    helper="Fila operacional atual aguardando tratamento."
                    tone={
                      responsavelSelecionado.prazosPendentes > OVERLOAD_LIMIT
                        ? "critical"
                        : "default"
                    }
                  />
                  <DetailMetric
                    icon={Activity}
                    label="Ritmo no periodo"
                    value={formatNumber(responsavelSelecionado.movimentacoesRegistadas)}
                    helper="Volume de atividades registradas na janela selecionada."
                  />
                </div>
              </div>

              {responsavelSelecionado.prazosPendentes > OVERLOAD_LIMIT && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Risco de sobrecarga</AlertTitle>
                  <AlertDescription>
                    {responsavelSelecionado.nomeUsuario} ultrapassou o limite critico de{" "}
                    {OVERLOAD_LIMIT} pendencias e merece triagem prioritaria.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border border-border bg-background p-5">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Ritmo semanal</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Volume de tarefas concluidas nas ultimas quatro semanas para apoiar a leitura
                      de consistencia da equipe.
                    </p>
                  </div>

                  <Badge variant="outline" className="border-border bg-card text-foreground">
                    Barra semanal de produtividade
                  </Badge>
                </div>

                <div className="h-[300px]">
                  {loadingEvolucao ? (
                    <div className="space-y-4 pt-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-[220px] w-full rounded-lg" />
                    </div>
                  ) : evolucao.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card text-center">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Nenhuma conclusao consolidada.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          O historico semanal sera exibido quando houver entregas registradas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="data"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--accent))" }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            color: "hsl(var(--popover-foreground))",
                            boxShadow: "0 14px 28px -20px rgba(15, 23, 42, 0.25)",
                          }}
                          formatter={(value: number) => [
                            `${formatNumber(value)} concluidas`,
                            "Produtividade",
                          ]}
                        />
                        <Bar
                          dataKey="tarefasConcluidas"
                          radius={[4, 4, 0, 0]}
                          fill={BAR_COLOR}
                          barSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
