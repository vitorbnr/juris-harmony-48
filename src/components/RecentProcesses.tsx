import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { processosApi } from "@/services/api";

const statusStyles: Record<string, string> = {
  "EM_ANDAMENTO": "bg-chart-blue/15 text-chart-blue border-chart-blue/20",
  "AGUARDANDO": "bg-chart-amber/15 text-chart-amber border-chart-amber/20",
  "CONCLUIDO": "bg-primary/15 text-primary border-primary/20",
  "URGENTE": "bg-destructive/15 text-destructive border-destructive/20",
  "SUSPENSO": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  // fallbacks for display labels
  "Em andamento": "bg-chart-blue/15 text-chart-blue border-chart-blue/20",
  "Aguardando": "bg-chart-amber/15 text-chart-amber border-chart-amber/20",
  "Concluído": "bg-primary/15 text-primary border-primary/20",
  "Urgente": "bg-destructive/15 text-destructive border-destructive/20",
  "Suspenso": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

interface ProcessoRecente {
  id: string;
  numero: string;
  clienteNome: string;
  tipo: string;
  status: string;
  dataDistribuicao: string;
}

export const RecentProcesses = () => {
  const [processos, setProcessos] = useState<ProcessoRecente[]>([]);

  useEffect(() => {
    processosApi.listar({ size: 5, sort: "criadoEm,desc" })
      .then((data) => {
        const items = data.content ?? data;
        setProcessos(Array.isArray(items) ? items.slice(0, 5) : []);
      })
      .catch(() => setProcessos([]));
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Processos Recentes</h3>
      </div>
      <div className="space-y-3">
        {processos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo cadastrado</p>
        ) : (
          processos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {p.clienteNome}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.numero}</p>
              </div>
              <div className="hidden sm:block text-xs text-muted-foreground mx-4">{p.tipo}</div>
              <Badge
                variant="outline"
                className={cn("text-[11px] font-medium shrink-0", statusStyles[p.status] ?? "bg-muted text-muted-foreground")}
              >
                {p.status}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
