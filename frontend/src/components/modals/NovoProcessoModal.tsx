import { useEffect, useState } from "react";
import { Loader2, Plus, Search, UserPlus, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/context/AuthContext";
import { NovoCasoModal } from "@/components/modals/NovoCasoModal";
import { Button } from "@/components/ui/button";
import { EtiquetasEditor } from "@/components/EtiquetasEditor";
import { PartesProcessoEditor, sanitizeProcessoPartesForApi } from "@/components/PartesProcessoEditor";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCurrency, maskProcesso, parseCurrency } from "@/lib/masks";
import { casosApi, clientesApi, processosApi, unidadesApi, usuariosApi } from "@/services/api";
import type { Caso, ProcessoParteFormValue } from "@/types";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  initialClienteId?: string;
}

type ProcessoFormValues = {
  numero: string;
  clienteId: string;
  casoId: string;
  tipo: string;
  vara: string;
  tribunal: string;
  status: string;
  dataDistribuicao: string;
  valorCausa: string;
  descricao: string;
  unidadeId: string;
};

type ClienteOption = {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
};

type UnidadeOption = {
  id: string;
  nome: string;
};

type CasoOption = Caso;

type UsuarioOption = {
  id: string;
  nome: string;
  papel: string;
};

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      mensagem?: string;
    };
  };
};

const tiposProcesso = [
  { value: "CIVEL", label: "Civel" },
  { value: "TRABALHISTA", label: "Trabalhista" },
  { value: "CRIMINAL", label: "Criminal" },
  { value: "FAMILIA", label: "Familia" },
  { value: "TRIBUTARIO", label: "Tributario" },
  { value: "EMPRESARIAL", label: "Empresarial" },
  { value: "PREVIDENCIARIO", label: "Previdenciario" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
];

function inferTipoProcesso(classe: string | null, assunto: string | null): ProcessoFormValues["tipo"] {
  const text = `${classe ?? ""} ${assunto ?? ""}`.toLowerCase();

  if (text.includes("trabalh")) return "TRABALHISTA";
  if (text.includes("crime") || text.includes("criminal") || text.includes("penal")) return "CRIMINAL";
  if (text.includes("famil") || text.includes("alimento") || text.includes("guarda") || text.includes("divor")) return "FAMILIA";
  if (text.includes("tribut") || text.includes("fiscal") || text.includes("icms") || text.includes("iptu")) return "TRIBUTARIO";
  if (text.includes("empres") || text.includes("falência") || text.includes("falencia") || text.includes("recuperação") || text.includes("recuperacao")) return "EMPRESARIAL";
  if (text.includes("previd") || text.includes("aposent") || text.includes("benefício") || text.includes("beneficio") || text.includes("inss")) return "PREVIDENCIARIO";
  if (text.includes("administr")) return "ADMINISTRATIVO";
  return "CIVEL";
}

function formatCurrencyFromApiValue(value: string | null): string {
  if (!value) return "";

  const sanitized = value.trim().replace(/[^\d,.-]/g, "");
  if (!sanitized) return "";

  const commaIndex = sanitized.lastIndexOf(",");
  const dotIndex = sanitized.lastIndexOf(".");

  let normalized = sanitized;
  if (commaIndex > dotIndex) {
    normalized = sanitized.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    normalized = sanitized.replace(/,/g, "");
  } else {
    normalized = sanitized.replace(",", ".");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function NovoProcessoModal({ onClose, onSaved, initialClienteId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const [casos, setCasos] = useState<CasoOption[]>([]);
  const [loadingCasos, setLoadingCasos] = useState(false);
  const [modalCasoAberto, setModalCasoAberto] = useState(false);
  const [advogados, setAdvogados] = useState<{ id: string; nome: string }[]>([]);
  const [advogadosSelecionados, setAdvogadosSelecionados] = useState<{ id: string; nome: string }[]>([]);
  const [advogadoSelecionarId, setAdvogadoSelecionarId] = useState("");
  const [advogadosError, setAdvogadosError] = useState("");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [partes, setPartes] = useState<ProcessoParteFormValue[]>([]);

  const form = useForm<ProcessoFormValues>({
    defaultValues: {
      numero: "",
      clienteId: initialClienteId || "",
      casoId: "",
      tipo: "CIVEL",
      vara: "",
      tribunal: "",
      status: "EM_ANDAMENTO",
      dataDistribuicao: new Date().toISOString().split("T")[0],
      valorCausa: "",
      descricao: "",
      unidadeId: user?.unidadeId ?? "",
    },
  });
  const clienteIdSelecionado = form.watch("clienteId");
  const unidadeIdSelecionada = form.watch("unidadeId");

  useEffect(() => {
    clientesApi.listar({ size: 1000 }).then(data => {
      const items = data.content ?? data;
      setClientes(Array.isArray(items) ? items as ClienteOption[] : []);
    }).catch(() => {});

    unidadesApi.listar().then(res => {
      const items = res.content ?? res;
      setUnidades(Array.isArray(items) ? items as UnidadeOption[] : []);
    }).catch(() => {});

    usuariosApi.listar().then((data: UsuarioOption[] | { content?: UsuarioOption[] }) => {
      const items = (data as { content?: UsuarioOption[] }).content ?? data;
      const lista = Array.isArray(items) ? items as UsuarioOption[] : [];
      setAdvogados(lista.filter(u => u.papel === "ADVOGADO" || u.papel === "ADMINISTRADOR"));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialClienteId) {
      form.setValue("clienteId", initialClienteId, { shouldValidate: true });
    }
  }, [form, initialClienteId]);

  useEffect(() => {
    if (!clienteIdSelecionado) {
      setCasos([]);
      form.setValue("casoId", "");
      return;
    }

    setLoadingCasos(true);
    casosApi.listar({
      clienteId: clienteIdSelecionado,
      unidadeId: unidadeIdSelecionada || undefined,
      size: 100,
    }).then((data) => {
      const items = data.content ?? data;
      const lista = Array.isArray(items) ? items as CasoOption[] : [];
      setCasos(lista);

      const casoAtual = form.getValues("casoId");
      if (casoAtual && !lista.some((caso) => caso.id === casoAtual)) {
        form.setValue("casoId", "");
      }
    }).catch(() => {
      setCasos([]);
      form.setValue("casoId", "");
    }).finally(() => setLoadingCasos(false));
  }, [clienteIdSelecionado, form, unidadeIdSelecionada]);

  useEffect(() => {
    if (user?.unidadeId && !form.getValues("unidadeId")) {
      form.setValue("unidadeId", user.unidadeId, { shouldValidate: true });
    }
  }, [form, user?.unidadeId]);

  const adicionarAdvogado = () => {
    if (!advogadoSelecionarId) return;

    const advogado = advogados.find(item => item.id === advogadoSelecionarId);
    if (!advogado) return;
    if (advogadosSelecionados.some(item => item.id === advogado.id)) return;

    setAdvogadosSelecionados(prev => [...prev, advogado]);
    setAdvogadosError("");
    setAdvogadoSelecionarId("");
  };

  const removerAdvogado = (id: string) => {
    setAdvogadosSelecionados(prev => prev.filter(item => item.id !== id));
  };

  const handleBuscarDatajud = async () => {
    const numeroAtual = form.getValues("numero");
    const numeroLimpo = numeroAtual.replace(/\D/g, "");

    if (numeroLimpo.length !== 20) {
      toast.error("O numero do processo deve conter 20 digitos.");
      return;
    }

    setIsSearching(true);
    try {
      const capa = await processosApi.consultarCapaDatajud(numeroLimpo);

      form.setValue("numero", capa.numeroCnj || maskProcesso(numeroAtual), { shouldValidate: true });
      if (capa.tribunal) {
        form.setValue("tribunal", capa.tribunal, { shouldValidate: true });
      }
      if (capa.orgaoJulgador) {
        form.setValue("vara", capa.orgaoJulgador, { shouldValidate: true });
      }
      if (capa.dataDistribuicao) {
        form.setValue("dataDistribuicao", capa.dataDistribuicao, { shouldValidate: true });
      }
      if (capa.valorCausa) {
        const valorFormatado = formatCurrencyFromApiValue(capa.valorCausa);
        if (valorFormatado) {
          form.setValue("valorCausa", valorFormatado, { shouldValidate: true });
        }
      }

      const descricaoAtual = form.getValues("descricao");
      const descricaoImportada = [capa.classe, capa.assunto]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(" - ");

      if (descricaoImportada && !descricaoAtual.trim()) {
        form.setValue("descricao", descricaoImportada, { shouldValidate: true });
      }

      form.setValue("tipo", inferTipoProcesso(capa.classe, capa.assunto), { shouldValidate: true });
      form.setValue("status", "EM_ANDAMENTO", { shouldValidate: true });
      const totalMovimentacoes = capa.movimentacoes?.length ?? 0;
      toast.success(
        totalMovimentacoes > 0
          ? `Dados do processo importados. ${totalMovimentacoes} movimentacoes serao sincronizadas ao salvar.`
          : "Dados do processo importados com sucesso.",
      );
    } catch (error: unknown) {
      const axiosErr = error as ApiErrorShape;
      if (axiosErr.response?.status === 404) {
        toast.error("Processo nao encontrado no Datajud ou esta em segredo de justica.");
      } else {
        toast.error(axiosErr.response?.data?.mensagem || "Nao foi possivel consultar o Datajud.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = form.handleSubmit(async values => {
    if (!values.numero || !values.clienteId) {
      toast.error("Numero e cliente sao obrigatorios.");
      return;
    }
    if (advogadosSelecionados.length === 0) {
      const message = "Selecione ao menos um advogado responsável.";
      setAdvogadosError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      await processosApi.criar({
        ...values,
        casoId: values.casoId || null,
        advogadoIds: advogadosSelecionados.map(item => item.id),
        etiquetas,
        partes: sanitizeProcessoPartesForApi(partes),
        valorCausa: values.valorCausa ? parseCurrency(values.valorCausa) : null,
      });

      toast.success("Processo cadastrado com sucesso!");
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as ApiErrorShape;
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao cadastrar processo");
    } finally {
      setLoading(false);
    }
  });

  const advogadosDisponiveis = advogados.filter(item =>
    !advogadosSelecionados.some(selecionado => selecionado.id === item.id),
  );

  const handleCasoSalvo = (caso: Caso) => {
    setCasos((prev) => {
      const next = [caso, ...prev.filter((item) => item.id !== caso.id)];
      return next.sort((left, right) => left.titulo.localeCompare(right.titulo, "pt-BR"));
    });

    form.setValue("clienteId", caso.clienteId, { shouldValidate: true, shouldDirty: true });
    form.setValue("unidadeId", caso.unidadeId, { shouldValidate: true, shouldDirty: true });
    form.setValue("casoId", caso.id, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-xl mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Novo Processo</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form id="novo-processo-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <input type="hidden" {...form.register("status")} />

            <FormField
              control={form.control}
              name="numero"
              rules={{ required: "Numero do processo e obrigatorio" }}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Numero do processo *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        className="flex-1"
                        placeholder=""
                        value={field.value}
                        onChange={event => field.onChange(maskProcesso(event.target.value))}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={handleBuscarDatajud}
                      disabled={isSearching || loading}
                      aria-label="Buscar dados do processo no Datajud"
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clienteId"
              rules={{ required: "Cliente e obrigatorio" }}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="casoId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Caso</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <select
                        {...field}
                        disabled={!clienteIdSelecionado || loadingCasos}
                        className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="">Sem caso vinculado</option>
                        {casos.map((caso) => (
                          <option key={caso.id} value={caso.id}>
                            {caso.titulo}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setModalCasoAberto(true)}
                      aria-label="Criar novo caso"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Opcional. Vincule o processo a um caso para manter contexto, envolvidos e organizacao do escritorio.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tipo"
                rules={{ required: "Tipo e obrigatorio" }}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Tipo *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                      >
                        {tiposProcesso.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataDistribuicao"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Data distribuição</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="vara"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Vara</FormLabel>
                    <FormControl>
                      <Input value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tribunal"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Tribunal</FormLabel>
                    <FormControl>
                      <Input value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Advogados Responsáveis *</Label>

              {advogadosSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {advogadosSelecionados.map(advogado => (
                    <span
                      key={advogado.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25"
                    >
                      {advogado.nome}
                      <button
                        type="button"
                        onClick={() => removerAdvogado(advogado.id)}
                        className="hover:text-destructive transition-colors ml-0.5"
                        aria-label={`Remover ${advogado.nome}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {advogadosDisponiveis.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={advogadoSelecionarId}
                    onChange={event => setAdvogadoSelecionarId(event.target.value)}
                    className="flex-1 h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                  >
                    <option value="">- Selecionar advogado -</option>
                    {advogadosDisponiveis.map(advogado => (
                      <option key={advogado.id} value={advogado.id}>
                        {advogado.nome}
                      </option>
                    ))}
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

              {advogadosSelecionados.length === 0 && (
                <p className={`text-xs ${advogadosError ? "text-destructive" : "text-muted-foreground"}`}>
                  {advogadosError || "Selecione ao menos um advogado responsável."}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="valorCausa"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Valor da causa</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={field.value}
                      onChange={event => field.onChange(maskCurrency(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none"
                      rows={3}
                      placeholder="Resumo do processo..."
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />

            <EtiquetasEditor value={etiquetas} onChange={setEtiquetas} />

            <PartesProcessoEditor
              value={partes}
              onChange={setPartes}
              advogadosInternos={advogadosSelecionados}
              clientesSugestoes={clientes.map(c => ({ id: c.id, nome: c.nome, cpfCnpj: c.cpfCnpj ?? "", tipo: c.tipo ?? "pessoa_fisica" }))}
            />

            <FormField
              control={form.control}
              name="unidadeId"
              rules={{ required: "Unidade e obrigatoria" }}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                    >
                      {unidades.map(unidade => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button type="submit" form="novo-processo-form" className="flex-1" disabled={loading || isSearching}>
            {loading ? "Salvando..." : "Cadastrar Processo"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>

      {modalCasoAberto && (
        <NovoCasoModal
          onClose={() => setModalCasoAberto(false)}
          onSaved={handleCasoSalvo}
          initialClienteId={clienteIdSelecionado || undefined}
          initialUnidadeId={unidadeIdSelecionada || undefined}
          initialResponsavelId={user?.id}
          lockClienteId={clienteIdSelecionado || undefined}
          title="Novo Caso para o Processo"
          description="Crie o caso e volte ao cadastro do processo com o vinculo ja selecionado."
        />
      )}
    </div>
  );
}
