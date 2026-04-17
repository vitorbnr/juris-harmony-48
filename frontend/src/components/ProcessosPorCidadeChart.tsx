import { MapPin, Scale } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { DashboardProcessosPorCidade } from "@/types";

interface Props {
  data?: DashboardProcessosPorCidade[];
  loading?: boolean;
}

export const ProcessosPorCidadeChart = ({ data = [], loading = false }: Props) => {
  const itens = [...data].sort((a, b) => {
    if (b.totalProcessos !== a.totalProcessos) return b.totalProcessos - a.totalProcessos;
    return a.cidade.localeCompare(b.cidade, "pt-BR", { sensitivity: "base" });
  });
  const maiorValor = Math.max(...itens.map((item) => item.totalProcessos), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-fade-in" style={{ animationDelay: "560ms" }}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Andamento por Cidade</h3>
          <p className="text-xs text-muted-foreground">Processos ativos por cidade e unidade</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <MapPin className="h-4 w-4" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
              <div className="h-2 animate-pulse rounded-full bg-muted/40" />
            </div>
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Scale className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum processo ativo para consolidar por cidade.</p>
        </div>
      ) : (
        <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
          {itens.map((item) => (
            <div key={`${item.unidadeId}-${item.cidade}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.cidade}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.unidadeNome} · {item.estado}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {item.totalProcessos}
                </span>
              </div>
              <Progress
                value={Math.max((item.totalProcessos / maiorValor) * 100, 8)}
                className="h-2 bg-primary/10"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
