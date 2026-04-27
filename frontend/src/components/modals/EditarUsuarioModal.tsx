import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { maskCPF } from "@/lib/masks";
import { unidadesApi, usuariosApi } from "@/services/api";
import type { UserRole } from "@/types";
import { toast } from "sonner";

interface Props {
  usuarioId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const papeis = [
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
    cpf: "",
    habilitadoDomicilio: false,
    unidadeId: "",
  });

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [usuario, unidadesData] = await Promise.all([usuariosApi.buscar(usuarioId), unidadesApi.listar()]);
        const items = (unidadesData as { content?: { id: string; nome: string }[] }).content ?? unidadesData;
        setUnidades(Array.isArray(items) ? items : []);
        setForm({
          nome: usuario.nome || "",
          email: usuario.email || "",
          papel: usuario.papel || "ADVOGADO",
          cargo: usuario.cargo || "",
          oab: usuario.oab || "",
          cpf: usuario.cpf ? maskCPF(usuario.cpf) : "",
          habilitadoDomicilio: Boolean(usuario.habilitadoDomicilio),
          unidadeId: usuario.unidadeId || "",
        });
      } catch {
        toast.error("Erro ao carregar dados do usuario.");
        onClose();
      } finally {
        setFetching(false);
      }
    };

    void carregarDados();
  }, [onClose, usuarioId]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.nome || !form.email || !form.unidadeId) {
      toast.error("Nome, e-mail e unidade sao obrigatorios.");
      return;
    }

    if (form.habilitadoDomicilio && form.cpf.replace(/\D/g, "").length !== 11) {
      toast.error("Informe um CPF válido para habilitar o usuário no Domicílio.");
      return;
    }

    setLoading(true);
    try {
      await usuariosApi.atualizar(usuarioId, form);
      toast.success("Usuario atualizado com sucesso.");
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao atualizar usuario.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-heading text-lg font-semibold text-foreground">Editar Usuario</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Papel *</Label>
            <div className="flex gap-2">
              {papeis.map((papel) => (
                <button
                  key={papel.value}
                  type="button"
                  onClick={() => set("papel", papel.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    form.papel === papel.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {papel.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>OAB</Label>
              <Input value={form.oab} onChange={(e) => set("oab", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => set("cpf", maskCPF(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Operacao Domicilio</Label>
              <div className="flex h-10 items-center justify-between rounded-md bg-secondary px-3">
                <span className="text-sm text-foreground">Habilitado</span>
                <Switch
                  checked={form.habilitadoDomicilio}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, habilitadoDomicilio: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Esse marcador apenas indica aptidao operacional. A escolha do operador institucional sera feita na etapa seguinte.
          </p>

          <div className="space-y-1.5">
            <Label>Unidade *</Label>
            <select
              value={form.unidadeId}
              onChange={(e) => set("unidadeId", e.target.value)}
              required
              className="h-10 w-full rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
            >
              <option value="">Selecione a unidade</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
