import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { prazosApi } from "@/services/api";
import { toast } from "sonner";
import type { Prazo } from "@/types";

const tiposOpcoes = [
  { value: "prazo_processual", label: "Prazo Processual" },
  { value: "audiencia",        label: "Audiência" },
  { value: "tarefa_interna",   label: "Tarefa Interna" },
  { value: "reuniao",          label: "Reunião" },
];

const prioridadesOpcoes = [
  { value: "alta",  label: "Alta",  cls: "border-red-500/50 text-red-400 bg-red-500/5" },
  { value: "media", label: "Média", cls: "border-yellow-500/50 text-yellow-400 bg-yellow-500/5" },
  { value: "baixa", label: "Baixa", cls: "border-primary/50 text-primary bg-primary/5" },
];

interface Props {
  prazo: Prazo;
  onClose: () => void;
  onSaved: () => void;
}

export function EditarPrazoModal({ prazo, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: prazo.titulo,
    data: prazo.data,
    hora: prazo.hora ?? "",
    tipo: prazo.tipo,
    prioridade: prazo.prioridade,
    etapa: prazo.etapa ?? (prazo.concluido ? "concluido" : "a_fazer"),
    descricao: prazo.descricao ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo || !form.data) {
      toast.error("Título e data são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      await prazosApi.atualizar(prazo.id, {
        titulo: form.titulo,
        data: form.data,
        hora: form.hora || null,
        tipo: form.tipo.toUpperCase(),
        prioridade: form.prioridade.toUpperCase(),
        etapa: form.tipo === "tarefa_interna" ? form.etapa.toUpperCase() : null,
        descricao: form.descricao || null,
      });
      toast.success("Prazo atualizado com sucesso!");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao atualizar prazo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Editar Prazo / Tarefa</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => set("titulo", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={e => set("data", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={form.hora} onChange={e => set("hora", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select value={form.tipo} onChange={e => set("tipo", e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              {tiposOpcoes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {prioridadesOpcoes.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("prioridade", p.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    form.prioridade === p.value ? p.cls : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {form.tipo === "tarefa_interna" && (
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <select
                value={form.etapa}
                onChange={e => set("etapa", e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
              >
                <option value="a_fazer">A Fazer</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluido</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <textarea
              className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none"
              rows={3} value={form.descricao}
              onChange={e => set("descricao", e.target.value)}
              placeholder="Observações adicionais..." />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
