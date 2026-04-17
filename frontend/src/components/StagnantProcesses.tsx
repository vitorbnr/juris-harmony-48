import { AlertTriangle, Scale } from "lucide-react";

import type { DashboardProcessoResumo } from "@/types";

interface Props {
  processos?: DashboardProcessoResumo[];
  loading?: boolean;
}

const formatarData = (data: string | null) => {
  if (!data) return null;
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
};

export const StagnantProcesses = ({ processos = [], loading = false }: Props) => (
  <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-fade-in" style={{ animationDelay: "620ms" }}>
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Processos Parados</h3>
        <p className="text-xs text-muted-foreground">Sem movimentacao ha mais de 60 dias</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </div>
    </div>

    {loading ? (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    ) : processos.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <Scale className="h-8 w-8 opacity-30" />
        <p className="text-sm">Nenhum processo parado acima do limite no dashboard.</p>
      </div>
    ) : (
      <div className="space-y-3">
        {processos.map((processo) => (
          <div key={processo.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{processo.numero}</p>
                <p className="truncate text-xs text-muted-foreground">{processo.clienteNome}</p>
                {processo.ultimaMovimentacao && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Ultima movimentacao em {formatarData(processo.ultimaMovimentacao)}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive/90">
                Parado ha {processo.diasParados} dias
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
