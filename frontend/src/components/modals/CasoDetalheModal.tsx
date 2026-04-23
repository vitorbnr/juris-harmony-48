import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { casosApi } from "@/services/api";
import type { AcessoCaso, Caso } from "@/types";

type CasoDetalheModalProps = {
  open: boolean;
  casoId: string | null;
  onClose: () => void;
};

type AcessoMeta = {
  label: string;
  className: string;
  description: string;
};

const acessoConfig: Record<AcessoCaso, AcessoMeta> = {
  PUBLICO: {
    label: "Publico",
    className: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
    description: "Visivel para utilizadores com permissao no modulo.",
  },
  PRIVADO: {
    label: "Privado",
    className: "border-rose-500/25 bg-rose-500/15 text-rose-300",
    description: "Restrito ao responsavel e aos acessos concedidos manualmente.",
  },
  EQUIPE: {
    label: "Equipe",
    className: "border-sky-500/25 bg-sky-500/15 text-sky-300",
    description: "Partilhado com a equipa da pasta selecionada.",
  },
};

function formatDateTime(value?: string | null) {
  if (!value) return "Nao informado";

  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResumoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function CasoDetalheModal({ open, casoId, onClose }: CasoDetalheModalProps) {
  const [loading, setLoading] = useState(false);
  const [caso, setCaso] = useState<Caso | null>(null);

  useEffect(() => {
    if (!open || !casoId) {
      setLoading(false);
      setCaso(null);
      return;
    }

    let ativo = true;
    setLoading(true);

    casosApi
      .buscar(casoId)
      .then((data) => {
        if (ativo) setCaso(data);
      })
      .catch(() => {
        if (ativo) setCaso(null);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [casoId, open]);

  const acessoMeta = useMemo(() => {
    if (!caso?.acesso) return acessoConfig.EQUIPE;
    return acessoConfig[caso.acesso] ?? acessoConfig.EQUIPE;
  }, [caso?.acesso]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="border-border bg-card p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border text-[11px]", acessoMeta.className)}>{acessoMeta.label}</Badge>
            {caso?.etiquetas?.slice(0, 3).map((etiqueta) => (
              <Badge
                key={etiqueta}
                variant="outline"
                className="border-primary/20 bg-primary/10 text-[11px] text-primary"
              >
                {etiqueta}
              </Badge>
            ))}
          </div>

          <DialogTitle className="mt-3 text-2xl leading-tight text-foreground">
            {caso?.titulo ?? "Detalhes do caso"}
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-3xl leading-6">
            {caso
              ? "Leitura consolidada do caso, com cliente, pasta, responsavel, envolvidos e contexto operacional."
              : "A carregar o caso selecionado."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !caso ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">Nao foi possivel carregar os detalhes deste caso.</p>
          </div>
        ) : (
          <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ResumoCard icon={Briefcase} label="Cliente" value={caso.clienteNome} />
              <ResumoCard icon={Building2} label="Pasta" value={caso.unidadeNome} />
              <ResumoCard icon={UserRound} label="Responsavel" value={caso.responsavelNome} />
              <ResumoCard
                icon={ShieldCheck}
                label="Atualizado em"
                value={formatDateTime(caso.dataAtualizacao ?? caso.dataCriacao)}
              />
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-border/70 bg-background/35 p-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Contexto do caso
                    </h3>
                  </div>

                  <div className="mt-4 space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Descricao
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {caso.descricao?.trim() || "Sem descricao registada."}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Observacoes
                      </p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {caso.observacoes?.trim() || "Sem observacoes internas."}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/35 p-5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Envolvidos
                    </h3>
                  </div>

                  {caso.envolvidos.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Nenhum envolvido adicional registado.</p>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {caso.envolvidos.map((envolvido) => (
                        <div
                          key={envolvido.id}
                          className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3"
                        >
                          <p className="text-sm font-medium text-foreground">{envolvido.nome}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {envolvido.qualificacao?.trim() || "Sem qualificacao informada"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-border/70 bg-background/35 p-5">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Acesso
                    </h3>
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{acessoMeta.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{acessoMeta.description}</p>
                </section>

                <section className="rounded-3xl border border-border/70 bg-background/35 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Etiquetas
                    </h3>
                  </div>

                  {caso.etiquetas.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Sem etiquetas classificatorias.</p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {caso.etiquetas.map((etiqueta) => (
                        <Badge
                          key={etiqueta}
                          variant="outline"
                          className="border-primary/20 bg-primary/10 text-primary"
                        >
                          {etiqueta}
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
