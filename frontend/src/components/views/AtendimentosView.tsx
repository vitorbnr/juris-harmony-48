import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Check, Loader2, MoreVertical, Pencil, Plus, RefreshCcw, RotateCcw, Scale, Search, Trash2 } from "lucide-react";

import { NovoAtendimentoModal } from "@/components/modals/NovoAtendimentoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { atendimentosApi } from "@/services/api";
import { toast } from "sonner";
import type { Atendimento, StatusAtendimento } from "@/types";

interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

type FiltroAtendimento = "TODOS" | "ABERTOS" | "FECHADOS";

const statusConfig: Record<StatusAtendimento, { label: string; className: string }> = {
  ABERTO: {
    label: "Aberto",
    className: "border-blue-500/25 bg-blue-500/10 text-blue-400",
  },
  EM_ANALISE: {
    label: "Em analise",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  CONVERTIDO: {
    label: "Convertido",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  ARQUIVADO: {
    label: "Fechado",
    className: "border-border bg-muted text-muted-foreground",
  },
};

const filtrosStatus: Array<{ value: FiltroAtendimento; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "ABERTOS", label: "Em aberto" },
  { value: "FECHADOS", label: "Fechados" },
];

const formatarData = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function AtendimentosView() {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<FiltroAtendimento>("TODOS");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [alterandoStatusId, setAlterandoStatusId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [atendimentoEmEdicao, setAtendimentoEmEdicao] = useState<Atendimento | null>(null);
  const [resultado, setResultado] = useState<PageResponse<Atendimento>>({
    content: [],
    number: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  });

  const buscaDeferred = useDeferredValue(busca);

  const carregarAtendimentos = useCallback(() => {
    setLoading(true);

    atendimentosApi.listar({
      unidadeId: unidadeSelecionada !== "todas" ? unidadeSelecionada : undefined,
      status: status === "TODOS" ? undefined : status,
      busca: buscaDeferred.trim() || undefined,
      page,
      size: 10,
      sort: "dataCriacao,desc",
    })
      .then((data: PageResponse<Atendimento>) => {
        setResultado({
          content: data.content ?? [],
          number: data.number ?? 0,
          size: data.size ?? 10,
          totalElements: data.totalElements ?? 0,
          totalPages: data.totalPages ?? 0,
          first: data.first ?? true,
          last: data.last ?? true,
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar atendimentos:", error);
        toast.error("Erro ao carregar atendimentos.");
        setResultado({
          content: [],
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        });
      })
      .finally(() => setLoading(false));
  }, [buscaDeferred, page, status, unidadeSelecionada]);

  useEffect(() => {
    carregarAtendimentos();
  }, [carregarAtendimentos]);

  useEffect(() => {
    setPage(0);
  }, [buscaDeferred, status, unidadeSelecionada]);

  const fecharModal = () => {
    setModalAberto(false);
    setAtendimentoEmEdicao(null);
  };

  const refrescarPrimeiraPagina = () => {
    if (page === 0) {
      carregarAtendimentos();
      return;
    }
    setPage(0);
  };

  const handleNovo = () => {
    setAtendimentoEmEdicao(null);
    setModalAberto(true);
  };

  const handleEditar = (atendimento: Atendimento) => {
    setAtendimentoEmEdicao(atendimento);
    setModalAberto(true);
  };

  const handleExcluir = async (atendimento: Atendimento) => {
    if (!confirm(`Excluir o atendimento "${atendimento.assunto}"? Esta acao nao pode ser desfeita.`)) {
      return;
    }

    setExcluindoId(atendimento.id);
    try {
      await atendimentosApi.excluir(atendimento.id);
      toast.success("Atendimento excluido com sucesso.");

      if (page > 0 && resultado.content.length === 1) {
        setPage((current) => Math.max(0, current - 1));
      } else {
        carregarAtendimentos();
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Nao foi possivel excluir o atendimento.");
    } finally {
      setExcluindoId(null);
    }
  };

  const handleFechar = async (atendimento: Atendimento) => {
    if (!confirm(`Fechar o atendimento "${atendimento.assunto}"?`)) {
      return;
    }

    setAlterandoStatusId(atendimento.id);
    try {
      await atendimentosApi.fechar(atendimento.id);
      toast.success("Atendimento fechado com sucesso.");
      carregarAtendimentos();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Nao foi possivel fechar o atendimento.");
    } finally {
      setAlterandoStatusId(null);
    }
  };

  const handleReabrir = async (atendimento: Atendimento) => {
    if (!confirm(`Reabrir o atendimento "${atendimento.assunto}"?`)) {
      return;
    }

    setAlterandoStatusId(atendimento.id);
    try {
      await atendimentosApi.reabrir(atendimento.id);
      toast.success("Atendimento reaberto com sucesso.");
      carregarAtendimentos();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Nao foi possivel reabrir o atendimento.");
    } finally {
      setAlterandoStatusId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-end gap-4">
        <Button className="gap-2" onClick={handleNovo}>
          <Plus className="h-4 w-4" />
          Novo Atendimento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por cliente, assunto ou contexto..."
            className="border-none bg-secondary pl-9"
          />
        </div>

        <Button variant="outline" className="gap-2" onClick={carregarAtendimentos} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtrosStatus.map((filtro) => {
          const ativo = filtro.value === status;

          return (
            <button
              key={filtro.value}
              onClick={() => setStatus(filtro.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                ativo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {filtro.label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-[56px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A carregar atendimentos...
                  </div>
                </TableCell>
              </TableRow>
            ) : resultado.content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <Scale className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Nenhum atendimento encontrado nesta visao.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              resultado.content.map((atendimento) => {
                const statusAtual = statusConfig[atendimento.status];
                const excluindo = excluindoId === atendimento.id;
                const alterandoStatus = alterandoStatusId === atendimento.id;
                const isOwner = atendimento.usuarioId === user?.id;
                const podeFechar = isOwner
                  && atendimento.status !== "ARQUIVADO"
                  && atendimento.status !== "CONVERTIDO";
                const podeReabrir = isOwner && atendimento.status === "ARQUIVADO";
                const semAcoes = !isOwner;

                return (
                  <TableRow key={atendimento.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{atendimento.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">
                          Registado por {atendimento.usuarioNome}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{atendimento.assunto}</p>
                        {atendimento.processoNumero && (
                          <p className="mt-1 text-xs font-medium text-primary">
                            Processo relacionado: {atendimento.processoNumero}
                          </p>
                        )}
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {atendimento.descricao || "Sem descricao detalhada."}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {atendimento.etiquetas.slice(0, 3).map((etiqueta) => (
                            <span
                              key={etiqueta}
                              className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {etiqueta}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusAtual.className}>
                        {statusAtual.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarData(atendimento.dataCriacao)}
                    </TableCell>
                    <TableCell className="text-right">
                      {semAcoes ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              disabled={excluindo || alterandoStatus}
                              aria-label="Abrir menu de acoes"
                            >
                              {excluindo || alterandoStatus ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {isOwner && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditar(atendimento)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Editar
                                </DropdownMenuItem>
                                {podeFechar && (
                                  <DropdownMenuItem onClick={() => void handleFechar(atendimento)}>
                                    <Check className="mr-2 h-3.5 w-3.5" />
                                    Fechar
                                  </DropdownMenuItem>
                                )}
                                {podeReabrir && (
                                  <DropdownMenuItem onClick={() => void handleReabrir(atendimento)}>
                                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                    Reabrir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {isOwner && (
                              <>
                                {(podeFechar || podeReabrir) && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => void handleExcluir(atendimento)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {resultado.totalElements} atendimento(s) encontrado(s)
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resultado.first || loading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Pagina {resultado.totalPages === 0 ? 0 : resultado.number + 1} de {resultado.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={resultado.last || loading || resultado.totalPages === 0}
            onClick={() => setPage((current) => current + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>

      {modalAberto && (
        <NovoAtendimentoModal
          initialData={atendimentoEmEdicao}
          onClose={fecharModal}
          onSaved={refrescarPrimeiraPagina}
        />
      )}
    </div>
  );
}
