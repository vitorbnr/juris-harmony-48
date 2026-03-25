import { useState, useEffect } from "react";
import { FileText, Search, Upload, Download, FolderOpen, Grid3x3, List, X, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { documentosApi } from "@/services/api";
import type { Documento } from "@/types";

// ─── Ícones por tipo ──────────────────────────────────────────────────────────

const tipoConfig: Record<string, { label: string; bg: string; text: string; char: string }> = {
  pdf:  { label: "PDF",  bg: "bg-red-500/15",    text: "text-red-400",    char: "PDF" },
  docx: { label: "DOCX", bg: "bg-blue-500/15",   text: "text-blue-400",   char: "DOC" },
  xlsx: { label: "XLSX", bg: "bg-green-500/15",  text: "text-green-400",  char: "XLS" },
  jpg:  { label: "JPG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  jpeg: { label: "JPEG", bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  png:  { label: "PNG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  outro:{ label: "ARQ",  bg: "bg-muted",         text: "text-muted-foreground", char: "ARQ" },
};

const categoriaLabel: Record<string, string> = {
  peticao: "Petição", contrato: "Contrato", procuracao: "Procuração",
  sentenca: "Sentença", recurso: "Recurso", comprovante: "Comprovante", outros: "Outros",
};

function FileIcon({ tipo, size = "md" }: { tipo: string; size?: "sm" | "md" | "lg" }) {
  const conf = tipoConfig[tipo] ?? tipoConfig.outro;
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

// ─── Área de Upload ───────────────────────────────────────────────────────────

function UploadArea({ onClose }: { onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [vinculoTipo, setVinculoTipo] = useState<"processo" | "cliente">("processo");
  const [vinculoId, setVinculoId] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Upload de Documentos</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-6 space-y-4">
          {!uploaded ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); setUploaded(true); }}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
              onClick={() => setUploaded(true)}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Arraste arquivos aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, imagens — até 10MB</p>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Arquivo recebido com sucesso!</p>
              <p className="text-sm text-muted-foreground">(R2 será integrado com credenciais reais)</p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <Label>Vincular a</Label>
            <div className="flex gap-2">
              <select value={vinculoTipo} onChange={e => setVinculoTipo(e.target.value as "processo" | "cliente")} className="w-[120px] h-9 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
                <option value="processo">Processo</option>
                <option value="cliente">Cliente</option>
              </select>
              <Input placeholder={`Buscar ou digitar ID do ${vinculoTipo}...`} className="flex-1 h-9 bg-secondary border-none" value={vinculoId} onChange={e => setVinculoId(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={onClose} disabled={!uploaded || !vinculoId}>Finalizar Upload</Button>
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

  useEffect(() => {
    setLoading(true);
    documentosApi.listar()
      .then((data) => {
        const items = data.content ?? data;
        setDocumentos(Array.isArray(items) ? items : []);
      })
      .catch(() => setDocumentos([]))
      .finally(() => setLoading(false));
  }, []);

  const docsFiltrados = documentos.filter(d =>
    !busca || d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." className="pl-9 bg-secondary border-none h-9" value={busca} onChange={e => setBusca(e.target.value)} />
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

      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-yellow-400" />
        <h3 className="font-medium text-foreground text-sm">Todos os Documentos</h3>
        <span className="text-muted-foreground text-xs">— {docsFiltrados.length} documento{docsFiltrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Conteúdo */}
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
                <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
                  <Download className="h-3.5 w-3.5" />
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
                    <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadAberto && <UploadArea onClose={() => setUploadAberto(false)} />}
    </div>
  );
};
