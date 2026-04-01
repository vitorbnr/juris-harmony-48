import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Search, Upload, Download, FolderOpen, FolderClosed,
  Grid3x3, List, X, Trash2, CheckCircle2, ChevronRight, Files,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { documentosApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type { Documento } from "@/types";

// ─── Config de tipo e categoria ───────────────────────────────────────────────

const tipoConfig: Record<string, { label: string; bg: string; text: string; char: string }> = {
  pdf:  { label: "PDF",  bg: "bg-red-500/15",    text: "text-red-400",    char: "PDF" },
  docx: { label: "DOCX", bg: "bg-blue-500/15",   text: "text-blue-400",   char: "DOC" },
  doc:  { label: "DOC",  bg: "bg-blue-500/15",   text: "text-blue-400",   char: "DOC" },
  xlsx: { label: "XLSX", bg: "bg-green-500/15",  text: "text-green-400",  char: "XLS" },
  xls:  { label: "XLS",  bg: "bg-green-500/15",  text: "text-green-400",  char: "XLS" },
  jpg:  { label: "JPG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  jpeg: { label: "JPEG", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  png:  { label: "PNG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  gif:  { label: "GIF",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  mp4:  { label: "MP4",  bg: "bg-orange-500/15", text: "text-orange-400", char: "VID" },
  zip:  { label: "ZIP",  bg: "bg-yellow-500/15", text: "text-yellow-400", char: "ZIP" },
  rar:  { label: "RAR",  bg: "bg-yellow-500/15", text: "text-yellow-400", char: "RAR" },
  txt:  { label: "TXT",  bg: "bg-muted",         text: "text-muted-foreground", char: "TXT" },
  outro:{ label: "ARQ",  bg: "bg-muted",         text: "text-muted-foreground", char: "ARQ" },
};

const categoriaLabel: Record<string, string> = {
  peticao: "Petição", contrato: "Contrato", procuracao: "Procuração",
  sentenca: "Sentença", recurso: "Recurso", comprovante: "Comprovante",
  outros: "Outros", PETICAO: "Petição", CONTRATO: "Contrato",
  PROCURACAO: "Procuração", SENTENCA: "Sentença", RECURSO: "Recurso",
  COMPROVANTE: "Comprovante", OUTROS: "Outros",
};

const categoriasOpcoes = [
  { value: "PETICAO", label: "Petição" }, { value: "CONTRATO", label: "Contrato" },
  { value: "PROCURACAO", label: "Procuração" }, { value: "SENTENCA", label: "Sentença" },
  { value: "RECURSO", label: "Recurso" }, { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTROS", label: "Outros" },
];

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileIcon({ tipo, size = "md" }: { tipo: string; size?: "sm" | "md" | "lg" }) {
  const conf = tipoConfig[tipo?.toLowerCase()] ?? tipoConfig.outro;
  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center font-bold shrink-0",
      conf.bg, conf.text,
      size === "sm" && "w-8 h-8 text-[9px]",
      size === "md" && "w-10 h-10 text-[10px]",
      size === "lg" && "w-14 h-14 text-xs",
    )}>
      {conf.char}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSaved: () => void;
  initialClienteId?: string;
  clientesList: { id: string; nome: string }[];
}

function UploadModal({ onClose, onSaved, initialClienteId, clientesList }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState("OUTROS");
  const [clienteId, setClienteId] = useState(initialClienteId || "");
  const [processoId, setProcessoId] = useState("");
  const [processos, setProcessos] = useState<{ id: string; numero: string; clienteNome: string }[]>([]);
  const [progresso, setProgresso] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    processosApi.listar({ size: 100 }).then(data => {
      const items = data.content ?? data;
      setProcessos(Array.isArray(items) ? items : []);
    }).catch(() => {});
  }, []);

  // Suporte a Ctrl+V para colar arquivo da área de transferência
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) escolherArquivo(f);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const escolherArquivo = (f: File) => {
    if (f.size > MAX_SIZE_BYTES) {
      setErro(`Arquivo muito grande: ${formatBytes(f.size)}. Máximo permitido: 100MB.`);
      return;
    }
    setFile(f);
    setErro(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setErro(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("categoria", categoria);
    if (clienteId) fd.append("clienteId", clienteId);
    if (processoId) fd.append("processoId", processoId);

    try {
      await documentosApi.upload(fd, pct => setProgresso(pct));
      setConcluido(true);
      setTimeout(() => { onSaved(); onClose(); }, 1400);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      const msg = axiosErr.response?.data?.mensagem ?? "Erro ao enviar arquivo. Tente novamente.";
      setErro(msg);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Upload de Documento</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) escolherArquivo(f); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
            >
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.zip,.rar,.7z,.txt,.rtf"
                onChange={e => { if (e.target.files?.[0]) escolherArquivo(e.target.files[0]); }} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste, clique ou cole (Ctrl+V)</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, imagens, vídeos e mais — até 100MB</p>
            </div>
          ) : concluido ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Upload concluído!</p>
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

          {/* Metadados */}
          {!concluido && (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                  {categoriasOpcoes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Atribuir ao cliente (opcional)</Label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                  <option value="">Nenhum cliente</option>
                  {clientesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Vincular ao processo (opcional)</Label>
                <select value={processoId} onChange={e => setProcessoId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                  <option value="">Nenhum processo</option>
                  {processos.map(p => <option key={p.id} value={p.id}>{p.numero} — {p.clienteNome?.split(" ")[0]}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" disabled={!file || uploading || concluido} onClick={handleUpload}>
            {uploading ? `Enviando... ${progresso}%` : "Fazer Upload"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const DocumentosView = () => {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("lista");
  const [uploadAberto, setUploadAberto] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [clientesFiltro, setClientesFiltro] = useState<{ id: string; nome: string }[]>([]);
  const [todosClientes, setTodosClientes] = useState<{ id: string; nome: string }[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega clientes com documentos para a sidebar
  const carregarClientesFiltro = useCallback(() => {
    documentosApi.listarClientesComDocumentos()
      .then(data => setClientesFiltro(Array.isArray(data) ? data : []))
      .catch(() => setClientesFiltro([]));
  }, []);

  // Carrega todos os clientes para o modal de upload
  const carregarTodosClientes = useCallback(() => {
    import("@/services/api").then(({ clientesApi }) => {
      clientesApi.listar({ size: 200 }).then(data => {
        const items = data.content ?? data;
        setTodosClientes(Array.isArray(items) ? items : []);
      }).catch(() => {});
    });
  }, []);

  const carregarDocumentos = useCallback(() => {
    setLoading(true);
    const params: { clienteId?: string; busca?: string } = {};
    if (clienteSelecionado) params.clienteId = clienteSelecionado.id;
    if (busca.trim()) params.busca = busca.trim();

    documentosApi.listar(params)
      .then(data => {
        const items = data.content ?? data;
        setDocumentos(Array.isArray(items) ? items : []);
      })
      .catch(() => setDocumentos([]))
      .finally(() => setLoading(false));
  }, [busca, clienteSelecionado]);

  useEffect(() => { carregarDocumentos(); }, [carregarDocumentos]);
  useEffect(() => { carregarClientesFiltro(); carregarTodosClientes(); }, [carregarClientesFiltro, carregarTodosClientes]);

  const handleDownload = async (doc: Documento) => {
    try {
      const result = await documentosApi.downloadUrl(doc.id);
      const url = typeof result === "string" ? result : result.url;
      // URL local (/api/documentos/stream/...) abre um link de download direto
      const a = document.createElement("a");
      a.href = url.startsWith("/") ? url : url;
      a.download = doc.nome;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error("Erro ao obter link de download.");
    }
  };

  const handleExcluir = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"? Esta ação é irreversível.`)) return;
    try {
      await documentosApi.excluir(doc.id);
      setDocumentos(prev => prev.filter(d => d.id !== doc.id));
      carregarClientesFiltro(); // atualiza sidebar
      toast.success("Documento excluído.");
    } catch {
      toast.error("Erro ao excluir documento.");
    }
  };

  const handleSaved = () => {
    carregarDocumentos();
    carregarClientesFiltro();
  };

  const docsFiltrados = documentos.filter(d =>
    !busca.trim() || d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar de Pastas ─────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documentos</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {/* "Todos os documentos" */}
          <button
            onClick={() => setClienteSelecionado(null)}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all rounded-none",
              !clienteSelecionado
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Files className="h-4 w-4 shrink-0" />
            <span className="truncate">Todos os documentos</span>
          </button>

          {/* Divisor Clientes */}
          {clientesFiltro.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              Clientes
            </p>
          )}

          {clientesFiltro.map(c => {
            const ativo = clienteSelecionado?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setClienteSelecionado(c)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all",
                  ativo
                    ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {ativo
                  ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                  : <FolderClosed className="h-3.5 w-3.5 shrink-0 text-yellow-500/70" />}
                <span className="truncate text-xs">{c.nome}</span>
                {ativo && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
              </button>
            );
          })}

          {clientesFiltro.length === 0 && (
            <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">
              Nenhum documento enviado ainda.
            </p>
          )}
        </nav>
      </aside>

      {/* ── Conteúdo Principal ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border bg-card/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar documentos..." className="pl-9 bg-secondary border-none h-9"
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button onClick={() => setModo("grid")} className={cn("p-1.5 rounded-md transition-all", modo === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button onClick={() => setModo("lista")} className={cn("p-1.5 rounded-md transition-all", modo === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button className="gap-2 ml-auto" onClick={() => setUploadAberto(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50">
          <FolderOpen className="h-4 w-4 text-yellow-500" />
          <div className="flex items-center gap-1 text-sm">
            <button onClick={() => setClienteSelecionado(null)} className={cn("transition-colors", clienteSelecionado ? "text-muted-foreground hover:text-foreground" : "text-foreground font-medium")}>
              Todos os documentos
            </button>
            {clienteSelecionado && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground font-medium">{clienteSelecionado.nome}</span>
              </>
            )}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{docsFiltrados.length} {docsFiltrados.length === 1 ? "documento" : "documentos"}</span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : docsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-20" />
              <p className="text-sm">Nenhum documento encontrado.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadAberto(true)}>
                <Upload className="h-3.5 w-3.5" /> Fazer upload
              </Button>
            </div>
          ) : modo === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {docsFiltrados.map(doc => (
                <div key={doc.id} className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                  <FileIcon tipo={doc.tipo} size="lg" />
                  <div className="text-center w-full">
                    <p className="text-xs font-medium text-foreground truncate w-full group-hover:text-primary transition-colors">{doc.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{doc.tamanho}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); handleDownload(doc); }} title="Baixar"
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleExcluir(doc); }} title="Excluir"
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">Cliente</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Categoria</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Tamanho</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {docsFiltrados.map(doc => (
                    <tr key={doc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileIcon tipo={doc.tipo} size="sm" />
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">{doc.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{doc.clienteNome || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">{categoriaLabel[doc.categoria] ?? doc.categoria}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{doc.tamanho}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); handleDownload(doc); }} title="Baixar"
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleExcluir(doc); }} title="Excluir"
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
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
        <UploadModal
          onClose={() => setUploadAberto(false)}
          onSaved={handleSaved}
          initialClienteId={clienteSelecionado?.id}
          clientesList={todosClientes}
        />
      )}
    </div>
  );
};
