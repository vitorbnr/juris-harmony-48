import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, Mail, Phone, Scale, X, LayoutGrid, List, ChevronRight, Building2, User, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clientesApi } from "@/services/api";
import { useUnidade } from "@/context/UnidadeContext";
import { toast } from "sonner";
import { NovoClienteModal } from "@/components/modals/NovoClienteModal";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
interface ClienteData {
  id: string;
  nome: string;
  tipo: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  dataCadastro: string;
  advogadoResponsavel: string; // Vem do backend
  unidadeId: string;
  unidadeNome: string;
  ativo: boolean;
  processos?: number; // Vem do backend
}

function getInitials(nome: string) {
  return nome.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Drawer de Detalhes ───────────────────────────────────────────────────────

function ClienteDrawer({ cliente, onClose, onDesativado }: { cliente: ClienteData; onClose: () => void; onDesativado: () => void }) {
  const [desativando, setDesativando] = useState(false);

  const handleDesativar = async () => {
    if (!confirm(`Deseja realmente desativar o cliente "${cliente.nome}"? Esta ação pode ser revertida somente pelo administrador.`)) return;
    setDesativando(true);
    try {
      await clientesApi.desativar(cliente.id);
      toast.success(`Cliente "${cliente.nome}" desativado com sucesso.`);
      onDesativado();
      onClose();
    } catch {
      toast.error("Erro ao desativar cliente.");
    } finally {
      setDesativando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(cliente.nome)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{cliente.nome}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {cliente.tipo === "PESSOA_FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Informações</h3>
            <div className="space-y-2.5">
              {[
                { label: "CPF / CNPJ", value: cliente.cpfCnpj },
                { label: "E-mail", value: cliente.email },
                { label: "Telefone", value: cliente.telefone },
                { label: "Cidade / UF", value: `${cliente.cidade} — ${cliente.estado}` },
                { label: "Cadastro", value: new Date(cliente.dataCadastro).toLocaleDateString("pt-BR") },
                { label: "Advogado Responsável", value: cliente.advogadoResponsavel || "—" },
                { label: "Unidade", value: cliente.unidadeNome || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground min-w-[140px]">{label}</span>
                  <span className="text-sm text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent("open_editar_cliente", { detail: cliente }))}>Editar Cliente</Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("open_novo_processo", { detail: cliente.id }))}>Novo Processo</Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500/70 hover:text-red-600 hover:bg-red-500/10"
            onClick={handleDesativar}
            disabled={desativando}
            title="Desativar cliente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const ClientesView = () => {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("grid");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteData | null>(null);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [processoClienteId, setProcessoClienteId] = useState<string>("");
  const [clienteEditando, setClienteEditando] = useState<ClienteData | null>(null);
  const { unidadeSelecionada } = useUnidade();

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setProcessoClienteId(customEvent.detail);
      setModalProcessoAberto(true);
    };
    const handlerEdicao = (e: Event) => {
      setClienteEditando((e as CustomEvent<ClienteData>).detail);
      setModalAberto(true);
    };
    window.addEventListener("open_novo_processo", handler);
    window.addEventListener("open_editar_cliente", handlerEdicao);
    return () => {
      window.removeEventListener("open_novo_processo", handler);
      window.removeEventListener("open_editar_cliente", handlerEdicao);
    };
  }, []);

  const carregarClientes = useCallback(() => {
    setLoading(true);

    const buscaNorm = busca.trim();
    const params: { unidadeId?: string; busca?: string } = {};
    if (unidadeSelecionada && unidadeSelecionada !== "todas") params.unidadeId = unidadeSelecionada;
    if (buscaNorm) params.busca = buscaNorm;

    clientesApi.listar(Object.keys(params).length ? params : undefined)
      .then((data) => {
        const items = data.content ?? data;
        setClientes(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error("Erro ao carregar clientes:", err);
        toast.error("Erro ao carregar clientes");
        setClientes([]);
      })
      .finally(() => setLoading(false));
  }, [busca, unidadeSelecionada]);

  useEffect(() => { carregarClientes(); }, [carregarClientes]);

  // Sem double-filter: a lista já vem filtrada do servidor
  const clientesFiltrados = clientes;


  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Topo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
            className="pl-9 bg-secondary border-none"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setModo("grid")}
            className={cn("p-1.5 rounded-md transition-all", modo === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setModo("lista")}
            className={cn("p-1.5 rounded-md transition-all", modo === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Botão Novo Cliente com ref resetada */}
        <Button className="gap-2 ml-auto" onClick={() => { setClienteEditando(null); setModalAberto(true); }}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : modo === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map(c => (
            <div
              key={c.id}
              onClick={() => setClienteSelecionado(c)}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{getInitials(c.nome)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.nome}</p>
                    {c.tipo === "PESSOA_JURIDICA"
                      ? <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.cpfCnpj}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs bg-accent text-foreground border-border">
                  <Scale className="h-3 w-3 mr-1" />{c.processos ?? 0}
                </Badge>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.telefone || "—"}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.advogadoResponsavel || "—"}</span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />{c.unidadeNome || "—"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Lista / Tabela */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden md:table-cell">CPF / CNPJ</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden lg:table-cell">Contato</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden lg:table-cell">Responsável</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Processos</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setClienteSelecionado(c)}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-primary/15">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{getInitials(c.nome)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.tipo === "PESSOA_FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{c.cpfCnpj}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <p className="text-sm text-foreground">{c.telefone || "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.email || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{c.advogadoResponsavel || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-foreground px-2 py-1 rounded-full">
                      <Scale className="h-3 w-3" />{c.processos ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {clientesFiltrados.length} clientes
      </p>

      {clienteSelecionado && (
        <ClienteDrawer cliente={clienteSelecionado} onClose={() => setClienteSelecionado(null)} onDesativado={carregarClientes} />
      )}

      {/* Modais */}
      {modalAberto && (
        <NovoClienteModal 
          onClose={() => setModalAberto(false)} 
          onSaved={carregarClientes} 
          initialData={clienteEditando as unknown as Record<string, unknown> || undefined} 
        />
      )}
      {modalProcessoAberto && (
        <NovoProcessoModal 
          onClose={() => setModalProcessoAberto(false)} 
          onSaved={() => toast.success("Processo criado e vinculado!")} 
          initialClienteId={processoClienteId}
        />
      )}
    </div>
  );
};
