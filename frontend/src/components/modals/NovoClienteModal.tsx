import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { clientesApi, unidadesApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  maskCNPJ,
  maskCPF,
  maskCTPS,
  maskCnhNumero,
  maskPIS,
  maskPassaporte,
  maskPhone,
  maskRG,
  maskReservista,
  maskTituloEleitorNumero,
  maskTituloEleitorSessao,
  maskTituloEleitorZona,
} from "@/lib/masks";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: Record<string, unknown>;
}

type TipoClienteForm = "PESSOA_FISICA" | "PESSOA_JURIDICA";

interface ClienteFormState {
  nome: string;
  tipo: TipoClienteForm;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  advogadoId: string;
  unidadeId: string;
  rg: string;
  ctps: string;
  pis: string;
  tituloEleitorNumero: string;
  tituloEleitorZona: string;
  tituloEleitorSessao: string;
  cnhNumero: string;
  cnhCategoria: string;
  cnhVencimento: string;
  passaporteNumero: string;
  certidaoReservistaNumero: string;
  dataNascimento: string;
  nomePai: string;
  nomeMae: string;
  naturalidade: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  empresa: string;
  atividadeEconomica: string;
  comentarios: string;
  bancoNome: string;
  bancoAgencia: string;
  bancoConta: string;
  bancoTipo: "" | "CORRENTE" | "POUPANCA";
  chavePix: string;
  isFalecido: boolean;
  detalhesObito: string;
}

const estados = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const initialFormState = (initialData: Record<string, unknown> | undefined, user: { id?: string; unidadeId?: string } | null): ClienteFormState => ({
  nome: (initialData?.nome as string) || "",
  tipo: ((initialData?.tipo as TipoClienteForm) || "PESSOA_FISICA"),
  cpfCnpj: (initialData?.cpfCnpj as string) || "",
  email: (initialData?.email as string) || "",
  telefone: (initialData?.telefone as string) || "",
  cidade: (initialData?.cidade as string) || "",
  estado: (initialData?.estado as string) || "BA",
  advogadoId: (initialData?.advogadoId as string) || user?.id || "",
  unidadeId: (initialData?.unidadeId as string) || user?.unidadeId || "",
  rg: (initialData?.rg as string) || "",
  ctps: (initialData?.ctps as string) || "",
  pis: (initialData?.pis as string) || "",
  tituloEleitorNumero: (initialData?.tituloEleitorNumero as string) || "",
  tituloEleitorZona: (initialData?.tituloEleitorZona as string) || "",
  tituloEleitorSessao: (initialData?.tituloEleitorSessao as string) || "",
  cnhNumero: (initialData?.cnhNumero as string) || "",
  cnhCategoria: (initialData?.cnhCategoria as string) || "",
  cnhVencimento: (initialData?.cnhVencimento as string) || "",
  passaporteNumero: (initialData?.passaporteNumero as string) || "",
  certidaoReservistaNumero: (initialData?.certidaoReservistaNumero as string) || "",
  dataNascimento: (initialData?.dataNascimento as string) || "",
  nomePai: (initialData?.nomePai as string) || "",
  nomeMae: (initialData?.nomeMae as string) || "",
  naturalidade: (initialData?.naturalidade as string) || "",
  nacionalidade: (initialData?.nacionalidade as string) || "",
  estadoCivil: (initialData?.estadoCivil as string) || "",
  profissao: (initialData?.profissao as string) || "",
  empresa: (initialData?.empresa as string) || "",
  atividadeEconomica: (initialData?.atividadeEconomica as string) || "",
  comentarios: (initialData?.comentarios as string) || "",
  bancoNome: (initialData?.bancoNome as string) || "",
  bancoAgencia: (initialData?.bancoAgencia as string) || "",
  bancoConta: (initialData?.bancoConta as string) || "",
  bancoTipo: ((initialData?.bancoTipo as "CORRENTE" | "POUPANCA" | "") || ""),
  chavePix: (initialData?.chavePix as string) || "",
  isFalecido: Boolean(initialData?.isFalecido),
  detalhesObito: (initialData?.detalhesObito as string) || "",
});

export function NovoClienteModal({ onClose, onSaved, initialData }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState<ClienteFormState>(() => initialFormState(initialData, user ?? null));
  const isPessoaFisica = form.tipo === "PESSOA_FISICA";

  useEffect(() => {
    unidadesApi.listar()
      .then((res) => {
        const items = res.content ?? res;
        setUnidades(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  const set = <K extends keyof ClienteFormState>(key: K, value: ClienteFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => ({
    nome: form.nome.trim(),
    tipo: form.tipo,
    cpfCnpj: normalizeOptional(form.cpfCnpj),
    email: normalizeOptional(form.email),
    telefone: normalizeOptional(form.telefone),
    cidade: form.cidade.trim(),
    estado: form.estado.trim().toUpperCase(),
    advogadoId: form.advogadoId || null,
    unidadeId: form.unidadeId || null,
    rg: isPessoaFisica ? normalizeOptional(form.rg) : null,
    ctps: isPessoaFisica ? normalizeOptional(form.ctps) : null,
    pis: isPessoaFisica ? normalizeOptional(form.pis) : null,
    tituloEleitorNumero: isPessoaFisica ? normalizeOptional(form.tituloEleitorNumero) : null,
    tituloEleitorZona: isPessoaFisica ? normalizeOptional(form.tituloEleitorZona) : null,
    tituloEleitorSessao: isPessoaFisica ? normalizeOptional(form.tituloEleitorSessao) : null,
    cnhNumero: isPessoaFisica ? normalizeOptional(form.cnhNumero) : null,
    cnhCategoria: isPessoaFisica ? normalizeOptional(form.cnhCategoria.toUpperCase()) : null,
    cnhVencimento: isPessoaFisica ? normalizeOptional(form.cnhVencimento) : null,
    passaporteNumero: isPessoaFisica ? normalizeOptional(form.passaporteNumero) : null,
    certidaoReservistaNumero: isPessoaFisica ? normalizeOptional(form.certidaoReservistaNumero) : null,
    dataNascimento: normalizeOptional(form.dataNascimento),
    nomePai: normalizeOptional(form.nomePai),
    nomeMae: normalizeOptional(form.nomeMae),
    naturalidade: normalizeOptional(form.naturalidade),
    nacionalidade: normalizeOptional(form.nacionalidade),
    estadoCivil: normalizeOptional(form.estadoCivil),
    profissao: normalizeOptional(form.profissao),
    empresa: normalizeOptional(form.empresa),
    atividadeEconomica: normalizeOptional(form.atividadeEconomica),
    comentarios: normalizeOptional(form.comentarios),
    bancoNome: normalizeOptional(form.bancoNome),
    bancoAgencia: normalizeOptional(form.bancoAgencia),
    bancoConta: normalizeOptional(form.bancoConta),
    bancoTipo: normalizeOptional(form.bancoTipo),
    chavePix: normalizeOptional(form.chavePix),
    isFalecido: form.isFalecido,
    detalhesObito: form.isFalecido ? normalizeOptional(form.detalhesObito) : null,
  });

  const validateForm = () => {
    if (!form.nome.trim() || !form.cidade.trim() || !form.estado.trim() || !form.unidadeId) {
      toast.error("Nome, Cidade, UF e Unidade são obrigatórios");
      return false;
    }

    const digitsOnly = form.cpfCnpj.replace(/\D/g, "");
    if (digitsOnly) {
      if (isPessoaFisica && digitsOnly.length !== 11) {
        toast.error("CPF deve ter 11 dígitos");
        return false;
      }

      if (!isPessoaFisica && digitsOnly.length !== 14) {
        toast.error("CNPJ deve ter 14 dígitos");
        return false;
      }
    }

    if (form.isFalecido && !form.detalhesObito.trim()) {
      toast.error("Informe os detalhes do óbito");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = buildPayload();
      if (initialData?.id) {
        await clientesApi.atualizar(initialData.id as string, payload);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await clientesApi.criar(payload);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {initialData ? "Editar informações do Cliente" : "Cadastro de Cliente"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Cadastro em alta densidade com dados civis, complementares e bancários.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex-1 overflow-y-auto"
        >
          <Tabs defaultValue="basicos" className="p-6">
            <TabsList className="grid w-full grid-cols-2 gap-1 h-auto md:grid-cols-4">
              <TabsTrigger value="basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="identidade">Identidade</TabsTrigger>
              <TabsTrigger value="complementar">Complementar</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro/Óbito</TabsTrigger>
            </TabsList>

            <TabsContent value="basicos" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <div className="flex gap-2">
                    {[
                      ["PESSOA_FISICA", "Pessoa Física"],
                      ["PESSOA_JURIDICA", "Pessoa Jurídica"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("tipo", value as TipoClienteForm)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm transition-all",
                          form.tipo === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{isPessoaFisica ? "CPF" : "CNPJ"}</Label>
                  <Input
                    placeholder={isPessoaFisica ? "000.000.000-00" : "00.000.000/0000-00"}
                    value={form.cpfCnpj}
                    onChange={(e) => {
                      const masked = isPessoaFisica ? maskCPF(e.target.value) : maskCNPJ(e.target.value);
                      set("cpfCnpj", masked);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} />
                </div>

                <div className="space-y-1.5">
                  <Label>Cidade *</Label>
                  <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label>UF *</Label>
                  <select
                    value={form.estado}
                    onChange={(e) => set("estado", e.target.value)}
                    required
                    className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
                  >
                    {estados.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Unidade *</Label>
                  <select
                    value={form.unidadeId}
                    onChange={(e) => set("unidadeId", e.target.value)}
                    required
                    className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Selecione a unidade</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="identidade" className="mt-6 space-y-4">
              {!isPessoaFisica ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  Documentos civis de alta densidade ficam visíveis apenas para Pessoa Física.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={(e) => set("rg", maskRG(e.target.value))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>CTPS</Label>
                    <Input value={form.ctps} onChange={(e) => set("ctps", maskCTPS(e.target.value))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>PIS</Label>
                    <Input value={form.pis} onChange={(e) => set("pis", maskPIS(e.target.value))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Título de Eleitor</Label>
                    <Input
                      value={form.tituloEleitorNumero}
                      onChange={(e) => set("tituloEleitorNumero", maskTituloEleitorNumero(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Zona</Label>
                    <Input
                      value={form.tituloEleitorZona}
                      onChange={(e) => set("tituloEleitorZona", maskTituloEleitorZona(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Sessão</Label>
                    <Input
                      value={form.tituloEleitorSessao}
                      onChange={(e) => set("tituloEleitorSessao", maskTituloEleitorSessao(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>CNH</Label>
                    <Input value={form.cnhNumero} onChange={(e) => set("cnhNumero", maskCnhNumero(e.target.value))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Categoria CNH</Label>
                    <Input
                      value={form.cnhCategoria}
                      onChange={(e) => set("cnhCategoria", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vencimento CNH</Label>
                    <Input type="date" value={form.cnhVencimento} onChange={(e) => set("cnhVencimento", e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Passaporte</Label>
                    <Input value={form.passaporteNumero} onChange={(e) => set("passaporteNumero", maskPassaporte(e.target.value))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Certidão de Reservista</Label>
                    <Input
                      value={form.certidaoReservistaNumero}
                      onChange={(e) => set("certidaoReservistaNumero", maskReservista(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="complementar" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Estado civil</Label>
                  <Input value={form.estadoCivil} onChange={(e) => set("estadoCivil", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Nome do pai</Label>
                  <Input value={form.nomePai} onChange={(e) => set("nomePai", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Nome da mãe</Label>
                  <Input value={form.nomeMae} onChange={(e) => set("nomeMae", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Naturalidade</Label>
                  <Input value={form.naturalidade} onChange={(e) => set("naturalidade", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Nacionalidade</Label>
                  <Input value={form.nacionalidade} onChange={(e) => set("nacionalidade", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Profissão</Label>
                  <Input value={form.profissao} onChange={(e) => set("profissao", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Empresa</Label>
                  <Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Atividade econômica</Label>
                  <Input value={form.atividadeEconomica} onChange={(e) => set("atividadeEconomica", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Comentários</Label>
                  <Textarea value={form.comentarios} onChange={(e) => set("comentarios", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Banco</Label>
                  <Input value={form.bancoNome} onChange={(e) => set("bancoNome", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de conta</Label>
                  <select
                    value={form.bancoTipo}
                    onChange={(e) => set("bancoTipo", e.target.value as ClienteFormState["bancoTipo"])}
                    className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Selecione</option>
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Agência</Label>
                  <Input value={form.bancoAgencia} onChange={(e) => set("bancoAgencia", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <Input value={form.bancoConta} onChange={(e) => set("bancoConta", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Chave PIX</Label>
                  <Input value={form.chavePix} onChange={(e) => set("chavePix", e.target.value)} />
                </div>

                <div className="md:col-span-2 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Cliente marcado como falecido</p>
                      <p className="text-xs text-muted-foreground">
                        Ative apenas quando o dossiê exigir marcação explícita de óbito.
                      </p>
                    </div>
                    <Switch
                      checked={form.isFalecido}
                      onCheckedChange={(checked) => {
                        set("isFalecido", checked);
                        if (!checked) set("detalhesObito", "");
                      }}
                    />
                  </div>
                </div>

                {form.isFalecido && (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Detalhes do óbito *</Label>
                    <Textarea
                      value={form.detalhesObito}
                      onChange={(e) => set("detalhesObito", e.target.value)}
                      placeholder="Data, contexto, observações relevantes e eventuais responsáveis."
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </form>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1" onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? "Salvando..." : initialData ? "Salvar Alterações" : "Cadastrar Cliente"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
