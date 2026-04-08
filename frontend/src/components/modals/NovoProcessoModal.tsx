import { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { processosApi, clientesApi, unidadesApi, usuariosApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { maskProcesso, maskCurrency, parseCurrency } from "@/lib/masks";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  initialClienteId?: string;
}

const tiposProcesso = [
  { value: "CIVEL",          label: "Cível" },
  { value: "TRABALHISTA",    label: "Trabalhista" },
  { value: "CRIMINAL",       label: "Criminal" },
  { value: "FAMILIA",        label: "Família" },
  { value: "TRIBUTARIO",     label: "Tributário" },
  { value: "EMPRESARIAL",    label: "Empresarial" },
  { value: "PREVIDENCIARIO", label: "Previdenciário" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
];

export function NovoProcessoModal({ onClose, onSaved, initialClienteId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [advogados, setAdvogados] = useState<{ id: string; nome: string }[]>([]);

  const [form, setForm] = useState({
    numero: "",
    clienteId: initialClienteId || "",
    tipo: "CIVEL",
    vara: "",
    tribunal: "",
    status: "EM_ANDAMENTO",
    dataDistribuicao: new Date().toISOString().split("T")[0],
    valorCausa: "",
    descricao: "",
    unidadeId: user?.unidadeId ?? "",
  });

  // Lista de advogados selecionados
  const [advogadosSelecionados, setAdvogadosSelecionados] = useState<{ id: string; nome: string }[]>([]);
  const [advogadoSelecionarId, setAdvogadoSelecionarId] = useState("");

  useEffect(() => {
    clientesApi.listar({ size: 1000 }).then(data => {
      const items = data.content ?? data;
      setClientes(Array.isArray(items) ? items : []);
    }).catch(() => {});
    unidadesApi.listar().then(res => {
      const items = res.content ?? res;
      setUnidades(Array.isArray(items) ? items : []);
    }).catch(() => {});
    usuariosApi.listar().then((data: { id: string; nome: string; papel: string }[]) => {
      setAdvogados(data.filter(u => u.papel === "ADVOGADO" || u.papel === "ADMINISTRADOR"));
    }).catch(() => {});
  }, []);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const adicionarAdvogado = () => {
    if (!advogadoSelecionarId) return;
    const adv = advogados.find(a => a.id === advogadoSelecionarId);
    if (!adv) return;
    if (advogadosSelecionados.some(a => a.id === adv.id)) return;
    setAdvogadosSelecionados(prev => [...prev, adv]);
    setAdvogadoSelecionarId("");
  };

  const removerAdvogado = (id: string) => {
    setAdvogadosSelecionados(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero || !form.clienteId) {
      toast.error("Número e Cliente são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      await processosApi.criar({
        ...form,
        advogadoIds: advogadosSelecionados.map(a => a.id),
        valorCausa: form.valorCausa ? parseCurrency(form.valorCausa) : null,
      });
      toast.success("Processo cadastrado com sucesso!");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao cadastrar processo");
    } finally {
      setLoading(false);
    }
  };

  // Advogados disponíveis para seleção (excluindo os já selecionados)
  const advogadosDisponiveis = advogados.filter(a => !advogadosSelecionados.some(s => s.id === a.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Novo Processo</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Número do processo *</Label>
            <Input placeholder="0000000-00.0000.0.00.0000" value={form.numero} onChange={e => set("numero", maskProcesso(e.target.value))} required />
          </div>

          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <select value={form.clienteId} onChange={e => set("clienteId", e.target.value)} required
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              <option value="">Selecione um cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <select value={form.tipo} onChange={e => set("tipo", e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                {tiposProcesso.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Data distribuição</Label>
              <Input type="date" value={form.dataDistribuicao} onChange={e => set("dataDistribuicao", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vara</Label>
              <Input placeholder="" value={form.vara} onChange={e => set("vara", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tribunal</Label>
              <Input placeholder="" value={form.tribunal} onChange={e => set("tribunal", e.target.value)} />
            </div>
          </div>

          {/* ── Advogados Responsáveis ─────────────────────────── */}
          <div className="space-y-2">
            <Label>Advogados Responsáveis <span className="text-muted-foreground text-xs">(opcional)</span></Label>

            {/* Chips dos selecionados */}
            {advogadosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {advogadosSelecionados.map(a => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25"
                  >
                    {a.nome}
                    <button
                      type="button"
                      onClick={() => removerAdvogado(a.id)}
                      className="hover:text-destructive transition-colors ml-0.5"
                      aria-label={`Remover ${a.nome}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Seletor + botão adicionar */}
            {advogadosDisponiveis.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={advogadoSelecionarId}
                  onChange={e => setAdvogadoSelecionarId(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                >
                  <option value="">— Selecionar advogado —</option>
                  {advogadosDisponiveis.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={adicionarAdvogado}
                  disabled={!advogadoSelecionarId}
                  className="h-10 w-10 shrink-0"
                  aria-label="Adicionar advogado"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {advogadosDisponiveis.length === 0 && advogadosSelecionados.length > 0 && (
              <p className="text-xs text-muted-foreground">Todos os advogados foram adicionados.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Valor da causa</Label>
            <Input type="text" placeholder="R$ 0,00" value={form.valorCausa} onChange={e => set("valorCausa", maskCurrency(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <textarea className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none" rows={3}
              placeholder="Resumo do processo..." value={form.descricao} onChange={e => set("descricao", e.target.value)} />
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
            {loading ? "Salvando..." : "Cadastrar Processo"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
