import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const processes = [
  { id: "0012345-67.2024.8.19.0001", client: "Maria Oliveira", type: "Trabalhista", status: "Em andamento", date: "21/03/2026" },
  { id: "0098765-43.2024.8.19.0002", client: "João Santos", type: "Cível", status: "Aguardando", date: "20/03/2026" },
  { id: "0054321-89.2024.8.19.0003", client: "Ana Costa", type: "Família", status: "Concluído", date: "19/03/2026" },
  { id: "0011223-44.2024.8.19.0004", client: "Pedro Lima", type: "Tributário", status: "Em andamento", date: "18/03/2026" },
  { id: "0077889-55.2024.8.19.0005", client: "Carla Souza", type: "Penal", status: "Urgente", date: "18/03/2026" },
];

const statusStyles: Record<string, string> = {
  "Em andamento": "bg-chart-blue/15 text-chart-blue border-chart-blue/20",
  "Aguardando": "bg-chart-amber/15 text-chart-amber border-chart-amber/20",
  "Concluído": "bg-primary/15 text-primary border-primary/20",
  "Urgente": "bg-destructive/15 text-destructive border-destructive/20",
};

export const RecentProcesses = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-foreground">Processos Recentes</h3>
        <button className="text-sm text-primary hover:underline font-medium">Ver todos</button>
      </div>
      <div className="space-y-3">
        {processes.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {p.client}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.id}</p>
            </div>
            <div className="hidden sm:block text-xs text-muted-foreground mx-4">{p.type}</div>
            <div className="hidden md:block text-xs text-muted-foreground mx-4">{p.date}</div>
            <Badge
              variant="outline"
              className={cn("text-[11px] font-medium shrink-0", statusStyles[p.status])}
            >
              {p.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
