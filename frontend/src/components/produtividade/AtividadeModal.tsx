import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { atendimentosApi, prazosApi, processosApi, usuariosApi } from "@/services/api";
import { toast } from "sonner";
import type {
  Atendimento,
  EtapaPrazo,
  ModalidadeAtividade,
  Prazo,
  PrioridadePrazo,
  TipoPrazo,
  TipoUnidadeAlertaPrazo,
  TipoVinculoPrazo,
  Usuario,
} from "@/types";

type AtividadeDraft = {
  tipo: TipoPrazo;
  etiqueta: string;
  titulo: string;
  data: string;
  hora: string;
  dataFim: string;
  horaFim: string;
  diaInteiro: boolean;
  prioridade: PrioridadePrazo;
  etapa: EtapaPrazo;
  processoId: string;
  vinculoTipo: TipoVinculoPrazo | "";
  vinculoReferenciaId: string;
  vinculoBusca: string;
  responsavelId: string;
  participantesIds: string[];
  participantesBusca: string;
  descricao: string;
  local: string;
  modalidade: ModalidadeAtividade | "";
  sala: string;
  alertaValor: string;
  alertaUnidade: TipoUnidadeAlertaPrazo | "";
};

type AtividadeModalProps = {
  open: boolean;
  initialData?: Prazo | null;
  initialTipo?: TipoPrazo;
  dataInicial?: string;
  onClose: () => void;
  onSaved?: (atividade: Prazo) => void;
};

type ProcessOption = {
  id: string;
  numero: string;
  clienteNome?: string;
};

type AtendimentoOption = Pick<Atendimento, "id" | "assunto" | "clienteNome" | "processoId" | "processoNumero">;

type AuthUserOption = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  cargo: string;
  initials: string;
  unidadeId: string;
  unidadeNome: string;
};

const PRIORIDADE_DEFAULT: Record<TipoPrazo, PrioridadePrazo> = {
  tarefa_interna: "media",
  prazo_processual: "alta",
  reuniao: "media",
  audiencia: "alta",
};

const TIPO_META: Record<TipoPrazo, { label: string; description: string; accent: string }> = {
  tarefa_interna: {
    label: "Tarefa",
    description: "Acao operacional com dono claro, participantes e acompanhamento objetivo.",
    accent: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  prazo_processual: {
    label: "Prazo",
    description: "Compromisso fatal do processo com alerta interno configuravel.",
    accent: "border-red-500/30 bg-red-500/10 text-red-200",
  },
  reuniao: {
    label: "Evento",
    description: "Compromisso de agenda com periodo, local e modalidade.",
    accent: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  },
  audiencia: {
    label: "Audiencia",
    description: "Agenda judicial com processo, foro, sala e participantes adicionais.",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
};

const ETAPA_OPTIONS: Array<{ value: EtapaPrazo; label: string }> = [
  { value: "a_fazer", label: "A Fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluido" },
];

function extractItems<T>(response: T[] | { content?: T[] } | undefined): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  return [];
}

function normalizeUserRole(papel?: string): Usuario["papel"] {
  const normalized = papel?.toLowerCase();
  if (normalized === "administrador" || normalized === "advogado" || normalized === "secretaria") {
    return normalized;
  }
  return "advogado";
}

function buildCurrentUserOption(user: AuthUserOption | null): Usuario | null {
  if (!user) return null;

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    cargo: user.cargo,
    papel: normalizeUserRole(user.papel),
    ativo: true,
    initials: user.initials,
    unidadeId: user.unidadeId,
    unidadeNome: user.unidadeNome,
  };
}

function mergeUsuarios(apiUsers: Usuario[], currentUser: Usuario | null): Usuario[] {
  const deduped = new Map<string, Usuario>();

  for (const usuario of [...apiUsers, ...(currentUser ? [currentUser] : [])]) {
    deduped.set(usuario.id, { ...usuario, ativo: usuario.ativo ?? true });
  }

  return Array.from(deduped.values()).sort((left, right) => left.nome.localeCompare(right.nome));
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/\D+/g, "");
}

function buildInitialDraft(initialData?: Prazo | null, initialTipo?: TipoPrazo, dataInicial?: string): AtividadeDraft {
  const tipo = initialData?.tipo ?? initialTipo ?? "tarefa_interna";
  const vinculoTipo = initialData?.vinculoTipo ?? (initialData?.processoId ? "processo" : "");
  const vinculoReferenciaId = initialData?.vinculoReferenciaId ?? initialData?.processoId ?? "";

  return {
    tipo,
    etiqueta: initialData?.etiqueta ?? "",
    titulo: initialData?.titulo ?? "",
    data: initialData?.data ?? dataInicial ?? "",
    hora: initialData?.hora?.slice(0, 5) ?? "",
    dataFim: initialData?.dataFim ?? initialData?.data ?? dataInicial ?? "",
    horaFim: initialData?.horaFim?.slice(0, 5) ?? "",
    diaInteiro: initialData?.diaInteiro ?? false,
    prioridade: initialData?.prioridade ?? PRIORIDADE_DEFAULT[tipo],
    etapa: initialData?.etapa ?? "a_fazer",
    processoId: initialData?.processoId ?? "",
    vinculoTipo,
    vinculoReferenciaId,
    vinculoBusca: "",
    responsavelId: initialData?.advogadoId ?? "",
    participantesIds: initialData?.participantes?.map((participante) => participante.id) ?? [],
    participantesBusca: "",
    descricao: initialData?.descricao ?? "",
    local: initialData?.local ?? "",
    modalidade: initialData?.modalidade ?? "",
    sala: initialData?.sala ?? "",
    alertaValor: initialData?.alertaValor != null ? String(initialData.alertaValor) : "",
    alertaUnidade: initialData?.alertaUnidade ?? "",
  };
}

function formatTipoPrazo(tipo: TipoPrazo) {
  return TIPO_META[tipo].label;
}

export function AtividadeModal({
  open,
  initialData,
  initialTipo,
  dataInicial,
  onClose,
  onSaved,
}: AtividadeModalProps) {
  const { user } = useAuth();
  const currentUserOption = useMemo(() => buildCurrentUserOption(user), [user]);
  const isAdmin = user?.papel?.toLowerCase() === "administrador";
  const [form, setForm] = useState<AtividadeDraft>(() => buildInitialDraft(initialData, initialTipo, dataInicial));
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [processos, setProcessos] = useState<ProcessOption[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialDraft(initialData, initialTipo, dataInicial));
  }, [dataInicial, initialData, initialTipo, open]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoadingOptions(true);

    Promise.allSettled([
      usuariosApi.listar(),
      processosApi.listar({ size: 1000 }),
      atendimentosApi.listar({ size: 1000 }),
    ])
      .then(([usuariosResult, processosResult, atendimentosResult]) => {
        if (!active) return;

        const usersFromApi =
          usuariosResult.status === "fulfilled"
            ? extractItems<Usuario>(usuariosResult.value).filter((item) => item.ativo)
            : [];
        const mergedUsers = mergeUsuarios(usersFromApi, currentUserOption);
        const processItems =
          processosResult.status === "fulfilled"
            ? extractItems<ProcessOption>(processosResult.value)
            : [];
        const atendimentoItems =
          atendimentosResult.status === "fulfilled"
            ? extractItems<AtendimentoOption>(atendimentosResult.value)
            : [];

        setUsuarios(mergedUsers);
        setProcessos(processItems);
        setAtendimentos(atendimentoItems);

        setForm((current) => ({
          ...current,
          responsavelId: isAdmin
            ? current.responsavelId || currentUserOption?.id || mergedUsers[0]?.id || ""
            : currentUserOption?.id || current.responsavelId || mergedUsers[0]?.id || "",
        }));

        if (
          usuariosResult.status === "rejected" &&
          processosResult.status === "rejected" &&
          atendimentosResult.status === "rejected"
        ) {
          toast.error("Nao foi possivel carregar as opcoes do formulario de atividade.");
        }
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [currentUserOption, isAdmin, open]);

  useEffect(() => {
    if (!open || isAdmin || !currentUserOption?.id) return;

    setForm((current) => ({
      ...current,
      responsavelId: currentUserOption.id,
      participantesIds: current.participantesIds.filter((id) => id !== currentUserOption.id),
    }));
  }, [currentUserOption?.id, isAdmin, open]);

  const isEdicao = Boolean(initialData?.id);
  const meta = TIPO_META[form.tipo];
  const isTarefa = form.tipo === "tarefa_interna";
  const isPrazo = form.tipo === "prazo_processual";
  const isEvento = form.tipo === "reuniao";
  const isAudiencia = form.tipo === "audiencia";
  const processoSelecionado = useMemo(
    () => processos.find((processo) => processo.id === form.processoId) ?? null,
    [form.processoId, processos],
  );
  const atendimentoSelecionado = useMemo(
    () => atendimentos.find((atendimento) => atendimento.id === form.vinculoReferenciaId) ?? null,
    [atendimentos, form.vinculoReferenciaId],
  );
  const participantsDisponiveis = useMemo(
    () =>
      usuarios.filter((usuario) => {
        if (usuario.id === form.responsavelId) return false;

        const haystack = [usuario.nome, usuario.cargo, usuario.papel, usuario.unidadeNome]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(form.participantesBusca.toLowerCase().trim());
      }),
    [form.participantesBusca, form.responsavelId, usuarios],
  );
  const vinculoBusca = form.vinculoBusca.toLowerCase().trim();
  const processosFiltrados = useMemo(
    () =>
      processos.filter((processo) =>
        [processo.numero, processo.clienteNome].filter(Boolean).join(" ").toLowerCase().includes(vinculoBusca),
      ),
    [processos, vinculoBusca],
  );
  const atendimentosFiltrados = useMemo(
    () =>
      atendimentos.filter((atendimento) =>
        [atendimento.assunto, atendimento.clienteNome, atendimento.processoNumero]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(vinculoBusca),
      ),
    [atendimentos, vinculoBusca],
  );
  const canClearVinculo = !isPrazo && !isAudiencia;
  const showProcessoVinculo = form.vinculoTipo === "processo";
  const showAtendimentoVinculo = form.vinculoTipo === "atendimento";
  const responsavelSelecionado =
    usuarios.find((usuario) => usuario.id === form.responsavelId) ??
    (currentUserOption?.id === form.responsavelId ? currentUserOption : null);

  const updateField = <K extends keyof AtividadeDraft>(field: K, value: AtividadeDraft[K]) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "tipo") {
        next.prioridade = PRIORIDADE_DEFAULT[value as TipoPrazo];
        next.etapa = "a_fazer";

        if (value === "audiencia" || value === "prazo_processual") {
          if (current.vinculoTipo !== "processo") {
            next.processoId = "";
            next.vinculoReferenciaId = "";
            next.vinculoBusca = "";
          }
          next.vinculoTipo = "processo";
        }

        if (value === "tarefa_interna") {
          next.dataFim = next.data;
          next.horaFim = "";
          next.diaInteiro = false;
        }
      }

      if (field === "data" && !current.dataFim) {
        next.dataFim = value as string;
      }

      if (field === "responsavelId") {
        next.participantesIds = current.participantesIds.filter((id) => id !== value);
      }

      if (field === "vinculoTipo") {
        next.vinculoReferenciaId = "";
        next.processoId = "";
        next.vinculoBusca = "";
      }

      if (field === "vinculoReferenciaId" && next.vinculoTipo === "processo") {
        next.processoId = value as string;
      }

      if (field === "processoId" && next.vinculoTipo === "processo") {
        next.vinculoReferenciaId = value as string;
      }

      return next;
    });
  };

  const handleSelecionarVinculo = (tipo: Exclude<TipoVinculoPrazo, "caso">) => {
    updateField("vinculoTipo", form.vinculoTipo === tipo && canClearVinculo ? "" : tipo);
  };

  const handleLimparVinculo = () => {
    if (!canClearVinculo) return;
    updateField("vinculoTipo", "");
  };

  const toggleParticipante = (usuarioId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      participantesIds: checked
        ? Array.from(new Set([...current.participantesIds, usuarioId]))
        : current.participantesIds.filter((id) => id !== usuarioId),
    }));
  };

  const validate = () => {
    if (!form.titulo.trim()) return "O titulo da atividade e obrigatorio.";
    if (!form.data) return "A data inicial e obrigatoria.";
    if (!form.responsavelId) return "Selecione um responsavel.";

    if (isTarefa && !form.descricao.trim()) {
      return "A descricao da tarefa e obrigatoria.";
    }

    if (isPrazo && !form.processoId) {
      return "O prazo precisa de um processo vinculado. O modulo de Caso ficara disponivel futuramente.";
    }

    if (isAudiencia) {
      if (!form.processoId) return "Audiencias exigem um processo vinculado.";
      if (!form.hora || !form.horaFim) return "Informe o horario inicial e final da audiencia.";
    }

    if ((isEvento || isAudiencia) && !form.dataFim) {
      return "Informe a data final do compromisso.";
    }

    if ((isEvento || isAudiencia) && !form.diaInteiro && form.hora && form.horaFim && form.data === form.dataFim && form.horaFim < form.hora) {
      return "O horario final nao pode ser anterior ao horario inicial.";
    }

    if ((isEvento || isTarefa) && form.vinculoTipo === "caso") {
      return "O modulo de Caso ainda nao foi implementado. A fundacao ficou preparada para a proxima etapa.";
    }

    return null;
  };

  const handleSalvar = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const alertaValor = form.alertaValor.trim() ? Number(form.alertaValor) : null;
    if (alertaValor != null && Number.isNaN(alertaValor)) {
      toast.error("O alerta deve ser um numero valido.");
      return;
    }

    const vinculoTipo = isAudiencia ? "processo" : form.vinculoTipo;
    const vinculoReferenciaId =
      vinculoTipo === "processo"
        ? form.processoId
        : vinculoTipo === "atendimento"
        ? form.vinculoReferenciaId
        : "";

    const payload = {
      titulo: form.titulo.trim(),
      data: form.data,
      hora: form.diaInteiro ? null : form.hora || null,
      dataFim: isEvento || isAudiencia ? form.dataFim || form.data : form.data,
      horaFim: form.diaInteiro ? null : (isEvento || isAudiencia ? form.horaFim || null : null),
      diaInteiro: form.diaInteiro,
      tipo: form.tipo,
      prioridade: form.prioridade,
      etapa: form.etapa.toUpperCase(),
      processoId: vinculoTipo === "processo" ? form.processoId || null : null,
      advogadoId: isAdmin ? form.responsavelId : currentUserOption?.id ?? form.responsavelId,
      participantesIds: form.participantesIds,
      etiqueta: form.etiqueta.trim() || null,
      descricao: form.descricao.trim() || null,
      local: form.local.trim() || null,
      modalidade: form.modalidade ? form.modalidade.toUpperCase() : null,
      sala: form.sala.trim() || null,
      alertaValor,
      alertaUnidade: form.alertaUnidade ? form.alertaUnidade.toUpperCase() : null,
      vinculoTipo: vinculoTipo ? vinculoTipo.toUpperCase() : "",
      vinculoReferenciaId: vinculoReferenciaId || null,
      quadroKanban: initialData?.quadroKanban ?? "Operacional",
      unidadeId: user?.unidadeId ?? null,
    };

    setSaving(true);
    try {
      const atividade = isEdicao && initialData?.id
        ? await prazosApi.atualizar(initialData.id, payload)
        : await prazosApi.criar(payload);

      toast.success(isEdicao ? "Atividade atualizada com sucesso." : "Atividade criada com sucesso.");
      onSaved?.(atividade);
      onClose();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Nao foi possivel guardar a atividade.");
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = isAudiencia
    ? "Titulo da audiencia *"
    : isEvento
    ? "Titulo do evento *"
    : isPrazo
    ? "Titulo do prazo *"
    : "Titulo da tarefa *";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="!flex h-[min(92vh,940px)] w-[min(1120px,calc(100vw-1rem))] max-w-[min(1120px,calc(100vw-1rem))] !flex-col overflow-hidden rounded-2xl border border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>{isEdicao ? `Editar ${formatTipoPrazo(form.tipo)}` : `Nova ${formatTipoPrazo(form.tipo)}`}</DialogTitle>
                <Badge className={cn("border", meta.accent)}>{meta.label}</Badge>
              </div>
              <DialogDescription>{meta.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="scroll-subtle min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.keys(TIPO_META) as TipoPrazo[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => updateField("tipo", tipo)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  form.tipo === tipo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40",
                )}
              >
                {TIPO_META[tipo].label}
              </button>
            ))}
          </div>

          {loadingOptions ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[1.55fr,0.95fr]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>{titleLabel}</Label>
                      <Input value={form.titulo} onChange={(e) => updateField("titulo", e.target.value)} placeholder={isTarefa ? "Ex.: Preparar minuta da contestacao" : "Ex.: Audiencia de instrucao"} />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Tag / Etiqueta</Label>
                      <Input value={form.etiqueta} onChange={(e) => updateField("etiqueta", e.target.value)} placeholder="Ex.: urgente, cliente VIP, sustentacao" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Responsavel *</Label>
                      {isAdmin ? (
                        <select
                          value={form.responsavelId}
                          onChange={(e) => updateField("responsavelId", e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                        >
                          <option value="">Selecione</option>
                          {usuarios.map((usuario) => (
                            <option key={usuario.id} value={usuario.id}>
                              {usuario.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <Input value={currentUserOption?.nome ?? ""} readOnly />
                          <p className="text-xs text-muted-foreground">
                            Apenas administradores podem atribuir a atividade para outro responsavel.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>{isPrazo ? "Data limite *" : "Data inicial *"}</Label>
                      <Input type="date" value={form.data} onChange={(e) => updateField("data", e.target.value)} />
                    </div>

                    {!isTarefa && (
                      <>
                        <div className="space-y-1.5">
                          <Label>{isEvento ? "De" : "Hora inicial"}</Label>
                          <Input type="time" value={form.hora} onChange={(e) => updateField("hora", e.target.value)} disabled={form.diaInteiro} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{isEvento ? "Ate" : "Data final"}</Label>
                          <Input type="date" value={form.dataFim} onChange={(e) => updateField("dataFim", e.target.value)} />
                        </div>
                      </>
                    )}

                    {(isEvento || isAudiencia) && (
                      <>
                        <div className="space-y-1.5">
                          <Label>{isEvento ? "Hora final" : "Hora final *"}</Label>
                          <Input type="time" value={form.horaFim} onChange={(e) => updateField("horaFim", e.target.value)} disabled={form.diaInteiro} />
                        </div>
                        <div className="space-y-3 rounded-xl border border-border bg-card/50 px-3 py-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id="dia-inteiro"
                              checked={form.diaInteiro}
                              onCheckedChange={(checked) => updateField("diaInteiro", checked === true)}
                            />
                            <Label htmlFor="dia-inteiro" className="cursor-pointer">
                              Marcacao de dia inteiro
                            </Label>
                          </div>
                        </div>
                      </>
                    )}

                    {(isTarefa || isPrazo) && (
                      <div className="space-y-1.5">
                        <Label>Prioridade</Label>
                        <select
                          value={form.prioridade}
                          onChange={(e) => updateField("prioridade", e.target.value as PrioridadePrazo)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baixa">Baixa</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Coluna do Kanban *</Label>
                      <select
                        value={form.etapa}
                        onChange={(e) => updateField("etapa", e.target.value as EtapaPrazo)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                      >
                        {ETAPA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Contexto e alertas</h4>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Vincular a</Label>
                      <div className="flex flex-wrap gap-2">
                        {canClearVinculo && (
                          <button
                            type="button"
                            onClick={handleLimparVinculo}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                              !form.vinculoTipo
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40",
                            )}
                          >
                            Sem vinculo
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelecionarVinculo("processo")}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                            form.vinculoTipo === "processo"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40",
                          )}
                        >
                          Processo
                        </button>
                        {!isPrazo && !isAudiencia && (
                          <button
                            type="button"
                            onClick={() => handleSelecionarVinculo("atendimento")}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                              form.vinculoTipo === "atendimento"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40",
                            )}
                          >
                            Atendimento
                          </button>
                        )}
                        <button
                          type="button"
                          disabled
                          className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-70"
                          title="Base preparada para implementação futura do modulo de Casos."
                        >
                          Caso (futuro)
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {canClearVinculo
                          ? "O vinculo e opcional para tarefas e eventos. Pode trocar ou remover sem fechar o modal."
                          : "Prazo e audiencia continuam a exigir processo vinculado."}
                      </p>
                    </div>

                    {showProcessoVinculo && (
                      <div className="space-y-3 md:col-span-2">
                        <Label>{isAudiencia || isPrazo ? "Processo *" : "Buscar processo"}</Label>
                        <Input
                          value={form.vinculoBusca}
                          onChange={(e) => updateField("vinculoBusca", e.target.value)}
                          placeholder="Buscar por numero do processo ou cliente..."
                        />
                        {processoSelecionado && (
                          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
                            <p className="font-medium text-foreground">{processoSelecionado.numero}</p>
                            {processoSelecionado.clienteNome && (
                              <p className="text-xs text-muted-foreground">{processoSelecionado.clienteNome}</p>
                            )}
                          </div>
                        )}
                        <div className="scroll-subtle max-h-48 space-y-2 overflow-y-auto pr-1">
                          {processosFiltrados.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                              Nenhum processo encontrado para essa busca.
                            </div>
                          ) : (
                            processosFiltrados.slice(0, 10).map((processo) => {
                              const selected = processo.id === form.processoId;
                              return (
                                <button
                                  key={processo.id}
                                  type="button"
                                  onClick={() => updateField("processoId", processo.id)}
                                  className={cn(
                                    "flex w-full flex-col rounded-xl border px-3 py-3 text-left transition-colors",
                                    selected
                                      ? "border-primary bg-primary/10"
                                      : "border-border bg-card/60 hover:border-primary/30",
                                  )}
                                >
                                  <span className="text-sm font-medium text-foreground">{processo.numero}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {processo.clienteNome || "Sem cliente vinculado"}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {showAtendimentoVinculo && (
                      <div className="space-y-3 md:col-span-2">
                        <Label>Buscar atendimento</Label>
                        <Input
                          value={form.vinculoBusca}
                          onChange={(e) => updateField("vinculoBusca", e.target.value)}
                          placeholder="Buscar por assunto, cliente ou processo..."
                        />
                        {atendimentoSelecionado && (
                          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
                            <p className="font-medium text-foreground">{atendimentoSelecionado.assunto}</p>
                            <p className="text-xs text-muted-foreground">
                              {atendimentoSelecionado.clienteNome}
                              {atendimentoSelecionado.processoNumero ? ` • ${atendimentoSelecionado.processoNumero}` : ""}
                            </p>
                          </div>
                        )}
                        <div className="scroll-subtle max-h-48 space-y-2 overflow-y-auto pr-1">
                          {atendimentosFiltrados.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                              Nenhum atendimento encontrado para essa busca.
                            </div>
                          ) : (
                            atendimentosFiltrados.slice(0, 10).map((atendimento) => {
                              const selected = atendimento.id === form.vinculoReferenciaId;
                              return (
                                <button
                                  key={atendimento.id}
                                  type="button"
                                  onClick={() => updateField("vinculoReferenciaId", atendimento.id)}
                                  className={cn(
                                    "flex w-full flex-col rounded-xl border px-3 py-3 text-left transition-colors",
                                    selected
                                      ? "border-primary bg-primary/10"
                                      : "border-border bg-card/60 hover:border-primary/30",
                                  )}
                                >
                                  <span className="text-sm font-medium text-foreground">{atendimento.assunto}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {atendimento.clienteNome}
                                    {atendimento.processoNumero ? ` • ${atendimento.processoNumero}` : ""}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {(isEvento || isAudiencia) && (
                      <>
                        <div className="space-y-1.5">
                          <Label>{isAudiencia ? "Forum / endereco" : "Endereco ou local"}</Label>
                          <Input value={form.local} onChange={(e) => updateField("local", e.target.value)} placeholder={isAudiencia ? "Forum da comarca, endereco ou link" : "Sala, escritorio, forum ou link"} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Modalidade</Label>
                          <select
                            value={form.modalidade}
                            onChange={(e) => updateField("modalidade", e.target.value as ModalidadeAtividade | "")}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                          >
                            <option value="">Selecione</option>
                            <option value="presencial">Presencial</option>
                            <option value="online">Online</option>
                            <option value="hibrido">Hibrido</option>
                          </select>
                        </div>
                      </>
                    )}

                    {isAudiencia && (
                      <div className="space-y-1.5">
                        <Label>Sala do forum</Label>
                        <Input value={form.sala} onChange={(e) => updateField("sala", e.target.value)} placeholder="Sala, vara ou observacao local" />
                      </div>
                    )}

                    {(isEvento || isAudiencia || isPrazo) && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Alerta interno</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={form.alertaValor}
                            onChange={(e) => updateField("alertaValor", sanitizeIntegerInput(e.target.value))}
                            placeholder="Ex.: 2"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Unidade do alerta</Label>
                          <select
                            value={form.alertaUnidade}
                            onChange={(e) => updateField("alertaUnidade", e.target.value as TipoUnidadeAlertaPrazo | "")}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                          >
                            <option value="">Selecione</option>
                            <option value="horas">Horas antes</option>
                            <option value="dias">Dias antes</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <Label>{isTarefa ? "Detalhes da tarefa *" : "Observacoes"}</Label>
                      <Textarea
                        value={form.descricao}
                        onChange={(e) => updateField("descricao", e.target.value)}
                        placeholder={isTarefa ? "Descreva claramente o que precisa ser executado..." : "Anote contexto, instrucoes, observacoes ou detalhes operacionais..."}
                        className="min-h-[120px] resize-none"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Participantes e alertas</h4>
                  </div>

                  <div className="rounded-xl border border-dashed border-border bg-card/40 px-3 py-3 text-xs text-muted-foreground">
                    Participantes adicionais recebem os alertas internos da atividade, mas o responsavel principal continua a ser o dono do card no Kanban.
                  </div>

                  <div className="mt-4 space-y-3">
                    <Input
                      value={form.participantesBusca}
                      onChange={(e) => updateField("participantesBusca", e.target.value)}
                      placeholder="Pesquisar participante por nome, cargo ou unidade..."
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{participantsDisponiveis.length} resultado(s)</span>
                      <span>{form.participantesIds.length} selecionado(s)</span>
                    </div>
                  </div>

                  <div className="scroll-subtle mt-4 max-h-[44vh] space-y-2 overflow-y-auto pr-1">
                    {participantsDisponiveis.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                        Nenhum participante encontrado.
                      </div>
                    ) : (
                      participantsDisponiveis.map((usuario) => {
                        const checked = form.participantesIds.includes(usuario.id);
                        return (
                          <label
                            key={usuario.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-3 transition-colors hover:border-primary/30"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleParticipante(usuario.id, value === true)}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{usuario.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {usuario.cargo || usuario.papel}
                                {usuario.unidadeNome ? ` • ${usuario.unidadeNome}` : ""}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="outline">{meta.label}</Badge>
                    <p className="text-xs text-muted-foreground">
                      {form.participantesIds.length} participante(s) adicional(is)
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Responsavel: <span className="text-foreground">{responsavelSelecionado?.nome || "Nao definido"}</span></p>
                    <p>Coluna: <span className="text-foreground">{ETAPA_OPTIONS.find((option) => option.value === form.etapa)?.label}</span></p>
                    {form.vinculoTipo && (
                      <p>Vinculo: <span className="text-foreground capitalize">{form.vinculoTipo}</span></p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            O vinculo com <strong className="font-medium text-foreground">Caso</strong> ja esta previsto na estrutura e sera ativado quando o modulo existir.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSalvar()} disabled={saving || loadingOptions} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdicao ? "Guardar alteracoes" : "Criar atividade"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
