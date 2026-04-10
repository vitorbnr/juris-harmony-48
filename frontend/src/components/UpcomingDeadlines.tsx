import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";

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
    dashboardApi
      .get()
      .then((data) => {
        const items = data.proximosPrazos ?? [];
        setPrazos(Array.isArray(items) ? items.slice(0, 4) : []);
      })
      .catch(() => setPrazos([]));
  }, []);

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">Proximos prazos</h3>
      </div>
      <div className="space-y-3">
        {prazos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum prazo pendente</p>
        ) : (
          prazos.map((prazo) => {
            const days = getDaysUntil(prazo.data);
            const urgent = prazo.prioridade === "alta" || days <= 3;

            return (
              <div
                key={prazo.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", urgent ? "bg-destructive/10" : "bg-accent")}>
                  {urgent ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CalendarClock className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{prazo.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(prazo.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    urgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  {days < 0 ? "Atrasado" : days === 0 ? "Hoje" : days === 1 ? "Amanha" : `${days} dias`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
