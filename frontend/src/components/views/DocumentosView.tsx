import { useState, useEffect, useCallback, useRef } from "react";
import { FileText, Search, Upload, Download, FolderOpen, Grid3x3, List, X, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { documentosApi } from "@/services/api";
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

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState("OUTROS");
  const [progresso, setProgresso] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const escolherArquivo = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { setErro("Arquivo deve ter no máximo 10MB"); return; }
    setFile(f); setErro(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setErro(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("categoria", categoria);
    try {
      await documentosApi.upload(fd, pct => setProgresso(pct));
      setConcluido(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch {
      setErro("Erro ao enviar arquivo. Verifique as credenciais R2.");
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
          {!file ? (
            <div
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
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.zip"
                onChange={e => { if (e.target.files?.[0]) escolherArquivo(e.target.files[0]); }} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, imagens — até 10MB</p>
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
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
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

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label>Categoria</Label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              {categoriasOpcoes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
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
  const [modo, setModo] = useState<"grid" | "lista">("grid");
  const [uploadAberto, setUploadAberto] = useState(false);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDocumentos = useCallback(() => {
    setLoading(true);
    documentosApi.listar({ busca: busca || undefined })
      .then((data) => {
        const items = data.content ?? data;
        setDocumentos(Array.isArray(items) ? items : []);
      })
      .catch(() => setDocumentos([]))
      .finally(() => setLoading(false));
  }, [busca]);

  useEffect(() => { carregarDocumentos(); }, [carregarDocumentos]);

  // Busca é feita no servidor; docsFiltrados é igual a documentos
  const docsFiltrados = documentos;

  const handleDownload = async (doc: Documento) => {
    try {
      const url = await documentosApi.downloadUrl(doc.id);
      window.open(url, "_blank");
    } catch {
      alert("Erro ao obter link de download.");
    }
  };

  const handleExcluir = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"? Esta ação é irreversível.`)) return;
    try {
      await documentosApi.excluir(doc.id);
      setDocumentos(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      alert("Erro ao excluir documento.");
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." className="pl-9 bg-secondary border-none h-9"
            value={busca} onChange={e => { setBusca(e.target.value); }} />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => setModo("grid")} className={cn("p-1.5 rounded-md transition-all", modo === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button onClick={() => setModo("lista")} className={cn("p-1.5 rounded-md transition-all", modo === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button className="gap-2 ml-auto" onClick={() => setUploadAberto(true)}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-yellow-400" />
        <h3 className="font-medium text-foreground text-sm">Todos os Documentos</h3>
        <span className="text-muted-foreground text-xs">— {docsFiltrados.length} documento{docsFiltrados.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : docsFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10 opacity-30" />
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
                <button onClick={() => handleDownload(doc)} title="Baixar"
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleExcluir(doc)} title="Excluir"
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Cliente</th>
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
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{categoriaLabel[doc.categoria] ?? doc.categoria}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">{doc.clienteNome ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{doc.tamanho}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownload(doc)} title="Baixar"
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleExcluir(doc)} title="Excluir"
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

      {uploadAberto && (
        <UploadModal
          onClose={() => setUploadAberto(false)}
          onSaved={carregarDocumentos}
        />
      )}
    </div>
  );
};
