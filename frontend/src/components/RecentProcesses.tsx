import { useState, useEffect } from "react";
import { Scale, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/services/api";
import type { Processo } from "@/types";

const statusConfig: Record<string, { label: string; cls: string }> = {
  EM_ANDAMENTO:  { label: "Em Andamento",  cls: "bg-blue-500/15 text-blue-400" },
  URGENTE:       { label: "Urgente",        cls: "bg-red-500/15 text-red-400" },
  AGUARDANDO:    { label: "Aguardando",     cls: "bg-yellow-500/15 text-yellow-400" },
  CONCLUIDO:     { label: "Concluído",      cls: "bg-green-500/15 text-green-400" },
  SUSPENSO:      { label: "Suspenso",       cls: "bg-muted text-muted-foreground" },
  ARQUIVADO:     { label: "Arquivado",      cls: "bg-muted text-muted-foreground" },
};

interface Props {
  onNavigate?: (item: string) => void;
}

export const RecentProcesses = ({ onNavigate }: Props) => {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then((data) => {
        const items = data.processosRecentes ?? [];
        setProcessos(Array.isArray(items) ? items : []);
      })
      .catch(() => setProcessos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Processos Recentes</h3>
        {onNavigate && (
          <button
            onClick={() => onNavigate("processos")}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : processos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Scale className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum processo cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {processos.map((p) => {
            const cfg = statusConfig[p.status] ?? statusConfig.EM_ANDAMENTO;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Scale className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {p.numero}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.clienteNome}</p>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.cls)}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
