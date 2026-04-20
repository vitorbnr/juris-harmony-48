import { AlertTriangle, CalendarClock, ClipboardList } from "lucide-react";

const cards = [
  {
    key: "prazosAtrasados",
    label: "Atrasados",
    icon: AlertTriangle,
    cls: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    key: "prazosHoje",
    label: "Vencem hoje",
    icon: CalendarClock,
    cls: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    key: "tarefasAbertas",
    label: "Tarefas abertas",
    icon: ClipboardList,
    cls: "border-primary/20 bg-primary/5 text-primary",
  },
] as const;

interface UrgencyPanelProps {
  prazosAtrasados?: number;
  prazosHoje?: number;
  tarefasAbertas?: number;
  loading?: boolean;
}

export const UrgencyPanel = ({
  prazosAtrasados = 0,
  prazosHoje = 0,
  tarefasAbertas = 0,
  loading = false,
}: UrgencyPanelProps) => {
  const data = {
    prazosAtrasados,
    prazosHoje,
    tarefasAbertas,
  };

  return (
    <div className="surface-card rounded-[1.35rem] border border-border/80 p-6 opacity-0 animate-fade-in" style={{ animationDelay: "320ms" }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">Painel de urgência</h3>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const value = data[card.key];

            return (
              <div key={card.key} className={`surface-panel rounded-2xl border p-4 ${card.cls}`}>
                <div className="mb-3 flex items-center justify-between">
                  <Icon className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{value}</span>
                </div>
                <p className="text-sm font-medium">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
