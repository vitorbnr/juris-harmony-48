import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { notasPessoaisApi } from "@/services/api";

type SaveState = "idle" | "saving" | "saved" | "error";

export const BlocoNotasDashboard = () => {
  const [conteudo, setConteudo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const prontoRef = useRef(false);
  const ultimoSalvoRef = useRef("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    let ativo = true;

    notasPessoaisApi
      .buscarMinhaNota()
      .then((nota) => {
        if (!ativo) return;
        const conteudoInicial = nota?.conteudo ?? "";
        setConteudo(conteudoInicial);
        ultimoSalvoRef.current = conteudoInicial;
        prontoRef.current = true;
        setSaveState("saved");
      })
      .catch(() => {
        if (!ativo) return;
        prontoRef.current = true;
        setSaveState("error");
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!prontoRef.current) return;
    if (conteudo === ultimoSalvoRef.current) return;

    setSaveState("saving");
    const requestId = ++requestIdRef.current;

    const timer = window.setTimeout(async () => {
      try {
        const nota = await notasPessoaisApi.salvarMinhaNota(conteudo);
        if (requestIdRef.current !== requestId) return;
        ultimoSalvoRef.current = nota?.conteudo ?? conteudo;
        setSaveState("saved");
      } catch {
        if (requestIdRef.current !== requestId) return;
        setSaveState("error");
      }
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conteudo]);

  const statusLabel = carregando
    ? "Carregando..."
    : saveState === "saving"
      ? "Salvando..."
      : saveState === "saved"
        ? "Salvo"
        : saveState === "error"
          ? "Falha ao salvar"
          : "";

  const statusClassName =
    saveState === "error"
      ? "text-destructive"
      : saveState === "saving"
        ? "text-primary/80"
        : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-6 opacity-0 animate-fade-in" style={{ animationDelay: "680ms" }}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">Bloco de Notas</h3>
              <p className="text-xs text-muted-foreground">Notas pessoais com auto-save silencioso</p>
            </div>
          </div>
        </div>
        <span className={`text-[11px] font-medium ${statusClassName}`}>{statusLabel}</span>
      </div>

      <Textarea
        value={conteudo}
        onChange={(event) => setConteudo(event.target.value)}
        placeholder="Registe recados de ligacao, pontos de atencao e lembretes pessoais..."
        className="min-h-[260px] resize-none border-border/80 bg-background/40"
        disabled={carregando}
      />
    </div>
  );
};
