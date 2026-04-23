import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

import { EtiquetasEditor } from "@/components/EtiquetasEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { casosApi, clientesApi, unidadesApi, usuariosApi } from "@/services/api";
import type { AcessoCaso, Caso, Cliente, Unidade, Usuario } from "@/types";
import { toast } from "sonner";

type ApiErrorShape = {
  response?: {
    data?: {
      mensagem?: string;
      erros?: Record<string, string>;
    };
  };
};

type CasoFormValues = {
  clienteId: string;
  unidadeId: string;
  responsavelId: string;
  titulo: string;
  descricao: string;
  observacoes: string;
  acesso: AcessoCaso;
  envolvidos: Array<{
    nome: string;
    qualificacao: string;
  }>;
};

interface NovoCasoModalProps {
  onClose: () => void;
  onSaved?: (caso: Caso) => void;
  initialClienteId?: string;
  initialUnidadeId?: string;
  initialResponsavelId?: string;
  lockClienteId?: string;
  title?: string;
  description?: string;
}

function extractItems<T>(response: T[] | { content?: T[] } | undefined): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  return [];
}

export function NovoCasoModal({
  onClose,
  onSaved,
  initialClienteId,
  initialUnidadeId,
  initialResponsavelId,
  lockClienteId,
  title = "Novo Caso",
  description = "Crie um caso operacional para agrupar contexto, envolvidos e futuros processos relacionados.",
}: NovoCasoModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [responsaveis, setResponsaveis] = useState<Usuario[]>([]);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);

  const form = useForm<CasoFormValues>({
    defaultValues: {
      clienteId: lockClienteId || initialClienteId || "",
      unidadeId: initialUnidadeId || user?.unidadeId || "",
      responsavelId: initialResponsavelId || user?.id || "",
      titulo: "",
      descricao: "",
      observacoes: "",
      acesso: "EQUIPE",
      envolvidos: [{ nome: "", qualificacao: "" }],
    },
  });
  const clienteIdSelecionado = form.watch("clienteId");

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "envolvidos",
  });

  useEffect(() => {
    clientesApi.listar({ size: 1000 })
      .then((data) => setClientes(extractItems<Cliente>(data)))
      .catch(() => setClientes([]));

    unidadesApi.listar()
      .then((data) => setUnidades(extractItems<Unidade>(data)))
      .catch(() => setUnidades([]));

    usuariosApi.listar()
      .then((data: Usuario[] | { content?: Usuario[] }) => {
        const items = extractItems<Usuario>(data);
        setResponsaveis(items.filter((usuario) => usuario.ativo !== false));
      })
      .catch(() => setResponsaveis([]));
  }, []);

  useEffect(() => {
    if (lockClienteId) {
      form.setValue("clienteId", lockClienteId, { shouldValidate: true });
    }
  }, [form, lockClienteId]);

  const clienteSelecionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteIdSelecionado) ?? null,
    [clienteIdSelecionado, clientes],
  );

  const submit = form.handleSubmit(async (values) => {
    const envolvidos = values.envolvidos
      .map((envolvido) => ({
        nome: envolvido.nome.trim(),
        qualificacao: envolvido.qualificacao.trim() || null,
      }))
      .filter((envolvido) => envolvido.nome);

    setLoading(true);
    try {
      const caso = await casosApi.criar({
        clienteId: values.clienteId,
        unidadeId: values.unidadeId || null,
        responsavelId: values.responsavelId,
        titulo: values.titulo.trim(),
        descricao: values.descricao.trim() || null,
        observacoes: values.observacoes.trim() || null,
        etiquetas,
        acesso: values.acesso,
        envolvidos,
      });

      toast.success("Caso criado com sucesso.");
      onSaved?.(caso);
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as ApiErrorShape;
      const validationMessage = axiosErr.response?.data?.erros
        ? Object.values(axiosErr.response.data.erros)[0]
        : undefined;
      toast.error(validationMessage || axiosErr.response?.data?.mensagem || "Erro ao guardar caso.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="novo-caso-form" onSubmit={submit} className="max-h-[78vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="unidadeId"
                  rules={{ required: "Pasta e obrigatoria" }}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Pasta *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
                        >
                          <option value="">Selecione a pasta</option>
                          {unidades.map((unidade) => (
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
                          disabled={Boolean(lockClienteId)}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <option value="">Selecione o cliente</option>
                          {clientes.map((cliente) => (
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
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <FormField
                  control={form.control}
                  name="titulo"
                  rules={{ required: "Titulo e obrigatorio" }}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Titulo *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o titulo do caso" maxLength={255} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavelId"
                  rules={{ required: "Responsavel e obrigatorio" }}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Responsavel *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
                        >
                          <option value="">Selecione o responsavel</option>
                          {responsaveis.map((responsavel) => (
                            <option key={responsavel.id} value={responsavel.id}>
                              {responsavel.nome}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <EtiquetasEditor
                value={etiquetas}
                onChange={setEtiquetas}
                label="Etiqueta"
                helperText="Use etiquetas para classificar o caso e facilitar futuras vinculacoes."
              />

              <div className="rounded-3xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Outros envolvidos</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registe contrapartes, testemunhas, representantes ou outros nomes relevantes para o caso.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => append({ nome: "", qualificacao: "" })}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  {fields.map((item, index) => (
                    <div key={item.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]">
                      <FormField
                        control={form.control}
                        name={`envolvidos.${index}.nome`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs">Nome</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Digite o nome do envolvido" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`envolvidos.${index}.qualificacao`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs">Qualificacao</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Reu, testemunha, representante" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Descricao</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Resumo do contexto do caso"
                          className="min-h-[150px] resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Observacoes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notas internas, riscos e orientacoes adicionais"
                          className="min-h-[150px] resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="acesso"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Acesso</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid gap-3 md:grid-cols-3"
                      >
                        {[
                          {
                            value: "PUBLICO",
                            label: "Publico",
                            description: "Visivel para utilizadores com permissao no modulo.",
                          },
                          {
                            value: "PRIVADO",
                            label: "Privado",
                            description: "Restrito ao responsavel e a quem receber acesso explicito.",
                          },
                          {
                            value: "EQUIPE",
                            label: "Equipe",
                            description: "Partilhado com a equipa da pasta selecionada.",
                          },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className="flex cursor-pointer gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm transition-colors hover:border-primary/40"
                          >
                            <RadioGroupItem value={option.value} className="mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">{option.label}</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {clienteSelecionado && (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs text-primary">
                  O caso sera criado para {clienteSelecionado.nome}.
                </div>
              )}
            </div>
          </form>
        </Form>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="novo-caso-form" disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Guardando..." : "Guardar caso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
