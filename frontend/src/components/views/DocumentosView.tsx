import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Files,
  FolderClosed,
  FolderOpen,
  Grid3x3,
  List,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { EditarDocumentoModal } from "@/components/modals/EditarDocumentoModal";
import { DocumentoUploadModal } from "@/components/modals/DocumentoUploadModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { clientes as clientesMock, documentos as documentosMock, processos as processosMock } from "@/data/mockData";
import {
  applyDocumentoVirtualState,
  listDocumentoVirtualTrashed,
  markDocumentoVirtualDeleted,
  purgeDocumentoVirtual,
  restoreDocumentoVirtual,
  saveDocumentoVirtualOverride,
} from "@/lib/documentos-virtual-state";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { clientesApi, documentosApi, pastasApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type {
  AcervoCidadeDocumento,
  AcervoClienteDocumento,
  Cliente,
  DocumentoAtividade,
  Documento,
  PastaInternaNode,
  Processo,
} from "@/types";

const tipoConfig: Record<string, { label: string; bg: string; text: string; char: string }> = {
  pdf: { label: "PDF", bg: "bg-red-500/15", text: "text-red-400", char: "PDF" },
  docx: { label: "DOCX", bg: "bg-blue-500/15", text: "text-blue-400", char: "DOC" },
  doc: { label: "DOC", bg: "bg-blue-500/15", text: "text-blue-400", char: "DOC" },
  xlsx: { label: "XLSX", bg: "bg-green-500/15", text: "text-green-400", char: "XLS" },
  xls: { label: "XLS", bg: "bg-green-500/15", text: "text-green-400", char: "XLS" },
  jpg: { label: "JPG", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  jpeg: { label: "JPEG", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  png: { label: "PNG", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  gif: { label: "GIF", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  mp4: { label: "MP4", bg: "bg-orange-500/15", text: "text-orange-400", char: "VID" },
  zip: { label: "ZIP", bg: "bg-yellow-500/15", text: "text-yellow-400", char: "ZIP" },
  rar: { label: "RAR", bg: "bg-yellow-500/15", text: "text-yellow-400", char: "RAR" },
  txt: { label: "TXT", bg: "bg-muted", text: "text-muted-foreground", char: "TXT" },
  outro: { label: "ARQ", bg: "bg-muted", text: "text-muted-foreground", char: "ARQ" },
};

const categoriaLabel: Record<string, string> = {
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

const categoriasOpcoes = [
  { value: "PETICAO", label: "Peticao" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "PROCURACAO", label: "Procuracao" },
  { value: "SENTENCA", label: "Sentenca" },
  { value: "RECURSO", label: "Recurso" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTROS", label: "Outros" },
];

const ordenacaoOpcoes = [
  { value: "recentes", label: "Recentes" },
  { value: "antigos", label: "Mais antigos" },
  { value: "nome_asc", label: "Nome A-Z" },
  { value: "nome_desc", label: "Nome Z-A" },
  { value: "categoria", label: "Categoria" },
];

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

type DocumentoDestino = "cliente" | "interno";
type OrdenacaoDocumentos = "recentes" | "antigos" | "nome_asc" | "nome_desc" | "categoria";
type ClienteAcervoSource = Pick<Cliente, "id" | "nome" | "initials" | "cidade" | "estado" | "ativo">;

type DocumentSelection =
  | { type: "overview" }
  | { type: "trash" }
  | { type: "cidade"; cidade: AcervoCidadeDocumento }
  | { type: "cliente"; cidadeChave: string; cidadeLabel: string; cliente: AcervoClienteDocumento }
  | { type: "interna"; pastaId: string; nome: string; path: string[] };

interface PastaOption {
  id: string;
  label: string;
}

interface ExplorerFolderItem {
  kind: "folder";
  id: string;
  nome: string;
  subtitle: string;
  tipoLabel: string;
  contextoLabel: string;
  tamanhoLabel: string;
  onOpen: () => void;
}

interface BreadcrumbItem {
  label: string;
  current?: boolean;
  onClick?: () => void;
}

type PreviewTab = "preview" | "info" | "activities";
type PreviewKind = "pdf" | "image" | "video" | "text" | "unsupported";
type PainelDetalhesModo = "documento" | "atividade_global";

const SHOULD_MERGE_DEMO_DOCUMENTS = import.meta.env.DEV || import.meta.env.MODE === "test";

const clienteMockPorId = new Map(clientesMock.map((cliente) => [cliente.id, cliente]));
const processoMockPorId = new Map(processosMock.map((processo) => [processo.id, processo]));

const documentosMockNormalizados = documentosMock.map((doc) =>
  normalizeDocumento({
    ...doc,
    id: `demo:${doc.id}`,
    clienteNome: doc.clienteNome ?? clienteMockPorId.get(doc.clienteId ?? "")?.nome,
    processoNumero: doc.processoNumero ?? processoMockPorId.get(doc.processoId ?? "")?.numero,
  } as Documento & { uploadadoPor?: string }),
);

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildInitials(nome?: string | null) {
  const normalizedName = (nome ?? "").trim();
  if (!normalizedName) return "CL";

  return normalizedName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildCidadeGroupKey(cidade?: string | null, estado?: string | null) {
  return `${normalizeText(cidade)}::${normalizeText(estado)}`;
}

function buildCidadeLabel(cidade?: string | null, estado?: string | null) {
  const cidadeLabel = cidade?.trim() || "Sem cidade";
  const estadoLabel = estado?.trim() || "--";
  return `${cidadeLabel} - ${estadoLabel}`;
}

function sortAcervoClientes(clientes: AcervoClienteDocumento[]) {
  return [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

function mergeAcervoComClientes(
  acervoBase: AcervoCidadeDocumento[],
  clientesBase: ClienteAcervoSource[],
): AcervoCidadeDocumento[] {
  const grouped = new Map<string, AcervoCidadeDocumento>();

  acervoBase.forEach((cidade) => {
    const groupKey = buildCidadeGroupKey(cidade.cidade, cidade.estado);
    const clientesUnicos = new Map(cidade.clientes.map((cliente) => [cliente.id, cliente]));

    grouped.set(groupKey, {
      ...cidade,
      clientes: sortAcervoClientes(Array.from(clientesUnicos.values())),
      totalClientes: clientesUnicos.size,
    });
  });

  clientesBase
    .filter((cliente) => cliente.ativo !== false)
    .forEach((cliente) => {
      const groupKey = buildCidadeGroupKey(cliente.cidade, cliente.estado);
      const clienteAcervo: AcervoClienteDocumento = {
        id: cliente.id,
        nome: cliente.nome,
        initials: cliente.initials || buildInitials(cliente.nome),
      };

      const existing = grouped.get(groupKey);

      if (existing) {
        if (!existing.clientes.some((item) => item.id === cliente.id)) {
          const nextClientes = sortAcervoClientes([...existing.clientes, clienteAcervo]);
          grouped.set(groupKey, {
            ...existing,
            clientes: nextClientes,
            totalClientes: nextClientes.length,
          });
        }
        return;
      }

      grouped.set(groupKey, {
        chave: `cidade:${groupKey}`,
        cidade: cliente.cidade || "Sem cidade",
        estado: cliente.estado || "--",
        label: buildCidadeLabel(cliente.cidade, cliente.estado),
        clientes: [clienteAcervo],
        totalClientes: 1,
      });
    });

  return Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function normalizeDocumento(doc: Documento & { uploadadoPor?: string }): Documento {
  return {
    ...doc,
    uploadedPor: doc.uploadedPor ?? doc.uploadadoPor,
  };
}

function isDocumentoLocal(doc: Documento) {
  return doc.id.startsWith("local:");
}

function isDocumentoDemo(doc: Documento) {
  return doc.id.startsWith("demo:");
}

function isDocumentoVirtual(doc: Documento) {
  return isDocumentoLocal(doc) || isDocumentoDemo(doc);
}

function buildDocumentoMergeKey(doc: Documento) {
  return [
    normalizeText(doc.nome),
    normalizeText(doc.clienteId),
    normalizeText(doc.clienteNome),
    normalizeText(doc.processoId),
    normalizeText(doc.processoNumero),
    normalizeText(doc.pastaId),
    normalizeText(doc.dataUpload),
  ].join("|");
}

function mergeDocumentos(primary: Documento[], fallback: Documento[]) {
  const merged = new Map<string, Documento>();

  fallback.forEach((doc) => {
    merged.set(buildDocumentoMergeKey(doc), doc);
  });

  primary.forEach((doc) => {
    merged.set(buildDocumentoMergeKey(doc), doc);
  });

  return Array.from(merged.values());
}

function mergeDocumentosById(primary: Documento[], secondary: Documento[]) {
  const merged = new Map<string, Documento>();

  secondary.forEach((doc) => {
    merged.set(doc.id, doc);
  });

  primary.forEach((doc) => {
    merged.set(doc.id, doc);
  });

  return Array.from(merged.values());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDateLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resolvePreviewKind(documento: Documento | null): PreviewKind {
  if (!documento) return "unsupported";

  const tipo = documento.tipo?.toLowerCase?.() ?? "";
  if (tipo === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(tipo)) return "image";
  if (["mp4", "mov", "mpeg", "avi", "webm"].includes(tipo)) return "video";
  if (["txt"].includes(tipo)) return "text";
  return "unsupported";
}

function formatTipoAcao(acao?: string | null) {
  switch ((acao ?? "").toUpperCase()) {
    case "FEZ_UPLOAD":
      return "Upload";
    case "BAIXOU":
      return "Download";
    case "EDITOU":
      return "Edicao";
    case "EXCLUIU":
      return "Exclusao";
    case "RESTAUROU":
      return "Restauracao";
    case "VISUALIZOU":
      return "Visualizacao";
    default:
      return acao ?? "Atividade";
  }
}

function FileIcon({ tipo, size = "md" }: { tipo: string; size?: "sm" | "md" | "lg" }) {
  const conf = tipoConfig[tipo?.toLowerCase()] ?? tipoConfig.outro;
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-bold shrink-0",
        conf.bg,
        conf.text,
        size === "sm" && "w-8 h-8 text-[9px]",
        size === "md" && "w-10 h-10 text-[10px]",
        size === "lg" && "w-14 h-14 text-xs",
      )}
    >
      {conf.char}
    </div>
  );
}

function flattenPastas(nodes: PastaInternaNode[], depth = 0): PastaOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"\u00A0\u00A0".repeat(depth)}${node.nome}` },
    ...flattenPastas(node.children ?? [], depth + 1),
  ]);
}

function findPastaNode(nodes: PastaInternaNode[], targetId: string): PastaInternaNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const child = findPastaNode(node.children ?? [], targetId);
    if (child) return child;
  }
  return null;
}

function findPastaPath(nodes: PastaInternaNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node.nome];
    if (node.id === targetId) return nextTrail;
    const childPath = findPastaPath(node.children ?? [], targetId, nextTrail);
    if (childPath) return childPath;
  }
  return null;
}

function findPastaPathIds(nodes: PastaInternaNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node.id];
    if (node.id === targetId) return nextTrail;
    const childPath = findPastaPathIds(node.children ?? [], targetId, nextTrail);
    if (childPath) return childPath;
  }
  return null;
}

interface UploadModalProps {
  onClose: () => void;
  onSaved: () => void;
  clientesList: { id: string; nome: string }[];
  pastasInternas: PastaInternaNode[];
  initialDestino?: DocumentoDestino;
  initialClienteId?: string;
  initialPastaId?: string;
}

function UploadModal({
  onClose,
  onSaved,
  clientesList,
  pastasInternas,
  initialDestino = "cliente",
  initialClienteId,
  initialPastaId,
}: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [destino, setDestino] = useState<DocumentoDestino>(initialDestino);
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState("OUTROS");
  const [clienteId, setClienteId] = useState(initialClienteId ?? "");
  const [pastaId, setPastaId] = useState(initialPastaId ?? "");
  const [progresso, setProgresso] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pastaOptions = flattenPastas(pastasInternas);

  const escolherArquivo = (selectedFile: File) => {
    if (selectedFile.size > MAX_SIZE_BYTES) {
      setErro(`Arquivo muito grande: ${formatBytes(selectedFile.size)}. Maximo permitido: 100MB.`);
      return;
    }
    setFile(selectedFile);
    setErro(null);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const pastedFile = item.getAsFile();
          if (pastedFile) escolherArquivo(pastedFile);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (destino === "cliente" && !clienteId) {
      setErro("Selecione o cliente que recebera o documento.");
      return;
    }
    if (destino === "interno" && !pastaId) {
      setErro("Selecione a pasta que recebera o documento.");
      return;
    }

    setUploading(true);
    setErro(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoria", categoria);
    if (destino === "cliente") formData.append("clienteId", clienteId);
    if (destino === "interno") formData.append("pastaId", pastaId);

    try {
      await documentosApi.upload(formData, (pct) => setProgresso(pct));
      setConcluido(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      setErro(axiosErr.response?.data?.mensagem ?? "Erro ao enviar arquivo.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Upload de documento</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {!file ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const droppedFile = event.dataTransfer.files[0];
                if (droppedFile) escolherArquivo(droppedFile);
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.zip,.rar,.7z,.txt,.rtf"
                onChange={(event) => {
                  if (event.target.files?.[0]) escolherArquivo(event.target.files[0]);
                }}
              />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste, clique ou cole (Ctrl+V)</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, imagens e videos ate 100MB</p>
            </div>
          ) : concluido ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Upload concluido</p>
              <p className="text-sm text-muted-foreground">{file.name}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <FileIcon tipo={file.name.split(".").pop() ?? ""} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setFile(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{progresso}%</p>
                </div>
              )}
            </div>
          )}

          {erro && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}

          {!concluido && (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <select
                  value={destino}
                  onChange={(event) => setDestino(event.target.value as DocumentoDestino)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                >
                  <option value="cliente">Cliente</option>
                  <option value="interno">Pasta</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  value={categoria}
                  onChange={(event) => setCategoria(event.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                >
                  {categoriasOpcoes.map((categoriaOption) => (
                    <option key={categoriaOption.value} value={categoriaOption.value}>
                      {categoriaOption.label}
                    </option>
                  ))}
                </select>
              </div>

              {destino === "cliente" ? (
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <select
                    value={clienteId}
                    onChange={(event) => setClienteId(event.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientesList.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Pasta</Label>
                  <select
                    value={pastaId}
                    onChange={(event) => setPastaId(event.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                  >
                    <option value="">Selecione uma pasta</option>
                    {pastaOptions.map((pasta) => (
                      <option key={pasta.id} value={pasta.id}>
                        {pasta.label}
                      </option>
                    ))}
                  </select>
                  {pastaOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Crie uma pasta antes de usar este destino.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" disabled={!file || uploading || concluido} onClick={handleUpload}>
            {uploading ? `Enviando... ${progresso}%` : "Fazer upload"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NovaPastaModalProps {
  onClose: () => void;
  onSaved: (pasta: PastaInternaNode) => void;
  pastasInternas: PastaInternaNode[];
  initialParentId?: string;
}

function NovaPastaModal({ onClose, onSaved, pastasInternas, initialParentId }: NovaPastaModalProps) {
  const [nome, setNome] = useState("");
  const [parentId, setParentId] = useState(initialParentId ?? "");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pastaOptions = flattenPastas(pastasInternas);

  const handleSave = async () => {
    if (!nome.trim()) {
      setErro("Informe o nome da pasta.");
      return;
    }

    setSaving(true);
    setErro(null);

    try {
      const created = await pastasApi.criarInterna({
        nome: nome.trim(),
        parentId: parentId || undefined,
      });
      onSaved(created);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      setErro(axiosErr.response?.data?.mensagem ?? "Erro ao criar pasta.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Nova pasta</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da pasta</Label>
            <Input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder=""
              className="bg-secondary border-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Criar em:</Label>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
            >
              <option value="">Pastas internas</option>
              {pastaOptions.map((pasta) => (
                <option key={pasta.id} value={pasta.id}>
                  {pasta.label}
                </option>
              ))}
            </select>
          </div>

          {erro && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{erro}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" disabled={saving} onClick={handleSave}>
            {saving ? "Criando..." : "Criar pasta"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export const DocumentosView = () => {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("lista");
  const [uploadAberto, setUploadAberto] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState<Documento | null>(null);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<Documento | null>(null);
  const [novaPastaAberta, setNovaPastaAberta] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [documentosBase, setDocumentosBase] = useState<Documento[]>([]);
  const [todosClientes, setTodosClientes] = useState<ClienteAcervoSource[]>([]);
  const [todosProcessos, setTodosProcessos] = useState<Processo[]>([]);
  const [acervoClientes, setAcervoClientes] = useState<AcervoCidadeDocumento[]>([]);
  const [pastasInternas, setPastasInternas] = useState<PastaInternaNode[]>([]);
  const [acervoAberto, setAcervoAberto] = useState(true);
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [expandedPastas, setExpandedPastas] = useState<Record<string, boolean>>({});
  const [selecao, setSelecao] = useState<DocumentSelection>({ type: "overview" });
  const [loadingEstruturas, setLoadingEstruturas] = useState(true);
  const [loadingDocumentos, setLoadingDocumentos] = useState(true);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoDocumentos>("recentes");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [painelDetalhesAberto, setPainelDetalhesAberto] = useState(false);
  const [painelDetalhesModo, setPainelDetalhesModo] = useState<PainelDetalhesModo>("documento");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("preview");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewErro, setPreviewErro] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [atividades, setAtividades] = useState<DocumentoAtividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [atividadesGerais, setAtividadesGerais] = useState<DocumentoAtividade[]>([]);
  const [loadingAtividadesGerais, setLoadingAtividadesGerais] = useState(false);
  const previewObjectUrlRef = useRef<string | null>(null);

  const hidratarDocumentos = useCallback((docs: Documento[]) => applyDocumentoVirtualState(docs), []);
  const limparPreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  const selecionarPasta = useCallback((pastaId: string, nodes: PastaInternaNode[]) => {
    const pasta = findPastaNode(nodes, pastaId);
    const path = findPastaPath(nodes, pastaId);
    const pathIds = findPastaPathIds(nodes, pastaId);
    if (!pasta || !path || !pathIds) return;

    setExpandedPastas((prev) => {
      const next = { ...prev };
      pathIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    setSelecao({
      type: "interna",
      pastaId: pasta.id,
      nome: pasta.nome,
      path,
    });
  }, []);

  const carregarEstruturas = useCallback(async (pastaParaSelecionar?: string) => {
    setLoadingEstruturas(true);

    try {
      const [acervo, pastas, clientes, processos] = await Promise.all([
        documentosApi.listarAcervoClientes(),
        pastasApi.listarInternas(),
        clientesApi.listar({ size: 500 }),
        processosApi.listar({ size: 1000 }).catch(() => ({ content: [] })),
      ]);

      const acervoLista = Array.isArray(acervo) ? acervo : [];
      const pastasLista = Array.isArray(pastas) ? pastas : [];
      const clientesData = clientes?.content ?? clientes;
      const clientesLista = Array.isArray(clientesData) ? clientesData : [];
      const processosData = processos?.content ?? processos;
      const processosLista = Array.isArray(processosData) ? processosData : [];

      setAcervoClientes(acervoLista);
      setPastasInternas(pastasLista);
      setTodosClientes(clientesLista);
      setTodosProcessos(processosLista);

      setExpandedCities((prev) => {
        const next = { ...prev };
        acervoLista.forEach((cidade) => {
          if (next[cidade.chave] === undefined) next[cidade.chave] = false;
        });
        return next;
      });

      if (pastaParaSelecionar) {
        selecionarPasta(pastaParaSelecionar, pastasLista);
      }
    } catch {
      setAcervoClientes([]);
      setPastasInternas([]);
      setTodosClientes([]);
      setTodosProcessos([]);
    } finally {
      setLoadingEstruturas(false);
    }
  }, [selecionarPasta]);

  const carregarDocumentos = useCallback(async () => {
    if (selecao.type === "cidade") {
      setDocumentosBase([]);
      setDocumentos([]);
      setLoadingDocumentos(false);
      return;
    }

    setLoadingDocumentos(true);

    try {
      if (selecao.type === "trash") {
        const [responseLixeira, responseTodos] = await Promise.all([
          documentosApi.listarLixeira({ size: 1000 }),
          documentosApi.listar({ size: 1000 }).catch(() => ({ content: [] })),
        ]);

        const itensLixeira = responseLixeira?.content ?? responseLixeira;
        const itensTodos = responseTodos?.content ?? responseTodos;

        const docsLixeira = Array.isArray(itensLixeira)
          ? itensLixeira.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        const docsAtivos = Array.isArray(itensTodos)
          ? itensTodos.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        const baseAtiva = SHOULD_MERGE_DEMO_DOCUMENTS ? mergeDocumentos(docsAtivos, documentosMockNormalizados) : docsAtivos;

        setDocumentosBase(baseAtiva);
        setDocumentos(docsLixeira);
        return;
      }

      if (selecao.type === "cliente") {
        const response = await documentosApi.listarPorCliente(selecao.cliente.id, { size: 1000 });
        const items = response?.content ?? response;
        const docsApi = Array.isArray(items)
          ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        setDocumentosBase(docsApi);
        setDocumentos(hidratarDocumentos(docsApi));
        return;
      }

      if (selecao.type === "interna") {
        const response = await documentosApi.listarPorPasta(selecao.pastaId, { size: 1000 });
        const items = response?.content ?? response;
        const docsApi = Array.isArray(items)
          ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        setDocumentosBase(docsApi);
        setDocumentos(hidratarDocumentos(docsApi));
        return;
      }

      const response = await documentosApi.listar({ size: 1000 });
      const items = response?.content ?? response;
      const docsApi = Array.isArray(items)
        ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
        : [];
      const docsBase = SHOULD_MERGE_DEMO_DOCUMENTS ? mergeDocumentos(docsApi, documentosMockNormalizados) : docsApi;

      setDocumentosBase(docsBase);
      setDocumentos(hidratarDocumentos(docsBase));
    } catch {
      const fallback = SHOULD_MERGE_DEMO_DOCUMENTS && (selecao.type === "overview" || selecao.type === "trash")
        ? documentosMockNormalizados
        : [];
      setDocumentosBase(fallback);
      setDocumentos(hidratarDocumentos(selecao.type === "trash" ? [] : fallback));
    } finally {
      setLoadingDocumentos(false);
    }
  }, [hidratarDocumentos, selecao]);

  useEffect(() => {
    void carregarEstruturas();
  }, [carregarEstruturas]);

  useEffect(() => {
    void carregarDocumentos();
  }, [carregarDocumentos]);

  useEffect(() => {
    setDocumentoSelecionado(null);
    setPainelDetalhesAberto(false);
    setPainelDetalhesModo("documento");
    setPreviewTab("preview");
    setAtividades([]);
    setAtividadesGerais([]);
    setPreviewErro(null);
    setPreviewUrl(null);
    limparPreviewObjectUrl();
  }, [selecao, limparPreviewObjectUrl]);

  const clientesAcervoBase = SHOULD_MERGE_DEMO_DOCUMENTS
    ? (() => {
        const merged = new Map<string, ClienteAcervoSource>();
        clientesMock.forEach((cliente) => {
          merged.set(cliente.id, cliente);
        });
        todosClientes.forEach((cliente) => {
          merged.set(cliente.id, cliente);
        });
        return Array.from(merged.values());
      })()
    : todosClientes;

  const acervoAgrupado = mergeAcervoComClientes(acervoClientes, clientesAcervoBase);

  useEffect(() => {
    setExpandedCities((prev) => {
      const next = { ...prev };
      acervoAgrupado.forEach((cidade) => {
        if (next[cidade.chave] === undefined) next[cidade.chave] = false;
      });
      return next;
    });
  }, [acervoAgrupado]);

  const selecionarCidade = useCallback((cidade: AcervoCidadeDocumento) => {
    setExpandedCities((prev) => ({ ...prev, [cidade.chave]: !(prev[cidade.chave] ?? false) }));
    setSelecao({ type: "cidade", cidade });
  }, []);

  const selecionarCliente = useCallback((cidade: AcervoCidadeDocumento, cliente: AcervoClienteDocumento) => {
    setExpandedCities((prev) => ({ ...prev, [cidade.chave]: true }));
    setSelecao({
      type: "cliente",
      cidadeChave: cidade.chave,
      cidadeLabel: cidade.label,
      cliente,
    });
  }, []);

  const handleDownload = async (doc: Documento) => {
    try {
      if (isDocumentoDemo(doc)) {
        toast.error("Documento disponivel apenas para visualizacao na massa de teste.");
        return;
      }

      if (isDocumentoLocal(doc)) {
        const storageKey = doc.id.slice("local:".length);
        const apiPath = `/documentos/stream/${storageKey.replaceAll("/", "__")}`;
        const res = await api.get(apiPath, { responseType: "blob" });
        const blobUrl = URL.createObjectURL(res.data);
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
      const nome = typeof result === "string" ? doc.nome : (result.nome || doc.nome);

      if (url.startsWith("/")) {
        const apiPath = url.startsWith("/api") ? url.slice(4) : url;
        const res = await api.get(apiPath, { responseType: "blob" });
        const blobUrl = URL.createObjectURL(res.data);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = nome;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(blobUrl);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = nome;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
    } catch {
      toast.error("Erro ao obter link de download.");
    }
  };

  const abrirPainelDetalhesDocumento = (tab: PreviewTab = "info") => {
    if (!documentoSelecionado) {
      toast.error("Selecione um documento para visualizar detalhes.");
      return;
    }

    setPainelDetalhesModo("documento");
    setPreviewTab(tab);
    setPainelDetalhesAberto(true);
  };

  const abrirPainelAtividadesGerais = () => {
    setPainelDetalhesModo("atividade_global");
    setPainelDetalhesAberto(true);
  };

  const excluirDocumentoPersistido = useCallback(async (doc: Documento) => {
    const snapshotLixeira: Documento = {
      ...doc,
      deletedAt: doc.deletedAt ?? new Date().toISOString(),
      deletedPor: doc.deletedPor ?? "Sistema",
    };

    if (isDocumentoDemo(doc)) {
      markDocumentoVirtualDeleted(snapshotLixeira);
      return;
    }

    if (isDocumentoLocal(doc)) {
      markDocumentoVirtualDeleted(snapshotLixeira);
      return;
    }

    await documentosApi.excluir(doc.id);
    markDocumentoVirtualDeleted(snapshotLixeira);
  }, []);

  const handleExcluir = async (doc: Documento) => {
    if (!confirm(`Enviar "${doc.nome}" para a lixeira?`)) return;

    try {
      await excluirDocumentoPersistido(doc);
      if (documentoSelecionado?.id === doc.id) {
        setDocumentoSelecionado(null);
      }
      toast.success("Documento enviado para a lixeira.");
      void carregarDocumentos();
    } catch {
      toast.error("Erro ao excluir documento.");
    }
  };

  const handleRestaurarDocumento = async (doc: Documento) => {
    try {
      if (isDocumentoVirtual(doc)) {
        restoreDocumentoVirtual(doc.id);
      } else {
        await documentosApi.restaurar(doc.id);
      }

      if (documentoSelecionado?.id === doc.id) {
        setDocumentoSelecionado(null);
      }
      toast.success("Documento restaurado.");
      void carregarDocumentos();
    } catch {
      toast.error("Erro ao restaurar documento.");
    }
  };

  const handleExcluirPermanentemente = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}" permanentemente? Esta acao nao pode ser desfeita.`)) return;

    try {
      if (isDocumentoVirtual(doc)) {
        purgeDocumentoVirtual(doc.id);
      } else {
        await documentosApi.excluirPermanentemente(doc.id);
      }

      if (documentoSelecionado?.id === doc.id) {
        setDocumentoSelecionado(null);
      }
      toast.success("Documento removido permanentemente.");
      void carregarDocumentos();
    } catch {
      toast.error("Erro ao remover documento.");
    }
  };

  const handleSalvarEdicaoDocumento = async (payload: { nome: string; categoria: string }) => {
    if (!documentoEditando) return;

    if (isDocumentoVirtual(documentoEditando)) {
      saveDocumentoVirtualOverride(documentoEditando.id, {
        nome: payload.nome,
        categoria: payload.categoria.toLowerCase(),
      });
    } else {
      await documentosApi.atualizar(documentoEditando.id, {
        nome: payload.nome,
        categoria: payload.categoria,
      });
    }

    toast.success("Documento atualizado.");
    setDocumentoEditando(null);
    void carregarDocumentos();
  };

  const handleUploadSaved = () => {
    void carregarDocumentos();
  };

  const handlePastaCriada = (pasta: PastaInternaNode) => {
    void carregarEstruturas(pasta.id);
    toast.success("Pasta criada.");
  };

  const handleExcluirPasta = async (pasta: PastaInternaNode) => {
    if (!confirm(`Excluir a pasta "${pasta.nome}"?`)) return;

    try {
      await pastasApi.excluirInterna(pasta.id);

      if (selecao.type === "interna" && selecao.pastaId === pasta.id) {
        setSelecao({ type: "overview" });
      }

      toast.success("Pasta excluida.");
      void carregarEstruturas();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem ?? "Erro ao excluir pasta.");
    }
  };

  const buscaNormalizada = normalizeText(busca);

  const cidadePorClienteId = new Map<string, string>();
  acervoAgrupado.forEach((cidade) => {
    cidade.clientes.forEach((cliente) => {
      cidadePorClienteId.set(cliente.id, cidade.label);
    });
  });
  clientesMock.forEach((cliente) => {
    if (!cidadePorClienteId.has(cliente.id)) {
      cidadePorClienteId.set(cliente.id, `${cliente.cidade} - ${cliente.estado}`);
    }
  });

  const documentosLixeiraVirtuais =
    selecao.type === "trash"
      ? listDocumentoVirtualTrashed(documentosBase).map((documento) => ({
          ...documento,
          deletedAt: documento.deletedAt ?? documento.dataUpload,
          deletedPor: documento.deletedPor ?? "Acervo local",
        }))
      : [];
  const documentosDaSelecao =
    selecao.type === "trash"
      ? mergeDocumentosById(documentos, documentosLixeiraVirtuais)
      : documentos;

  const docsFiltrados = documentosDaSelecao
    .filter((doc) => {
      if (categoriaFiltro !== "todas" && doc.categoria?.toLowerCase() !== categoriaFiltro) {
        return false;
      }

      if (!buscaNormalizada) return true;

      const cidadeCliente = doc.clienteId ? cidadePorClienteId.get(doc.clienteId) : "";
      const textoBase = [
        doc.nome,
        doc.clienteNome,
        doc.processoNumero,
        categoriaLabel[doc.categoria],
        cidadeCliente,
        doc.deletedPor,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      if (textoBase.includes(buscaNormalizada)) {
        return true;
      }

      if (selecao.type === "overview") {
        return false;
      }

      if (selecao.type === "cliente") {
        return normalizeText(selecao.cliente.nome).includes(buscaNormalizada);
      }

      if (selecao.type === "interna") {
        return normalizeText(selecao.nome).includes(buscaNormalizada);
      }

      return false;
    })
    .sort((a, b) => {
      const referenciaA = selecao.type === "trash" ? a.deletedAt ?? a.dataUpload : a.dataUpload;
      const referenciaB = selecao.type === "trash" ? b.deletedAt ?? b.dataUpload : b.dataUpload;
      const dataA = Date.parse(referenciaA ?? "");
      const dataB = Date.parse(referenciaB ?? "");
      const safeDataA = Number.isNaN(dataA) ? 0 : dataA;
      const safeDataB = Number.isNaN(dataB) ? 0 : dataB;

      switch (ordenacao) {
        case "antigos":
          return safeDataA - safeDataB;
        case "nome_asc":
          return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
        case "nome_desc":
          return b.nome.localeCompare(a.nome, "pt-BR", { sensitivity: "base" });
        case "categoria":
          return (categoriaLabel[a.categoria] ?? a.categoria).localeCompare(
            categoriaLabel[b.categoria] ?? b.categoria,
            "pt-BR",
            { sensitivity: "base" },
          );
        case "recentes":
        default:
          return safeDataB - safeDataA;
      }
    });

  useEffect(() => {
    if (!documentoSelecionado) {
      return;
    }

    const atualizado = docsFiltrados.find((doc) => doc.id === documentoSelecionado.id);
    if (!atualizado) {
      setDocumentoSelecionado(null);
      return;
    }

    if (atualizado !== documentoSelecionado) {
      setDocumentoSelecionado(atualizado);
    }
  }, [documentoSelecionado, docsFiltrados]);

  useEffect(() => {
    let ativo = true;

    const carregarAtividades = async () => {
      if (!documentoSelecionado || isDocumentoVirtual(documentoSelecionado)) {
        setAtividades([]);
        setLoadingAtividades(false);
        return;
      }

      setLoadingAtividades(true);
      try {
        const response = await documentosApi.atividades(documentoSelecionado.id);
        if (!ativo) return;
        setAtividades(Array.isArray(response) ? response : []);
      } catch {
        if (!ativo) return;
        setAtividades([]);
      } finally {
        if (ativo) {
          setLoadingAtividades(false);
        }
      }
    };

    void carregarAtividades();

    return () => {
      ativo = false;
    };
  }, [documentoSelecionado]);

  useEffect(() => {
    let ativo = true;

    const carregarAtividadesGerais = async () => {
      if (!painelDetalhesAberto || painelDetalhesModo !== "atividade_global") {
        setLoadingAtividadesGerais(false);
        return;
      }

      setLoadingAtividadesGerais(true);
      try {
        const response = await documentosApi.atividadesGerais({ size: 100 });
        if (!ativo) return;
        const items = response?.content ?? response;
        setAtividadesGerais(Array.isArray(items) ? items : []);
      } catch {
        if (!ativo) return;
        setAtividadesGerais([]);
      } finally {
        if (ativo) {
          setLoadingAtividadesGerais(false);
        }
      }
    };

    void carregarAtividadesGerais();

    return () => {
      ativo = false;
    };
  }, [painelDetalhesAberto, painelDetalhesModo]);

  useEffect(() => {
    let ativo = true;

    const carregarPreview = async () => {
      limparPreviewObjectUrl();
      setPreviewUrl(null);
      setPreviewErro(null);

      if (!documentoSelecionado) {
        setLoadingPreview(false);
        return;
      }

      if (isDocumentoDemo(documentoSelecionado)) {
        setPreviewErro("Preview indisponivel para documentos da massa de testes.");
        setLoadingPreview(false);
        return;
      }

      const previewKind = resolvePreviewKind(documentoSelecionado);
      if (previewKind === "unsupported") {
        setPreviewErro("Este formato nao possui preview nativo nesta fase.");
        setLoadingPreview(false);
        return;
      }

      setLoadingPreview(true);

      try {
        if (isDocumentoLocal(documentoSelecionado)) {
          const storageKey = documentoSelecionado.id.slice("local:".length);
          const res = await api.get(`/documentos/preview/${storageKey.replaceAll("/", "__")}`, { responseType: "blob" });
          if (!ativo) return;
          const blobUrl = URL.createObjectURL(res.data);
          previewObjectUrlRef.current = blobUrl;
          setPreviewUrl(blobUrl);
          return;
        }

        const preview = await documentosApi.previewUrl(documentoSelecionado.id);
        if (!ativo) return;

        if (preview.url.startsWith("/")) {
          const apiPath = preview.url.startsWith("/api") ? preview.url.slice(4) : preview.url;
          const res = await api.get(apiPath, { responseType: "blob" });
          if (!ativo) return;
          const blobUrl = URL.createObjectURL(res.data);
          previewObjectUrlRef.current = blobUrl;
          setPreviewUrl(blobUrl);
          return;
        }

        setPreviewUrl(preview.url);
      } catch {
        if (!ativo) return;
        setPreviewErro("Nao foi possivel carregar o preview deste documento.");
      } finally {
        if (ativo) {
          setLoadingPreview(false);
        }
      }
    };

    void carregarPreview();

    return () => {
      ativo = false;
      limparPreviewObjectUrl();
    };
  }, [documentoSelecionado, limparPreviewObjectUrl]);

  const acervoFiltrado = acervoAgrupado
    .map((cidade) => {
      if (!buscaNormalizada) return cidade;

      const cidadeMatch = [
        cidade.label,
        cidade.cidade,
        cidade.estado,
      ].some((value) => normalizeText(value).includes(buscaNormalizada));

      const clientesFiltrados = cidadeMatch
        ? cidade.clientes
        : cidade.clientes.filter((cliente) => normalizeText(cliente.nome).includes(buscaNormalizada));

      if (!cidadeMatch && clientesFiltrados.length === 0) {
        return null;
      }

      return {
        ...cidade,
        clientes: clientesFiltrados,
        totalClientes: clientesFiltrados.length,
      };
    })
    .filter((cidade): cidade is AcervoCidadeDocumento => cidade !== null)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));

  const clientesDaCidade =
    selecao.type === "cidade"
      ? (acervoAgrupado.find((cidade) => cidade.chave === selecao.cidade.chave)?.clientes ?? selecao.cidade.clientes).filter((cliente) =>
          !buscaNormalizada || normalizeText(cliente.nome).includes(buscaNormalizada),
        )
      : [];

  const pastaAtual = selecao.type === "interna" ? findPastaNode(pastasInternas, selecao.pastaId) : null;
  const subpastasDaSelecao =
    selecao.type === "interna"
      ? (pastaAtual?.children ?? []).filter(
          (pasta) => !buscaNormalizada || normalizeText(pasta.nome).includes(buscaNormalizada),
        )
      : [];

  const explorerFolders: ExplorerFolderItem[] =
    selecao.type === "cidade"
      ? clientesDaCidade.map((cliente) => ({
          kind: "folder",
          id: cliente.id,
          nome: cliente.nome,
          subtitle: selecao.cidade.label,
          tipoLabel: "Pasta de cliente",
          contextoLabel: "Acervo de clientes",
          tamanhoLabel: "Cliente",
          onOpen: () => selecionarCliente(selecao.cidade, cliente),
        }))
      : selecao.type === "interna"
        ? subpastasDaSelecao.map((pasta) => ({
            kind: "folder",
            id: pasta.id,
            nome: pasta.nome,
            subtitle: `Dentro de ${selecao.nome}`,
            tipoLabel: "Pasta interna",
            contextoLabel: selecao.path.join(" / "),
            tamanhoLabel:
              pasta.children.length > 0
                ? `${pasta.children.length} ${pasta.children.length === 1 ? "subpasta" : "subpastas"}`
                : "Pasta",
            onOpen: () => selecionarPasta(pasta.id, pastasInternas),
          }))
        : [];

  const breadcrumbItems: BreadcrumbItem[] =
    selecao.type === "overview"
      ? [{ label: "Todos os documentos", current: true }]
      : selecao.type === "trash"
        ? [{ label: "Lixeira", current: true }]
      : selecao.type === "cidade"
        ? [
            { label: "Acervo de clientes" },
            { label: selecao.cidade.label, current: true },
          ]
        : selecao.type === "cliente"
          ? [
              { label: "Acervo de clientes" },
              {
                label: selecao.cidadeLabel,
                onClick: () => {
                  const cidade = acervoAgrupado.find((item) => item.chave === selecao.cidadeChave);
                  if (cidade) selecionarCidade(cidade);
                },
              },
              { label: selecao.cliente.nome, current: true },
            ]
          : (() => {
              const pathIds = findPastaPathIds(pastasInternas, selecao.pastaId) ?? [];
              return [
                { label: "Pastas internas" },
                ...selecao.path.map((item, index) => ({
                  label: item,
                  current: index === selecao.path.length - 1,
                  onClick:
                    index === selecao.path.length - 1 || !pathIds[index]
                      ? undefined
                      : () => selecionarPasta(pathIds[index], pastasInternas),
                })),
              ];
            })();

  const subtituloSelecao =
    selecao.type === "cidade"
      ? `${clientesDaCidade.length} ${clientesDaCidade.length === 1 ? "cliente" : "clientes"}`
      : selecao.type === "trash"
        ? `${docsFiltrados.length} ${docsFiltrados.length === 1 ? "item" : "itens"}`
      : explorerFolders.length > 0 && docsFiltrados.length > 0
        ? `${explorerFolders.length} ${explorerFolders.length === 1 ? "pasta" : "pastas"} • ${docsFiltrados.length} ${docsFiltrados.length === 1 ? "documento" : "documentos"}`
        : explorerFolders.length > 0
          ? `${explorerFolders.length} ${explorerFolders.length === 1 ? "pasta" : "pastas"}`
          : `${docsFiltrados.length} ${docsFiltrados.length === 1 ? "documento" : "documentos"}`;

  const totalItensVisiveis = explorerFolders.length + docsFiltrados.length;
  const contextEyebrow =
    selecao.type === "overview"
      ? "Visao geral"
      : selecao.type === "trash"
        ? "Lixeira"
      : selecao.type === "cidade"
        ? "Cidade"
        : selecao.type === "cliente"
          ? "Cliente"
          : "Pasta interna";
  const contextTitle =
    selecao.type === "overview"
      ? "Todos os documentos"
      : selecao.type === "trash"
        ? "Lixeira"
      : selecao.type === "cidade"
        ? selecao.cidade.label
        : selecao.type === "cliente"
          ? selecao.cliente.nome
          : selecao.nome;
  const contextDescription =
    selecao.type === "overview"
      ? "Visao consolidada do acervo com filtros, recentes e categorias."
      : selecao.type === "trash"
        ? "Itens removidos podem ser restaurados ao local original ou excluidos permanentemente."
      : selecao.type === "cidade"
        ? "Clientes da cidade selecionada para navegar como pastas."
        : selecao.type === "cliente"
          ? `Documentos vinculados a ${selecao.cliente.nome}.`
          : "Conteudo da pasta atual com subpastas imediatas e documentos.";
  const emptyStateTitle =
    selecao.type === "cidade"
      ? "Nenhum cliente encontrado nesta cidade."
      : selecao.type === "trash"
        ? "A lixeira esta vazia."
      : buscaNormalizada
        ? "Nenhum item encontrado para esta busca."
        : selecao.type === "interna"
          ? "Esta pasta ainda nao possui itens."
          : "Nenhum documento encontrado.";
  const emptyStateDescription =
    selecao.type === "cidade"
      ? "Ajuste a busca ou selecione outra cidade do acervo."
      : selecao.type === "trash"
        ? "Quando remover documentos, eles aparecerao aqui para restauracao."
      : buscaNormalizada
        ? "Tente outro termo ou revise os filtros ativos."
        : selecao.type === "interna"
          ? "Crie uma subpasta ou envie arquivos para comecar a organizar este espaco."
          : "Envie arquivos ou revise os filtros para preencher esta visualizacao.";

  const initialUploadDestino: DocumentoDestino = selecao.type === "interna" ? "interno" : "cliente";
  const initialClienteId = selecao.type === "cliente" ? selecao.cliente.id : undefined;
  const initialPastaId = selecao.type === "interna" ? selecao.pastaId : undefined;
  const acervoVisivel = acervoAberto || Boolean(buscaNormalizada);

  const toggleAcervo = () => {
    setAcervoAberto((prev) => !prev);
  };

  const renderPastaNodes = (nodes: PastaInternaNode[], depth = 0): JSX.Element[] =>
    nodes.flatMap((node) => {
      const expanded = expandedPastas[node.id] ?? true;
      const hasChildren = (node.children ?? []).length > 0;
      const ativo = selecao.type === "interna" && selecao.pastaId === node.id;

      const row = (
        <div key={node.id}>
          <div className="group flex items-center">
            <div className="w-6 flex justify-center">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPastas((prev) => ({
                      ...prev,
                      [node.id]: !expanded,
                    }))
                  }
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
                </button>
              ) : (
                <span className="w-3.5" />
              )}
            </div>

            <button
              type="button"
              onClick={() => selecionarPasta(node.id, pastasInternas)}
              className={cn(
                "flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-all text-left",
                ativo
                  ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              {ativo ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
              ) : (
                <FolderClosed className="h-3.5 w-3.5 shrink-0 text-yellow-500/70" />
              )}
              <span className="truncate text-xs">{node.nome}</span>
            </button>
            <button
              type="button"
              aria-label={`Excluir pasta ${node.nome}`}
              title="Excluir pasta"
              onClick={(event) => {
                event.stopPropagation();
                void handleExcluirPasta(node);
              }}
              className="mr-2 rounded-md p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {hasChildren && expanded ? renderPastaNodes(node.children, depth + 1) : null}
        </div>
      );

      return [row];
    });

  const renderFolderGridCard = (folder: ExplorerFolderItem) => (
    <button
      key={`folder:${folder.id}`}
      type="button"
      onClick={folder.onOpen}
      aria-label={`Abrir pasta ${folder.nome}`}
      className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
          <FolderClosed className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{folder.nome}</p>
          <p className="text-xs text-muted-foreground mt-1">{folder.tipoLabel}</p>
          <p className="text-xs text-muted-foreground truncate mt-2">{folder.subtitle}</p>
        </div>
      </div>
    </button>
  );

  const renderDocumentoAcoes = (doc: Documento) => {
    if (selecao.type === "trash") {
      return (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void handleRestaurarDocumento(doc);
            }}
            title="Restaurar"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              void handleExcluirPermanentemente(doc);
            }}
            title="Excluir permanentemente"
            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      );
    }

    return (
      <>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setDocumentoEditando(doc);
          }}
          title="Editar"
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            void handleDownload(doc);
          }}
          title="Baixar"
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            void handleExcluir(doc);
          }}
          title="Excluir"
          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </>
    );
  };

  const renderDocumentoGridCard = (doc: Documento) => (
    <div
      key={doc.id}
      onClick={() => setDocumentoSelecionado(doc)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setDocumentoSelecionado(doc);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col items-center gap-3 hover:border-primary/40 hover:shadow-sm transition-all group text-left",
        documentoSelecionado?.id === doc.id ? "border-primary shadow-sm" : "border-border",
      )}
    >
      <FileIcon tipo={doc.tipo} size="lg" />
      <div className="text-center w-full">
        <p className="text-xs font-medium text-foreground truncate w-full group-hover:text-primary transition-colors">
          {doc.nome}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {selecao.type === "trash"
            ? `Excluido ${formatDateLabel(doc.deletedAt ?? doc.dataUpload)}`
            : doc.clienteNome || categoriaLabel[doc.categoria] || "Documento"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{doc.tamanho}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {renderDocumentoAcoes(doc)}
      </div>
    </div>
  );

  const renderExplorerGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {explorerFolders.map(renderFolderGridCard)}
      {docsFiltrados.map(renderDocumentoGridCard)}
    </div>
  );

  const renderExplorerTable = () => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Nome</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">Tipo</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Vinculo</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden xl:table-cell">Processo</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Modificado</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Tamanho</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {explorerFolders.map((folder) => (
            <tr key={`folder:${folder.id}`} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={folder.onOpen}
                  className="flex items-center gap-2.5 text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <FolderClosed className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {folder.nome}
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">{folder.subtitle}</span>
                  </div>
                </button>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{folder.tipoLabel}</td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">{folder.contextoLabel}</td>
              <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-xs">-</td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">-</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{folder.tamanhoLabel}</td>
              <td className="px-3 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={folder.onOpen}
                >
                  Abrir
                </Button>
              </td>
            </tr>
          ))}

          {docsFiltrados.map((doc) => (
            <tr
              key={doc.id}
              className={cn(
                "border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group",
                documentoSelecionado?.id === doc.id && "bg-primary/5",
              )}
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setDocumentoSelecionado(doc)}
                  className="flex items-center gap-2.5 text-left"
                >
                  <FileIcon tipo={doc.tipo} size="sm" />
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">{doc.nome}</span>
                </button>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                {categoriaLabel[doc.categoria] ?? doc.categoria}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                {selecao.type === "trash"
                  ? (doc.deletedPor || "Sistema")
                  : doc.clienteNome || (selecao.type === "cliente" ? selecao.cliente.nome : "-")}
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-xs">{doc.processoNumero || "-"}</td>
              <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                {formatDateLabel(selecao.type === "trash" ? doc.deletedAt ?? doc.dataUpload : doc.dataUpload)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{doc.tamanho}</td>
              <td className="px-3 py-3 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {renderDocumentoAcoes(doc)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPreviewConteudo = () => {
    if (!documentoSelecionado) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Selecione um documento para visualizar preview, informacoes e atividades.
        </div>
      );
    }

    if (loadingPreview) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        </div>
      );
    }

    if (previewErro || !previewUrl) {
      return (
        <div className="space-y-3 px-5 py-6 text-sm text-muted-foreground">
          <p>{previewErro ?? "Preview indisponivel."}</p>
          {["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(documentoSelecionado.tipo?.toLowerCase?.() ?? "") && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleDownload(documentoSelecionado)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir externamente
            </Button>
          )}
        </div>
      );
    }

    const previewKind = resolvePreviewKind(documentoSelecionado);
    if (previewKind === "image") {
      return <img src={previewUrl} alt={documentoSelecionado.nome} className="max-h-full w-full object-contain" />;
    }

    if (previewKind === "video") {
      return <video src={previewUrl} controls className="max-h-full w-full rounded-xl bg-black" />;
    }

    return <iframe title={`Preview de ${documentoSelecionado.nome}`} src={previewUrl} className="h-full w-full border-0" />;
  };

  const renderPainelDetalhes = () => (
    <Sheet
      open={painelDetalhesAberto && (painelDetalhesModo === "atividade_global" || Boolean(documentoSelecionado))}
      onOpenChange={(open) => {
        setPainelDetalhesAberto(open);
      }}
    >
      <SheetContent side="right" className="w-full border-l border-border bg-card p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border px-5 py-4 pr-14 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {painelDetalhesModo === "atividade_global" ? "Atividades" : "Detalhes"}
          </p>
          <SheetTitle className="mt-1 truncate text-base">
            {painelDetalhesModo === "atividade_global" ? "Historico do modulo de documentos" : documentoSelecionado?.nome ?? "Documento"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {painelDetalhesModo === "atividade_global"
              ? "Historico geral de uploads, alteracoes, exclusoes e restauracoes do modulo de documentos."
              : "Preview, informacoes e atividades do documento selecionado."}
          </SheetDescription>
        </SheetHeader>

        {painelDetalhesModo === "documento" && (
          <div className="flex items-center gap-1 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setPreviewTab("preview")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                previewTab === "preview" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("info")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                previewTab === "info" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Informacoes
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("activities")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                previewTab === "activities" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Atividades
            </button>
          </div>
        )}

        <div className="h-[calc(100%-121px)] overflow-y-auto">
          {painelDetalhesModo === "atividade_global" && (
            <div className="p-4">
              {loadingAtividadesGerais ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
                </div>
              ) : atividadesGerais.length === 0 ? (
                <div className="space-y-2 rounded-2xl border border-dashed border-border bg-background/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  <Clock3 className="mx-auto h-8 w-8 opacity-40" />
                  <p>Nenhuma atividade registrada ainda no modulo de documentos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atividadesGerais.map((atividade) => (
                    <div key={atividade.id} className="rounded-2xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatTipoAcao(atividade.acao)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{atividade.descricao}</p>
                        </div>
                        <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{atividade.usuarioNome}</span>
                        <span>{formatDateTimeLabel(atividade.dataHora)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {painelDetalhesModo === "documento" && previewTab === "preview" && (
            <div className="h-full p-4">
              <div className="h-full min-h-[420px] overflow-hidden rounded-2xl border border-border bg-background/70">
                {renderPreviewConteudo()}
              </div>
            </div>
          )}

          {painelDetalhesModo === "documento" && previewTab === "info" && (
            <div className="space-y-4 p-4">
              {documentoSelecionado ? (
                <>
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex items-center gap-3">
                      <FileIcon tipo={documentoSelecionado.tipo} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{documentoSelecionado.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {tipoConfig[documentoSelecionado.tipo]?.label ?? documentoSelecionado.tipo?.toUpperCase?.() ?? "Arquivo"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Categoria</p>
                      <p className="mt-2 text-foreground">{categoriaLabel[documentoSelecionado.categoria] ?? documentoSelecionado.categoria}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tamanho</p>
                      <p className="mt-2 text-foreground">{documentoSelecionado.tamanho}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Enviado em</p>
                      <p className="mt-2 text-foreground">{formatDateTimeLabel(documentoSelecionado.dataUpload)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Enviado por</p>
                      <p className="mt-2 text-foreground">{documentoSelecionado.uploadedPor || "-"}</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cliente</p>
                      <p className="mt-1 text-foreground">{documentoSelecionado.clienteNome || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Processo</p>
                      <p className="mt-1 text-foreground">{documentoSelecionado.processoNumero || "-"}</p>
                    </div>
                    {selecao.type === "trash" && (
                      <>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Excluido em</p>
                          <p className="mt-1 text-foreground">{formatDateTimeLabel(documentoSelecionado.deletedAt)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Excluido por</p>
                          <p className="mt-1 text-foreground">{documentoSelecionado.deletedPor || "-"}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selecao.type === "trash" ? (
                      <>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleRestaurarDocumento(documentoSelecionado)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurar
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => void handleExcluirPermanentemente(documentoSelecionado)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir permanente
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleDownload(documentoSelecionado)}>
                          <Download className="h-3.5 w-3.5" />
                          Baixar
                        </Button>
                        {!isDocumentoVirtual(documentoSelecionado) && (
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDocumentoEditando(documentoSelecionado)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {painelDetalhesModo === "documento" && previewTab === "activities" && (
            <div className="p-4">
              {!documentoSelecionado ? null : loadingAtividades ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
                </div>
              ) : atividades.length === 0 ? (
                <div className="space-y-2 rounded-2xl border border-dashed border-border bg-background/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  <Clock3 className="mx-auto h-8 w-8 opacity-40" />
                  <p>Nenhuma atividade detalhada disponivel para este documento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atividades.map((atividade) => (
                    <div key={atividade.id} className="rounded-2xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatTipoAcao(atividade.acao)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{atividade.descricao}</p>
                        </div>
                        <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{atividade.usuarioNome}</span>
                        <span>{formatDateTimeLabel(atividade.dataHora)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex h-full min-h-0">
      <aside className="w-72 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documentos</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" data-testid="documentos-sidebar-scroll">
          <button
            onClick={() => setSelecao({ type: "overview" })}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all rounded-none",
              selecao.type === "overview"
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <Files className="h-4 w-4 shrink-0" />
            <span className="truncate">Todos os documentos</span>
          </button>

          <button
            onClick={() => setSelecao({ type: "trash" })}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all rounded-none",
              selecao.type === "trash"
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Lixeira</span>
          </button>

          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAcervo}
              className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", acervoVisivel && "rotate-90")} />
              <MapPin className="h-3.5 w-3.5" />
              <span>Escritório Viana</span>
            </button>
          </div>

          {!acervoVisivel ? null : loadingEstruturas ? (
            <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">Carregando acervo...</p>
          ) : acervoFiltrado.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">Nenhum cliente ativo no acervo.</p>
          ) : (
            acervoFiltrado.map((cidade) => {
              const expanded = buscaNormalizada ? true : (expandedCities[cidade.chave] ?? false);
              const cidadeAtiva = selecao.type === "cidade" && selecao.cidade.chave === cidade.chave;

              return (
                <div key={cidade.chave}>
                  <div className="flex items-center">
                    <div className="w-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCities((prev) => ({
                            ...prev,
                            [cidade.chave]: !expanded,
                          }))
                        }
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => selecionarCidade(cidade)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-all text-left",
                        cidadeAtiva
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      {expanded || cidadeAtiva ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                      ) : (
                        <FolderClosed className="h-3.5 w-3.5 shrink-0 text-yellow-500/70" />
                      )}
                      <span className="truncate text-xs">{cidade.label}</span>
                    </button>
                  </div>

                  {expanded &&
                    cidade.clientes.map((cliente) => {
                      const ativo = selecao.type === "cliente" && selecao.cliente.id === cliente.id;

                      return (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selecionarCliente(cidade, cliente)}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-2 text-sm transition-all text-left",
                            ativo
                              ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                          )}
                          style={{ paddingLeft: "36px" }}
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
                            {cliente.initials}
                          </span>
                          <span className="truncate text-xs">{cliente.nome}</span>
                        </button>
                      );
                    })}
                </div>
              );
            })
          )}

          <div className="px-4 pt-5 pb-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <FolderClosed className="h-3.5 w-3.5" />
              <span>Pastas Internas</span>
            </div>
            <button
              type="button"
              onClick={() => setNovaPastaAberta(true)}
              className="text-primary hover:text-primary/80 transition-colors"
              title="Criar pasta"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto pr-1" data-testid="pastas-internas-scroll">
            {loadingEstruturas ? (
              <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">Carregando pastas...</p>
            ) : pastasInternas.length === 0 ? (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[11px] text-muted-foreground/60 italic">Nenhuma pasta criada.</p>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setNovaPastaAberta(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Nova pasta
                </Button>
              </div>
            ) : (
              renderPastaNodes(pastasInternas)
            )}
          </div>
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border bg-card/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos, clientes, processos ou cidades"
              className="pl-9 bg-secondary border-none h-9"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          {selecao.type !== "cidade" && (
            <>
              <select
                value={ordenacao}
                onChange={(event) => setOrdenacao(event.target.value as OrdenacaoDocumentos)}
                className="h-9 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
              >
                {ordenacaoOpcoes.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>

              <select
                value={categoriaFiltro}
                onChange={(event) => setCategoriaFiltro(event.target.value)}
                className="h-9 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
              >
                <option value="todas">Todas as categorias</option>
                {categoriasOpcoes.map((categoria) => (
                  <option key={categoria.value} value={categoria.value.toLowerCase()}>
                    {categoria.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setModo("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                modo === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setModo("lista")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                modo === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="outline"
            className="gap-2"
            disabled={!documentoSelecionado}
            onClick={() => abrirPainelDetalhesDocumento("info")}
          >
            <FileText className="h-4 w-4" />
            Detalhes
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={abrirPainelAtividadesGerais}
          >
            <Clock3 className="h-4 w-4" />
            Atividades
          </Button>

          {selecao.type !== "trash" && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => setNovaPastaAberta(true)}>
                <Plus className="h-4 w-4" />
                Nova pasta
              </Button>

              <Button className="gap-2 ml-auto" onClick={() => setUploadAberto(true)}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </>
          )}
          </div>

          <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50">
            <FolderOpen className="h-4 w-4 text-yellow-500" />
            <div className="flex items-center gap-1 text-sm flex-wrap">
              {breadcrumbItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  {item.onClick ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className={cn(item.current ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{subtituloSelecao}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingEstruturas || loadingDocumentos ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {contextEyebrow}
                    </p>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-lg font-semibold text-foreground">{contextTitle}</h2>
                        <span className="text-xs text-muted-foreground">{subtituloSelecao}</span>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{contextDescription}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Itens</p>
                      <p className="mt-1 text-lg font-semibold leading-none text-foreground">{totalItensVisiveis}</p>
                    </div>
                    <div className="max-w-[280px] rounded-lg border border-border bg-background/70 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Contexto</p>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">{subtituloSelecao}</p>
                    </div>
                  </div>
                </div>

                {totalItensVisiveis === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 py-20 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-20" />
                    <p className="mt-4 text-sm font-medium text-foreground">{emptyStateTitle}</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">{emptyStateDescription}</p>
                    {selecao.type !== "cidade" && selecao.type !== "trash" && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadAberto(true)}>
                          <Upload className="h-3.5 w-3.5" />
                          Fazer upload
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setNovaPastaAberta(true)}>
                          <Plus className="h-3.5 w-3.5" />
                          Nova pasta
                        </Button>
                      </div>
                    )}
                  </div>
                ) : modo === "grid" ? (
                  renderExplorerGrid()
                ) : (
                  renderExplorerTable()
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {renderPainelDetalhes()}

      {uploadAberto && (
        <DocumentoUploadModal
          onClose={() => setUploadAberto(false)}
          onSaved={handleUploadSaved}
          clientesList={todosClientes}
          processosList={todosProcessos}
          pastasInternas={pastasInternas}
          initialDestino={initialUploadDestino}
          initialClienteId={initialClienteId}
          initialPastaId={initialPastaId}
        />
      )}

      {documentoEditando && (
        <EditarDocumentoModal
          documento={documentoEditando}
          onClose={() => setDocumentoEditando(null)}
          onSave={handleSalvarEdicaoDocumento}
        />
      )}

      {novaPastaAberta && (
        <NovaPastaModal
          onClose={() => setNovaPastaAberta(false)}
          onSaved={handlePastaCriada}
          pastasInternas={pastasInternas}
          initialParentId={selecao.type === "interna" ? selecao.pastaId : undefined}
        />
      )}
    </div>
  );
};
