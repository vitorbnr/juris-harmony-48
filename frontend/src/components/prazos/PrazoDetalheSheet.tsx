import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  MoveLeft,
  MoveRight,
  Pencil,
  Scale,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { EditarPrazoModal } from "@/components/modals/EditarPrazoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { prazosApi } from "@/services/api";
import { toast } from "sonner";
import type { EtapaPrazo, Prazo, PrazoComentario, PrazoDetalhe } from "@/types";

const etapaLabel: Record<EtapaPrazo, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em andamento",
  concluido: "Concluido",
};

const tipoLabel: Record<Prazo["tipo"], string> = {
  tarefa_interna: "Tarefa",
  prazo_processual: "Prazo",
  reuniao: "Evento",
  audiencia: "Audiencia",
};

const prioridadeClass: Record<Prazo["prioridade"], string> = {
  alta: "border-red-500/30 bg-red-500/10 text-red-300",
  media: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  baixa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function normalizeEtapa(prazo: Prazo): EtapaPrazo {
  if (prazo.etapa) return prazo.etapa;
  return prazo.concluido ? "concluido" : "a_fazer";
}

function isPrazoParticipant(prazo: Prazo, userId?: string) {
  return Boolean(userId && prazo.participantes?.some((participante) => participante.id === userId));
}

function canEditPrazo(prazo: Prazo, userId?: string, userRole?: string) {
  if (!userId) return false;
  if (userRole?.toLowerCase() === "administrador") return true;
  return prazo.advogadoId === userId;
}

function canOperatePrazo(prazo: Prazo, userId?: string, userRole?: string) {
  return canEditPrazo(prazo, userId, userRole) || isPrazoParticipant(prazo, userId);
}

function formatDate(date?: string | null) {
  if (!date) return "Nao informado";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateTime(dateTime?: string | null) {
  if (!dateTime) return "Nao informado";
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) return dateTime;
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAlerta(valor?: number | null, unidade?: string | null) {
  if (valor == null || !unidade) return "Sem alerta interno";
  return `${valor} ${unidade === "horas" ? (valor === 1 ? "hora" : "horas") : valor === 1 ? "dia" : "dias"} antes`;
}

function formatEventoTipo(tipo?: string | null) {
  switch ((tipo ?? "").toUpperCase()) {
    case "PUBLICACAO":
      return "Publicacao";
    case "INTIMACAO":
      return "Intimacao";
    case "MOVIMENTACAO":
      return "Movimentacao";
    default:
      return tipo || "Nao informado";
  }
}

function formatEventoStatus(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "NOVO":
      return "Novo";
    case "EM_TRIAGEM":
      return "Em triagem";
    case "CONCLUIDO":
      return "Concluido";
    case "ARQUIVADO":
      return "Arquivado";
    default:
      return status || "Nao informado";
  }
}

type PrazoDetalheSheetProps = {
  open: boolean;
  prazoId: string | null;
  onClose: () => void;
  onPrazoAtualizado?: (prazo: Prazo) => void;
  onPrazoExcluido?: (prazoId: string) => void;
};

export function PrazoDetalheSheet({
  open,
  prazoId,
  onClose,
  onPrazoAtualizado,
  onPrazoExcluido,
}: PrazoDetalheSheetProps) {
  const { user } = useAuth();
  const [detalhe, setDetalhe] = useState<PrazoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!open || !prazoId) {
      setDetalhe(null);
      setCommentDraft("");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    prazosApi
      .buscarDetalhe(prazoId)
      .then((response) => {
        if (!active) return;
        setDetalhe(response);
      })
      .catch(() => {
        if (!active) return;
        toast.error("Nao foi possivel carregar os detalhes desta atividade.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, prazoId]);

  const prazo = detalhe?.prazo ?? null;
  const etapaAtual = prazo ? normalizeEtapa(prazo) : "a_fazer";
  const canEdit = prazo ? canEditPrazo(prazo, user?.id, user?.papel) : false;
  const canOperate = prazo ? canOperatePrazo(prazo, user?.id, user?.papel) : false;
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasado = Boolean(prazo && !prazo.concluido && prazo.data < hoje);

  const participantesTexto = useMemo(() => {
    if (!prazo?.participantes?.length) return "Sem participantes adicionais";
    return prazo.participantes.map((participante) => participante.nome).join(", ");
  }, [prazo?.participantes]);

  const handlePrazoAtualizado = (prazoAtualizado: Prazo) => {
    setDetalhe((current) => (current ? { ...current, prazo: prazoAtualizado } : current));
    onPrazoAtualizado?.(prazoAtualizado);
  };

  const recarregarDetalhe = async (id: string) => {
    const detalheAtualizado = await prazosApi.buscarDetalhe(id);
    setDetalhe(detalheAtualizado);
    onPrazoAtualizado?.(detalheAtualizado.prazo);
    return detalheAtualizado;
  };

  const moverPrazo = async (etapa: EtapaPrazo) => {
    if (!prazo) return;

    setMutating(true);
    try {
      const prazoAtualizado = await prazosApi.atualizarEtapaKanban(prazo.id, etapa.toUpperCase());
      handlePrazoAtualizado(prazoAtualizado);
      try {
        await recarregarDetalhe(prazo.id);
      } catch {
        void 0;
      }
      toast.success(`Coluna atualizada para ${etapaLabel[etapa]}.`);
    } catch {
      toast.error("Nao foi possivel atualizar a coluna do Kanban.");
    } finally {
      setMutating(false);
    }
  };

  const concluirOuReabrir = async () => {
    if (!prazo) return;

    setMutating(true);
    try {
      const prazoAtualizado = await prazosApi.concluir(prazo.id);
      handlePrazoAtualizado(prazoAtualizado);
      try {
        await recarregarDetalhe(prazo.id);
      } catch {
        void 0;
      }
      toast.success(prazoAtualizado.concluido ? "Atividade concluida." : "Atividade reaberta.");
    } catch {
      toast.error("Nao foi possivel alterar o status desta atividade.");
    } finally {
      setMutating(false);
    }
  };

  const excluirPrazo = async () => {
    if (!prazo) return;
    if (!confirm(`Deseja realmente excluir "${prazo.titulo}"?`)) return;

    setMutating(true);
    try {
      await prazosApi.excluir(prazo.id);
      toast.success("Atividade excluida.");
      onPrazoExcluido?.(prazo.id);
      onClose();
    } catch {
      toast.error("Nao foi possivel excluir esta atividade.");
    } finally {
      setMutating(false);
    }
  };

  const adicionarComentario = async () => {
    if (!prazo) return;
    const conteudo = commentDraft.trim();
    if (!conteudo) return;

    setCommentSaving(true);
    try {
      const comentario = await prazosApi.adicionarComentario(prazo.id, conteudo);
      setDetalhe((current) =>
        current
          ? {
              ...current,
              comentarios: [comentario, ...current.comentarios],
              historico: [
                {
                  id: `local-comment-${comentario.id}`,
                  descricao: "Comentario interno adicionado ao prazo.",
                  acao: "EDITOU",
                  usuarioNome: comentario.autorNome,
                  dataHora: comentario.criadoEm ?? null,
                },
                ...current.historico,
              ],
            }
          : current,
      );
      setCommentDraft("");
      toast.success("Comentario interno guardado.");
    } catch {
      toast.error("Nao foi possivel guardar o comentario.");
    } finally {
      setCommentSaving(false);
    }
  };

  const acaoPrimaria =
    etapaAtual === "a_fazer"
      ? { label: "Iniciar", etapa: "em_andamento" as EtapaPrazo, icon: MoveRight }
      : etapaAtual === "em_andamento"
        ? { label: "Concluir", etapa: "concluido" as EtapaPrazo, icon: CheckCircle2 }
        : { label: "Reabrir", etapa: "em_andamento" as EtapaPrazo, icon: MoveLeft };
  const AcaoPrimariaIcon = acaoPrimaria.icon;

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent side="right" className="w-full border-l border-border bg-card p-0 sm:max-w-[920px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalhes da atividade</SheetTitle>
            <SheetDescription>Visao completa do prazo, tarefa, evento ou audiencia selecionada.</SheetDescription>
          </SheetHeader>

          {loading || !prazo ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-border bg-gradient-to-br from-primary/8 via-card to-card px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/10 text-primary">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {tipoLabel[prazo.tipo]}
                      </Badge>
                      <Badge variant="outline" className={cn("border", prioridadeClass[prazo.prioridade])}>
                        {prazo.prioridade}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background/70 text-foreground">
                        {etapaLabel[etapaAtual]}
                      </Badge>
                      {!canEdit && canOperate && (
                        <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                          Participante
                        </Badge>
                      )}
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{prazo.titulo}</h2>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        { label: "Data", value: formatDate(prazo.data), accent: atrasado ? "text-red-400" : "text-foreground" },
                        { label: "Processo", value: detalhe?.processo?.numero ?? prazo.processoNumero ?? "Sem processo", accent: "text-foreground" },
                        { label: "Responsavel", value: prazo.advogadoNome ?? "Nao definido", accent: "text-foreground" },
                        { label: "Outros envolvidos", value: participantesTexto, accent: "text-muted-foreground" },
                        { label: "Quadro", value: prazo.quadroKanban ?? "Operacional", accent: "text-foreground" },
                        { label: "Coluna", value: etapaLabel[etapaAtual], accent: "text-foreground" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                          <p className={cn("mt-1 text-sm font-medium", item.accent)}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canOperate && (
                      <>
                        <Button className="gap-2" onClick={() => void moverPrazo(acaoPrimaria.etapa)} disabled={mutating}>
                          {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AcaoPrimariaIcon className="h-4 w-4" />}
                          {acaoPrimaria.label}
                        </Button>
                        {etapaAtual !== "a_fazer" && (
                          <Button variant="outline" className="gap-2" onClick={() => void moverPrazo("a_fazer")} disabled={mutating}>
                            <MoveLeft className="h-4 w-4" />
                            A Fazer
                          </Button>
                        )}
                        <Button variant="outline" className="gap-2" onClick={concluirOuReabrir} disabled={mutating}>
                          <CheckCircle2 className="h-4 w-4" />
                          {prazo.concluido ? "Reabrir" : "Alternar status"}
                        </Button>
                      </>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => setEditando(true)} disabled={mutating} className="h-10 w-10">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={excluirPrazo} disabled={mutating} className="h-10 w-10 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="atividades" className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border px-6">
                  <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0">
                    {[
                      ["atividades", "Atividades"],
                      ["comentarios", "Comentarios"],
                      ["publicacao", "Publicacao"],
                      ["outros", "Outros"],
                      ["historico", "Historico de alteracoes"],
                    ].map(([value, label]) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="rounded-none border-b-2 border-transparent px-1 py-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-6 py-5">
                    <TabsContent value="atividades" className="mt-0 space-y-5">
                      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="rounded-3xl border border-border bg-card/60 p-5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h3 className="text-base font-semibold text-foreground">Resumo operacional</h3>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                              { label: "Titulo", value: prazo.titulo },
                              { label: "Tipo", value: tipoLabel[prazo.tipo] },
                              { label: "Data limite", value: formatDate(prazo.data) },
                              { label: "Horario", value: prazo.diaInteiro ? "Dia inteiro" : prazo.hora ? prazo.hora.slice(0, 5) : "Sem horario" },
                              { label: "Responsavel", value: prazo.advogadoNome ?? "Nao definido" },
                              { label: "Participantes", value: participantesTexto },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Descricao / escopo</p>
                            <p className="mt-2 text-sm leading-6 text-foreground">
                              {prazo.descricao?.trim() || "Sem descricao operacional registada para este item."}
                            </p>
                          </div>
                        </section>

                        <section className="space-y-5">
                          <div className="rounded-3xl border border-border bg-card/60 p-5">
                            <div className="flex items-center gap-2">
                              <Scale className="h-4 w-4 text-primary" />
                              <h3 className="text-base font-semibold text-foreground">Contexto juridico</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Numero do processo</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{detalhe?.processo?.numero ?? prazo.processoNumero ?? "Nao vinculado"}</p>
                              </div>
                              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cliente</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{detalhe?.processo?.clienteNome ?? prazo.clienteNome ?? "Nao informado"}</p>
                              </div>
                              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tribunal / Vara</p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                  {[detalhe?.processo?.tribunal, detalhe?.processo?.vara].filter(Boolean).join(" • ") || "Nao informado"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-border bg-card/60 p-5">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <h3 className="text-base font-semibold text-foreground">Acoes rapidas</h3>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {canOperate ? (
                                <>
                                  <Button className="gap-2" onClick={() => void moverPrazo(acaoPrimaria.etapa)} disabled={mutating}>
                                    <AcaoPrimariaIcon className="h-4 w-4" />
                                    {acaoPrimaria.label}
                                  </Button>
                                  <Button variant="outline" className="gap-2" onClick={concluirOuReabrir} disabled={mutating}>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {prazo.concluido ? "Reabrir" : "Concluir"}
                                  </Button>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Sem permissao de operacao neste item.</p>
                              )}
                              {canEdit && (
                                <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setEditando(true)} disabled={mutating}>
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>
                    </TabsContent>

                    <TabsContent value="comentarios" className="mt-0 space-y-5">
                      <section className="rounded-3xl border border-border bg-card/60 p-5">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <h3 className="text-base font-semibold text-foreground">Comentarios internos</h3>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                          <Textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="Registe observacoes internas, contexto do prazo, combinados da equipa ou apontamentos de execucao..."
                            className="min-h-[140px] resize-none border-border bg-background"
                          />
                          <div className="mt-3 flex justify-end">
                            <Button onClick={() => void adicionarComentario()} disabled={commentSaving || !commentDraft.trim()} className="gap-2">
                              {commentSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                              Guardar comentario
                            </Button>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          {detalhe.comentarios.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-5 py-8 text-sm text-muted-foreground">
                              Nenhum comentario interno registado ainda.
                            </div>
                          ) : (
                            detalhe.comentarios.map((comentario: PrazoComentario) => (
                              <article key={comentario.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
                                    <UserRound className="h-3.5 w-3.5" />
                                    {comentario.autorNome ?? "Utilizador"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{formatDateTime(comentario.criadoEm)}</span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{comentario.conteudo}</p>
                              </article>
                            ))
                          )}
                        </div>
                      </section>
                    </TabsContent>

                    <TabsContent value="publicacao" className="mt-0">
                      <section className="rounded-3xl border border-border bg-card/60 p-5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="text-base font-semibold text-foreground">Publicacao vinculada</h3>
                        </div>

                        {detalhe.eventoJuridico ? (
                          <div className="mt-5 space-y-4">
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                                  {detalhe.eventoJuridico.fonte ?? "Fonte"}
                                </Badge>
                                <Badge variant="outline" className="border-border bg-background/70 text-foreground">
                                  {formatEventoTipo(detalhe.eventoJuridico.tipo)}
                                </Badge>
                                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                                  {formatEventoStatus(detalhe.eventoJuridico.status)}
                                </Badge>
                              </div>
                              <h4 className="mt-4 text-xl font-semibold text-foreground">
                                {detalhe.eventoJuridico.titulo ?? "Evento juridico vinculado"}
                              </h4>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                {detalhe.eventoJuridico.descricao ?? "Sem descricao complementar."}
                              </p>
                              <div className="mt-5 grid gap-3 md:grid-cols-2">
                                {[
                                  { label: "Orgao julgador", value: detalhe.eventoJuridico.orgaoJulgador },
                                  { label: "Referencia externa", value: detalhe.eventoJuridico.referenciaExterna },
                                  { label: "Destinatario", value: detalhe.eventoJuridico.destinatario },
                                  { label: "Parte relacionada", value: detalhe.eventoJuridico.parteRelacionada },
                                  { label: "Data do evento", value: formatDateTime(detalhe.eventoJuridico.dataEvento) },
                                  { label: "Criado em", value: formatDateTime(detalhe.eventoJuridico.criadoEm) },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">{item.value || "Nao informado"}</p>
                                  </div>
                                ))}
                              </div>
                              {detalhe.eventoJuridico.linkOficial && (
                                <div className="mt-4">
                                  <Button asChild variant="outline" className="gap-2">
                                    <a href={detalhe.eventoJuridico.linkOficial} target="_blank" rel="noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                      Abrir fonte oficial
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/60 px-5 py-10 text-sm text-muted-foreground">
                            O modulo de publicacoes sera ligado aqui futuramente. Este espaco ja esta preparado para receber a fonte oficial, o teor util e o historico da vinculacao quando essa camada entrar no sistema.
                          </div>
                        )}
                      </section>
                    </TabsContent>

                    <TabsContent value="outros" className="mt-0">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-3xl border border-border bg-card/60 p-5">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <h3 className="text-base font-semibold text-foreground">Alertas e agenda</h3>
                          </div>
                          <div className="mt-4 space-y-3">
                            {[
                              { label: "Alerta interno", value: formatAlerta(prazo.alertaValor, prazo.alertaUnidade) },
                              { label: "Data inicial", value: formatDate(prazo.data) },
                              { label: "Data final", value: prazo.dataFim ? formatDate(prazo.dataFim) : "Nao informado" },
                              { label: "Horario", value: prazo.diaInteiro ? "Dia inteiro" : prazo.hora ? prazo.hora.slice(0, 5) : "Sem horario" },
                              { label: "Horario final", value: prazo.horaFim ? prazo.horaFim.slice(0, 5) : "Nao informado" },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="rounded-3xl border border-border bg-card/60 p-5">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <h3 className="text-base font-semibold text-foreground">Contexto complementar</h3>
                          </div>
                          <div className="mt-4 space-y-3">
                            {[
                              { label: "Etiqueta", value: prazo.etiqueta || "Sem etiqueta" },
                              { label: "Modalidade", value: prazo.modalidade || "Nao informada" },
                              { label: "Local", value: prazo.local || "Nao informado" },
                              { label: "Sala", value: prazo.sala || "Nao informada" },
                              { label: "Vinculo", value: prazo.vinculoTipo || "Sem vinculo complementar" },
                              { label: "Unidade", value: detalhe.unidadeNome || "Nao informada" },
                              { label: "Criado em", value: formatDateTime(detalhe.criadoEm) },
                              { label: "Criado por", value: detalhe.criadoPorNome || "Nao identificado" },
                            ].map((item) => (
                              <div key={item.label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-0">
                      <section className="rounded-3xl border border-border bg-card/60 p-5">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />
                          <h3 className="text-base font-semibold text-foreground">Historico de alteracoes</h3>
                        </div>

                        <div className="mt-5">
                          {detalhe.historico.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-5 py-8 text-sm text-muted-foreground">
                              Nenhuma alteracao registada ainda.
                            </div>
                          ) : (
                            <div className="relative space-y-0">
                              {detalhe.historico.map((item, index) => (
                                <div key={item.id} className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                    {index < detalhe.historico.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                                  </div>
                                  <div className="pb-5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {item.acao && (
                                        <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                                          {item.acao.toLowerCase()}
                                        </Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">{formatDateTime(item.dataHora)}</span>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-foreground">{item.descricao}</p>
                                    {item.usuarioNome && <p className="mt-1 text-xs text-muted-foreground">por {item.usuarioNome}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {editando && prazo && (
        <EditarPrazoModal
          prazo={prazo}
          onClose={() => setEditando(false)}
          onSaved={async () => {
            setEditando(false);
            if (!prazoId) return;
            try {
              await recarregarDetalhe(prazoId);
            } catch {
              toast.error("Nao foi possivel recarregar os detalhes apos a edicao.");
            }
          }}
        />
      )}
    </>
  );
}
