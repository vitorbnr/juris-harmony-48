import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Archive,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Pause,
  Pencil,
  Plus,
  Scale,
  Search,
  X,
} from "lucide-react";

import { EditarProcessoModal } from "@/components/modals/EditarProcessoModal";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useUnidade } from "@/context/UnidadeContext";
import { cn } from "@/lib/utils";
import { processosApi } from "@/services/api";
import type { Processo, StatusProcesso, TipoProcesso } from "@/types";
import { toast } from "sonner";

const statusConfig: Record<StatusProcesso, { label: string; class: string; icon: React.ElementType }> = {
  EM_ANDAMENTO: {
    label: "Em andamento",
    class: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    icon: Clock,
  },
  AGUARDANDO: {
    label: "Aguardando",
    class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    icon: Clock,
  },
  URGENTE: {
    label: "Urgente",
    class: "bg-red-500/15 text-red-400 border-red-500/20",
    icon: AlertCircle,
  },
  CONCLUIDO: {
    label: "Concluido",
    class: "bg-primary/15 text-primary border-primary/20",
    icon: CheckCircle,
  },
  SUSPENSO: {
    label: "Suspenso",
    class: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    icon: Pause,
  },
  ARQUIVADO: {
    label: "Arquivado",
    class: "bg-muted text-muted-foreground border-border",
    icon: Archive,
  },
};

const tiposProcesso: TipoProcesso[] = [
  "CIVEL",
  "TRABALHISTA",
  "CRIMINAL",
  "FAMILIA",
  "TRIBUTARIO",
  "EMPRESARIAL",
  "PREVIDENCIARIO",
  "ADMINISTRATIVO",
];

const tipoMovimentacaoLabel = (tipo?: string) => {
  switch ((tipo ?? "").toUpperCase()) {
    case "DESPACHO":
      return "Despacho";
    case "SENTENCA":
      return "Sentenca";
    case "AUDIENCIA":
      return "Audiencia";
    case "PETICAO":
      return "Peticao";
    case "PUBLICACAO":
      return "Publicacao";
    case "OUTRO":
      return "Outro";
    default:
      return tipo || "Movimentacao";
  }
};

const formatarDataMovimentacao = (data?: string, dataHora?: string) => {
  if (dataHora) {
    const parsed = new Date(dataHora);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (data) {
    const parsed = new Date(`${data}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("pt-BR");
    }
  }

  return "Data nao informada";
};

const formatarValorCausa = (valor?: string) => {
  if (!valor) return "—";

  const parsed = Number.parseFloat(valor);
  if (!Number.isFinite(parsed)) return valor;

  return `R$ ${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

function ProcessoDrawer({
  processo,
  onClose,
  onEditar,
}: {
  processo: Processo;
  onClose: () => void;
  onEditar: () => void;
}) {
  const status = statusConfig[processo.status] ?? statusConfig.EM_ANDAMENTO;
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl animate-in flex-col border-l border-border bg-card shadow-2xl slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">{processo.numero}</p>
              <p className="text-sm font-semibold text-foreground">{processo.clienteNome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1 text-xs", status.class)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            <h3 className="font-heading text-base font-semibold text-foreground">Dados do Processo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tipo", value: processo.tipo },
                { label: "Tribunal", value: processo.tribunal || "—" },
                { label: "Vara / Juizo", value: processo.vara || "—" },
                {
                  label: "Distribuicao",
                  value: processo.dataDistribuicao
                    ? new Date(`${processo.dataDistribuicao}T00:00:00`).toLocaleDateString("pt-BR")
                    : "—",
                },
                { label: "Valor da Causa", value: formatarValorCausa(processo.valorCausa) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-sm font-medium leading-tight text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Advogados Responsaveis
              </p>
              {processo.advogados && processo.advogados.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {processo.advogados.map((advogado) => (
                    <span
                      key={advogado.id}
                      className="inline-flex items-center rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {advogado.nome}
                    </span>
                  ))}
                </div>
              ) : processo.advogadoNome ? (
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {processo.advogadoNome}
                </span>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            {processo.descricao && (
              <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Descricao</p>
                <p className="text-sm text-foreground">{processo.descricao}</p>
              </div>
            )}

            {processo.proximoPrazo && (
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                <CalendarClock className="h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Proximo Prazo</p>
                  <p className="text-sm text-foreground">
                    {new Date(`${processo.proximoPrazo}T00:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {processo.movimentacoes && processo.movimentacoes.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="mb-3 font-heading text-base font-semibold text-foreground">Movimentacoes</h3>
              <div className="relative space-y-0">
                {processo.movimentacoes.map((mov, i) => (
                  <div key={mov.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                      {i < (processo.movimentacoes?.length ?? 0) - 1 && (
                        <div className="my-1 min-h-[24px] w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-[10px] text-muted-foreground">
                        {formatarDataMovimentacao(mov.data, mov.dataHora)} · {tipoMovimentacaoLabel(mov.tipo)}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground">{mov.descricao}</p>
                      {mov.orgaoJulgador && (
                        <p className="mt-1 text-xs text-muted-foreground">{mov.orgaoJulgador}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1 gap-2" onClick={onEditar}>
            <Pencil className="h-4 w-4" /> Editar / Gerenciar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ProcessosView = () => {
  const { user } = useAuth();
  const { unidadeSelecionada } = useUnidade();

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProcesso | "Todos">("Todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoProcesso | "Todos">("Todos");
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [editando, setEditando] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  const isSecretaria = user?.papel?.toUpperCase() === "SECRETARIA";

  const carregarProcessos = useCallback(() => {
    setLoading(true);

    const buscaNorm = busca.trim();
    const params: { unidadeId?: string; busca?: string; size?: number } = { size: 1000 };

    if (unidadeSelecionada && unidadeSelecionada !== "todas") {
      params.unidadeId = unidadeSelecionada;
    }

    if (buscaNorm) {
      params.busca = buscaNorm;
    }

    processosApi
      .listar(Object.keys(params).length ? params : undefined)
      .then((data) => {
        const items = data.content ?? data;
        setProcessos(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error("Erro ao carregar processos:", err);
        toast.error("Erro ao carregar processos");
        setProcessos([]);
      })
      .finally(() => setLoading(false));
  }, [busca, unidadeSelecionada]);

  useEffect(() => {
    carregarProcessos();
  }, [carregarProcessos]);

  const todoStatus: Array<StatusProcesso | "Todos"> = [
    "Todos",
    "EM_ANDAMENTO",
    "URGENTE",
    "AGUARDANDO",
    "SUSPENSO",
    "CONCLUIDO",
    "ARQUIVADO",
  ];

  const processosFiltrados = processos.filter((processo) => {
    const matchStatus = filtroStatus === "Todos" || processo.status === filtroStatus;
    const matchTipo = filtroTipo === "Todos" || processo.tipo === filtroTipo;
    return matchStatus && matchTipo;
  });

  const handleClickProcesso = async (processo: Processo) => {
    try {
      const completo = await processosApi.buscar(processo.id);
      setProcessoSelecionado(completo);
    } catch {
      setProcessoSelecionado(processo);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero ou cliente..."
            className="border-none bg-secondary pl-9"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(event) => setFiltroStatus(event.target.value as StatusProcesso | "Todos")}
          className="h-10 cursor-pointer rounded-md border-none bg-secondary px-3 text-sm text-foreground outline-none"
        >
          {todoStatus.map((status) => (
            <option key={status} value={status}>
              {status === "Todos" ? "Todos os status" : statusConfig[status as StatusProcesso]?.label || status}
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(event) => setFiltroTipo(event.target.value as TipoProcesso | "Todos")}
          className="h-10 cursor-pointer rounded-md border-none bg-secondary px-3 text-sm text-foreground outline-none"
        >
          <option value="Todos">Todos os tipos</option>
          {tiposProcesso.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        {!isSecretaria && (
          <Button className="ml-auto gap-2" onClick={() => setModalAberto(true)}>
            <Plus className="h-4 w-4" /> Novo Processo
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {todoStatus.slice(0, 5).map((status) => {
          const count = status === "Todos" ? processos.length : processos.filter((processo) => processo.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                filtroStatus === status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              {status === "Todos" ? status : statusConfig[status as StatusProcesso]?.label || status}{" "}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}

      {!loading && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {processosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Filter className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground">
                    N° do Processo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground">
                    Cliente
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground md:table-cell">
                    Tipo
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground lg:table-cell">
                    Advogado
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {processosFiltrados.map((processo) => {
                  const conf =
                    statusConfig[processo.status] ??
                    { class: "bg-muted text-foreground border-border", icon: AlertCircle, label: processo.status };
                  const Icon = conf.icon;

                  return (
                    <tr
                      key={processo.id}
                      onClick={() => handleClickProcesso(processo)}
                      className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-primary">
                            {processo.numero.length > 16 ? `${processo.numero.slice(0, 16)}...` : processo.numero}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {processo.unidadeNome ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                            {processo.clienteNome
                              .split(" ")
                              .slice(0, 2)
                              .map((nome) => nome[0])
                              .join("")}
                          </div>
                          <span className="font-medium text-foreground">{processo.clienteNome}</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">{processo.tipo}</td>
                      <td className="hidden px-5 py-4 text-sm text-muted-foreground lg:table-cell">
                        {(() => {
                          const advogados =
                            processo.advogados && processo.advogados.length > 0
                              ? processo.advogados
                              : processo.advogadoNome
                                ? [{ id: processo.advogadoId ?? "", nome: processo.advogadoNome }]
                                : [];

                          if (advogados.length === 0) {
                            return <span className="text-muted-foreground/50">—</span>;
                          }

                          return (
                            <span className="flex items-center gap-1">
                              {advogados[0].nome}
                              {advogados.length > 1 && (
                                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-primary/20 bg-primary/15 px-1 text-[9px] font-bold text-primary">
                                  +{advogados.length - 1}
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", conf.class)}>
                          <Icon className="h-3 w-3" />
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && (
        <p className="text-right text-xs text-muted-foreground">
          {processosFiltrados.length} de {processos.length} processos
        </p>
      )}

      {processoSelecionado && !editando && (
        <ProcessoDrawer
          processo={processoSelecionado}
          onClose={() => setProcessoSelecionado(null)}
          onEditar={() => setEditando(true)}
        />
      )}

      {processoSelecionado && editando && (
        <EditarProcessoModal
          processo={processoSelecionado}
          onClose={() => {
            setEditando(false);
            setProcessoSelecionado(null);
          }}
          onSaved={() => {
            setEditando(false);
            setProcessoSelecionado(null);
            carregarProcessos();
          }}
        />
      )}

      {modalAberto && <NovoProcessoModal onClose={() => setModalAberto(false)} onSaved={carregarProcessos} />}
    </div>
  );
};
