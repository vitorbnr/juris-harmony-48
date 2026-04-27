import { ArrowRight, Clock3, Scale } from "lucide-react";

import type { DashboardMovimentacaoRecente } from "@/types";

const tipoLabel = (tipo?: string | null) => {
  if (!tipo) return "Movimentação";

  const labels: Record<string, string> = {
    peticao: "Petição",
    publicacao: "Publicação",
    audiencia: "Audiência",
    intimacao: "Intimação",
    sentenca: "Sentença",
    procuracao: "Procuração",
    distribuicao: "Distribuição",
    certidao: "Certidão",
    pericia: "Perícia",
    diligencia: "Diligência",
    movimentacao: "Movimentação",
  };

  const tipoLower = tipo.toLowerCase();
  if (labels[tipoLower]) return labels[tipoLower];

  return tipoLower
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
};

const formatarDataMovimentacao = (data?: string | null, dataHora?: string | null) => {
  if (dataHora) {
    return new Date(dataHora).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (data) {
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  }

  return "Data indisponível";
};

interface Props {
  onNavigate?: (item: string) => void;
  movimentacoes?: DashboardMovimentacaoRecente[];
  loading?: boolean;
}

export const RecentProcesses = ({ onNavigate, movimentacoes = [], loading = false }: Props) => (
  <div className="surface-card rounded-[1.35rem] border border-border/80 p-6 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
    <div className="mb-5 flex items-center justify-between">
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Últimas movimentações</h3>
        <p className="text-xs text-muted-foreground">Movimentações mais recentes dos processos ativos</p>
      </div>
      {onNavigate && (
        <button
          onClick={() => onNavigate("processos")}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver processos <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>

    {loading ? (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    ) : movimentacoes.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <Scale className="h-8 w-8 opacity-30" />
        <p className="text-sm">Nenhuma movimentação recente encontrada</p>
      </div>
    ) : (
      <div className="space-y-3">
        {movimentacoes.map((movimentacao, index) => (
          <div
            key={`${movimentacao.processoId ?? "sem-processo"}-${movimentacao.dataHora ?? movimentacao.data ?? index}`}
            className="surface-panel rounded-2xl border border-border/70 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock3 className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {movimentacao.processoNumero ?? "Processo sem número"}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {tipoLabel(movimentacao.tipo)}
                  </span>
                </div>

                <p className="truncate text-xs text-muted-foreground">
                  {movimentacao.clienteNome ?? "Cliente não identificado"}
                </p>

                <p className="mt-2 line-clamp-2 text-sm text-foreground/90">
                  {movimentacao.descricao}
                </p>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatarDataMovimentacao(movimentacao.data, movimentacao.dataHora)}
                  {movimentacao.origem ? ` · ${movimentacao.origem}` : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
