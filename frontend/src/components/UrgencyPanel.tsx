import { AlertTriangle, CalendarClock, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

import { dashboardApi } from "@/services/api";

interface DashboardUrgency {
  prazosAtrasados: number;
  prazosHoje: number;
  tarefasAbertas: number;
}

const cards = [
  {
    key: "prazosAtrasados",
    label: "Atrasados",
    icon: AlertTriangle,
    cls: "border-red-500/20 bg-red-500/5 text-red-400",
  },
  {
    key: "prazosHoje",
    label: "Vencem hoje",
    icon: CalendarClock,
    cls: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  },
  {
    key: "tarefasAbertas",
    label: "Tarefas abertas",
    icon: ClipboardList,
    cls: "border-primary/20 bg-primary/5 text-primary",
  },
] as const;

export const UrgencyPanel = () => {
  const [data, setData] = useState<DashboardUrgency>({
    prazosAtrasados: 0,
    prazosHoje: 0,
    tarefasAbertas: 0,
  });

  useEffect(() => {
    dashboardApi
      .get()
      .then((response) => {
        setData({
          prazosAtrasados: response.prazosAtrasados ?? 0,
          prazosHoje: response.prazosHoje ?? 0,
          tarefasAbertas: response.tarefasAbertas ?? 0,
        });
      })
      .catch(() =>
        setData({
          prazosAtrasados: 0,
          prazosHoje: 0,
          tarefasAbertas: 0,
        }),
      );
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-fade-in" style={{ animationDelay: "320ms" }}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-foreground">Painel de urgencia</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = data[card.key];

          return (
            <div key={card.key} className={`rounded-xl border p-4 ${card.cls}`}>
              <div className="mb-3 flex items-center justify-between">
                <Icon className="h-4 w-4" />
                <span className="text-2xl font-semibold">{value}</span>
              </div>
              <p className="text-sm font-medium">{card.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
