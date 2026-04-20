import { Scale } from "lucide-react";
import { Cell, Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { DashboardProcessosPorArea } from "@/types";

interface Props {
  data?: DashboardProcessosPorArea[];
  loading?: boolean;
}

type ChartDatum = DashboardProcessosPorArea & {
  fill: string;
};

const chartConfig = {
  quantidade: {
    label: "Processos ativos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const AREA_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.84)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--chart-blue) / 0.72)",
  "hsl(var(--muted-foreground) / 0.6)",
] as const;

const resolveSliceColor = (area: string, index: number) => {
  if (area === "Outros") {
    return "hsl(var(--muted-foreground) / 0.58)";
  }

  return AREA_COLORS[index % AREA_COLORS.length];
};

const DemandasPorAreaTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
        <p className="font-medium text-foreground">{item.area}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Processos ativos</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {item.quantidade.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
};

export const ProcessosPorAreaChart = ({ data = [], loading = false }: Props) => {
  const itens = data.filter((item) => item.quantidade > 0);
  const totalProcessos = itens.reduce((total, item) => total + item.quantidade, 0);
  const chartData: ChartDatum[] = itens.map((item, index) => ({
    ...item,
    fill: resolveSliceColor(item.area, index),
  }));
  const areaPrincipal = chartData[0] ?? null;

  return (
    <Card className="border-border bg-card opacity-0 animate-fade-in" style={{ animationDelay: "560ms" }}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">Demandas por Area</CardTitle>
        <CardDescription>Volume de processos ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
            <div className="mx-auto h-[260px] w-[260px] animate-pulse rounded-full border border-border/50 bg-muted/30" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/30" />
              ))}
            </div>
          </>
        ) : chartData.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Scale className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum processo ativo para consolidar por area.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-panel rounded-2xl border border-border/70 px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Total ativo
                </p>
                <p className="mt-1 text-2xl font-semibold leading-none text-foreground">
                  {totalProcessos.toLocaleString("pt-BR")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Soma das areas consolidadas no dashboard.
                </p>
              </div>

              <div className="surface-panel rounded-2xl border border-border/70 px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Maior frente
                </p>
                <p className="mt-1 truncate text-base font-semibold text-foreground">
                  {areaPrincipal?.area ?? "Nao informado"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {areaPrincipal?.quantidade.toLocaleString("pt-BR") ?? "0"} processos nesta area
                </p>
              </div>
            </div>

            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[280px] w-full max-w-[320px]"
            >
              <PieChart>
                <ChartTooltip cursor={false} content={<DemandasPorAreaTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="quantidade"
                  nameKey="area"
                  innerRadius={78}
                  outerRadius={110}
                  paddingAngle={2}
                  strokeWidth={4}
                >
                  {chartData.map((item) => (
                    <Cell key={item.area} fill={item.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                        return null;
                      }

                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-[28px] font-semibold"
                          >
                            {totalProcessos.toLocaleString("pt-BR")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy + 22}
                            className="fill-muted-foreground text-[11px]"
                          >
                            processos ativos
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="grid gap-3 sm:grid-cols-2">
              {chartData.map((item) => {
                const percentual = totalProcessos > 0 ? (item.quantidade / totalProcessos) * 100 : 0;
                const percentualFormatado = percentual.toFixed(percentual >= 10 ? 0 : 1);

                return (
                  <div
                    key={item.area}
                    className="surface-panel rounded-2xl border border-border/70 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.area}</p>
                          <p className="text-xs text-muted-foreground">{percentualFormatado}% do total</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary/95">
                        {item.quantidade.toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.max(percentual, 8)}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>Participacao</span>
                      <span>{percentualFormatado}% da carteira</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
