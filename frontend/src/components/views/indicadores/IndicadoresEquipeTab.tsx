import { useEffect, useState, type ElementType } from "react";
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

const SAGE = "#7aab8a";
const OVERLOAD_LIMIT = 50;

const PERIODOS: Array<{
  value: TipoPeriodoIndicadoresEquipe;
  label: string;
  helper: string;
}> = [
  {
    value: "ESTE_MES",
    label: "Este mes",
    helper: "Foco no mes corrente",
  },
  {
    value: "MES_PASSADO",
    label: "Mes passado",
    helper: "Comparacao com a janela anterior",
  },
  {
    value: "ULTIMOS_90_DIAS",
    label: "Ultimos 90 dias",
    helper: "Leitura mais ampla da produtividade",
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

const MetricCard = ({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: ElementType;
  label: string;
  value: string;
  accentClass?: string;
}) => (
  <div className="rounded-2xl border border-border/70 bg-black/10 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary",
          accentClass,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const CompletionCell = ({
  responsavel,
}: {
  responsavel: IndicadorResponsavel;
}) => {
  const total = completionTotal(responsavel);
  const onTimeWidth = total === 0 ? 0 : (responsavel.prazosConcluidosNoPrazo / total) * 100;
  const lateWidth = total === 0 ? 0 : (responsavel.prazosConcluidosAtrasados / total) * 100;

  return (
    <div className="min-w-[210px] space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/70">
        <div
          className="h-full rounded-l-full bg-[var(--sage-green)] transition-all"
          style={{ width: `${onTimeWidth}%`, backgroundColor: SAGE }}
        />
        <div
          className="h-full rounded-r-full bg-red-400/80 transition-all"
          style={{ width: `${lateWidth}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/10">
          {formatNumber(responsavel.prazosConcluidosNoPrazo)} no prazo
        </Badge>
        <Badge className="border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/10">
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
        className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 rounded-2xl border border-border/70 bg-black/10 px-4 py-4"
      >
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-14" />
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
        setError("Nao foi possivel carregar os indicadores da equipe.");
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
  const totalPendencias = indicadores.reduce((total, item) => total + item.prazosPendentes, 0);
  const sobrecarregados = indicadores.filter(
    (item) => item.prazosPendentes > OVERLOAD_LIMIT,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7aab8a]/25 bg-[#7aab8a]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#b7d3bd]">
            <Users className="h-3.5 w-3.5" />
            Equipe e produtividade
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Ranking de carga e ritmo da equipe
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Painel orientado a responsaveis para localizar gargalos, comparar entregas e abrir
              rapidamente o perfil operacional de cada membro do escritorio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
              {formatNumber(indicadores.length)} membros ativos
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "border-white/10 bg-white/5",
                sobrecarregados > 0
                  ? "border-red-400/30 bg-red-400/10 text-red-300"
                  : "text-[#b7d3bd]",
              )}
            >
              {formatNumber(sobrecarregados)} em zona critica
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
              {formatNumber(totalPendencias)} prazos pendentes
            </Badge>
          </div>
        </div>

        <div className="w-full max-w-[240px]">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Periodo</p>
          <Select
            value={periodo}
            onValueChange={(value) => setPeriodo(value as TipoPeriodoIndicadoresEquipe)}
          >
            <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-black/10">
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
          <p className="mt-2 text-xs text-muted-foreground">{periodoMeta.helper}</p>
        </div>
      </div>

      <Card className="border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.08))]">
        <CardHeader className="gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-xl">Tabela de produtividade</CardTitle>
            <CardDescription>
              Ordenada por carga pendente para destacar rapidamente quem esta mais pressionado.
            </CardDescription>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Linhas com mais de {OVERLOAD_LIMIT} pendencias recebem destaque sutil
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert className="border-red-400/20 bg-red-400/10 text-red-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <TableSkeleton />
          ) : indicadores.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-black/10 text-center">
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
                    <TableRow className="border-border/70 hover:bg-transparent">
                      <TableHead>Funcionario</TableHead>
                      <TableHead className="text-center">Processos ativos</TableHead>
                      <TableHead className="text-center">Prazos pendentes</TableHead>
                      <TableHead>Prazos no prazo vs atrasados</TableHead>
                      <TableHead className="text-center">Movimentacoes registadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicadores.map((item) => {
                      const critico = item.prazosPendentes > OVERLOAD_LIMIT;

                      return (
                        <TableRow
                          key={item.usuarioId}
                          className={cn(
                            "border-border/60 transition-colors hover:bg-white/5",
                            critico && "bg-red-400/5 hover:bg-red-400/10",
                          )}
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7aab8a]/20 bg-[#7aab8a]/10 text-sm font-semibold text-[#b7d3bd]">
                                {item.nomeUsuario
                                  .split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((parte) => parte[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{item.nomeUsuario}</p>
                                <div className="flex flex-wrap gap-2">
                                  {critico ? (
                                    <Badge className="border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/10">
                                      Carga critica
                                    </Badge>
                                  ) : (
                                    <Badge className="border border-[#7aab8a]/20 bg-[#7aab8a]/10 text-[#b7d3bd] hover:bg-[#7aab8a]/10">
                                      Fluxo estavel
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
                                "inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-sm font-semibold",
                                critico
                                  ? "bg-red-400/15 text-red-300"
                                  : "bg-white/5 text-foreground",
                              )}
                            >
                              {formatNumber(item.prazosPendentes)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <CompletionCell responsavel={item} />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex min-w-16 items-center justify-center rounded-full bg-[#7aab8a]/12 px-3 py-1 text-sm font-semibold text-[#b7d3bd]">
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

      <Card className="border-[#7aab8a]/15 bg-[radial-gradient(circle_at_top_left,rgba(122,171,138,0.14),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.08))]">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-xl">Perfil individual do responsavel</CardTitle>
            <CardDescription>
              Abra o recorte operacional de um membro da equipe e acompanhe o ritmo das ultimas
              quatro semanas.
            </CardDescription>
          </div>

          <div className="w-full lg:max-w-[280px]">
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Ver detalhes do funcionario
            </p>
            <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-black/10">
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
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-black/10 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">Selecione um funcionario.</p>
                <p className="text-sm text-muted-foreground">
                  O detalhe individual aparece aqui assim que um membro da equipe for escolhido.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <MetricCard
                  icon={Scale}
                  label="Processos em carteira"
                  value={formatNumber(responsavelSelecionado.processosSobResponsabilidade)}
                />
                <MetricCard
                  icon={CalendarClock}
                  label="Prazos pendentes"
                  value={formatNumber(responsavelSelecionado.prazosPendentes)}
                  accentClass={
                    responsavelSelecionado.prazosPendentes > OVERLOAD_LIMIT
                      ? "border-red-400/20 bg-red-400/10 text-red-300"
                      : undefined
                  }
                />
                <MetricCard
                  icon={Activity}
                  label="Movimentacoes no periodo"
                  value={formatNumber(responsavelSelecionado.movimentacoesRegistadas)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/10">
                  {formatNumber(responsavelSelecionado.prazosConcluidosNoPrazo)} concluidos no prazo
                </Badge>
                <Badge className="border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/10">
                  {formatNumber(responsavelSelecionado.prazosConcluidosAtrasados)} concluidos atrasados
                </Badge>
                <Badge className="border border-[#7aab8a]/20 bg-[#7aab8a]/10 text-[#b7d3bd] hover:bg-[#7aab8a]/10">
                  {completionRate(responsavelSelecionado)}% de aderencia ao prazo
                </Badge>
              </div>

              {responsavelSelecionado.prazosPendentes > OVERLOAD_LIMIT && (
                <Alert className="border-red-400/20 bg-red-400/10 text-red-100">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Risco de sobrecarga</AlertTitle>
                  <AlertDescription>
                    {responsavelSelecionado.nomeUsuario} ultrapassou o limite critico de{" "}
                    {OVERLOAD_LIMIT} prazos pendentes e merece triagem prioritaria.
                  </AlertDescription>
                </Alert>
              )}

              <Card className="border-white/5 bg-black/10">
                <CardHeader>
                  <CardTitle className="text-lg">Grafico de ritmo</CardTitle>
                  <CardDescription>
                    Tarefas e prazos concluidos nas ultimas quatro semanas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loadingEvolucao ? (
                    <div className="space-y-4 pt-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-[220px] w-full rounded-2xl" />
                    </div>
                  ) : evolucao.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-black/5 text-center">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Nenhuma conclusao consolidada.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          O historico semanal sera exibido quando houver entregas registadas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.14} />
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
                          cursor={{ fill: "rgba(122, 171, 138, 0.12)" }}
                          contentStyle={{
                            backgroundColor: "rgba(11, 15, 18, 0.94)",
                            border: "1px solid rgba(122, 171, 138, 0.22)",
                            borderRadius: "16px",
                            color: "#e8f0ea",
                          }}
                          formatter={(value: number) => [
                            `${formatNumber(value)} concluidas`,
                            "Produtividade",
                          ]}
                        />
                        <Bar
                          dataKey="tarefasConcluidas"
                          radius={[8, 8, 0, 0]}
                          fill={SAGE}
                          barSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
