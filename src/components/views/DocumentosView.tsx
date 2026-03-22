import { useState, useRef } from "react";
import { FileText, Search, Upload, Download, FolderOpen, Folder, ChevronRight, File, Grid3x3, List, X, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { documentos, pastas } from "@/data/mockData";
import type { Documento, Pasta } from "@/types";

// ─── Ícones por tipo ──────────────────────────────────────────────────────────

const tipoConfig: Record<string, { label: string; bg: string; text: string; char: string }> = {
  pdf:  { label: "PDF",  bg: "bg-red-500/15",    text: "text-red-400",    char: "PDF" },
  docx: { label: "DOCX", bg: "bg-blue-500/15",   text: "text-blue-400",   char: "DOC" },
  xlsx: { label: "XLSX", bg: "bg-green-500/15",  text: "text-green-400",  char: "XLS" },
  jpg:  { label: "JPG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  png:  { label: "PNG",  bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  outro:{ label: "ARQ",  bg: "bg-muted",         text: "text-muted-foreground", char: "ARQ" },
};

const categoriaLabel: Record<string, string> = {
  peticao: "Petição", contrato: "Contrato", procuracao: "Procuração",
  sentenca: "Sentença", recurso: "Recurso", comprovante: "Comprovante", outros: "Outros",
};

// ─── Componente de Ícone de Arquivo ──────────────────────────────────────────

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

// ─── Área de Upload Drag & Drop ───────────────────────────────────────────────

function UploadArea({ onClose }: { onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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
                "border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 gap-3 transition-all cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div className={cn("rounded-full p-4 transition-all", dragging ? "bg-primary/20" : "bg-muted")}>
                <Upload className={cn("h-8 w-8 transition-all", dragging ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">Arraste arquivos aqui</p>
                <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
              </div>
              <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, JPG, PNG — até 50MB por arquivo</p>
            </div>
          ) : (
            <div className="rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center gap-3 py-10">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Arquivo recebido com sucesso!</p>
              <p className="text-sm text-muted-foreground">(Demonstração — integração com backend em breve)</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vincular a</label>
            <select className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none">
              <option value="">Selecione um cliente ou processo</option>
              {pastas.filter(p => !p.processoId && p.clienteId).map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={onClose} disabled={!uploaded}>Finalizar Upload</Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const DocumentosView = () => {
  const [pastaSelecionada, setPastaSelecionada] = useState<Pasta>(pastas[0]);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("grid");
  const [uploadAberto, setUploadAberto] = useState(false);
  const [pastaExpandida, setPastaExpandida] = useState<string[]>(["pasta_c1", "pasta_c2"]);

  const togglePastaExpandida = (id: string) =>
    setPastaExpandida(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const docsFiltrados = (pastaSelecionada.id === "pasta_todos" ? documentos : documentos.filter(d => {
    if (pastaSelecionada.processoId) return d.pastaId === pastaSelecionada.id;
    if (pastaSelecionada.clienteId) return d.clienteId === pastaSelecionada.clienteId;
    return d.pastaId === pastaSelecionada.id;
  })).filter(d =>
    !busca || d.nome.toLowerCase().includes(busca.toLowerCase()) || (d.clienteNome ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  const pastasRaiz = pastas.filter(p => !p.parentId && p.id !== "pasta_todos");
  const getPastasFilhas = (parentId: string) => pastas.filter(p => p.parentId === parentId);

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Sidebar de Pastas */}
      <aside className="w-64 shrink-0 border-r border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pastas</p>

          {/* Todos */}
          <button
            onClick={() => setPastaSelecionada(pastas[0])}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
              pastaSelecionada.id === "pasta_todos" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent/50"
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-yellow-400" />
            <span className="flex-1 text-left truncate">Todos os Documentos</span>
            <span className="text-xs text-muted-foreground shrink-0">{documentos.length}</span>
          </button>

          {/* Pastas por cliente */}
          <div className="mt-2 space-y-0.5">
            {pastasRaiz.map(pasta => {
              const filhas = getPastasFilhas(pasta.id);
              const expandida = pastaExpandida.includes(pasta.id);
              return (
                <div key={pasta.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => { setPastaSelecionada(pasta); if (filhas.length) togglePastaExpandida(pasta.id); }}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                        pastaSelecionada.id === pasta.id ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent/50"
                      )}
                    >
                      {expandida ? <FolderOpen className="h-4 w-4 shrink-0 text-yellow-400" /> : <Folder className="h-4 w-4 shrink-0 text-yellow-400" />}
                      <span className="flex-1 text-left truncate">{pasta.nome}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{pasta.documentos}</span>
                    </button>
                    {filhas.length > 0 && (
                      <button onClick={() => togglePastaExpandida(pasta.id)} className="p-1 text-muted-foreground hover:text-foreground">
                        <ChevronRight className={cn("h-3 w-3 transition-transform", expandida && "rotate-90")} />
                      </button>
                    )}
                  </div>
                  {expandida && filhas.map(filha => (
                    <button
                      key={filha.id}
                      onClick={() => setPastaSelecionada(filha)}
                      className={cn(
                        "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-xs transition-all",
                        pastaSelecionada.id === filha.id ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left truncate">{filha.nome}</span>
                      <span className="opacity-70">{filha.documentos}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/30">
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

          <Button className="gap-2" onClick={() => setUploadAberto(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>

        {/* Cabeçalho da pasta */}
        <div className="px-6 py-3 border-b border-border/50 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-yellow-400" />
          <h3 className="font-medium text-foreground text-sm">{pastaSelecionada.nome}</h3>
          <span className="text-muted-foreground text-xs">— {docsFiltrados.length} documento{docsFiltrados.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {docsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum documento encontrado nesta pasta.</p>
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Upload por</th>
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
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{categoriaLabel[doc.categoria]}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">{doc.clienteNome ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">{doc.uploadadoPor}</td>
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
        </div>
      </div>

      {uploadAberto && <UploadArea onClose={() => setUploadAberto(false)} />}
    </div>
  );
};
