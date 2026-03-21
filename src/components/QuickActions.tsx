import { Plus, UserPlus, FileText, Calculator } from "lucide-react";

const actions = [
  { icon: Plus, label: "Novo Processo", color: "bg-primary text-primary-foreground" },
  { icon: UserPlus, label: "Novo Cliente", color: "bg-chart-blue/15 text-chart-blue" },
  { icon: FileText, label: "Nova Petição", color: "bg-chart-amber/15 text-chart-amber" },
  { icon: Calculator, label: "Calc. Prazos", color: "bg-accent text-foreground" },
];

export const QuickActions = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
      <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <button
            key={i}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.color} group-hover:scale-105 transition-transform`}>
              <a.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
