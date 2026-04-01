import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usuariosApi, unidadesApi } from "@/services/api";
import { toast } from "sonner";
import type { UserRole } from "@/types";

interface Props {
  usuarioId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const papeisOptions = [
  { value: "ADMINISTRADOR", label: "Administrador" },
  { value: "ADVOGADO", label: "Advogado" },
  { value: "SECRETARIA", label: "Secretaria" },
];

export function EditarUsuarioModal({ usuarioId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    papel: "ADVOGADO" as UserRole,
    cargo: "",
    oab: "",
    unidadeId: "",
  });

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [userData, unitsData] = await Promise.all([
          usuariosApi.buscar(usuarioId),
          unidadesApi.listar()
        ]);
        setUnidades(unitsData);
        setForm({
          nome: userData.nome || "",
          email: userData.email || "",
          papel: userData.papel || "ADVOGADO",
          cargo: userData.cargo || "",
          oab: userData.oab || "",
          unidadeId: userData.unidadeId || "",
        });
      } catch (err) {
        toast.error("Erro ao carregar dados do usuário");
        onClose();
      } finally {
        setFetching(false);
      }
    };
    carregarDados();
  }, [usuarioId, onClose]);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.unidadeId) {
      toast.error("Nome, email e unidade são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      await usuariosApi.atualizar(usuarioId, form);
      toast.success("Usuário atualizado com sucesso!");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Editar Usuário</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Papel (Permissões) *</Label>
            <div className="flex gap-2">
              {papeisOptions.map(p => (
                <button
                  key={p.value} type="button" onClick={() => set("papel", p.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.papel === p.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input placeholder="Ex: Advogado Sênior" value={form.cargo} onChange={e => set("cargo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>OAB</Label>
              <Input placeholder="Opcional" value={form.oab} onChange={e => set("oab", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Unidade *</Label>
            <select value={form.unidadeId} onChange={e => set("unidadeId", e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              <option value="">Selecione a unidade</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
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
