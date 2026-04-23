import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { EtiquetasEditor } from "@/components/EtiquetasEditor";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { atendimentosApi, casosApi, clientesApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type { Atendimento, Caso, Cliente, Processo } from "@/types";

interface NovoAtendimentoModalProps {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: Atendimento | null;
}

type ApiErrorShape = {
  response?: {
    data?: {
      mensagem?: string;
      erros?: Record<string, string>;
    };
  };
};

type TipoRelacionamento = "NENHUM" | "PROCESSO" | "CASO";

type AtendimentoFormState = {
  clienteId: string;
  assunto: string;
  descricao: string;
  processoId: string;
  casoId: string;
  relacionamento: TipoRelacionamento;
};

const buildInitialForm = (initialData: Atendimento | null): AtendimentoFormState => ({
  clienteId: initialData?.clienteId ?? "",
  assunto: initialData?.assunto ?? "",
  descricao: initialData?.descricao ?? "",
  processoId: initialData?.processoId ?? "",
  casoId: initialData?.vinculoTipo === "CASO" ? initialData?.vinculoReferenciaId ?? "" : "",
  relacionamento:
    initialData?.processoId || initialData?.vinculoTipo === "PROCESSO"
      ? "PROCESSO"
      : initialData?.vinculoTipo === "CASO"
        ? "CASO"
        : "NENHUM",
});

export function NovoAtendimentoModal({
  onClose,
  onSaved,
  initialData = null,
}: NovoAtendimentoModalProps) {
  const { user } = useAuth();
  const modoEdicao = Boolean(initialData);

  const [loading, setLoading] = useState(false);
  const [carregandoProcessos, setCarregandoProcessos] = useState(false);
  const [carregandoCasos, setCarregandoCasos] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [processoOpen, setProcessoOpen] = useState(false);
  const [casoOpen, setCasoOpen] = useState(false);
  const [etiquetas, setEtiquetas] = useState<string[]>(initialData?.etiquetas ?? []);
  const [form, setForm] = useState<AtendimentoFormState>(buildInitialForm(initialData));

  useEffect(() => {
    setEtiquetas(initialData?.etiquetas ?? []);
    setForm(buildInitialForm(initialData));
  }, [initialData]);

  useEffect(() => {
    clientesApi.listar({ size: 1000 })
      .then((data) => {
        const items = data.content ?? data;
        setClientes(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        setClientes([]);
        toast.error("Nao foi possivel carregar os clientes.");
      });
  }, []);

  useEffect(() => {
    if (!form.clienteId) {
      setProcessos([]);
      setCasos([]);
      return;
    }

    setCarregandoProcessos(true);
    processosApi.listar({
      clienteId: form.clienteId,
      size: 100,
    })
      .then((data) => {
        const items = data.content ?? data;
        const processosCliente = Array.isArray(items)
          ? items.filter((processo) => !processo.numero?.toUpperCase().startsWith("ATD-"))
          : [];
        setProcessos(processosCliente);
        if (form.processoId && !processosCliente.some((processo) => processo.id === form.processoId)) {
          setForm((current) => ({ ...current, processoId: "" }));
        }
      })
      .catch(() => {
        setProcessos([]);
        toast.error("Nao foi possivel carregar os processos do cliente.");
      })
      .finally(() => setCarregandoProcessos(false));
  }, [form.clienteId]);

  useEffect(() => {
    if (!form.clienteId) {
      setCasos([]);
      return;
    }

    setCarregandoCasos(true);
    casosApi.listar({
      clienteId: form.clienteId,
      size: 100,
    })
      .then((data) => {
        const items = data.content ?? data;
        const casosCliente = Array.isArray(items) ? items : [];
        setCasos(casosCliente);
        if (form.casoId && !casosCliente.some((caso) => caso.id === form.casoId)) {
          setForm((current) => ({ ...current, casoId: "" }));
        }
      })
      .catch(() => {
        setCasos([]);
        toast.error("Nao foi possivel carregar os casos do cliente.");
      })
      .finally(() => setCarregandoCasos(false));
  }, [form.clienteId]);

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId) ?? null,
    [clientes, form.clienteId],
  );

  const processoSelecionado = useMemo(
    () => processos.find((processo) => processo.id === form.processoId) ?? null,
    [processos, form.processoId],
  );

  const casoSelecionado = useMemo(
    () => casos.find((caso) => caso.id === form.casoId) ?? null,
    [casos, form.casoId],
  );

  const setField = (
    field: keyof AtendimentoFormState,
    value: AtendimentoFormState[keyof AtendimentoFormState],
  ) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "clienteId") {
        next.processoId = "";
        next.casoId = "";
      }

      if (field === "relacionamento" && value !== "PROCESSO") {
        next.processoId = "";
      }

      if (field === "relacionamento" && value !== "CASO") {
        next.casoId = "";
      }

      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Sessao invalida. Entre novamente.");
      return;
    }

    if (!form.clienteId || !form.assunto.trim()) {
      toast.error("Cliente e assunto sao obrigatorios.");
      return;
    }

    if (form.relacionamento === "PROCESSO" && !form.processoId) {
      toast.error("Selecione o processo relacionado ou remova o vinculo.");
      return;
    }

    if (form.relacionamento === "CASO" && !form.casoId) {
      toast.error("Selecione o caso relacionado ou remova o vinculo.");
      return;
    }

    setLoading(true);
    try {
      const processoId = form.relacionamento === "PROCESSO" ? form.processoId : null;
      const casoId = form.relacionamento === "CASO" ? form.casoId : null;
      const payload = {
        clienteId: form.clienteId,
        usuarioId: user.id,
        processoId,
        tipoVinculo: processoId ? "PROCESSO" : casoId ? "CASO" : null,
        vinculoReferenciaId: processoId || casoId,
        assunto: form.assunto.trim(),
        descricao: form.descricao.trim() || null,
        etiquetas,
      };

      if (modoEdicao && initialData) {
        await atendimentosApi.atualizar(initialData.id, payload);
      } else {
        await atendimentosApi.criar(payload);
      }

      toast.success(modoEdicao ? "Atendimento atualizado com sucesso." : "Atendimento criado com sucesso.");
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as ApiErrorShape;
      const validationMessage = axiosErr.response?.data?.erros
        ? Object.values(axiosErr.response.data.erros)[0]
        : undefined;
      toast.error(validationMessage || axiosErr.response?.data?.mensagem || "Erro ao guardar atendimento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="space-y-1">
          <SheetTitle>{modoEdicao ? "Editar Atendimento" : "Novo Atendimento"}</SheetTitle>
          <SheetDescription>
            {modoEdicao
              ? "Atualize o registo inicial do atendimento."
              : "Registe a triagem inicial com contexto opcional de processo, sem gerar andamento nem alterar o processo."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex h-[calc(100vh-120px)] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Registado por</Label>
              <Input
                value={user?.nome ?? "Utilizador atual"}
                readOnly
                className="bg-secondary"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteOpen}
                    className="w-full justify-between"
                  >
                    <span className={cn("truncate", !clienteSelecionado && "text-muted-foreground")}>
                      {clienteSelecionado ? clienteSelecionado.nome : "Selecionar cliente"}
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
                            value={`${cliente.nome} ${cliente.cpfCnpj}`}
                            onSelect={() => {
                              setField("clienteId", cliente.id);
                              setClienteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.clienteId === cliente.id ? "opacity-100" : "opacity-0",
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
            </div>

            <div className="space-y-2">
              <Label>Relacionar com</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={form.relacionamento === "NENHUM" ? "default" : "outline"}
                  onClick={() => setField("relacionamento", "NENHUM")}
                >
                  Nenhum
                </Button>
                <Button
                  type="button"
                  variant={form.relacionamento === "PROCESSO" ? "default" : "outline"}
                  onClick={() => setField("relacionamento", "PROCESSO")}
                  disabled={!form.clienteId}
                >
                  Processo
                </Button>
                <Button
                  type="button"
                  variant={form.relacionamento === "CASO" ? "default" : "outline"}
                  onClick={() => setField("relacionamento", "CASO")}
                  disabled={!form.clienteId}
                >
                  Caso
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Opcional. O processo fica apenas como contexto do atendimento e nao altera status, andamento ou timeline.
              </p>
            </div>

            {form.relacionamento === "PROCESSO" && (
              <div className="space-y-1.5">
                <Label>Processo relacionado</Label>
                <Popover open={processoOpen} onOpenChange={setProcessoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={processoOpen}
                      className="w-full justify-between"
                      disabled={!form.clienteId || carregandoProcessos}
                    >
                      <span className={cn("truncate", !processoSelecionado && "text-muted-foreground")}>
                        {carregandoProcessos
                          ? "A carregar processos..."
                          : processoSelecionado
                            ? processoSelecionado.numero
                            : "Selecionar processo do cliente"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar processo..." />
                      <CommandList>
                        <CommandEmpty>
                          {form.clienteId
                            ? "Nenhum processo ativo encontrado para este cliente."
                            : "Selecione um cliente primeiro."}
                        </CommandEmpty>
                        <CommandGroup>
                          {processos.map((processo) => (
                            <CommandItem
                              key={processo.id}
                              value={`${processo.numero} ${processo.clienteNome}`}
                              onSelect={() => {
                                setField("processoId", processo.id);
                                setProcessoOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.processoId === processo.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="min-w-0">
                                <p className="truncate">{processo.numero}</p>
                                <p className="text-xs text-muted-foreground">
                                  {processo.tipo} - {processo.status.replaceAll("_", " ")}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Use quando o cliente veio falar sobre um processo ja existente.
                </p>
              </div>
            )}

            {form.relacionamento === "CASO" && (
              <div className="space-y-1.5">
                <Label>Caso relacionado</Label>
                <Popover open={casoOpen} onOpenChange={setCasoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={casoOpen}
                      className="w-full justify-between"
                      disabled={!form.clienteId || carregandoCasos}
                    >
                      <span className={cn("truncate", !casoSelecionado && "text-muted-foreground")}>
                        {carregandoCasos
                          ? "A carregar casos..."
                          : casoSelecionado
                            ? casoSelecionado.titulo
                            : "Selecionar caso do cliente"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar caso..." />
                      <CommandList>
                        <CommandEmpty>
                          {form.clienteId
                            ? "Nenhum caso encontrado para este cliente."
                            : "Selecione um cliente primeiro."}
                        </CommandEmpty>
                        <CommandGroup>
                          {casos.map((caso) => (
                            <CommandItem
                              key={caso.id}
                              value={`${caso.titulo} ${caso.clienteNome} ${caso.responsavelNome}`}
                              onSelect={() => {
                                setField("casoId", caso.id);
                                setCasoOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.casoId === caso.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="min-w-0">
                                <p className="truncate">{caso.titulo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {caso.unidadeNome} - {caso.responsavelNome}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Use quando o contacto estiver ligado a um caso ainda sem processo ou a um conjunto maior de fatos.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Assunto *</Label>
              <Input
                value={form.assunto}
                onChange={(event) => setField("assunto", event.target.value)}
                placeholder="Ex: Reuniao inicial sobre cumprimento de sentenca"
                maxLength={255}
              />
            </div>

            <EtiquetasEditor
              value={etiquetas}
              onChange={setEtiquetas}
              label="Etiquetas"
              helperText="Ate 10 etiquetas por atendimento. Pressione Enter para adicionar."
            />

            <div className="space-y-1.5">
              <Label>Descricao dos Factos</Label>
              <Textarea
                value={form.descricao}
                onChange={(event) => setField("descricao", event.target.value)}
                placeholder="Descreva o relato inicial do cliente, contexto, urgência e encaminhamento..."
                className="min-h-[220px]"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2 border-t border-border pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : modoEdicao ? "Guardar alteracoes" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
