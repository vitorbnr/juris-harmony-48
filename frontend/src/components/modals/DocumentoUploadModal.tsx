import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { documentosApi } from "@/services/api";
import type { PastaInternaNode, Processo } from "@/types";

const tipoConfig: Record<string, { bg: string; text: string; char: string }> = {
  pdf: { bg: "bg-red-500/15", text: "text-red-400", char: "PDF" },
  docx: { bg: "bg-blue-500/15", text: "text-blue-400", char: "DOC" },
  doc: { bg: "bg-blue-500/15", text: "text-blue-400", char: "DOC" },
  xlsx: { bg: "bg-green-500/15", text: "text-green-400", char: "XLS" },
  xls: { bg: "bg-green-500/15", text: "text-green-400", char: "XLS" },
  jpg: { bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  jpeg: { bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  png: { bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  gif: { bg: "bg-purple-500/15", text: "text-purple-400", char: "IMG" },
  mp4: { bg: "bg-orange-500/15", text: "text-orange-400", char: "VID" },
  zip: { bg: "bg-yellow-500/15", text: "text-yellow-400", char: "ZIP" },
  rar: { bg: "bg-yellow-500/15", text: "text-yellow-400", char: "RAR" },
  txt: { bg: "bg-muted", text: "text-muted-foreground", char: "TXT" },
  outro: { bg: "bg-muted", text: "text-muted-foreground", char: "ARQ" },
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

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export type DocumentoDestino = "cliente" | "interno";

interface ClienteOption {
  id: string;
  nome: string;
}

interface PastaOption {
  id: string;
  label: string;
}

interface DocumentoUploadModalProps {
  onClose: () => void;
  onSaved: () => void;
  clientesList: ClienteOption[];
  processosList: Processo[];
  pastasInternas: PastaInternaNode[];
  initialDestino?: DocumentoDestino;
  initialClienteId?: string;
  initialProcessoId?: string;
  initialPastaId?: string;
  allowDestinoSwitch?: boolean;
  lockClienteId?: string;
  lockProcessoId?: string;
  title?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
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

export function DocumentoUploadModal({
  onClose,
  onSaved,
  clientesList,
  processosList,
  pastasInternas,
  initialDestino = "cliente",
  initialClienteId,
  initialProcessoId,
  initialPastaId,
  allowDestinoSwitch = true,
  lockClienteId,
  lockProcessoId,
  title = "Upload de documento",
}: DocumentoUploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [destino, setDestino] = useState<DocumentoDestino>(initialDestino);
  const [files, setFiles] = useState<File[]>([]);
  const [categoria, setCategoria] = useState("OUTROS");
  const [clienteId, setClienteId] = useState(initialClienteId ?? lockClienteId ?? "");
  const [processoId, setProcessoId] = useState(initialProcessoId ?? lockProcessoId ?? "");
  const [pastaId, setPastaId] = useState(initialPastaId ?? "");
  const [progresso, setProgresso] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivosEnviados, setArquivosEnviados] = useState(0);

  const pastaOptions = flattenPastas(pastasInternas);
  const clienteSelecionadoId = lockClienteId ?? clienteId;
  const processoSelecionadoId = lockProcessoId ?? processoId;

  const processosDoCliente = useMemo(
    () =>
      processosList
        .filter((processo) => processo.clienteId === clienteSelecionadoId)
        .sort((a, b) => a.numero.localeCompare(b.numero, "pt-BR", { sensitivity: "base" })),
    [processosList, clienteSelecionadoId],
  );

  const clienteSelecionado = clientesList.find((cliente) => cliente.id === clienteSelecionadoId) ?? null;
  const processoSelecionado = processosList.find((processo) => processo.id === processoSelecionadoId) ?? null;

  useEffect(() => {
    if (!allowDestinoSwitch) {
      setDestino(initialDestino);
    }
  }, [allowDestinoSwitch, initialDestino]);

  useEffect(() => {
    if (lockClienteId) {
      setClienteId(lockClienteId);
    }
  }, [lockClienteId]);

  useEffect(() => {
    if (lockProcessoId) {
      setProcessoId(lockProcessoId);
    }
  }, [lockProcessoId]);

  useEffect(() => {
    const processoInicialId = lockProcessoId ?? initialProcessoId;
    if (!processoInicialId) return;

    const processoInicial = processosList.find((processo) => processo.id === processoInicialId);
    if (!processoInicial) return;

    if (!lockClienteId) {
      setClienteId((prev) => prev || processoInicial.clienteId);
    }
  }, [processosList, initialProcessoId, lockClienteId, lockProcessoId]);

  useEffect(() => {
    if (destino !== "cliente" && !lockProcessoId) {
      setProcessoId("");
    }
  }, [destino, lockProcessoId]);

  useEffect(() => {
    if (lockProcessoId) return;
    if (!processoId) return;
    if (processosDoCliente.some((processo) => processo.id === processoId)) return;
    setProcessoId("");
  }, [processoId, processosDoCliente, lockProcessoId]);

  const adicionarArquivos = (selectedFiles: Iterable<File>) => {
    const validos: File[] = [];
    const invalidos: string[] = [];

    for (const selectedFile of Array.from(selectedFiles)) {
      if (selectedFile.size > MAX_SIZE_BYTES) {
        invalidos.push(selectedFile.name);
        continue;
      }

      validos.push(selectedFile);
    }

    if (validos.length > 0) {
      setFiles((prev) => {
        const existing = new Set(prev.map(buildFileKey));
        const novos = validos.filter((file) => {
          const key = buildFileKey(file);
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        });
        return [...prev, ...novos];
      });
      setConcluido(false);
      setArquivosEnviados(0);
    }

    if (invalidos.length > 0) {
      const nomes = invalidos.slice(0, 2).join(", ");
      setErro(
        `Alguns arquivos nao foram adicionados por excederem 100MB: ${nomes}${invalidos.length > 2 ? "..." : ""}.`,
      );
      return;
    }

    if (validos.length > 0) {
      setErro(null);
    }
  };

  const removerArquivo = (fileKey: string) => {
    setFiles((prev) => prev.filter((file) => buildFileKey(file) !== fileKey));
    setErro(null);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.kind !== "file") continue;

        const pastedFile = item.getAsFile();
        if (pastedFile) {
          adicionarArquivos([pastedFile]);
        }
        break;
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;

    if (destino === "cliente" && !clienteSelecionadoId) {
      setErro("Selecione o cliente que recebera o documento.");
      return;
    }

    if (destino === "interno" && !pastaId) {
      setErro("Selecione a pasta que recebera o documento.");
      return;
    }

    setUploading(true);
    setErro(null);
    setProgresso(0);

    const arquivosPendentes = [...files];
    const falhas: Array<{ file: File; message: string }> = [];
    let enviados = 0;

    for (let index = 0; index < arquivosPendentes.length; index += 1) {
      const file = arquivosPendentes[index];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("categoria", categoria);

      if (destino === "cliente") {
        formData.append("clienteId", clienteSelecionadoId);
      }
      if (destino === "interno") {
        formData.append("pastaId", pastaId);
      }
      if (processoSelecionadoId) {
        formData.append("processoId", processoSelecionadoId);
      }

      try {
        await documentosApi.upload(formData, (pct) => {
          const totalPct = ((index + pct / 100) / arquivosPendentes.length) * 100;
          setProgresso(Math.round(totalPct));
        });
        enviados += 1;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { mensagem?: string } } };
        falhas.push({
          file,
          message: axiosErr.response?.data?.mensagem ?? `Erro ao enviar ${file.name}.`,
        });
      }
    }

    setUploading(false);
    setArquivosEnviados(enviados);

    if (falhas.length > 0) {
      setFiles(falhas.map((falha) => falha.file));
      setConcluido(false);
      setProgresso(0);

      if (enviados > 0) {
        onSaved();
      }

      const arquivosComFalha = falhas.slice(0, 2).map((falha) => falha.file.name).join(", ");
      setErro(
        enviados > 0
          ? `${enviados} ${enviados === 1 ? "arquivo enviado" : "arquivos enviados"}. Falha em ${falhas.length}: ${arquivosComFalha}${falhas.length > 2 ? "..." : ""}.`
          : falhas[0].message,
      );
      return;
    }

    setProgresso(100);
    setConcluido(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {concluido ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Upload concluido</p>
              <p className="text-sm text-muted-foreground">
                {arquivosEnviados} {arquivosEnviados === 1 ? "arquivo enviado" : "arquivos enviados"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  adicionarArquivos(Array.from(event.dataTransfer.files));
                }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp4,.mpeg,.mov,.avi,.webm,.mp3,.wav,.ogg,.zip,.rar,.7z,.txt,.rtf"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      adicionarArquivos(Array.from(event.target.files));
                    }
                    event.currentTarget.value = "";
                  }}
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  {files.length > 0 ? "Adicionar mais arquivos" : "Arraste, clique ou cole (Ctrl+V)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, XLSX, imagens e videos ate 100MB por arquivo
                </p>
                {files.length > 0 && (
                  <p className="text-xs text-primary mt-2">
                    {files.length} {files.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
                  </p>
                )}
              </div>

              {files.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {files.map((file) => (
                    <div key={buildFileKey(file)} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                      <FileIcon tipo={file.name.split(".").pop() ?? ""} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={uploading}
                        onClick={() => removerArquivo(buildFileKey(file))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

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
              {allowDestinoSwitch ? (
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
              ) : (
                <div className="space-y-1.5">
                  <Label>Destino</Label>
                  <Input
                    value={destino === "cliente" ? "Cliente" : "Pasta interna"}
                    readOnly
                    className="bg-secondary border-none"
                  />
                </div>
              )}

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
                <>
                  {lockClienteId ? (
                    <div className="space-y-1.5">
                      <Label>Cliente</Label>
                      <Input value={clienteSelecionado?.nome ?? "Cliente selecionado"} readOnly className="bg-secondary border-none" />
                    </div>
                  ) : (
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
                  )}

                  {lockProcessoId ? (
                    <div className="space-y-1.5">
                      <Label>Processo</Label>
                      <Input value={processoSelecionado?.numero ?? "Processo selecionado"} readOnly className="bg-secondary border-none" />
                    </div>
                  ) : clienteSelecionadoId ? (
                    <div className="space-y-1.5">
                      <Label>Relacionar a um processo</Label>
                      <select
                        value={processoId}
                        onChange={(event) => setProcessoId(event.target.value)}
                        className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                      >
                        <option value="">Sem processo especifico</option>
                        {processosDoCliente.map((processo) => (
                          <option key={processo.id} value={processo.id}>
                            {processo.numero}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        O documento continua pertencendo ao cliente, mas tambem fica visivel no processo.
                      </p>
                    </div>
                  ) : null}
                </>
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

              {processoSelecionado && destino === "cliente" && (
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">Vinculo com processo ativo</p>
                      <p className="text-muted-foreground">
                        {processoSelecionado.numero} - {processoSelecionado.clienteNome}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" disabled={files.length === 0 || uploading || concluido} onClick={handleUpload}>
            {uploading
              ? `Enviando... ${progresso}%`
              : files.length > 1
                ? `Fazer upload (${files.length})`
                : "Fazer upload"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
