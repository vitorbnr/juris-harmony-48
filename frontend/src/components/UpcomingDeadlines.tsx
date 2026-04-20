import { AlertTriangle, CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";

interface PrazoProximo {
  id: string;
  titulo: string;
  data: string;
  prioridade: string;
  concluido: boolean;
}

interface Props {
  prazos?: PrazoProximo[];
  loading?: boolean;
}

export const UpcomingDeadlines = ({ prazos = [], loading = false }: Props) => {
  const itens = prazos.slice(0, 4);

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="surface-card rounded-[1.35rem] border border-border/80 p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">Proximos prazos</h3>
      </div>
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-muted/40" />
          ))
        ) : itens.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum prazo pendente</p>
        ) : (
          itens.map((prazo) => {
            const days = getDaysUntil(prazo.data);
            const urgent = prazo.prioridade === "alta" || days <= 3;

            return (
              <div
                key={prazo.id}
                className="surface-panel flex cursor-pointer items-center gap-3 rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", urgent ? "bg-destructive/10" : "bg-accent")}>
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
