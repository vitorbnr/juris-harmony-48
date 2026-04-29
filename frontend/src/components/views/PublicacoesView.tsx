import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  CircleOff,
  History,
  Inbox,
  Link2,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  WandSparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PrazoDateCalculator } from "@/components/prazos/PrazoDateCalculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { processosApi, publicacoesApi, usuariosApi } from "@/services/api";
import type { Processo, Usuario } from "@/types";
import type {
  Publicacao,
  PublicacaoHistorico,
  PublicacaoMetricas,
  StatusTratamentoPublicacao,
} from "@/types/publicacoes";
import { toast } from "sonner";

type FiltroStatus = StatusTratamentoPublicacao | "TODAS";
type FiltroFila = "TODAS" | "MINHAS" | "PRAZO_SUSPEITO" | "SEM_VINCULO" | "SEM_RESPONSAVEL";
type ModoAtividadePublicacao = "TAREFA" | "PRAZO" | "AUDIENCIA";

const metricasIniciais: PublicacaoMetricas = {
  naoTratadasHoje: 0,
  tratadasHoje: 0,
  descartadasHoje: 0,
  naoTratadas: 0,
  prazoSuspeito: 0,
  semVinculo: 0,
  semResponsavel: 0,
};

const formatarDataPublicacao = (value?: string | null) => {
  if (!value) return "Data não informada";

  try {
    return format(parseISO(value), "dd 'de' MMM yyyy 'as' HH:mm", { locale: ptBR });
  } catch {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Data não informada";
    return parsed.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const formatarDataCurta = (value?: string | null) => {
  if (!value) return "Sem data";

  try {
    return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Sem data";
    return parsed.toLocaleDateString("pt-BR");
  }
};

const isHoje = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const agora = new Date();
  return (
    parsed.getFullYear() === agora.getFullYear() &&
    parsed.getMonth() === agora.getMonth() &&
    parsed.getDate() === agora.getDate()
  );
};

const formatarAcaoSugerida = (value?: string | null) => {
  if (!value) return "Sem sugestão";

  const labels: Record<string, string> = {
    CRIAR_PRAZO: "Criar prazo",
    VINCULAR_PROCESSO: "Vincular processo",
    APENAS_ARQUIVAR: "Apenas arquivar",
    DESCARTAR: "Descartar",
  };

  return labels[value] ?? value.replaceAll("_", " ").toLowerCase();
};

const formatarLadoProcessual = (value?: string | null) => {
  const labels: Record<string, string> = {
    PARTE_AUTORA: "Parte autora",
    PARTE_RE: "Parte ré",
    TERCEIRO: "Terceiro",
    INDEFINIDO: "Indefinido",
  };

  return value ? labels[value] ?? value : "Não identificado";
};

const formatarStatusFluxo = (value?: string | null) => {
  const labels: Record<string, string> = {
    RECEBIDA: "Recebida",
    SEM_VINCULO: "Sem vinculo",
    SEM_RESPONSAVEL: "Sem responsavel",
    ATRIBUIDA: "Atribuida",
    EM_TRATAMENTO: "Em tratamento",
    TRATADA: "Tratada",
    DESCARTADA: "Descartada",
  };

  return value ? labels[value] ?? value.replaceAll("_", " ") : "Nao classificada";
};

const formatarAcaoHistorico = (value?: string | null) => {
  const labels: Record<string, string> = {
    CAPTURADA: "Capturada",
    VINCULADA_PROCESSO: "Processo vinculado",
    ATRIBUIDA: "Atribuida",
    ASSUMIDA: "Assumida",
    STATUS_ALTERADO: "Status alterado",
    DESCARTADA: "Descartada",
    TAREFA_CRIADA: "Tarefa criada",
    PRAZO_CRIADO: "Prazo criado",
    AUDIENCIA_CRIADA: "Audiencia criada",
    IA_REPROCESSADA: "IA reprocessada",
    REABERTA: "Reaberta",
  };

  return value ? labels[value] ?? value.replaceAll("_", " ") : "Evento registrado";
};

const prioridadeConfig = (score = 0) => {
  if (score >= 85) {
    return {
      label: "Alta prioridade",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (score >= 55) {
    return {
      label: "Fila ativa",
      className: "border-primary/20 bg-primary/10 text-primary",
    };
  }

  return {
    label: "Baixa urgência",
    className: "border-border bg-muted text-muted-foreground",
  };
};

const LoadingList = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-border bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="mt-4 h-4 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </div>
    ))}
  </div>
);

function VincularProcessoDialog({
  open,
  onOpenChange,
  publicacao,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicacao: Publicacao | null;
  onLinked: () => Promise<void> | void;
}) {
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultados, setResultados] = useState<Processo[]>([]);
  const [processoSelecionadoId, setProcessoSelecionadoId] = useState("");

  useEffect(() => {
    if (!open) return;
    const npu = publicacao?.npu?.trim() ?? "";
    setBusca(npu);
    setResultados([]);
    setProcessoSelecionadoId(publicacao?.processoId ?? "");
  }, [open, publicacao]);

  const buscarProcessos = useCallback(async () => {
    const termo = busca.trim();
    if (!termo) {
      toast.error("Informe um número CNJ ou cliente para localizar o processo.");
      return;
    }

    setBuscando(true);
    try {
      const data = await processosApi.listar({ busca: termo, size: 8, sort: "criadoEm,desc" });
      const items = data.content ?? data;
      const processos = Array.isArray(items) ? items : [];
      setResultados(processos);

      if (processos.length === 1) {
        setProcessoSelecionadoId(processos[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar processos para vinculo de publicacao:", error);
      toast.error("Não foi possível buscar processos.");
    } finally {
      setBuscando(false);
    }
  }, [busca]);

  useEffect(() => {
    if (open && publicacao?.npu) {
      void buscarProcessos();
    }
  }, [buscarProcessos, open, publicacao?.npu]);

  const vincular = async () => {
    if (!publicacao?.id || !processoSelecionadoId) {
      toast.error("Selecione um processo para vincular.");
      return;
    }

    setSalvando(true);
    try {
      await publicacoesApi.vincularProcesso(publicacao.id, processoSelecionadoId);
      toast.success("Processo vinculado à publicação.");
      onOpenChange(false);
      await onLinked();
    } catch (error) {
      console.error("Erro ao vincular processo a publicacao:", error);
      toast.error("Não foi possível vincular o processo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular processo</DialogTitle>
          <DialogDescription>
            Pesquise pelo CNJ ou pelo cliente e vincule esta publicacao ao processo correto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite número CNJ, cliente ou termo do processo"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void buscarProcessos();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => void buscarProcessos()} disabled={buscando}>
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-background/50 p-3">
            {resultados.length === 0 ? (
              <div className="flex min-h-[140px] items-center justify-center text-center text-sm text-muted-foreground">
                {buscando ? "Buscando processos..." : "Nenhum processo carregado para vinculação."}
              </div>
            ) : (
              resultados.map((processo) => {
                const ativo = processoSelecionadoId === processo.id;
                return (
                  <button
                    key={processo.id}
                    type="button"
                    onClick={() => setProcessoSelecionadoId(processo.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all",
                      ativo
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-card/70 hover:border-primary/25 hover:bg-card",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs text-foreground/90">{processo.numero}</p>
                      <Badge variant="outline" className="rounded-full">
                        {processo.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {processo.clienteNome ?? "Cliente não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {processo.tribunal} {processo.vara ? ` - ${processo.vara}` : ""}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void vincular()} disabled={salvando || !processoSelecionadoId}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Vincular processo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CriarAtividadePublicacaoDialog({
  open,
  onOpenChange,
  publicacao,
  modo,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicacao: Publicacao | null;
  modo: ModoAtividadePublicacao;
  onSaved: () => Promise<void> | void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !publicacao) return;

    const dataInicial = publicacao.dataPublicacao
      ? new Date(publicacao.dataPublicacao).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const label = modo === "AUDIENCIA" ? "Audiencia" : modo === "TAREFA" ? "Tarefa" : "Prazo";

    setTitulo(
      publicacao.npu
        ? `${label} derivado da publicacao ${publicacao.npu}`
        : `${label} derivado de publicacao oficial`,
    );
    setData(dataInicial);
    setHora("");
    setDescricao(
      [
        publicacao.resumoOperacional?.trim(),
        publicacao.iaPrazoSugeridoDias
          ? `Sugestao assistida: revisar prazo estimado de ${publicacao.iaPrazoSugeridoDias} dia(s).`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }, [modo, open, publicacao]);

  const salvar = async () => {
    if (!publicacao?.id || !publicacao.processoId) {
      toast.error("Vincule a publicacao a um processo antes de criar a atividade.");
      return;
    }
    if (!titulo.trim() || !data) {
      toast.error("Título e data são obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        data,
        hora: hora || null,
        prioridade: publicacao.riscoPrazo ? "ALTA" : "MEDIA",
        descricao: descricao.trim() || null,
      };

      if (modo === "TAREFA") {
        await publicacoesApi.criarTarefa(publicacao.id, payload);
      } else if (modo === "AUDIENCIA") {
        await publicacoesApi.criarAudiencia(publicacao.id, payload);
      } else {
        await publicacoesApi.criarPrazo(publicacao.id, payload);
      }

      const label = modo === "AUDIENCIA" ? "Audiencia" : modo === "TAREFA" ? "Tarefa" : "Prazo";
      toast.success(`${label} criado(a) e publicacao marcada como tratada.`);
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      console.error("Erro ao criar atividade a partir da publicacao:", error);
      toast.error("Nao foi possivel criar a atividade.");
    } finally {
      setSalvando(false);
    }
  };

  const tituloDialog = modo === "AUDIENCIA" ? "Criar audiencia" : modo === "TAREFA" ? "Criar tarefa" : "Criar prazo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tituloDialog}</DialogTitle>
          <DialogDescription>
            A atividade sera criada a partir da publicacao selecionada e marcada como tratada.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Título</label>
            <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data</label>
              <Input type="date" value={data} onChange={(event) => setData(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Hora</label>
              <Input type="time" value={hora} onChange={(event) => setHora(event.target.value)} />
            </div>
          </div>

          <PrazoDateCalculator dataInicial={data} onAplicarData={setData} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <Textarea
              className="min-h-[140px]"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Contexto interno para a equipa"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            {tituloDialog}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DescartarPublicacaoDialog({
  open,
  onOpenChange,
  publicacao,
  onDiscarded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicacao: Publicacao | null;
  onDiscarded: () => Promise<void> | void;
}) {
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo("");
    }
  }, [open]);

  const descartar = async () => {
    if (!publicacao?.id) return;
    if (!motivo.trim()) {
      toast.error("Informe o motivo do descarte.");
      return;
    }

    setSalvando(true);
    try {
      await publicacoesApi.descartar(publicacao.id, motivo.trim());
      toast.success("Publicacao descartada com motivo registrado.");
      onOpenChange(false);
      await onDiscarded();
    } catch (error) {
      console.error("Erro ao descartar publicacao:", error);
      toast.error("Nao foi possivel descartar a publicacao.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Descartar publicacao</DialogTitle>
          <DialogDescription>
            Registre o motivo para manter rastreabilidade operacional.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          className="min-h-[120px]"
          placeholder="Ex.: publicacao sem relacao com o escritorio, falso positivo, duplicidade operacional..."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={() => void descartar()} disabled={salvando || !motivo.trim()}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AtribuirPublicacaoDialog({
  open,
  onOpenChange,
  publicacao,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicacao: Publicacao | null;
  onAssigned: () => Promise<void> | void;
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsuarioId(publicacao?.atribuidaParaUsuarioId ?? "");
    setLoading(true);

    usuariosApi.listar()
      .then((data) => {
        const items = data?.content ?? data;
        const lista = Array.isArray(items) ? items : [];
        setUsuarios(
          lista.filter((usuario: Usuario) =>
            usuario.ativo && ["ADMINISTRADOR", "ADVOGADO"].includes(String(usuario.papel)),
          ),
        );
      })
      .catch((error) => {
        console.error("Erro ao carregar usuarios para atribuicao de publicacao:", error);
        toast.error("Nao foi possivel carregar os responsaveis.");
      })
      .finally(() => setLoading(false));
  }, [open, publicacao?.atribuidaParaUsuarioId]);

  const atribuir = async () => {
    if (!publicacao?.id || !usuarioId) {
      toast.error("Selecione um responsavel para a publicacao.");
      return;
    }

    setSalvando(true);
    try {
      await publicacoesApi.atribuir(publicacao.id, usuarioId);
      toast.success("Publicacao atribuida para tratamento.");
      onOpenChange(false);
      await onAssigned();
    } catch (error) {
      console.error("Erro ao atribuir publicacao:", error);
      toast.error("Nao foi possivel atribuir a publicacao.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Atribuir publicacao</DialogTitle>
          <DialogDescription>
            Direcione a publicacao para o advogado que deve tratar o evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={usuarioId} onValueChange={setUsuarioId} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Carregando responsaveis..." : "Selecione um responsavel"} />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((usuario) => (
                <SelectItem key={usuario.id} value={usuario.id}>
                  {usuario.nome} {usuario.oab ? `- OAB ${usuario.oab}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            A atribuicao fica registrada no historico e tambem permite filtrar depois por "Minhas".
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void atribuir()} disabled={salvando || loading || !usuarioId}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/*
function FontesMonitoradasDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void> | void;
}) {
  const [fontes, setFontes] = useState<PublicacaoFonteMonitorada[]>([]);
  const [diariosOficiais, setDiariosOficiais] = useState<PublicacaoDiarioOficial[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoFontePublicacaoMonitorada>("OAB");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [valorMonitorado, setValorMonitorado] = useState("");
  const [uf, setUf] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [abrangencia, setAbrangencia] = useState<AbrangenciaFonteMonitorada>("DJEN_TODOS");
  const [observacao, setObservacao] = useState("");

  const carregarFontes = useCallback(async () => {
    setLoading(true);
    try {
      const [fontesData, diariosData, usuariosData] = await Promise.all([
        publicacoesApi.listarFontesMonitoradas(),
        publicacoesApi.listarDiariosOficiais({ apenasSemScraping: false }),
        usuariosApi.listar(),
      ]);
      const usuariosItems = usuariosData?.content ?? usuariosData;
      setFontes(Array.isArray(fontesData) ? fontesData : []);
      setDiariosOficiais(Array.isArray(diariosData) ? diariosData : []);
      setUsuarios(
        Array.isArray(usuariosItems)
          ? usuariosItems.filter((usuario: Usuario) =>
            usuario.ativo && ["ADMINISTRADOR", "ADVOGADO"].includes(String(usuario.papel)),
          )
          : [],
      );
    } catch (error) {
      console.error("Erro ao carregar fontes monitoradas:", error);
      setFontes([]);
      setDiariosOficiais([]);
      setUsuarios([]);
      toast.error("Nao foi possivel carregar as fontes monitoradas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void carregarFontes();
    }
  }, [carregarFontes, open]);

  const limparFormulario = () => {
    setNomeExibicao("");
    setValorMonitorado("");
    setUf("");
    setDestinatarioId("");
    setAbrangencia("DJEN_TODOS");
    setObservacao("");
  };

  const resolverDiariosSelecionados = () => {
    const djenOficiais = diariosOficiais.filter((diario) => diario.grupo === "DJEN" && !diario.requerScraping);

    if (abrangencia === "DJEN_SUPERIORES") {
      return djenOficiais.filter((diario) => !diario.uf).map((diario) => diario.codigo);
    }

    if (abrangencia === "DJEN_UF_SUPERIORES") {
      const ufFiltro = uf.trim().toUpperCase();
      return djenOficiais
        .filter((diario) => !diario.uf || diario.uf === ufFiltro)
        .map((diario) => diario.codigo);
    }

    return djenOficiais.map((diario) => diario.codigo);
  };

  const criarFonte = async () => {
    const nome = nomeExibicao.trim();
    const valor = valorMonitorado.trim();
    const ufNormalizada = uf.trim().toUpperCase();

    if (!nome || !valor) {
      toast.error("Informe o nome de exibicao e o valor monitorado.");
      return;
    }

    if (tipo === "OAB" && ufNormalizada.length !== 2) {
      toast.error("Para OAB, informe a UF com 2 letras.");
      return;
    }

    if (abrangencia === "DJEN_UF_SUPERIORES" && ufNormalizada.length !== 2) {
      toast.error("Informe a UF para usar a cobertura por estado.");
      return;
    }

    if (!destinatarioId) {
      toast.error("Selecione quem recebe as publicacoes quando nao houver vinculo automatico.");
      return;
    }

    const diariosCodigos = resolverDiariosSelecionados();
    if (diariosCodigos.length === 0) {
      toast.error("Nenhum diario oficial sem scraping foi encontrado para esta abrangencia.");
      return;
    }

    setSalvando(true);
    try {
      await publicacoesApi.criarFonteMonitorada({
        tipo,
        nomeExibicao: nome,
        valorMonitorado: valor,
        uf: ufNormalizada || null,
        observacao: observacao.trim() || null,
        destinatariosIds: [destinatarioId],
        diariosCodigos,
      });
      toast.success("Fonte monitorada cadastrada.");
      limparFormulario();
      await carregarFontes();
      await onChanged();
    } catch (error) {
      console.error("Erro ao criar fonte monitorada:", error);
      toast.error("Nao foi possivel cadastrar a fonte monitorada.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarFonte = async (fonte: PublicacaoFonteMonitorada, ativo: boolean) => {
    setAlterandoId(fonte.id);
    try {
      const atualizada = await publicacoesApi.alterarAtivoFonteMonitorada(fonte.id, ativo);
      setFontes((atuais) => atuais.map((item) => (item.id === atualizada.id ? atualizada : item)));
      await onChanged();
    } catch (error) {
      console.error("Erro ao alterar fonte monitorada:", error);
      toast.error("Nao foi possivel alterar a fonte monitorada.");
    } finally {
      setAlterandoId(null);
    }
  };

  const fontesAtivas = fontes.filter((fonte) => fonte.ativo).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Fontes monitoradas</DialogTitle>
          <DialogDescription>
            Cadastre os nomes, OABs, CPFs ou CNPJs que representam o escritorio. O DJEN usa esta lista para filtrar publicacoes localmente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="max-h-[66vh] overflow-y-auto rounded-2xl border border-border bg-background/50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Nova fonte</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use entradas separadas para nome do fundador, nome do escritorio, OAB principal e CNPJ.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as TipoFontePublicacaoMonitorada)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposFontePublicacao.map((item) => (
                      <SelectItem key={item} value={item}>
                        {formatarTipoFonte(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Nome de exibicao</Label>
                <Input
                  value={nomeExibicao}
                  onChange={(event) => setNomeExibicao(event.target.value)}
                  placeholder="Ex.: Fundador - OAB BA"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_88px]">
                <div className="space-y-1.5">
                  <Label>Valor monitorado</Label>
                  <Input
                    value={valorMonitorado}
                    onChange={(event) => setValorMonitorado(event.target.value)}
                    placeholder={tipo === "OAB" ? "Ex.: 12345" : "Nome, CPF ou CNPJ"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input
                    value={uf}
                    onChange={(event) => setUf(event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="BA"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Quem recebe</Label>
                <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsavel padrao" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nome} {usuario.oab ? `- OAB ${usuario.oab}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Se o processo for vinculado, o responsavel do processo prevalece. Este campo e o fallback.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Diarios oficiais monitorados</Label>
                <Select
                  value={abrangencia}
                  onValueChange={(value) => setAbrangencia(value as AbrangenciaFonteMonitorada)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DJEN_TODOS">DJEN: todos os estados e superiores</SelectItem>
                    <SelectItem value="DJEN_UF_SUPERIORES">DJEN: UF informada e superiores</SelectItem>
                    <SelectItem value="DJEN_SUPERIORES">DJEN: somente superiores</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  Apenas fontes oficiais sem scraping entram no fluxo automatico.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Observacao interna</Label>
                <Textarea
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Ex.: nome usado nas publicacoes do escritorio"
                  className="min-h-[92px]"
                />
              </div>

              <Button type="button" className="w-full" onClick={() => void criarFonte()} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar fonte
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-background/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Fontes em uso</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fontesAtivas} ativa(s) de {fontes.length} cadastrada(s). {diariosOficiais.filter((diario) => !diario.requerScraping).length} canais oficiais sem scraping no catalogo.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void carregarFontes()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Atualizar
              </Button>
            </div>

            <ScrollArea className="min-h-[360px] flex-1">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-border bg-card/50 p-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="mt-3 h-4 w-3/4" />
                      <Skeleton className="mt-3 h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : fontes.length === 0 ? (
                <div className="flex min-h-[360px] items-center justify-center px-6 text-center">
                  <div className="space-y-2">
                    <Settings2 className="mx-auto h-9 w-9 text-muted-foreground/35" />
                    <p className="text-sm font-medium text-foreground">Nenhuma fonte monitorada</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastre OAB, nome ou CNPJ para a captura encontrar publicacoes do escritorio.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {fontes.map((fonte) => (
                    <div
                      key={fonte.id}
                      className={cn(
                        "rounded-2xl border p-4 transition-colors",
                        fonte.ativo
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-card/40 opacity-75",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                              {formatarTipoFonte(fonte.tipo)}
                            </Badge>
                            {fonte.uf ? (
                              <Badge variant="outline" className="rounded-full">
                                {fonte.uf}
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                fonte.ativo
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {fonte.ativo ? "Ativa" : "Pausada"}
                            </Badge>
                          </div>

                          <p className="mt-3 truncate text-sm font-semibold text-foreground">
                            {fonte.nomeExibicao}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {fonte.valorMonitorado}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Quem recebe:{" "}
                            <span className="text-foreground/85">
                              {fonte.destinatarios?.length
                                ? fonte.destinatarios.map((destinatario) => destinatario.nome).join(", ")
                                : "Sem fallback definido"}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Diarios:{" "}
                            <span className="text-foreground/85">
                              {fonte.abrangenciaResumo ?? "Sem diarios vinculados"}
                            </span>
                          </p>
                          {fonte.observacao ? (
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">
                              {fonte.observacao}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {alterandoId === fonte.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : null}
                          <Switch
                            checked={fonte.ativo}
                            disabled={alterandoId === fonte.id}
                            onCheckedChange={(checked) => void alternarFonte(fonte, checked)}
                          />
                        </div>
                      </div>
                      {fonte.diariosMonitorados?.length ? (
                        <details className="mt-4 rounded-xl border border-border bg-background/50 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                            Visualizar lista de diarios monitorados
                          </summary>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {fonte.diariosMonitorados.map((diario) => (
                              <Badge
                                key={diario.id}
                                variant="outline"
                                className={cn(
                                  "rounded-full",
                                  diario.requerScraping
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                                )}
                              >
                                {diario.codigo}{diario.uf ? `/${diario.uf}` : ""}
                              </Badge>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
*/

export const PublicacoesView = () => {
  const isMobile = useIsMobile();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [historico, setHistorico] = useState<PublicacaoHistorico[]>([]);
  const [metricas, setMetricas] = useState<PublicacaoMetricas>(metricasIniciais);
  const [publicacaoSelecionada, setPublicacaoSelecionada] = useState<Publicacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("PENDENTE");
  const [filaFiltro, setFilaFiltro] = useState<FiltroFila>("TODAS");
  const [apenasHoje, setApenasHoje] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [abrirVinculo, setAbrirVinculo] = useState(false);
  const [abrirAtividade, setAbrirAtividade] = useState(false);
  const [modoAtividade, setModoAtividade] = useState<ModoAtividadePublicacao>("PRAZO");
  const [abrirAtribuicao, setAbrirAtribuicao] = useState(false);
  const [abrirDescarte, setAbrirDescarte] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [itens, dadosMetricas] = await Promise.all([
        publicacoesApi.listar({
          status: statusFiltro === "TODAS" ? undefined : statusFiltro,
          busca: buscaAplicada || undefined,
          somenteRiscoPrazo: filaFiltro === "PRAZO_SUSPEITO" ? true : undefined,
          statusFluxo: filaFiltro === "SEM_RESPONSAVEL" ? "SEM_RESPONSAVEL" : undefined,
          minhas: filaFiltro === "MINHAS" ? true : undefined,
        }),
        publicacoesApi.metricas(),
      ]);

      setPublicacoes(Array.isArray(itens) ? itens : []);
      setMetricas(dadosMetricas ?? metricasIniciais);
    } catch (error) {
      console.error("Erro ao carregar publicacoes:", error);
      setPublicacoes([]);
      setMetricas(metricasIniciais);
      toast.error("Não foi possível carregar a mesa de publicações.");
    } finally {
      setLoading(false);
    }
  }, [buscaAplicada, filaFiltro, statusFiltro]);

  const carregarHistoricoPublicacao = useCallback(async (publicacaoId: string) => {
    setLoadingHistorico(true);
    try {
      const data = await publicacoesApi.historico(publicacaoId);
      setHistorico(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar historico da publicacao:", error);
      setHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const publicacoesFiltradas = useMemo(() => {
    return publicacoes.filter((publicacao) => {
      if (filaFiltro === "SEM_VINCULO" && publicacao.processoId) return false;
      if (filaFiltro === "SEM_RESPONSAVEL" && publicacao.statusFluxo !== "SEM_RESPONSAVEL") return false;
      if (filaFiltro === "PRAZO_SUSPEITO" && !publicacao.riscoPrazo) return false;
      if (apenasHoje && !isHoje(publicacao.dataPublicacao)) return false;
      return true;
    });
  }, [apenasHoje, filaFiltro, publicacoes]);

  useEffect(() => {
    setPublicacaoSelecionada((atual) => {
      if (publicacoesFiltradas.length === 0) return null;
      if (!atual) return publicacoesFiltradas[0];
      return publicacoesFiltradas.find((item) => item.id === atual.id) ?? publicacoesFiltradas[0];
    });
  }, [publicacoesFiltradas]);

  useEffect(() => {
    if (!publicacaoSelecionada?.id) {
      setHistorico([]);
      return;
    }

    void carregarHistoricoPublicacao(publicacaoSelecionada.id);
  }, [carregarHistoricoPublicacao, publicacaoSelecionada?.id]);

  const aplicarBusca = () => {
    setBuscaAplicada(busca.trim());
  };

  const limparFiltros = () => {
    setBusca("");
    setBuscaAplicada("");
    setStatusFiltro("PENDENTE");
    setFilaFiltro("TODAS");
    setApenasHoje(false);
  };

  const atualizarStatus = async (
    publicacao: Publicacao,
    status: StatusTratamentoPublicacao,
    successMessage: string,
  ) => {
    setActionLoadingId(publicacao.id);
    try {
      await publicacoesApi.atualizarStatus(publicacao.id, status);
      toast.success(successMessage);
      await carregarDados();
      await carregarHistoricoPublicacao(publicacao.id);
    } catch (error) {
      console.error("Erro ao atualizar status da publicacao:", error);
      toast.error("Não foi possível atualizar o status da publicação.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const abrirModalAtividade = (modo: ModoAtividadePublicacao) => {
    if (!publicacaoSelecionada) return;
    if (!publicacaoSelecionada.processoId) {
      toast.error("Vincule a publicacao a um processo antes de criar a atividade.");
      return;
    }
    setModoAtividade(modo);
    setAbrirAtividade(true);
  };

  const assumirPublicacao = async () => {
    if (!publicacaoSelecionada) return;

    setActionLoadingId(publicacaoSelecionada.id);
    try {
      await publicacoesApi.assumir(publicacaoSelecionada.id);
      toast.success("Publicacao assumida para tratamento.");
      await carregarDados();
      await carregarHistoricoPublicacao(publicacaoSelecionada.id);
    } catch (error) {
      console.error("Erro ao assumir publicacao:", error);
      toast.error("Nao foi possivel assumir a publicacao.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const reprocessarTriagem = async () => {
    if (!publicacaoSelecionada) return;

    setActionLoadingId(publicacaoSelecionada.id);
    try {
      await publicacoesApi.reprocessarIa(publicacaoSelecionada.id);
      toast.success("Triagem inteligente reprocessada.");
      await carregarDados();
      await carregarHistoricoPublicacao(publicacaoSelecionada.id);
    } catch (error) {
      console.error("Erro ao reprocessar triagem de publicacao:", error);
      toast.error("Nao foi possivel reprocessar a triagem.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cardsMetricas = [
    {
      title: "Não tratadas de hoje",
      value: metricas.naoTratadasHoje,
      className: "text-foreground",
      active:
        statusFiltro === "PENDENTE" &&
        apenasHoje &&
        filaFiltro === "TODAS",
      onClick: () => {
        setStatusFiltro("PENDENTE");
        setApenasHoje(true);
        setFilaFiltro("TODAS");
      },
    },
    {
      title: "Tratadas hoje",
      value: metricas.tratadasHoje,
      className: "text-sky-400",
      active:
        statusFiltro === "TRATADA" &&
        apenasHoje &&
        filaFiltro === "TODAS",
      onClick: () => {
        setStatusFiltro("TRATADA");
        setApenasHoje(true);
        setFilaFiltro("TODAS");
      },
    },
    {
      title: "Descartadas hoje",
      value: metricas.descartadasHoje,
      className: "text-rose-400",
      active:
        statusFiltro === "DESCARTADA" &&
        apenasHoje &&
        filaFiltro === "TODAS",
      onClick: () => {
        setStatusFiltro("DESCARTADA");
        setApenasHoje(true);
        setFilaFiltro("TODAS");
      },
    },
    {
      title: "Não tratadas",
      value: metricas.naoTratadas,
      className: "text-amber-300",
      active:
        statusFiltro === "PENDENTE" &&
        !apenasHoje &&
        filaFiltro === "TODAS",
      onClick: () => {
        setStatusFiltro("PENDENTE");
        setApenasHoje(false);
        setFilaFiltro("TODAS");
      },
    },
  ];

  const filaFilters = [
    { key: "TODAS" as const, label: "Fila completa" },
    { key: "MINHAS" as const, label: "Minhas publicacoes" },
    { key: "PRAZO_SUSPEITO" as const, label: `Prazo suspeito (${metricas.prazoSuspeito})` },
    { key: "SEM_VINCULO" as const, label: `Sem vínculo (${metricas.semVinculo})` },
    { key: "SEM_RESPONSAVEL" as const, label: `Sem responsavel (${metricas.semResponsavel})` },
  ];

  const statusFilters = [
    { key: "PENDENTE" as const, label: "Pendentes" },
    { key: "TODAS" as const, label: "Todas" },
    { key: "TRATADA" as const, label: "Tratadas" },
    { key: "DESCARTADA" as const, label: "Descartadas" },
  ];

  const painelFila = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Fila de publicações</h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A fila fica focada no trabalho pendente; os filtros globais ficam concentrados no topo.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
            {loading ? "..." : `${publicacoesFiltradas.length} item(ns)`}
          </Badge>
        </div>
      </div>

      {loading ? (
        <LoadingList />
      ) : publicacoesFiltradas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/35" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Nenhuma publicação encontrada</p>
            <p className="text-sm text-muted-foreground">
              Verifique os filtros selecionados.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {publicacoesFiltradas.map((publicacao) => {
              const ativa = publicacaoSelecionada?.id === publicacao.id;
              const prioridade = prioridadeConfig(publicacao.scorePrioridade ?? 0);

              return (
                <button
                  key={publicacao.id}
                  type="button"
                  onClick={() => setPublicacaoSelecionada(publicacao)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                    ativa
                      ? "border-primary/45 bg-primary/10 shadow-[0_18px_45px_-35px_hsl(var(--primary))]"
                      : "border-border bg-background/60 hover:border-primary/25 hover:bg-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="max-w-[180px] truncate border-primary/20 bg-primary/10 text-primary"
                      >
                        {publicacao.tribunalOrigem}
                      </Badge>
                      <Badge variant="outline" className={prioridade.className}>
                        {formatarScorePrioridade(publicacao.scorePrioridade)}
                      </Badge>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatarDataCurta(publicacao.dataPublicacao)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {publicacao.riscoPrazo ? (
                      <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300" variant="outline">
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        Prazo suspeito
                      </Badge>
                    ) : null}
                    {publicacao.processoId ? (
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Vinculada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                        <CircleOff className="mr-1 h-3 w-3" />
                        Sem vinculo
                      </Badge>
                    )}
                  </div>

                  <p className="mt-3 font-mono text-xs text-foreground/85">
                    {publicacao.npu ?? "NPU não informado"}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {publicacao.teor}
                  </p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const detalheSelecionado = publicacaoSelecionada;
  const prioridadeSelecionada = prioridadeConfig(detalheSelecionado?.scorePrioridade ?? 0);
  const actionLoading = detalheSelecionado ? actionLoadingId === detalheSelecionado.id : false;

  const painelDetalhe = (
    <div className="flex h-full flex-col">
      {detalheSelecionado ? (
        <>
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    {detalheSelecionado.tribunalOrigem}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {detalheSelecionado.statusTratamento}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                    {formatarStatusFluxo(detalheSelecionado.statusFluxo)}
                  </Badge>
                  <Badge variant="outline" className={prioridadeSelecionada.className}>
                    {prioridadeSelecionada.label}
                  </Badge>
                </div>

                <p className="font-mono text-sm text-foreground">
                  {detalheSelecionado.npu ?? "NPU não informado"}
                </p>

                <div className="flex flex-wrap gap-2">
                  {detalheSelecionado.riscoPrazo ? (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-300" variant="outline">
                      <ShieldAlert className="mr-1 h-3 w-3" />
                      Prazo suspeito
                    </Badge>
                  ) : null}
                  {detalheSelecionado.processoNumero ? (
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      Processo {detalheSelecionado.processoNumero}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                      Sem processo vinculado
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                <p>Publicada em</p>
                <p className="mt-1 font-medium text-foreground/90">
                  {formatarDataPublicacao(detalheSelecionado.dataPublicacao)}
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="mx-auto w-full max-w-7xl p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_340px]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Resumo operacional
                      </p>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-foreground/90">
                      {detalheSelecionado.resumoOperacional ??
                        "Infra pronta para resumo assistido. Nesta fase a IA ainda não executa, mas o modelo de dados e a UI já estão preparados."}
                    </p>

                    {detalheSelecionado.justificativaPrioridade ? (
                      <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Justificativa da fila
                        </p>
                        <p className="mt-2 text-sm text-foreground/85">
                          {detalheSelecionado.justificativaPrioridade}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6">
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Teor integral
                      </p>
                    </div>

                    <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                      {detalheSelecionado.teor}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Trilho de IA preparado</p>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      Ainda sem executar modelo externo. O painel ja expone os campos que vao receber sugestao, confianca e fundamento.
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-border bg-background/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ação sugerida</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatarAcaoSugerida(detalheSelecionado.iaAcaoSugerida)}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-xl border border-border bg-background/70 p-4">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo sugerido</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {detalheSelecionado.iaPrazoSugeridoDias
                              ? `${detalheSelecionado.iaPrazoSugeridoDias} dia(s)`
                              : "Não sugerido"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-background/70 p-4">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lado processual</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatarLadoProcessual(detalheSelecionado.ladoProcessualEstimado)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confiança</p>
                          <span className="text-sm font-medium text-foreground">
                            {detalheSelecionado.iaConfianca ?? 0}%
                          </span>
                        </div>
                        <Progress value={detalheSelecionado.iaConfianca ?? 0} className="mt-3" />
                      </div>

                      <div className="rounded-xl border border-border bg-background/70 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trecho relevante</p>
                        <p className="mt-2 text-sm leading-6 text-foreground/85">
                          {detalheSelecionado.iaTrechosRelevantes ??
                            "Quando a IA entrar, os trechos de apoio devem aparecer aqui para o advogado entender o motivo da sugestão."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/40 p-5">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Roteamento e historico</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score de prioridade</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detalheSelecionado.scorePrioridade ?? 0}/100
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vínculo de processo</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detalheSelecionado.processoNumero ?? "Não vinculado"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status da fila</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatarStatusFluxo(detalheSelecionado.statusFluxo)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Captada em nome de</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detalheSelecionado.captadaEmNome ?? detalheSelecionado.oabMonitorada ?? "Nao informado"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Responsavel</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detalheSelecionado.assumidaPorUsuarioNome ??
                            detalheSelecionado.atribuidaParaUsuarioNome ??
                            detalheSelecionado.responsavelProcessoNome ??
                            "Sem responsavel definido"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimos eventos</p>
                      {loadingHistorico ? (
                        <div className="mt-3 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : historico.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {historico.slice(0, 5).map((evento) => (
                            <div key={evento.id} className="border-l border-primary/35 pl-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-foreground">
                                  {formatarAcaoHistorico(evento.acao)}
                                </p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {formatarDataCurta(evento.criadoEm)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {evento.observacao ?? "Evento sem observacao."}
                              </p>
                              {evento.usuarioNome || evento.usuarioDestinoNome ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {evento.usuarioNome ?? "Sistema"}
                                  {evento.usuarioDestinoNome ? ` -> ${evento.usuarioDestinoNome}` : ""}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-card/95 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs text-muted-foreground">
                Tratamento direto da publicacao, sem trocar de tela.
              </p>

              <div className="flex flex-wrap gap-2">
                {detalheSelecionado.statusTratamento === "PENDENTE" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void assumirPublicacao()}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      Assumir
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAbrirAtribuicao(true)}
                      disabled={actionLoading}
                    >
                      <UserPlus className="h-4 w-4" />
                      Atribuir
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void reprocessarTriagem()}
                      disabled={actionLoading}
                    >
                      <WandSparkles className="h-4 w-4" />
                      Reprocessar IA
                    </Button>
                    <Button variant="outline" onClick={() => abrirModalAtividade("TAREFA")} disabled={actionLoading}>
                      <CheckCircle2 className="h-4 w-4" />
                      Criar Tarefa
                    </Button>
                    <Button onClick={() => abrirModalAtividade("PRAZO")} disabled={actionLoading}>
                      <CalendarClock className="h-4 w-4" />
                      Criar Prazo
                    </Button>
                    <Button variant="outline" onClick={() => abrirModalAtividade("AUDIENCIA")} disabled={actionLoading}>
                      <CalendarClock className="h-4 w-4" />
                      Criar Audiencia
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAbrirVinculo(true)}
                      disabled={actionLoading}
                    >
                      <Link2 className="h-4 w-4" />
                      Vincular Processo
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void atualizarStatus(
                          detalheSelecionado,
                          "TRATADA",
                          "Publicação arquivada como tratada.",
                        )
                      }
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                      Apenas Arquivar
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setAbrirDescarte(true)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      Descartar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void atualizarStatus(
                        detalheSelecionado,
                        "PENDENTE",
                        "Publicação reaberta para triagem.",
                      )
                    }
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Reabrir para triagem
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="space-y-3">
            {loading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : (
              <Newspaper className="mx-auto h-10 w-10 text-muted-foreground/35" />
            )}
            <p className="text-base text-muted-foreground">
              Selecione uma publicacao para iniciar a triagem
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex min-h-full flex-col gap-6 p-6 md:h-full md:min-h-0 md:overflow-hidden md:p-8">
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => void carregarDados()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Atualizar fila
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cardsMetricas.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className={cn(
                "rounded-2xl border px-5 py-4 text-left transition-all",
                card.active
                  ? "border-primary/35 bg-primary/10 shadow-[0_20px_40px_-32px_hsl(var(--primary))]"
                  : "border-border bg-card hover:border-primary/20 hover:bg-card/90",
              )}
            >
              <p className={cn("text-3xl font-semibold", card.className)}>{card.value}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {card.title}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-1 gap-2">
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Digite o processo, tribunal ou termo pesquisado"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    aplicarBusca();
                  }
                }}
              />
              <Button type="button" onClick={aplicarBusca}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_190px_auto_auto]">
              <Select
                value={statusFiltro}
                onValueChange={(value) => {
                  const next = value as FiltroStatus;
                  setStatusFiltro(next);
                  if (next !== "PENDENTE") {
                    setFilaFiltro("TODAS");
                  }
                }}
              >
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filaFiltro}
                onValueChange={(value) => {
                  const next = value as FiltroFila;
                  setFilaFiltro(next);
                  if (next !== "TODAS") {
                    setStatusFiltro("PENDENTE");
                  }
                }}
              >
                <SelectTrigger className="min-w-[190px]">
                  <SelectValue placeholder="Fila" />
                </SelectTrigger>
                <SelectContent>
                  {filaFilters.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant={apenasHoje ? "secondary" : "outline"}
                onClick={() => setApenasHoje((current) => !current)}
              >
                Hoje
              </Button>

              <Button type="button" variant="ghost" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="grid gap-6">
            {publicacoesFiltradas.length === 0 ? (
              <div className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.7)]">
                {painelDetalhe}
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.7)]">
                  {painelFila}
                </div>
                <div className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.7)]">
                  {painelDetalhe}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-45px_rgba(0,0,0,0.65)]">
            {publicacoesFiltradas.length === 0 ? (
              painelDetalhe
            ) : (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={35} minSize={26}>
                  {painelFila}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={65} minSize={38}>
                  {painelDetalhe}
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        )}
      </div>

      <VincularProcessoDialog
        open={abrirVinculo}
        onOpenChange={setAbrirVinculo}
        publicacao={publicacaoSelecionada}
        onLinked={carregarDados}
      />
      <CriarAtividadePublicacaoDialog
        open={abrirAtividade}
        onOpenChange={setAbrirAtividade}
        publicacao={publicacaoSelecionada}
        modo={modoAtividade}
        onSaved={carregarDados}
      />
      <DescartarPublicacaoDialog
        open={abrirDescarte}
        onOpenChange={setAbrirDescarte}
        publicacao={publicacaoSelecionada}
        onDiscarded={async () => {
          await carregarDados();
          if (publicacaoSelecionada?.id) {
            await carregarHistoricoPublicacao(publicacaoSelecionada.id);
          }
        }}
      />
      <AtribuirPublicacaoDialog
        open={abrirAtribuicao}
        onOpenChange={setAbrirAtribuicao}
        publicacao={publicacaoSelecionada}
        onAssigned={async () => {
          await carregarDados();
          if (publicacaoSelecionada?.id) {
            await carregarHistoricoPublicacao(publicacaoSelecionada.id);
          }
        }}
      />
    </>
  );
};

function formatarScorePrioridade(score?: number | null) {
  return `${score ?? 0}/100`;
}
