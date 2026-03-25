import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { clientesApi, unidadesApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { maskCPF, maskCNPJ, maskPhone } from "@/lib/masks";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: Record<string, unknown>;
}

export function NovoClienteModal({ onClose, onSaved, initialData }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);

  const [form, setForm] = useState({
    nome: (initialData?.nome as string) || "",
    tipo: (initialData?.tipo as string) || "PESSOA_FISICA",
    cpfCnpj: (initialData?.cpfCnpj as string) || "",
    email: (initialData?.email as string) || "",
    telefone: (initialData?.telefone as string) || "",
    cidade: (initialData?.cidade as string) || "",
    estado: (initialData?.estado as string) || "BA",
    advogadoId: (initialData?.advogadoId as string) || user?.id || "",
    unidadeId: (initialData?.unidadeId as string) || user?.unidadeId || "",
  });

  useEffect(() => {
    unidadesApi.listar().then(res => {
      const items = res.content ?? res;
      setUnidades(Array.isArray(items) ? items : []);
    }).catch(() => {});
  }, []);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.cpfCnpj) {
      toast.error("Nome e CPF/CNPJ são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      if (initialData?.id) {
  await clientesApi.atualizar(initialData.id as string, form);
  toast.success("Cliente atualizado com sucesso!");
} else {
        await clientesApi.criar(form);
        toast.success("Cliente cadastrado com sucesso!");
      }
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      const msg = axiosErr.response?.data?.mensagem;
      toast.error(typeof msg === "string" ? msg : "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  };

  const estados = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {initialData ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input placeholder="" value={form.nome} onChange={e => set("nome", e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {[["PESSOA_FISICA", "Pessoa Física"], ["PESSOA_JURIDICA", "Pessoa Jurídica"]].map(([val, label]) => (
                <button key={val} type="button" onClick={() => set("tipo", val)}
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm border transition-all",
                    form.tipo === val ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}>{label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{form.tipo === "PESSOA_FISICA" ? "CPF" : "CNPJ"} *</Label>
            <Input 
              placeholder={form.tipo === "PESSOA_FISICA" ? "000.000.000-00" : "00.000.000/0000-00"} 
              value={form.cpfCnpj} 
              onChange={e => {
                const val = form.tipo === "PESSOA_FISICA" ? maskCPF(e.target.value) : maskCNPJ(e.target.value);
                set("cpfCnpj", val);
              }} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" placeholder="" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="" value={form.telefone} onChange={e => set("telefone", maskPhone(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input placeholder="" value={form.cidade} onChange={e => set("cidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <select value={form.estado} onChange={e => set("estado", e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <select value={form.unidadeId} onChange={e => set("unidadeId", e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar Cliente"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
