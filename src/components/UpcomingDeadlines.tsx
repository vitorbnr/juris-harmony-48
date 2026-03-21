import { CalendarClock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const deadlines = [
  { title: "Contestação - Maria Oliveira", date: "22/03/2026", days: 1, urgent: true },
  { title: "Recurso - João Santos", date: "24/03/2026", days: 3, urgent: true },
  { title: "Audiência - Ana Costa", date: "28/03/2026", days: 7, urgent: false },
  { title: "Petição Inicial - Pedro Lima", date: "02/04/2026", days: 12, urgent: false },
];

export const UpcomingDeadlines = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Próximos Prazos</h3>
        <button className="text-sm text-primary hover:underline font-medium">Ver agenda</button>
      </div>
      <div className="space-y-3">
        {deadlines.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                d.urgent ? "bg-destructive/10" : "bg-accent"
              )}
            >
              {d.urgent ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CalendarClock className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
              <p className="text-xs text-muted-foreground">{d.date}</p>
            </div>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                d.urgent
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {d.days === 1 ? "Amanhã" : `${d.days} dias`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
