import { useState, useEffect, useCallback, useDeferredValue } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Scale,
  X,
  LayoutGrid,
  List,
  ChevronRight,
  Building2,
  User,
  MapPin,
  Trash2,
  AlertTriangle,
} from "lucide-react";
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
  advogadoId?: string | null;
  advogadoResponsavel: string;
  unidadeId: string;
  unidadeNome: string;
  ativo: boolean;
  isFalecido: boolean;
  detalhesObito?: string;
  processos?: number;
}

interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const PAGE_SIZE = 40;

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ClienteDrawer({
  cliente,
  onClose,
  onDesativado,
}: {
  cliente: ClienteData;
  onClose: () => void;
  onDesativado: () => void;
}) {
  const [desativando, setDesativando] = useState(false);

  const handleDesativar = async () => {
    if (!confirm(`Deseja realmente desativar o cliente "${cliente.nome}"? Esta ação pode ser revertida somente pelo administrador.`)) {
      return;
    }

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

  const infoRows = [
    { label: "CPF / CNPJ", value: cliente.cpfCnpj || "—" },
    { label: "E-mail", value: cliente.email || "—" },
    { label: "Telefone", value: cliente.telefone || "—" },
    { label: "Cidade / UF", value: `${cliente.cidade || "—"} — ${cliente.estado || "—"}` },
    { label: "Cadastro", value: cliente.dataCadastro ? new Date(cliente.dataCadastro).toLocaleDateString("pt-BR") : "—" },
    { label: "Unidade", value: cliente.unidadeNome || "—" },
    { label: "Status", value: cliente.isFalecido ? "Falecido" : "Ativo" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(cliente.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{cliente.nome}</p>
                {cliente.isFalecido && (
                  <Badge className="border-amber-300/70 bg-amber-100 text-amber-900 hover:bg-amber-100">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Falecido
                  </Badge>
                )}
              </div>
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
          <div className="space-y-4 p-6">
            <h3 className="font-heading text-base font-semibold text-foreground">Informações</h3>
            <div className="space-y-2.5">
              {infoRows.map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between border-b border-border/50 py-2 last:border-0">
                  <span className="min-w-[140px] text-xs text-muted-foreground">{label}</span>
                  <span className="text-right text-sm text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {cliente.isFalecido && cliente.detalhesObito && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Óbito</p>
                <p className="mt-2 text-sm text-amber-950">{cliente.detalhesObito}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button
            className="flex-1"
            onClick={() => window.dispatchEvent(new CustomEvent("open_editar_cliente", { detail: cliente }))}
          >
            Editar Cliente
          </Button>
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent("open_novo_processo", { detail: cliente.id }))}
          >
            Novo Processo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500/70 hover:bg-red-500/10 hover:text-red-600"
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

export const ClientesView = () => {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("grid");
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteData | null>(null);
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalProcessoAberto, setModalProcessoAberto] = useState(false);
  const [processoClienteId, setProcessoClienteId] = useState<string>("");
  const [clienteEditando, setClienteEditando] = useState<ClienteData | null>(null);
  const [resultado, setResultado] = useState<PageResponse<ClienteData>>({
    content: [],
    number: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });
  const { unidadeSelecionada } = useUnidade();
  const buscaDeferred = useDeferredValue(busca);

  useEffect(() => {
    const handlerNovoProcesso = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setProcessoClienteId(customEvent.detail);
      setModalProcessoAberto(true);
    };

    const handlerEdicao = (e: Event) => {
      setClienteEditando((e as CustomEvent<ClienteData>).detail);
      setModalAberto(true);
    };

    window.addEventListener("open_novo_processo", handlerNovoProcesso);
    window.addEventListener("open_editar_cliente", handlerEdicao);

    return () => {
      window.removeEventListener("open_novo_processo", handlerNovoProcesso);
      window.removeEventListener("open_editar_cliente", handlerEdicao);
    };
  }, []);

  const carregarClientes = useCallback(() => {
    setLoading(true);

    const buscaNorm = buscaDeferred.trim();
    const params: { unidadeId?: string; busca?: string; page: number; size: number } = {
      page,
      size: PAGE_SIZE,
    };
    if (unidadeSelecionada && unidadeSelecionada !== "todas") params.unidadeId = unidadeSelecionada;
    if (buscaNorm) params.busca = buscaNorm;

    clientesApi.listar(params)
      .then((data: PageResponse<ClienteData> | ClienteData[]) => {
        const items = Array.isArray(data) ? data : data.content ?? [];
        const content = Array.isArray(items) ? items : [];
        setClientes(content);
        setResultado({
          content,
          number: Array.isArray(data) ? page : data.number ?? page,
          size: Array.isArray(data) ? PAGE_SIZE : data.size ?? PAGE_SIZE,
          totalElements: Array.isArray(data) ? content.length : data.totalElements ?? content.length,
          totalPages: Array.isArray(data) ? (content.length > 0 ? 1 : 0) : data.totalPages ?? 0,
          first: Array.isArray(data) ? page === 0 : data.first ?? page === 0,
          last: Array.isArray(data) ? true : data.last ?? true,
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar clientes:", err);
        toast.error("Erro ao carregar clientes");
        setClientes([]);
        setResultado({
          content: [],
          number: 0,
          size: PAGE_SIZE,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        });
      })
      .finally(() => setLoading(false));
  }, [buscaDeferred, page, unidadeSelecionada]);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  useEffect(() => {
    setPage(0);
  }, [buscaDeferred, unidadeSelecionada]);

  const clientesFiltrados = clientes;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
            className="border-none bg-secondary pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          <button
            onClick={() => setModo("grid")}
            className={cn(
              "rounded-md p-1.5 transition-all",
              modo === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setModo("lista")}
            className={cn(
              "rounded-md p-1.5 transition-all",
              modo === "lista" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Button className="ml-auto gap-2" onClick={() => { setClienteEditando(null); setModalAberto(true); }}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : modo === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => setClienteSelecionado(cliente)}
              className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(cliente.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                      {cliente.nome}
                    </p>
                    {cliente.tipo === "PESSOA_JURIDICA" ? (
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">{cliente.cpfCnpj || "Sem documento"}</p>
                    {cliente.isFalecido && (
                      <Badge className="border-amber-300/70 bg-amber-100 text-amber-900 hover:bg-amber-100">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Falecido
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="outline" className="border-border bg-accent text-xs text-foreground">
                    <Scale className="mr-1 h-3 w-3" />
                    {cliente.processos ?? 0}
                  </Badge>
                  {cliente.isFalecido && (
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" title="Cliente marcado como falecido" />
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cliente.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{cliente.telefone || "—"}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  {cliente.unidadeNome || "—"}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground">Cliente</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground md:table-cell">CPF / CNPJ</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground lg:table-cell">Contato</th>
                <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground">Processos</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((cliente) => (
                <tr
                  key={cliente.id}
                  onClick={() => setClienteSelecionado(cliente)}
                  className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30 last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-primary/15">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(cliente.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground transition-colors group-hover:text-primary">{cliente.nome}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {cliente.tipo === "PESSOA_FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}
                          </p>
                          {cliente.isFalecido && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                              <AlertTriangle className="h-3 w-3" />
                              Falecido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 font-mono text-xs text-muted-foreground md:table-cell">
                    {cliente.cpfCnpj || "—"}
                  </td>
                  <td className="hidden px-5 py-3.5 lg:table-cell">
                    <p className="text-sm text-foreground">{cliente.telefone || "—"}</p>
                    <p className="text-xs text-muted-foreground">{cliente.email || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-foreground">
                      <Scale className="h-3 w-3" />
                      {cliente.processos ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {resultado.totalElements} clientes
        </p>

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Pagina {resultado.totalPages === 0 ? 0 : resultado.number + 1} de {resultado.totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={resultado.first || loading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={resultado.last || loading || resultado.totalPages === 0}
            onClick={() => setPage((current) => current + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>

      {clienteSelecionado && (
        <ClienteDrawer
          cliente={clienteSelecionado}
          onClose={() => setClienteSelecionado(null)}
          onDesativado={carregarClientes}
        />
      )}

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
