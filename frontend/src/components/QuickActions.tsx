import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { NovoClienteModal } from "./modals/NovoClienteModal";
import { NovoProcessoModal } from "./modals/NovoProcessoModal";

export const QuickActions = () => {
  const [modalCliente, setModalCliente] = useState(false);
  const [modalProcesso, setModalProcesso] = useState(false);

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalProcesso(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">Novo Processo</span>
          </button>
          
          <button
            onClick={() => setModalCliente(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-chart-blue/15 text-chart-blue group-hover:scale-105 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">Novo Cliente</span>
          </button>
        </div>
      </div>

      {modalCliente && <NovoClienteModal onClose={() => setModalCliente(false)} onSaved={() => window.location.reload()} />}
      {modalProcesso && <NovoProcessoModal onClose={() => setModalProcesso(false)} onSaved={() => window.location.reload()} />}
    </>
  );
};
