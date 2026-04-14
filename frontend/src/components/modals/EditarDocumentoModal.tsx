import { useState } from "react";
import { FileText, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Documento } from "@/types";

const categoriasOpcoes = [
  { value: "PETICAO", label: "Peticao" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "PROCURACAO", label: "Procuracao" },
  { value: "SENTENCA", label: "Sentenca" },
  { value: "RECURSO", label: "Recurso" },
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "OUTROS", label: "Outros" },
];

interface EditarDocumentoModalProps {
  documento: Documento;
  onClose: () => void;
  onSave: (data: { nome: string; categoria: string }) => Promise<void> | void;
}

export function EditarDocumentoModal({ documento, onClose, onSave }: EditarDocumentoModalProps) {
  const [nome, setNome] = useState(documento.nome);
  const [categoria, setCategoria] = useState((documento.categoria || "outros").toUpperCase());
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nome.trim()) {
      setErro("Informe o nome do documento.");
      return;
    }

    setSaving(true);
    setErro(null);

    try {
      await onSave({
        nome: nome.trim(),
        categoria,
      });
      onClose();
    } catch (error) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      setErro(axiosErr.response?.data?.mensagem ?? "Erro ao atualizar documento.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Editar documento</h2>
              <p className="text-xs text-muted-foreground">Atualize o nome exibido e a categoria.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{documento.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {documento.tipo.toUpperCase()} · {documento.tamanho}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nome exibido</Label>
            <Input value={nome} onChange={(event) => setNome(event.target.value)} className="bg-secondary border-none" />
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

          {erro && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{erro}</p>}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Salvando..." : "Salvar alteracoes"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
