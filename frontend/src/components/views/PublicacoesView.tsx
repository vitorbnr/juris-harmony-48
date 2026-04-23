import { useEffect, useState } from "react";
import { Archive, CalendarClock, Inbox, Link2, Loader2, Newspaper, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { publicacoesApi } from "@/services/api";
import type { Publicacao } from "@/types/publicacoes";
import { toast } from "sonner";

const formatarDataPublicacao = (value?: string | null) => {
  if (!value) return "Data nao informada";

  try {
    return format(parseISO(value), "dd 'de' MMM yyyy 'as' HH:mm", { locale: ptBR });
  } catch {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Data nao informada";
    return parsed.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const LoadingList = () => (
  <div className="space-y-3 p-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-border bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-4 h-4 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </div>
    ))}
  </div>
);

export const PublicacoesView = () => {
  const isMobile = useIsMobile();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [publicacaoSelecionada, setPublicacaoSelecionada] = useState<Publicacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    publicacoesApi
      .listar({ status: "PENDENTE" })
      .then((items) => {
        if (!ativo) return;

        const pendentes = Array.isArray(items) ? items : [];
        setPublicacoes(pendentes);
        setPublicacaoSelecionada((current) =>
          current ? pendentes.find((item) => item.id === current.id) ?? null : null,
        );
      })
      .catch((error) => {
        console.error("Erro ao carregar publicacoes pendentes:", error);
        if (!ativo) return;
        setPublicacoes([]);
        setPublicacaoSelecionada(null);
        toast.error("Nao foi possivel carregar as publicacoes pendentes.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const painelFila = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Fila de trabalho</h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Publicacoes pendentes para leitura e classificacao manual.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
            {loading ? "..." : `${publicacoes.length} pendente(s)`}
          </Badge>
        </div>
      </div>

      {loading ? (
        <LoadingList />
      ) : publicacoes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/35" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Nenhuma publicacao pendente</p>
            <p className="text-sm text-muted-foreground">
              Quando novas publicacoes forem inseridas, elas aparecerao nesta fila.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {publicacoes.map((publicacao) => {
              const ativa = publicacaoSelecionada?.id === publicacao.id;

              return (
                <button
                  key={publicacao.id}
                  type="button"
                  onClick={() => setPublicacaoSelecionada(publicacao)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                    ativa
                      ? "border-primary/45 bg-primary/10 shadow-[0_18px_45px_-35px_hsl(var(--primary))]"
                      : "border-border bg-background/60 hover:border-primary/25 hover:bg-background",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      variant="outline"
                      className="max-w-[70%] truncate border-primary/20 bg-primary/10 text-primary"
                    >
                      {publicacao.tribunalOrigem}
                    </Badge>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatarDataPublicacao(publicacao.dataPublicacao)}
                    </span>
                  </div>

                  <p className="mt-3 font-mono text-xs text-foreground/85">
                    {publicacao.npu ?? "NPU nao informado"}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {publicacao.teor}
                  </p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const painelDetalhe = (
    <div className="flex h-full flex-col">
      {publicacaoSelecionada ? (
        <>
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    {publicacaoSelecionada.tribunalOrigem}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {publicacaoSelecionada.statusTratamento}
                  </Badge>
                </div>
                <p className="mt-3 font-mono text-sm text-foreground">
                  {publicacaoSelecionada.npu ?? "NPU nao informado"}
                </p>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                <p>Publicada em</p>
                <p className="mt-1 font-medium text-foreground/90">
                  {formatarDataPublicacao(publicacaoSelecionada.dataPublicacao)}
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="mx-auto w-full max-w-4xl p-5">
              <div className="rounded-2xl border border-border bg-background/40 p-5 md:p-6">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Teor integral
                  </p>
                </div>

                <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                  {publicacaoSelecionada.teor}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-border bg-card/95 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs text-muted-foreground">
                Barra de acao visual da primeira fase. As operacoes ainda estao em modo layout.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => console.log("Criar Prazo", publicacaoSelecionada.id)}>
                  <CalendarClock className="h-4 w-4" />
                  Criar Prazo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => console.log("Vincular Processo", publicacaoSelecionada.id)}
                >
                  <Link2 className="h-4 w-4" />
                  Vincular Processo
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => console.log("Apenas Arquivar", publicacaoSelecionada.id)}
                >
                  <Archive className="h-4 w-4" />
                  Apenas Arquivar
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => console.log("Descartar", publicacaoSelecionada.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="space-y-3">
            {loading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : (
              <Newspaper className="mx-auto h-10 w-10 text-muted-foreground/35" />
            )}
            <p className="text-base text-muted-foreground">
              Selecione uma publicacao para iniciar a triagem
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-full flex-col gap-6 p-6 md:h-full md:min-h-0 md:overflow-hidden md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-foreground">Publicacoes</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Triagem manual em layout master-detail para leitura do teor e encaminhamento do tratamento.
          </p>
        </div>
      </div>

      {isMobile ? (
        <div className="grid gap-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.7)]">
            {painelFila}
          </div>
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_70px_-48px_rgba(0,0,0,0.7)]">
            {painelDetalhe}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-45px_rgba(0,0,0,0.65)]">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={35} minSize={26}>
              {painelFila}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65} minSize={38}>
              {painelDetalhe}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
};
