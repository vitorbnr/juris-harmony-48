import { useState, useEffect } from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardApi } from "@/services/api";

interface PrazoProximo {
  id: string;
  titulo: string;
  data: string;
  prioridade: string;
  concluido: boolean;
}

export const UpcomingDeadlines = () => {
  const [prazos, setPrazos] = useState<PrazoProximo[]>([]);

  useEffect(() => {
    dashboardApi.get()
      .then((data) => {
        const items = data.proximosPrazos ?? [];
        setPrazos(Array.isArray(items) ? items.slice(0, 4) : []);
      })
      .catch(() => setPrazos([]));
  }, []);

  const getDaysUntil = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Próximos Prazos</h3>
      </div>
      <div className="space-y-3">
        {prazos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo pendente</p>
        ) : (
          prazos.map((d) => {
            const days = getDaysUntil(d.data);
            // backend agora retorna lowercase: "alta", "media", "baixa"
            const urgent = d.prioridade === "alta" || days <= 3;
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  urgent ? "bg-destructive/10" : "bg-accent")}>
                  {urgent
                    ? <AlertTriangle className="h-4 w-4 text-destructive" />
                    : <CalendarClock className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                  urgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                )}>
                  {days <= 0 ? "Hoje" : days === 1 ? "Amanhã" : `${days} dias`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
