import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Prazo } from "@/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const prioridadeCor: Record<string, string> = {
  alta: "bg-red-400",
  media: "bg-yellow-400",
  baixa: "bg-primary",
};

interface Props {
  prazos: Prazo[];
  onClickDia: (data: string) => void;
  onAdicionar: () => void;
}

export const CalendarioPrazos = ({ prazos, onClickDia, onAdicionar }: Props) => {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const mesAnterior = () => { if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1); };
  const proximoMes  = () => { if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1); };

  // índice de prazos por data no mês atual
  const prazosPorDia: Record<number, Prazo[]> = {};
  prazos.forEach(p => {
    const d = new Date(p.data + "T00:00:00");
    if (d.getMonth() === mes && d.getFullYear() === ano) {
      const dia = d.getDate();
      if (!prazosPorDia[dia]) prazosPorDia[dia] = [];
      prazosPorDia[dia].push(p);
    }
  });

  const formatarData = (dia: number) =>
    `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const células: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {MESES[mes]} {ano}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={mesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={proximoMes}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gap-1.5 h-8 ml-1" onClick={onAdicionar}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-0.5">
        {células.map((dia, i) => {
          if (!dia) return <div key={`vazio-${i}`} />;
          const ehHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          const prazosDoDia = prazosPorDia[dia] ?? [];
          return (
            <button
              key={dia}
              onClick={() => onClickDia(formatarData(dia))}
              className={cn(
                "relative flex flex-col items-center rounded-lg py-1.5 px-1 transition-all hover:bg-accent/60 group",
                ehHoje && "bg-primary/15 ring-1 ring-primary/40"
              )}
            >
              <span className={cn(
                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
                ehHoje ? "text-primary font-bold" : "text-foreground",
                "group-hover:bg-primary group-hover:text-primary-foreground"
              )}>
                {dia}
              </span>
              {/* Marcadores de prazo */}
              {prazosDoDia.length > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center">
                  {prazosDoDia.slice(0, 3).map(p => (
                    <span
                      key={p.id}
                      className={cn("w-1.5 h-1.5 rounded-full", prioridadeCor[p.prioridade])}
                      title={p.titulo}
                    />
                  ))}
                  {prazosDoDia.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{prazosDoDia.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        {[["Alta prioridade", "bg-red-400"], ["Média", "bg-yellow-400"], ["Baixa", "bg-primary"]].map(([label, cor]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", cor)} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
