import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, FileText, Loader2, Plus, Search, Upload, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { cn } from "@/lib/utils";
import { atendimentosApi, clientesApi, documentosApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type { Cliente } from "@/types";
import type { DatajudCapaResponse } from "@/services/api";

import { NovoClienteModal } from "./modals/NovoClienteModal";
import { NovoProcessoModal } from "./modals/NovoProcessoModal";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

type ClientesApiResponse = Cliente[] | { content?: Cliente[] };

interface ClienteComboboxProps {
  clientes: Cliente[];
  value: string;
  open: boolean;
  disabled?: boolean;
  placeholder?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (clienteId: string) => void;
}

function resolveClientes(data: ClientesApiResponse): Cliente[] {
  if (Array.isArray(data)) return data;
  return Array.isArray(data.content) ? data.content : [];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ClienteCombobox({
  clientes,
  value,
  open,
  disabled = false,
  placeholder = "Selecionar cliente",
  onOpenChange,
  onChange,
}: ClienteComboboxProps) {
  const clienteSelecionado = clientes.find((cliente) => cliente.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => !disabled && onOpenChange(nextOpen)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn("truncate", !clienteSelecionado && "text-muted-foreground")}>
            {clienteSelecionado ? clienteSelecionado.nome : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clientes.map((cliente) => (
                <CommandItem
                  key={cliente.id}
                  value={`${cliente.nome} ${cliente.cpfCnpj ?? ""}`}
                  onSelect={() => {
                    onChange(cliente.id);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cliente.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">{cliente.cpfCnpj}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const QuickActions = () => {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();

  const [modalCliente, setModalCliente] = useState(false);
  const [modalProcesso, setModalProcesso] = useState(false);
  const [modalNpu, setModalNpu] = useState(false);
  const [modalNotaRapida, setModalNotaRapida] = useState(false);
  const [modalDocumento, setModalDocumento] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [npu, setNpu] = useState("");
  const [buscandoNpu, setBuscandoNpu] = useState(false);
  const [npuResultado, setNpuResultado] = useState<DatajudCapaResponse | null>(null);
  const [npuErro, setNpuErro] = useState<string | null>(null);

  const [notaClienteId, setNotaClienteId] = useState("");
  const [notaClienteOpen, setNotaClienteOpen] = useState(false);
  const [notaConteudo, setNotaConteudo] = useState("");
  const [savingNota, setSavingNota] = useState(false);

  const [documentoClienteId, setDocumentoClienteId] = useState("");
  const [documentoClienteOpen, setDocumentoClienteOpen] = useState(false);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [draggingDocumento, setDraggingDocumento] = useState(false);
  const [uploadingDocumento, setUploadingDocumento] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;

    let ativo = true;
    const unidadeId = unidadeSelecionada !== "todas" ? unidadeSelecionada : user.unidadeId;

    setLoadingClientes(true);
    clientesApi
      .listar({ unidadeId, size: 1000 })
      .then((data) => {
        if (!ativo) return;
        const itens = resolveClientes(data as ClientesApiResponse).sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
        );
        setClientes(itens);
      })
      .catch(() => {
        if (!ativo) return;
        setClientes([]);
        toast.error("Nao foi possivel carregar os clientes para as acoes rapidas.");
      })
      .finally(() => {
        if (ativo) {
          setLoadingClientes(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [unidadeSelecionada, user?.id, user?.unidadeId]);

  const clientesDisponiveis = useMemo(() => clientes, [clientes]);

  const resetNotaRapida = () => {
    setNotaClienteId("");
    setNotaClienteOpen(false);
    setNotaConteudo("");
    setSavingNota(false);
  };

  const resetDocumento = () => {
    setDocumentoClienteId("");
    setDocumentoClienteOpen(false);
    setDocumentoFile(null);
    setDraggingDocumento(false);
    setUploadingDocumento(false);
  };

  const selecionarDocumento = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const arquivo = Array.from(files)[0];
    if (arquivo.size > MAX_UPLOAD_BYTES) {
      toast.error("O arquivo excede o limite rapido de 100 MB.");
      return;
    }

    setDocumentoFile(arquivo);
  };

  const handleBuscarNpu = () => {
    const valor = npu.replace(/\D/g, "");
    if (!valor) {
      toast.error("Informe um NPU para consulta.");
      return;
    }

    if (valor.length !== 20) {
      setNpuResultado(null);
      setNpuErro("O NPU precisa ter 20 digitos para consulta.");
      return;
    }

    setBuscandoNpu(true);
    setNpuErro(null);
    setNpuResultado(null);

    processosApi
      .consultarCapaDatajud(valor)
      .then((resultado) => {
        setNpuResultado(resultado);
      })
      .catch((error: unknown) => {
        const axiosErr = error as { response?: { status?: number; data?: { mensagem?: string } } };
        setNpuErro(
          axiosErr.response?.data?.mensagem ??
            (axiosErr.response?.status === 404
              ? "Nenhum processo encontrado para esse NPU no Datajud."
              : "Nao foi possivel consultar esse NPU agora."),
        );
      })
      .finally(() => {
        setBuscandoNpu(false);
      });
  };

  const handleSalvarNotaRapida = async () => {
    if (!user?.id) {
      toast.error("Sessao invalida. Entre novamente.");
      return;
    }

    if (!notaClienteId) {
      toast.error("Selecione o cliente da nota rapida.");
      return;
    }

    if (!notaConteudo.trim()) {
      toast.error("Descreva a anotacao da ligacao.");
      return;
    }

    setSavingNota(true);
    try {
      await atendimentosApi.criar({
        clienteId: notaClienteId,
        usuarioId: user.id,
        unidadeId: unidadeSelecionada !== "todas" ? unidadeSelecionada : user.unidadeId,
        processoId: null,
        tipoVinculo: null,
        vinculoReferenciaId: null,
        assunto: "Nota Rápida",
        descricao: notaConteudo.trim(),
        etiquetas: ["Nota Rápida"],
      });

      toast.success("Nota rapida registada.");
      setModalNotaRapida(false);
      resetNotaRapida();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem ?? "Erro ao guardar a nota rapida.");
    } finally {
      setSavingNota(false);
    }
  };

  const handleUploadDocumento = async () => {
    if (!documentoClienteId) {
      toast.error("Selecione o cliente para vincular o documento.");
      return;
    }

    if (!documentoFile) {
      toast.error("Selecione um arquivo para upload rapido.");
      return;
    }

    setUploadingDocumento(true);
    try {
      const formData = new FormData();
      formData.append("file", documentoFile);
      formData.append("categoria", "OUTROS");
      formData.append("clienteId", documentoClienteId);

      await documentosApi.upload(formData);
      toast.success("Documento vinculado com sucesso.");
      setModalDocumento(false);
      resetDocumento();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem ?? "Erro ao vincular o documento.");
    } finally {
      setUploadingDocumento(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6 opacity-0 animate-fade-in" style={{ animationDelay: "500ms" }}>
        <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">Acoes Rapidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalProcesso(true)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-all group hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-center text-xs font-medium text-foreground">Novo Processo</span>
          </button>

          <button
            onClick={() => setModalCliente(true)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-all group hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-blue/15 text-chart-blue transition-transform group-hover:scale-105">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="text-center text-xs font-medium text-foreground">Novo Cliente</span>
          </button>

          <button
            onClick={() => setModalNpu(true)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-all group hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-center text-xs font-medium text-foreground">Consultar NPU</span>
          </button>

          <button
            onClick={() => setModalNotaRapida(true)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-all group hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 transition-transform group-hover:scale-105">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-center text-xs font-medium text-foreground">Nota Rapida</span>
          </button>

          <button
            onClick={() => setModalDocumento(true)}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-all group hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 transition-transform group-hover:scale-105">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-center text-xs font-medium text-foreground">Vincular Documento</span>
          </button>
        </div>
      </div>

      {modalCliente && <NovoClienteModal onClose={() => setModalCliente(false)} onSaved={() => window.location.reload()} />}
      {modalProcesso && <NovoProcessoModal onClose={() => setModalProcesso(false)} onSaved={() => window.location.reload()} />}

      <Dialog
        open={modalNpu}
        onOpenChange={(open) => {
          setModalNpu(open);
          if (!open) {
            setNpu("");
            setNpuErro(null);
            setNpuResultado(null);
            setBuscandoNpu(false);
          }
        }}
      >
        <DialogContent className="!flex max-h-[88vh] !w-[calc(100vw-2rem)] !max-w-3xl !flex-col overflow-hidden !gap-0 !p-0">
          <DialogHeader className="border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle>Consultar NPU</DialogTitle>
            <DialogDescription>Consulte a capa publica do processo e visualize o retorno no proprio dialog.</DialogDescription>
          </DialogHeader>
          <div className="scroll-subtle min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3.5">
              <div className="space-y-2">
                <Label htmlFor="quick-npu">NPU</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="quick-npu"
                    value={npu}
                    onChange={(event) => setNpu(event.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="min-w-0 flex-1"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleBuscarNpu();
                      }
                    }}
                  />
                  <Button onClick={handleBuscarNpu} disabled={buscandoNpu} className="sm:min-w-[104px]">
                    {buscandoNpu && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {buscandoNpu ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
              {npuErro && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {npuErro}
                </div>
              )}

              {npuResultado && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Numero CNJ</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.numeroCnj ?? "Nao informado"}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tribunal</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.tribunal ?? "Nao informado"}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Classe</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.classe ?? "Nao informado"}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Orgao julgador</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.orgaoJulgador ?? "Nao informado"}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Distribuicao</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.dataDistribuicao ?? "Nao informado"}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor da causa</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{npuResultado.valorCausa ?? "Nao informado"}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/40 p-3.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assunto</p>
                    <p className="mt-1 text-sm text-foreground">{npuResultado.assunto ?? "Nao informado"}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Movimentacoes retornadas</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {npuResultado.movimentacoes?.length ?? 0}
                      </span>
                    </div>

                    {npuResultado.movimentacoes && npuResultado.movimentacoes.length > 0 ? (
                      <div className="scroll-subtle max-h-[280px] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card/50 p-3">
                        <div className="space-y-2 pr-1">
                          {npuResultado.movimentacoes.slice(0, 8).map((movimentacao, index) => (
                            <div key={`${movimentacao.chaveExterna ?? movimentacao.dataHora ?? movimentacao.data ?? index}`} className="rounded-xl border border-border/60 bg-card p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                  {movimentacao.tipo ?? "Movimentacao"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {movimentacao.dataHora
                                    ? new Date(movimentacao.dataHora).toLocaleString("pt-BR")
                                    : movimentacao.data
                                      ? new Date(`${movimentacao.data}T00:00:00`).toLocaleDateString("pt-BR")
                                      : "Data indisponivel"}
                                </p>
                              </div>
                              <p className="mt-2 text-sm text-foreground">
                                {movimentacao.descricao ?? movimentacao.nome ?? "Sem descricao informada"}
                              </p>
                              {movimentacao.orgaoJulgador && (
                                <p className="mt-2 text-[11px] text-muted-foreground">{movimentacao.orgaoJulgador}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-card/50 px-4 py-5 text-sm text-muted-foreground">
                        Nenhuma movimentacao publica retornada para esse NPU.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-border/70 px-6 py-4">
            <Button variant="outline" onClick={() => setModalNpu(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalNotaRapida}
        onOpenChange={(open) => {
          setModalNotaRapida(open);
          if (!open) resetNotaRapida();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nota Rapida</DialogTitle>
            <DialogDescription>Registe rapidamente uma anotacao de ligacao vinculada ao cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <ClienteCombobox
                clientes={clientesDisponiveis}
                value={notaClienteId}
                open={notaClienteOpen}
                disabled={loadingClientes}
                placeholder={loadingClientes ? "Carregando clientes..." : "Selecionar cliente"}
                onOpenChange={setNotaClienteOpen}
                onChange={setNotaClienteId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-note-content">Anotacao da ligacao</Label>
              <Textarea
                id="quick-note-content"
                value={notaConteudo}
                onChange={(event) => setNotaConteudo(event.target.value)}
                placeholder="Descreva rapidamente o contexto, pedidos do cliente e proximos passos..."
                className="min-h-[220px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNotaRapida(false)} disabled={savingNota}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarNotaRapida} disabled={savingNota}>
              {savingNota && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingNota ? "Guardando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalDocumento}
        onOpenChange={(open) => {
          setModalDocumento(open);
          if (!open) resetDocumento();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Documento</DialogTitle>
            <DialogDescription>Selecione o cliente e envie um arquivo de forma rapida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <ClienteCombobox
                clientes={clientesDisponiveis}
                value={documentoClienteId}
                open={documentoClienteOpen}
                disabled={loadingClientes}
                placeholder={loadingClientes ? "Carregando clientes..." : "Selecionar cliente"}
                onOpenChange={setDocumentoClienteOpen}
                onChange={setDocumentoClienteId}
              />
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingDocumento(true);
              }}
              onDragLeave={() => setDraggingDocumento(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingDocumento(false);
                selecionarDocumento(event.dataTransfer.files);
              }}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                draggingDocumento ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  selecionarDocumento(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {documentoFile ? "Trocar arquivo selecionado" : "Arraste ou clique para anexar"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Upload rapido com vinculo direto ao cliente</p>

              {documentoFile && (
                <div className="mt-4 rounded-lg border border-border/70 bg-background/50 p-3 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{documentoFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(documentoFile.size)}</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDocumento(false)} disabled={uploadingDocumento}>
              Cancelar
            </Button>
            <Button onClick={handleUploadDocumento} disabled={uploadingDocumento}>
              {uploadingDocumento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadingDocumento ? "Enviando..." : "Enviar arquivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
