import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Files,
  FolderClosed,
  FolderOpen,
  Grid3x3,
  List,
  MapPin,
  Pencil,
  Plus,
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
import { clientes as clientesMock, documentos as documentosMock, processos as processosMock } from "@/data/mockData";
import {
  applyDocumentoVirtualState,
  markDocumentoVirtualDeleted,
  saveDocumentoVirtualOverride,
} from "@/lib/documentos-virtual-state";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { clientesApi, documentosApi, pastasApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type {
  AcervoCidadeDocumento,
  AcervoClienteDocumento,
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

type DocumentSelection =
  | { type: "overview" }
  | { type: "cidade"; cidade: AcervoCidadeDocumento }
  | { type: "cliente"; cidadeChave: string; cidadeLabel: string; cliente: AcervoClienteDocumento }
  | { type: "interna"; pastaId: string; nome: string; path: string[] };

interface PastaOption {
  id: string;
  label: string;
}

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
  const [novaPastaAberta, setNovaPastaAberta] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [todosClientes, setTodosClientes] = useState<{ id: string; nome: string }[]>([]);
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

  const hidratarDocumentos = useCallback((docs: Documento[]) => applyDocumentoVirtualState(docs), []);

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
          if (next[cidade.chave] === undefined) next[cidade.chave] = true;
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
      setDocumentos([]);
      setLoadingDocumentos(false);
      return;
    }

    setLoadingDocumentos(true);

    try {
      if (selecao.type === "cliente") {
        const response = await documentosApi.listarPorCliente(selecao.cliente.id, { size: 1000 });
        const items = response?.content ?? response;
        const docsApi = Array.isArray(items)
          ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        setDocumentos(hidratarDocumentos(docsApi));
        return;
      }

      if (selecao.type === "interna") {
        const response = await documentosApi.listarPorPasta(selecao.pastaId, { size: 1000 });
        const items = response?.content ?? response;
        const docsApi = Array.isArray(items)
          ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
          : [];
        setDocumentos(hidratarDocumentos(docsApi));
        return;
      }

      const response = await documentosApi.listar({ size: 1000 });
      const items = response?.content ?? response;
      const docsApi = Array.isArray(items)
        ? items.map((doc) => normalizeDocumento(doc as Documento & { uploadadoPor?: string }))
        : [];

      setDocumentos(hidratarDocumentos(
        SHOULD_MERGE_DEMO_DOCUMENTS ? mergeDocumentos(docsApi, documentosMockNormalizados) : docsApi,
      ));
    } catch {
      setDocumentos(hidratarDocumentos(
        SHOULD_MERGE_DEMO_DOCUMENTS && selecao.type === "overview" ? documentosMockNormalizados : [],
      ));
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

  const excluirDocumentoPersistido = useCallback(async (doc: Documento) => {
    if (isDocumentoDemo(doc)) {
      markDocumentoVirtualDeleted(doc.id);
      return;
    }

    if (isDocumentoLocal(doc)) {
      await documentosApi.excluirStorageKey(doc.id.slice("local:".length));
      return;
    }

    await documentosApi.excluir(doc.id);
  }, []);

  const handleExcluir = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"? Esta acao e irreversivel.`)) return;

    try {
      await excluirDocumentoPersistido(doc);
      toast.success("Documento excluido.");
      void carregarDocumentos();
    } catch {
      toast.error("Erro ao excluir documento.");
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
  acervoClientes.forEach((cidade) => {
    cidade.clientes.forEach((cliente) => {
      cidadePorClienteId.set(cliente.id, cidade.label);
    });
  });
  clientesMock.forEach((cliente) => {
    if (!cidadePorClienteId.has(cliente.id)) {
      cidadePorClienteId.set(cliente.id, `${cliente.cidade} - ${cliente.estado}`);
    }
  });

  const docsFiltrados = documentos
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
      const dataA = Date.parse(a.dataUpload ?? "");
      const dataB = Date.parse(b.dataUpload ?? "");
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

  const acervoFiltrado = acervoClientes
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
      ? selecao.cidade.clientes.filter((cliente) =>
          !buscaNormalizada || normalizeText(cliente.nome).includes(buscaNormalizada),
        )
      : [];

  const breadcrumbItems =
    selecao.type === "overview"
      ? ["Todos os documentos"]
      : selecao.type === "cidade"
        ? ["Acervo de clientes", selecao.cidade.label]
        : selecao.type === "cliente"
          ? ["Acervo de clientes", selecao.cidadeLabel, selecao.cliente.nome]
          : ["Pastas", ...selecao.path];

  const subtituloSelecao =
    selecao.type === "cidade"
      ? `${clientesDaCidade.length} ${clientesDaCidade.length === 1 ? "cliente" : "clientes"}`
      : `${docsFiltrados.length} ${docsFiltrados.length === 1 ? "documento" : "documentos"}`;

  const initialUploadDestino: DocumentoDestino = selecao.type === "interna" ? "interno" : "cliente";
  const initialClienteId = selecao.type === "cliente" ? selecao.cliente.id : undefined;
  const initialPastaId = selecao.type === "interna" ? selecao.pastaId : undefined;
  const acervoVisivel = acervoAberto || Boolean(buscaNormalizada);

  const abrirTodasCidades = () => {
    setExpandedCities(
      Object.fromEntries(acervoClientes.map((cidade) => [cidade.chave, true])),
    );
  };

  const fecharTodasCidades = () => {
    setExpandedCities(
      Object.fromEntries(acervoClientes.map((cidade) => [cidade.chave, false])),
    );
  };

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

          <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAcervo}
              className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", acervoVisivel && "rotate-90")} />
              <MapPin className="h-3.5 w-3.5" />
              <span>Escritório Viana</span>
            </button>
            {acervoVisivel && !loadingEstruturas && acervoClientes.length > 0 && (
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={abrirTodasCidades}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Abrir todos
                </button>
                <button
                  type="button"
                  onClick={fecharTodasCidades}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Fechar todos
                </button>
              </div>
            )}
          </div>

          {!acervoVisivel ? null : loadingEstruturas ? (
            <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">Carregando acervo...</p>
          ) : acervoFiltrado.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">Nenhum cliente ativo no acervo.</p>
          ) : (
            acervoFiltrado.map((cidade) => {
              const expanded = buscaNormalizada ? true : (expandedCities[cidade.chave] ?? true);
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
                      onClick={() => {
                        setExpandedCities((prev) => ({ ...prev, [cidade.chave]: true }));
                        setSelecao({ type: "cidade", cidade });
                      }}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-all text-left",
                        cidadeAtiva
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      {cidadeAtiva ? (
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
                          onClick={() => {
                            setExpandedCities((prev) => ({ ...prev, [cidade.chave]: true }));
                            setSelecao({
                              type: "cliente",
                              cidadeChave: cidade.chave,
                              cidadeLabel: cidade.label,
                              cliente,
                            });
                          }}
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

          <Button variant="outline" className="gap-2" onClick={() => setNovaPastaAberta(true)}>
            <Plus className="h-4 w-4" />
            Nova pasta
          </Button>

          <Button className="gap-2 ml-auto" onClick={() => setUploadAberto(true)}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50">
          <FolderOpen className="h-4 w-4 text-yellow-500" />
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {breadcrumbItems.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-1">
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <span className={cn(index === breadcrumbItems.length - 1 ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {item}
                </span>
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
          ) : selecao.type === "cidade" ? (
            clientesDaCidade.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <FolderClosed className="h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhum cliente encontrado nesta cidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientesDaCidade.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() =>
                      setSelecao({
                        type: "cliente",
                        cidadeChave: selecao.cidade.chave,
                        cidadeLabel: selecao.cidade.label,
                        cliente,
                      })
                    }
                    className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
                        {cliente.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground">{selecao.cidade.label}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : docsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-20" />
              <p className="text-sm">Nenhum documento encontrado.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadAberto(true)}>
                <Upload className="h-3.5 w-3.5" />
                Fazer upload
              </Button>
            </div>
          ) : modo === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {docsFiltrados.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <FileIcon tipo={doc.tipo} size="lg" />
                  <div className="text-center w-full">
                    <p className="text-xs font-medium text-foreground truncate w-full group-hover:text-primary transition-colors">
                      {doc.nome}
                    </p>
                    {doc.processoNumero && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{doc.processoNumero}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{doc.tamanho}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Nome</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">
                      Categoria
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden xl:table-cell">
                      Processo
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Tamanho</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {docsFiltrados.map((doc) => (
                    <tr key={doc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileIcon tipo={doc.tipo} size="sm" />
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">{doc.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{doc.clienteNome || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                        {categoriaLabel[doc.categoria] ?? doc.categoria}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-xs">
                        {doc.processoNumero || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{doc.tamanho}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDocumentoEditando(doc)}
                            title="Editar"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void handleDownload(doc)}
                            title="Baixar"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void handleExcluir(doc)}
                            title="Excluir"
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
