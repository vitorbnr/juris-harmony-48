import { KeyboardEvent, useState } from "react";
import { Plus, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EtiquetasEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
}

const LIMITE_ETIQUETAS = 10;
const LIMITE_CARACTERES = 40;

const normalizarEtiqueta = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export function EtiquetasEditor({
  value,
  onChange,
  label = "Etiquetas",
  disabled = false,
  helperText = `Ate ${LIMITE_ETIQUETAS} etiquetas por registo. Pressione Enter para adicionar.`,
}: EtiquetasEditorProps) {
  const [entrada, setEntrada] = useState("");

  const adicionarEtiqueta = () => {
    const limpa = entrada.trim().replace(/\s+/g, " ");
    if (!limpa || disabled) return;
    if (limpa.length > LIMITE_CARACTERES) return;
    if (value.length >= LIMITE_ETIQUETAS) return;

    const chave = normalizarEtiqueta(limpa);
    if (!chave) return;
    if (value.some((item) => normalizarEtiqueta(item) === chave)) {
      setEntrada("");
      return;
    }

    onChange([...value, limpa]);
    setEntrada("");
  };

  const removerEtiqueta = (etiqueta: string) => {
    onChange(value.filter((item) => item !== etiqueta));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      adicionarEtiqueta();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((etiqueta) => (
            <span
              key={etiqueta}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              <Tag className="h-3 w-3" />
              {etiqueta}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removerEtiqueta(etiqueta)}
                  className="transition-colors hover:text-destructive"
                  aria-label={`Remover etiqueta ${etiqueta}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={entrada}
            onChange={(event) => setEntrada(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Urgente, Execucao, Acordo"
            maxLength={LIMITE_CARACTERES}
            disabled={disabled || value.length >= LIMITE_ETIQUETAS}
          />
          <Button
            type="button"
            variant="outline"
            onClick={adicionarEtiqueta}
            disabled={disabled || !entrada.trim() || value.length >= LIMITE_ETIQUETAS}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {helperText}
      </p>
    </div>
  );
}
