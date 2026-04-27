import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  PencilLine,
  Plus,
  Scale,
  ShieldCheck,
  Upload,
  Users2,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { EditarProcessoModal } from "@/components/modals/EditarProcessoModal";
import { DocumentoUploadModal } from "@/components/modals/DocumentoUploadModal";
import { AtividadeModal } from "@/components/produtividade/AtividadeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { clientesApi, documentosApi, processosApi } from "@/services/api";
import type {
  Cliente,
  Documento,
  Processo,
  ProcessoDetalhe,
  ProcessoParte,
  StatusProcesso,
} from "@/types";
import { toast } from "sonner";

type ProcessoDossieModalProps = {
  open: boolean;
  processoId: string | null;
  onClose: () => void;
  onAtualizado?: () => void;
};

type FormAndamento = {
  tipo: string;
  data: string;
  descricao: string;
};

type DocumentoPreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "unsupported";

const STATUS_BADGE_CLASS: Record<NonNullable<ProcessoDetalhe["status"]>, string> = {
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  ARQUIVADO: "border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300",
  SUSPENSO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
};

const STATUS_LABEL: Record<NonNullable<ProcessoDetalhe["status"]>, string> = {
  ATIVO: "Ativo",
  ARQUIVADO: "Arquivado",
  SUSPENSO: "Suspenso",
};

const STATUS_ORIGINAL_LABEL: Record<StatusProcesso, string> = {
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO: "Aguardando",
  URGENTE: "Urgente",
  CONCLUIDO: "Concluido",
  SUSPENSO: "Suspenso",
  ARQUIVADO: "Arquivado",
};

const TIPO_MOVIMENTACAO_OPTIONS = [
  { value: "DESPACHO", label: "Despacho" },
  { value: "SENTENCA", label: "Sentenca" },
  { value: "AUDIENCIA", label: "Audiencia" },
  { value: "PETICAO", label: "Peticao" },
  { value: "PUBLICACAO", label: "Publicacao" },
  { value: "OUTRO", label: "Outro" },
];

const CATEGORIA_DOCUMENTO_LABEL: Record<string, string> = {
  peticao: "Peticao",
  contrato: "Contrato",
  procuracao: "Procuracao",
  sentenca: "Sentenca",
  recurso: "Recurso",
  comprovante: "Comprovante",
  outros: "Outros",
  PETICAO: "Peticao",
  CONTRATO: "Contrato",
  PROCURACAO: "Procuracao",
  SENTENCA: "Sentenca",
  RECURSO: "Recurso",
  COMPROVANTE: "Comprovante",
  OUTROS: "Outros",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mpeg: "video/mpeg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

function extractItems<T>(response: T[] | { content?: T[] } | undefined): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  return [];
}

function normalizeDigits(value?: string | null) {
  return (value ?? "").replace(/\D+/g, "");
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function maskNpu(value?: string | null) {
  if (!value) return "NPU não informado";

  const digits = normalizeDigits(value);
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
  }

  return value;
}

function formatDate(value?: string | null) {
  if (!value) return "Não informado";

  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não informado";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "Valor não informado";

  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return String(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatRelativeUpdate(value?: string | null) {
  if (!value) return "Sem movimentações registradas";

  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return formatDateTime(value);

  const diffMs = parsed.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (absMinutes < 60) {
    const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `Atualizado ${rtf.format(minutes, "minute")}`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 48) {
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    return `Atualizado ${rtf.format(hours, "hour")}`;
  }

  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return `Atualizado ${rtf.format(days, "day")}`;
}

function formatTipoMovimentacao(tipo?: string | null) {
  switch ((tipo ?? "").toUpperCase()) {
    case "DESPACHO":
      return "Despacho";
    case "SENTENCA":
      return "Sentenca";
    case "AUDIENCIA":
      return "Audiencia";
    case "PETICAO":
      return "Peticao";
    case "PUBLICACAO":
      return "Publicacao";
    default:
      return tipo || "Movimentacao";
  }
}

function formatPolo(polo?: string | null) {
  switch ((polo ?? "").toUpperCase()) {
    case "ATIVO":
      return "Polo Ativo";
    case "PASSIVO":
      return "Polo Passivo";
    case "TERCEIRO":
      return "Terceiro";
    default:
      return polo || "Não informado";
  }
}

function formatTipoParte(tipo?: string | null) {
  switch ((tipo ?? "").toUpperCase()) {
    case "PESSOA_FISICA":
      return "Pessoa fisica";
    case "PESSOA_JURIDICA":
      return "Pessoa juridica";
    case "NAO_IDENTIFICADO":
      return "Não identificado";
    default:
      return tipo || "Não informado";
  }
}

function formatKanbanStatus(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "A_FAZER":
      return "A Fazer";
    case "EM_ANDAMENTO":
      return "Em andamento";
    case "CONCLUIDO":
      return "Concluido";
    default:
      return status || "Sem coluna";
  }
}

function formatStatusOriginal(status?: StatusProcesso | null) {
  if (!status) return "Não informado";
  return STATUS_ORIGINAL_LABEL[status] ?? status;
}

function formatTipoProcesso(tipo?: string | null) {
  switch ((tipo ?? "").toUpperCase()) {
    case "CIVEL":
      return "Processo Civel";
    case "TRABALHISTA":
      return "Acao Trabalhista";
    case "CRIMINAL":
      return "Processo Criminal";
    case "FAMILIA":
      return "Processo de Familia";
    case "TRIBUTARIO":
      return "Execucao Tributaria";
    case "EMPRESARIAL":
      return "Processo Empresarial";
    case "PREVIDENCIARIO":
      return "Acao Previdenciaria";
    case "ADMINISTRATIVO":
      return "Procedimento Administrativo";
    default:
      return tipo || "Tipo não informado";
  }
}

function formatCategoriaDocumento(categoria?: string | null) {
  return CATEGORIA_DOCUMENTO_LABEL[categoria ?? ""] ?? categoria ?? "Documento";
}

function getDocumentoPreviewKind(tipo?: string | null): DocumentoPreviewKind {
  switch ((tipo ?? "").toLowerCase()) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "svg":
      return "image";
    case "pdf":
      return "pdf";
    case "mp4":
    case "webm":
    case "mpeg":
      return "video";
    case "mp3":
    case "wav":
    case "ogg":
      return "audio";
    case "txt":
      return "text";
    default:
      return "unsupported";
  }
}

function getDocumentoMimeType(tipo?: string | null) {
  return MIME_BY_EXTENSION[(tipo ?? "").toLowerCase()];
}

async function fetchDocumentoBlob(doc: Documento, apiPath: string) {
  const response = await api.get(apiPath, { responseType: "blob" });
  const originalBlob = response.data as Blob;
  const mime = getDocumentoMimeType(doc.tipo);

  if (mime && originalBlob.type !== mime) {
    return new Blob([originalBlob], { type: mime });
  }

  return originalBlob;
}

function resolveFallbackStatus(status?: ProcessoDetalhe["status"] | null): StatusProcesso {
  switch (status) {
    case "ARQUIVADO":
      return "ARQUIVADO";
    case "SUSPENSO":
      return "SUSPENSO";
    default:
      return "EM_ANDAMENTO";
  }
}

function toEditableProcesso(detalhe: ProcessoDetalhe): Processo {
  return {
    id: detalhe.id,
    numero: detalhe.numero || detalhe.npu,
    clienteId: detalhe.clienteId ?? "",
    clienteNome: detalhe.clienteNome ?? detalhe.titulo,
    casoId: detalhe.casoId ?? undefined,
    casoTitulo: detalhe.casoTitulo ?? undefined,
    tipo: (detalhe.tipo as Processo["tipo"]) ?? "CIVEL",
    vara: detalhe.vara ?? "",
    tribunal: detalhe.tribunal ?? "",
    advogados: detalhe.advogados ?? [],
    advogadoId: detalhe.advogadoId ?? undefined,
    advogadoNome: detalhe.advogadoNome ?? undefined,
    status: detalhe.statusOriginal ?? resolveFallbackStatus(detalhe.status),
    dataDistribuicao: detalhe.dataDistribuicao ?? "",
    ultimaMovimentacao: detalhe.dataUltimaMovimentacao ?? "",
    proximoPrazo: detalhe.proximoPrazo ?? undefined,
    valorCausa:
      detalhe.valorCausa === null || detalhe.valorCausa === undefined ? undefined : String(detalhe.valorCausa),
    descricao: detalhe.descricao ?? undefined,
    etiquetas: detalhe.etiquetas ?? [],
    partes: detalhe.partes ?? [],
    movimentacoes: detalhe.movimentacoes ?? [],
    unidadeId: detalhe.unidadeId ?? "",
    unidadeNome: detalhe.unidadeNome ?? undefined,
  };
}

function resolveClienteRelacionado(parte: ProcessoParte, clientes: Cliente[]) {
  const documentoParte = normalizeDigits(parte.documento);
  const nomeParte = normalizeText(parte.nome);

  return (
    clientes.find((cliente) => {
      const documentoCliente = normalizeDigits(cliente.cpfCnpj);
      if (documentoParte && documentoCliente && documentoParte === documentoCliente) {
        return true;
      }

      return nomeParte.length > 0 && normalizeText(cliente.nome) === nomeParte;
    }) ?? null
  );
}

function InfoMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-foreground">{value}</p>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ParteSection({
  title,
  subtitle,
  partes,
  clientes,
  onOpenCliente,
}: {
  title: string;
  subtitle: string;
  partes: ProcessoParte[];
  clientes: Cliente[];
  onOpenCliente: (cliente: Cliente) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="outline" className="border-border bg-background text-foreground">
          {partes.length}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {partes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-8 text-sm text-muted-foreground">
            Nenhuma parte registada neste polo.
          </div>
        ) : (
          partes.map((parte) => {
            const clienteRelacionado = resolveClienteRelacionado(parte, clientes);

            return (
              <article key={parte.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {clienteRelacionado ? (
                      <button
                        type="button"
                        onClick={() => onOpenCliente(clienteRelacionado)}
                        className="inline-flex items-center gap-1 text-left text-sm font-semibold text-foreground underline-offset-4 transition hover:text-primary hover:underline"
                      >
                        {parte.nome}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">{parte.nome}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border bg-background text-foreground">
                        {formatPolo(parte.polo)}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background text-foreground">
                        {formatTipoParte(parte.tipo)}
                      </Badge>
                      {parte.principal && (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                          Parte principal
                        </Badge>
                      )}
                    </div>
                  </div>

                  {parte.documento && (
                    <span className="rounded-full border border-border px-2 py-1 text-[11px] text-foreground">
                      {parte.documento}
                    </span>
                  )}
                </div>

                {parte.observacao && <p className="mt-3 text-sm leading-6 text-muted-foreground">{parte.observacao}</p>}

                {parte.representantes && parte.representantes.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {parte.representantes.map((representante) => (
                      <span
                        key={representante.id}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                      >
                        {representante.nome}
                        {representante.oab ? ` - ${representante.oab}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function ProcessoDossieModal({
  open,
  processoId,
  onClose,
  onAtualizado,
}: ProcessoDossieModalProps) {
  const previewObjectUrlRef = useRef<string | null>(null);

  const [abaAtiva, setAbaAtiva] = useState("resumo");
  const [detalhe, setDetalhe] = useState<ProcessoDetalhe | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [erroDocumentos, setErroDocumentos] = useState("");
  const [clientePreview, setClientePreview] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState(false);
  const [uploadDocumentoAberto, setUploadDocumentoAberto] = useState(false);
  const [novoPrazoAberto, setNovoPrazoAberto] = useState(false);
  const [registrarAndamentoAberto, setRegistrarAndamentoAberto] = useState(false);
  const [registrandoAndamento, setRegistrandoAndamento] = useState(false);
  const [documentoPreview, setDocumentoPreview] = useState<Documento | null>(null);
  const [documentoPreviewUrl, setDocumentoPreviewUrl] = useState<string | null>(null);
  const [documentoPreviewText, setDocumentoPreviewText] = useState<string | null>(null);
  const [documentoPreviewErro, setDocumentoPreviewErro] = useState("");
  const [documentoPreviewLoading, setDocumentoPreviewLoading] = useState(false);
  const [formAndamento, setFormAndamento] = useState<FormAndamento>({
    tipo: "DESPACHO",
    data: new Date().toISOString().slice(0, 10),
    descricao: "",
  });

  const limparPreviewDocumento = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    setDocumentoPreviewUrl(null);
    setDocumentoPreviewText(null);
    setDocumentoPreviewErro("");
    setDocumentoPreviewLoading(false);
  }, []);

  const fecharPreviewDocumento = useCallback(() => {
    limparPreviewDocumento();
    setDocumentoPreview(null);
  }, [limparPreviewDocumento]);

  const carregarDetalhe = useCallback(async (id: string) => {
    setLoadingDocumentos(true);
    setErroDocumentos("");

    const [detalheResult, clientesResult, documentosResult] = await Promise.allSettled([
      processosApi.buscar(id),
      clientesApi.listar({ size: 1000 }),
      documentosApi.listarPorProcesso(id, { size: 200 }),
    ]);

    if (detalheResult.status === "rejected") {
      setLoadingDocumentos(false);
      throw detalheResult.reason;
    }

    const proximoDetalhe = detalheResult.value;
    setDetalhe(proximoDetalhe);

    if (clientesResult.status === "fulfilled") {
      setClientes(extractItems<Cliente>(clientesResult.value));
    } else {
      setClientes([]);
    }

    if (documentosResult.status === "fulfilled") {
      setDocumentos(extractItems<Documento>(documentosResult.value));
      setErroDocumentos("");
    } else {
      setDocumentos([]);
      setErroDocumentos("Não foi possível carregar os documentos do processo.");
    }

    setLoadingDocumentos(false);
    return proximoDetalhe;
  }, []);

  const handleReload = useCallback(async () => {
    if (!processoId) return;

    setLoading(true);
    setErroCarregamento("");

    try {
      await carregarDetalhe(processoId);
    } catch {
      setErroCarregamento("Não foi possível carregar o dossiê deste processo.");
    } finally {
      setLoading(false);
    }
  }, [carregarDetalhe, processoId]);

  useEffect(() => {
    if (!open || !processoId) {
      setDetalhe(null);
      setClientes([]);
      setDocumentos([]);
      setErroCarregamento("");
      setErroDocumentos("");
      setLoading(false);
      setLoadingDocumentos(false);
      setAbaAtiva("resumo");
      fecharPreviewDocumento();
      return;
    }

    let active = true;
    setLoading(true);
    setErroCarregamento("");
    setAbaAtiva("resumo");

    carregarDetalhe(processoId)
      .catch(() => {
        if (!active) return;
        setErroCarregamento("Não foi possível carregar o dossiê deste processo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [carregarDetalhe, fecharPreviewDocumento, open, processoId]);

  useEffect(() => () => limparPreviewDocumento(), [limparPreviewDocumento]);

  const partesAtivas = useMemo(
    () => (detalhe?.partes ?? []).filter((parte) => (parte.polo ?? "").toUpperCase() === "ATIVO"),
    [detalhe?.partes],
  );
  const partesPassivas = useMemo(
    () => (detalhe?.partes ?? []).filter((parte) => (parte.polo ?? "").toUpperCase() === "PASSIVO"),
    [detalhe?.partes],
  );
  const movimentacoes = detalhe?.movimentacoes ?? [];
  const prazosVinculados = detalhe?.prazosVinculados ?? [];
  const documentosRecentes = documentos.slice(0, 4);
  const advogadosResumo =
    detalhe?.advogados && detalhe.advogados.length > 0
      ? detalhe.advogados.map((advogado) => advogado.nome).join(", ")
      : detalhe?.advogadoNome || "Não informado";
  const foroResumo =
    detalhe?.foro || [detalhe?.vara, detalhe?.tribunal].filter(Boolean).join(" / ") || detalhe?.unidadeNome || "Foro não informado";
  const tipoAcaoResumo = detalhe?.tipoAcao || formatTipoProcesso(detalhe?.tipo);
  const previewKind = documentoPreview ? getDocumentoPreviewKind(documentoPreview.tipo) : "unsupported";

  const loadDocumentoPreview = useCallback(
    async (doc: Documento, kind: DocumentoPreviewKind) => {
      if (doc.id.startsWith("local:")) {
        const storageKey = doc.id.slice("local:".length);
        const apiPath = `/documentos/stream/${storageKey.replaceAll("/", "__")}`;
        const blob = await fetchDocumentoBlob(doc, apiPath);
        const objectUrl = URL.createObjectURL(blob);
        previewObjectUrlRef.current = objectUrl;

        return {
          url: objectUrl,
          text: kind === "text" ? await blob.text() : null,
        };
      }

      const result = await documentosApi.downloadUrl(doc.id);
      const url = typeof result === "string" ? result : result.url;
      if (!url) {
        throw new Error("Documento sem URL de acesso.");
      }

      if (url.startsWith("/")) {
        const apiPath = url.startsWith("/api") ? url.slice(4) : url;
        const blob = await fetchDocumentoBlob(doc, apiPath);
        const objectUrl = URL.createObjectURL(blob);
        previewObjectUrlRef.current = objectUrl;

        return {
          url: objectUrl,
          text: kind === "text" ? await blob.text() : null,
        };
      }

      return {
        url,
        text: null,
      };
    },
    [],
  );

  const handleOpenDocumentoPreview = useCallback(
    async (doc: Documento) => {
      limparPreviewDocumento();
      setDocumentoPreview(doc);

      const kind = getDocumentoPreviewKind(doc.tipo);
      if (kind === "unsupported") {
        return;
      }

      setDocumentoPreviewLoading(true);

      try {
        const preview = await loadDocumentoPreview(doc, kind);
        setDocumentoPreviewUrl(preview.url);
        setDocumentoPreviewText(preview.text);
      } catch (error) {
        console.error("Erro ao preparar preview do documento:", error);
        setDocumentoPreviewErro("Não foi possível preparar a visualização deste arquivo.");
      } finally {
        setDocumentoPreviewLoading(false);
      }
    },
    [limparPreviewDocumento, loadDocumentoPreview],
  );

  const handleDownloadDocumento = useCallback(async (doc: Documento) => {
    try {
      if (doc.id.startsWith("local:")) {
        const storageKey = doc.id.slice("local:".length);
        const apiPath = `/documentos/stream/${storageKey.replaceAll("/", "__")}`;
        const blob = await fetchDocumentoBlob(doc, apiPath);
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = doc.nome;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const result = await documentosApi.downloadUrl(doc.id);
      const url = typeof result === "string" ? result : result.url;
      const nome = typeof result === "string" ? doc.nome : result.nome || doc.nome;

      if (!url) {
        throw new Error("URL de download ausente.");
      }

      if (url.startsWith("/")) {
        const apiPath = url.startsWith("/api") ? url.slice(4) : url;
        const blob = await fetchDocumentoBlob(doc, apiPath);
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = nome;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = nome;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast.error("Não foi possível baixar o documento.");
    }
  }, []);

  const handleAbrirPreviewEmNovaGuia = useCallback(() => {
    if (!documentoPreviewUrl) return;
    window.open(documentoPreviewUrl, "_blank", "noopener,noreferrer");
  }, [documentoPreviewUrl]);

  const handleRegistrarAndamento = async () => {
    if (!processoId) return;

    const descricao = formAndamento.descricao.trim();
    if (!descricao) {
      toast.error("Descreva o andamento antes de guardar.");
      return;
    }

    setRegistrandoAndamento(true);
    try {
      await processosApi.adicionarMovimentacao(processoId, {
        tipo: formAndamento.tipo,
        data: formAndamento.data,
        descricao,
      });
      await carregarDetalhe(processoId);
      onAtualizado?.();
      setRegistrarAndamentoAberto(false);
      setFormAndamento({
        tipo: "DESPACHO",
        data: new Date().toISOString().slice(0, 10),
        descricao: "",
      });
      toast.success("Andamento registado com sucesso.");
    } catch {
      toast.error("Não foi possível registrar o andamento manual.");
    } finally {
      setRegistrandoAndamento(false);
    }
  };

  const handleDocumentoSalvo = useCallback(async () => {
    if (!processoId) return;

    await carregarDetalhe(processoId);
    onAtualizado?.();
    setUploadDocumentoAberto(false);
    toast.success("Documento associado ao processo.");
  }, [carregarDetalhe, onAtualizado, processoId]);

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent side="right" className="w-full border-l border-border bg-background p-0 sm:max-w-[1280px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Dossie do processo</SheetTitle>
            <SheetDescription>Visão consolidada do processo com resumo, partes, histórico, prazos e documentos.</SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : erroCarregamento ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-base font-semibold text-foreground">Falha ao carregar o dossie</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{erroCarregamento}</p>
                {processoId && (
                  <Button className="mt-5" onClick={() => void handleReload()}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            </div>
          ) : !detalhe ? null : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border bg-card px-8 py-7">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className={cn("border text-xs", STATUS_BADGE_CLASS[detalhe.status])}>
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        {STATUS_LABEL[detalhe.status]}
                      </Badge>
                      <span className="font-mono text-2xl font-bold tracking-tight text-foreground">{maskNpu(detalhe.npu)}</span>
                    </div>

                    <p className="mt-3 text-lg text-foreground">{detalhe.titulo || "Título não informado"}</p>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoMetric
                        icon={Scale}
                        label="Acao / Foro"
                        value={[tipoAcaoResumo || "Ação não informada", foroResumo || "Foro não informado"].filter(Boolean).join(" / ")}
                      />
                      <InfoMetric
                        icon={Clock3}
                        label="Ultima movimentacao"
                        value={formatRelativeUpdate(detalhe.dataUltimaMovimentacao)}
                      />
                      <InfoMetric
                        icon={CircleDollarSign}
                        label="Valor da causa"
                        value={formatCurrency(detalhe.valorCausa)}
                      />
                      <InfoMetric
                        icon={CalendarDays}
                        label="Proximo prazo"
                        value={detalhe.proximoPrazo ? formatDate(detalhe.proximoPrazo) : "Sem prazo aberto"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => setUploadDocumentoAberto(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Adicionar documento
                    </Button>
                    <Button variant="outline" onClick={() => setEditando(true)}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Gerir processo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={onClose}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border px-8">
                  <TabsList className="h-auto w-full justify-start gap-4 overflow-x-auto rounded-none bg-transparent p-0">
                    {[
                      { value: "resumo", label: "Resumo" },
                      { value: "partes", label: "Partes" },
                      { value: "historico", label: "Historico" },
                      { value: "prazos", label: "Prazos" },
                      { value: "documentos", label: "Documentos" },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="rounded-none border-b-2 border-transparent px-1 py-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-8 py-6">
                    <TabsContent value="resumo" className="mt-0">
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-lg">Dados do Processo</CardTitle>
                                  <CardDescription>Leitura direta do cadastro, do foro e do contexto operacional.</CardDescription>
                                </div>
                                <Badge variant="outline" className="border-border bg-background text-foreground">
                                  {formatStatusOriginal(detalhe.statusOriginal)}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                              <SummaryField label="Acao" value={tipoAcaoResumo || "Não informada"} />
                              <SummaryField label="Numero / NPU" value={maskNpu(detalhe.npu || detalhe.numero)} />
                              <SummaryField label="Foro / Juizo" value={foroResumo} />
                              <SummaryField label="Valor da causa" value={formatCurrency(detalhe.valorCausa)} />
                              <SummaryField label="Caso" value={detalhe.casoTitulo || "Sem caso vinculado"} />
                              <SummaryField
                                label="Distribuido em"
                                value={detalhe.dataDistribuicao ? formatDate(detalhe.dataDistribuicao) : "Não informado"}
                              />
                              <SummaryField
                                label="Ultima movimentacao"
                                value={
                                  detalhe.dataUltimaMovimentacao
                                    ? `${formatDate(detalhe.dataUltimaMovimentacao)} / ${formatRelativeUpdate(detalhe.dataUltimaMovimentacao)}`
                                    : "Sem movimentacao registada"
                                }
                              />
                              <SummaryField label="Unidade" value={detalhe.unidadeNome || "Não informada"} />
                              <SummaryField label="Advogados" value={advogadosResumo} />
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                  <Users2 className="h-5 w-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">Partes Envolvidas</CardTitle>
                                  <CardDescription>Resumo visual dos polos do processo e das partes principais.</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <h4 className="text-sm font-semibold text-foreground">Polo Ativo</h4>
                                  <Badge variant="outline" className="border-border bg-background text-foreground">
                                    {partesAtivas.length}
                                  </Badge>
                                </div>
                                {partesAtivas.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Nenhum autor ou requerente registado.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {partesAtivas.slice(0, 4).map((parte) => {
                                      const clienteRelacionado = resolveClienteRelacionado(parte, clientes);

                                      return (
                                        <div key={parte.id} className="rounded-2xl border border-border bg-card px-3 py-3">
                                          {clienteRelacionado ? (
                                            <button
                                              type="button"
                                              onClick={() => setClientePreview(clienteRelacionado)}
                                              className="inline-flex items-center gap-1 text-left text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                                            >
                                              {parte.nome}
                                              <ArrowUpRight className="h-3.5 w-3.5" />
                                            </button>
                                          ) : (
                                            <p className="text-sm font-medium text-foreground">{parte.nome}</p>
                                          )}
                                          <p className="mt-1 text-xs text-muted-foreground">{parte.documento || "Documento não informado"}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <h4 className="text-sm font-semibold text-foreground">Polo Passivo</h4>
                                  <Badge variant="outline" className="border-border bg-background text-foreground">
                                    {partesPassivas.length}
                                  </Badge>
                                </div>
                                {partesPassivas.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Nenhum reu ou requerido registado.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {partesPassivas.slice(0, 4).map((parte) => {
                                      const clienteRelacionado = resolveClienteRelacionado(parte, clientes);

                                      return (
                                        <div key={parte.id} className="rounded-2xl border border-border bg-card px-3 py-3">
                                          {clienteRelacionado ? (
                                            <button
                                              type="button"
                                              onClick={() => setClientePreview(clienteRelacionado)}
                                              className="inline-flex items-center gap-1 text-left text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                                            >
                                              {parte.nome}
                                              <ArrowUpRight className="h-3.5 w-3.5" />
                                            </button>
                                          ) : (
                                            <p className="text-sm font-medium text-foreground">{parte.nome}</p>
                                          )}
                                          <p className="mt-1 text-xs text-muted-foreground">{parte.documento || "Documento não informado"}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                                  <History className="h-5 w-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">Ultimos Historicos</CardTitle>
                                  <CardDescription>Movimentações recentes para leitura imediata logo na entrada do dossiê.</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {movimentacoes.length > 0 ? (
                                <div className="space-y-4">
                                  {movimentacoes.slice(0, 5).map((movimentacao) => (
                                    <div
                                      key={movimentacao.id}
                                      className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/35 px-4 py-4"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="border-border bg-background text-foreground">
                                          {formatTipoMovimentacao(movimentacao.tipo)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDateTime(movimentacao.dataHora || movimentacao.data)}
                                        </span>
                                      </div>
                                      <p className="text-sm leading-6 text-foreground">{movimentacao.descricao}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-10 text-sm text-muted-foreground">
                                  Nenhum historico disponivel para este processo.
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-lg">Proximas Atividades</CardTitle>
                                  <CardDescription>Prazos, tarefas e compromissos vinculados a este processo.</CardDescription>
                                </div>
                                <Button size="sm" className="gap-2" onClick={() => setNovoPrazoAberto(true)}>
                                  <Plus className="h-4 w-4" />
                                  Novo prazo
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {prazosVinculados.length > 0 ? (
                                <div className="space-y-3">
                                  {prazosVinculados.slice(0, 4).map((prazo) => (
                                    <div
                                      key={prazo.id}
                                      className="rounded-2xl border border-border bg-muted/35 px-4 py-4"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <Badge variant="outline" className="border-border bg-background text-primary">
                                          {formatKanbanStatus(prazo.statusKanban)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {prazo.dataFatal ? formatDate(prazo.dataFatal) : "Data fatal nao informada"}
                                        </span>
                                      </div>
                                      <p className="mt-3 text-sm font-medium leading-6 text-foreground">{prazo.titulo}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-10 text-sm text-muted-foreground">
                                  Nenhum prazo vinculado a este processo.
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-lg">Documentos do Processo</CardTitle>
                                  <CardDescription>Arquivos mais recentes ligados ao processo, com preview rapido.</CardDescription>
                                </div>
                                <Button size="sm" variant="outline" className="gap-2" onClick={() => setUploadDocumentoAberto(true)}>
                                  <Upload className="h-4 w-4" />
                                  Enviar
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {loadingDocumentos ? (
                                <div className="flex items-center justify-center py-10">
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                              ) : documentosRecentes.length > 0 ? (
                                <div className="space-y-3">
                                  {documentosRecentes.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="rounded-2xl border border-border bg-muted/35 px-4 py-4"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-foreground">{doc.nome}</p>
                                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>{doc.tipo.toUpperCase()}</span>
                                            <span>/</span>
                                            <span>{formatCategoriaDocumento(doc.categoria)}</span>
                                            <span>/</span>
                                            <span>{doc.tamanho}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button size="sm" variant="ghost" onClick={() => void handleOpenDocumentoPreview(doc)}>
                                            <Eye className="h-4 w-4" />
                                            Preview
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => void handleDownloadDocumento(doc)}>
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-10 text-sm text-muted-foreground">
                                  {erroDocumentos || "Nenhum documento associado a este processo."}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-4">
                              <CardTitle className="text-lg">Painel Operacional</CardTitle>
                              <CardDescription>Indicadores de apoio para quem assume o processo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Etiquetas</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {detalhe.etiquetas && detalhe.etiquetas.length > 0 ? (
                                    detalhe.etiquetas.map((etiqueta) => (
                                      <Badge
                                        key={etiqueta}
                                        variant="outline"
                                        className="border-primary/20 bg-primary/10 text-primary"
                                      >
                                        {etiqueta}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Nenhuma etiqueta aplicada.</span>
                                  )}
                                </div>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Partes</p>
                                  <p className="mt-2 text-sm font-medium text-foreground">
                                    {partesAtivas.length + partesPassivas.length} parte(s) registada(s)
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/35 p-4">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Documentos</p>
                                  <p className="mt-2 text-sm font-medium text-foreground">{documentos.length} arquivo(s) associado(s)</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="partes" className="mt-0 space-y-6">
                      <section className="grid gap-4 lg:grid-cols-4">
                        {[
                          { label: "Status operacional", value: formatStatusOriginal(detalhe.statusOriginal) },
                          { label: "Distribuicao", value: detalhe.dataDistribuicao ? formatDate(detalhe.dataDistribuicao) : "Não informada" },
                          { label: "Unidade", value: detalhe.unidadeNome || "Não informada" },
                          { label: "Tribunal / Vara", value: [detalhe.tribunal, detalhe.vara].filter(Boolean).join(" / ") || "Não informado" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-border bg-card p-5">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </section>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <ParteSection
                          title="Polo Ativo (Autores)"
                          subtitle="Leitura consolidada das partes que impulsionam a demanda."
                          partes={partesAtivas}
                          clientes={clientes}
                          onOpenCliente={setClientePreview}
                        />
                        <ParteSection
                          title="Polo Passivo (Reus)"
                          subtitle="Contrapartes, litigantes adversos e partes demandadas."
                          partes={partesPassivas}
                          clientes={clientes}
                          onOpenCliente={setClientePreview}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-0 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Linha do tempo processual</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Historico cronologico de movimentacoes sincronizadas e manuais.</p>
                        </div>
                        <Button className="gap-2" onClick={() => setRegistrarAndamentoAberto(true)}>
                          <Plus className="h-4 w-4" />
                          Registar Andamento Manual
                        </Button>
                      </div>

                      <section className="rounded-2xl border border-border bg-card p-5">
                        {movimentacoes.length > 0 ? (
                          <div className="relative space-y-0">
                            {movimentacoes.map((movimentacao, index) => (
                              <div key={movimentacao.id} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                                  {index < movimentacoes.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                                </div>
                                <div className="pb-5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-border bg-background text-foreground">
                                      {formatTipoMovimentacao(movimentacao.tipo)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateTime(movimentacao.dataHora || movimentacao.data)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">{movimentacao.descricao}</p>
                                  {movimentacao.orgaoJulgador && (
                                    <p className="mt-1 text-xs text-muted-foreground">{movimentacao.orgaoJulgador}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-10 text-sm text-muted-foreground">
                            Nenhum andamento registado para este processo.
                          </div>
                        )}
                      </section>
                    </TabsContent>

                    <TabsContent value="prazos" className="mt-0 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Prazos vinculados ao processo</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Visao rapida das tarefas, prazos fatais e cards operacionais ligados a este processo.</p>
                        </div>
                        <Button className="gap-2" onClick={() => setNovoPrazoAberto(true)}>
                          <Plus className="h-4 w-4" />
                          Novo Prazo
                        </Button>
                      </div>

                      <section className="overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="grid grid-cols-[minmax(0,1.7fr)_160px_160px] gap-4 border-b border-border bg-muted/35 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          <span>Título</span>
                          <span>Data fatal</span>
                          <span>Kanban</span>
                        </div>

                        {prazosVinculados.length > 0 ? (
                          prazosVinculados.map((prazo) => (
                            <div
                              key={prazo.id}
                              className="grid grid-cols-[minmax(0,1.7fr)_160px_160px] gap-4 border-b border-border px-5 py-4 text-sm last:border-b-0"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{prazo.titulo}</p>
                                <p className="mt-1 text-xs text-muted-foreground">ID: {prazo.id}</p>
                              </div>
                              <div className="text-muted-foreground">{prazo.dataFatal ? formatDate(prazo.dataFatal) : "Não informada"}</div>
                              <div>
                                <Badge variant="outline" className="border-border bg-background text-foreground">
                                  {formatKanbanStatus(prazo.statusKanban)}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-10 text-sm text-muted-foreground">Nenhum prazo vinculado a este processo.</div>
                        )}
                      </section>
                    </TabsContent>

                    <TabsContent value="documentos" className="mt-0 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Diretorio do Processo</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Lista de arquivos atrelados ao processo com preview rapido e download.</p>
                        </div>
                        <Button className="gap-2" onClick={() => setUploadDocumentoAberto(true)}>
                          <Upload className="h-4 w-4" />
                          Novo Documento
                        </Button>
                      </div>

                      {erroDocumentos && documentos.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-6 text-sm text-muted-foreground">
                          {erroDocumentos}
                        </div>
                      )}

                      <section className="overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="hidden grid-cols-[minmax(0,1.6fr)_120px_170px_190px] gap-4 border-b border-border bg-muted/35 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
                          <span>Documento</span>
                          <span>Tipo</span>
                          <span>Upload</span>
                          <span className="text-right">Ações</span>
                        </div>

                        {loadingDocumentos ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : documentos.length > 0 ? (
                          documentos.map((doc) => (
                            <div
                              key={doc.id}
                              className="grid gap-4 border-b border-border px-5 py-4 text-sm last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_120px_170px_190px]"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{doc.nome}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="border-border bg-background text-foreground">
                                    {formatCategoriaDocumento(doc.categoria)}
                                  </Badge>
                                  <span>{doc.tamanho}</span>
                                </div>
                              </div>

                              <div className="text-muted-foreground">{doc.tipo.toUpperCase()}</div>
                              <div className="text-muted-foreground">{formatDate(doc.dataUpload)}</div>
                              <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                                <Button size="sm" variant="outline" onClick={() => void handleOpenDocumentoPreview(doc)}>
                                  <Eye className="h-4 w-4" />
                                  Preview
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => void handleDownloadDocumento(doc)}>
                                  <Download className="h-4 w-4" />
                                  Baixar
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-12 text-sm text-muted-foreground">
                            Nenhum documento associado a este processo.
                          </div>
                        )}
                      </section>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={registrarAndamentoAberto} onOpenChange={setRegistrarAndamentoAberto}>
        <DialogContent className="border-border bg-card sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Registar andamento manual</DialogTitle>
            <DialogDescription>Inclua um andamento interno ou protocolado e reforce o historico visivel no dossie.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de andamento</Label>
                <select
                  value={formAndamento.tipo}
                  onChange={(event) => setFormAndamento((current) => ({ ...current, tipo: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                >
                  {TIPO_MOVIMENTACAO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formAndamento.data}
                  onChange={(event) => setFormAndamento((current) => ({ ...current, data: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descricao *</Label>
              <Textarea
                value={formAndamento.descricao}
                onChange={(event) => setFormAndamento((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Descreva o andamento processual, a origem e o impacto esperado..."
                className="min-h-[140px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrarAndamentoAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleRegistrarAndamento()} disabled={registrandoAndamento}>
              {registrandoAndamento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar andamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(clientePreview)} onOpenChange={(nextOpen) => !nextOpen && setClientePreview(null)}>
        <DialogContent className="border-border bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{clientePreview?.nome ?? "Cliente relacionado"}</DialogTitle>
            <DialogDescription>Referencia rapida do cadastro identificado a partir das partes do processo.</DialogDescription>
          </DialogHeader>

          {clientePreview && (
            <div className="grid gap-3">
              {[
                { label: "Documento", value: clientePreview.cpfCnpj || "Não informado" },
                { label: "Email", value: clientePreview.email || "Não informado" },
                { label: "Telefone", value: clientePreview.telefone || "Não informado" },
                {
                  label: "Cidade / UF",
                  value: [clientePreview.cidade, clientePreview.estado].filter(Boolean).join(" / ") || "Não informado",
                },
                { label: "Advogado responsavel", value: clientePreview.advogadoResponsavel || "Não informado" },
                { label: "Unidade", value: clientePreview.unidadeNome || "Não informada" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(documentoPreview)} onOpenChange={(nextOpen) => !nextOpen && fecharPreviewDocumento()}>
        <DialogContent className="max-h-[90vh] overflow-hidden border-border bg-card p-0 sm:max-w-[1120px]">
          <div className="grid max-h-[90vh] min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="border-b border-border bg-background p-6 lg:border-b-0 lg:border-r">
              <DialogHeader className="text-left">
                <DialogTitle>{documentoPreview?.nome || "Preview do documento"}</DialogTitle>
                <DialogDescription>
                  {documentoPreview
                    ? `${documentoPreview.tipo.toUpperCase()} / ${formatCategoriaDocumento(documentoPreview.categoria)} / ${documentoPreview.tamanho}`
                    : "Visualizacao rapida do arquivo selecionado."}
                </DialogDescription>
              </DialogHeader>

              {documentoPreview && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Upload</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatDate(documentoPreview.dataUpload)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Preview</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {previewKind === "unsupported" ? "Tipo nao suportado no preview embutido" : "Visualizacao disponivel"}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {documentoPreview && (
                  <Button variant="outline" className="gap-2" onClick={() => void handleDownloadDocumento(documentoPreview)}>
                    <Download className="h-4 w-4" />
                    Baixar
                  </Button>
                )}
                {documentoPreviewUrl && previewKind !== "unsupported" && (
                  <Button variant="ghost" className="gap-2" onClick={handleAbrirPreviewEmNovaGuia}>
                    <ArrowUpRight className="h-4 w-4" />
                    Abrir em nova guia
                  </Button>
                )}
              </div>
            </div>

            <div className="min-h-[420px] bg-zinc-950">
              {documentoPreviewLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : documentoPreviewErro ? (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <div>
                    <p className="text-base font-semibold text-zinc-100">Falha ao preparar o preview</p>
                    <p className="mt-2 text-sm text-zinc-400">{documentoPreviewErro}</p>
                  </div>
                </div>
              ) : previewKind === "unsupported" ? (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="mt-5 text-base font-semibold text-zinc-100">Preview indisponivel para este formato</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Arquivos Office e comprimidos continuam acessiveis para download, mas sem visualizacao embutida neste painel.
                    </p>
                  </div>
                </div>
              ) : previewKind === "image" && documentoPreviewUrl ? (
                <div className="flex h-full items-center justify-center p-6">
                  <img src={documentoPreviewUrl} alt={documentoPreview?.nome} className="max-h-full max-w-full rounded-2xl object-contain" />
                </div>
              ) : previewKind === "pdf" && documentoPreviewUrl ? (
                <iframe title={documentoPreview?.nome} src={documentoPreviewUrl} className="h-[78vh] w-full" />
              ) : previewKind === "video" && documentoPreviewUrl ? (
                <div className="flex h-full items-center justify-center p-6">
                  <video src={documentoPreviewUrl} controls className="max-h-full max-w-full rounded-2xl" />
                </div>
              ) : previewKind === "audio" && documentoPreviewUrl ? (
                <div className="flex h-full items-center justify-center p-6">
                  <audio src={documentoPreviewUrl} controls className="w-full max-w-xl" />
                </div>
              ) : previewKind === "text" ? (
                documentoPreviewText ? (
                  <ScrollArea className="h-[78vh]">
                    <pre className="whitespace-pre-wrap break-words p-6 text-sm leading-7 text-zinc-100">{documentoPreviewText}</pre>
                  </ScrollArea>
                ) : documentoPreviewUrl ? (
                  <iframe title={documentoPreview?.nome} src={documentoPreviewUrl} className="h-[78vh] w-full" />
                ) : null
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {uploadDocumentoAberto && detalhe && (
        <DocumentoUploadModal
          onClose={() => setUploadDocumentoAberto(false)}
          onSaved={handleDocumentoSalvo}
          clientesList={[
            {
              id: detalhe.clienteId ?? "",
              nome: detalhe.clienteNome ?? detalhe.titulo,
            },
          ]}
          processosList={[toEditableProcesso(detalhe)]}
          pastasInternas={[]}
          initialDestino="cliente"
          initialClienteId={detalhe.clienteId ?? undefined}
          initialProcessoId={detalhe.id}
          allowDestinoSwitch={false}
          lockClienteId={detalhe.clienteId ?? undefined}
          lockProcessoId={detalhe.id}
          title="Adicionar documento ao processo"
        />
      )}

      {novoPrazoAberto && detalhe && (
        <AtividadeModal
          onClose={() => setNovoPrazoAberto(false)}
          onSaved={async () => {
            if (processoId) {
              await carregarDetalhe(processoId);
            }
            onAtualizado?.();
          }}
          initialProcessoId={detalhe.id}
        />
      )}

      {editando && detalhe && (
        <EditarProcessoModal
          processo={toEditableProcesso(detalhe)}
          onClose={() => setEditando(false)}
          onSaved={async () => {
            setEditando(false);
            await handleReload();
            onAtualizado?.();
          }}
        />
      )}
    </>
  );
}
